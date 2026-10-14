import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ThreatType, SecurityFlagStatus } from '@repo/prisma';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { calculateShannonEntropy } from './utils/entropy.util';
import { scanForHomoglyphs } from './utils/homoglyph.util';
import { SentinelEvaluationResult, SecurityFlagCreationParams } from './sentinel-ai.types';

const HIGH_VALUE_BRANDS = [
  'paypal',
  'google',
  'apple',
  'microsoft',
  'binance',
  'coinbase',
  'metamask',
  'phantom',
  'instagram',
  'facebook',
  'netflix',
  'amazon',
  'chase',
  'wellsfargo',
  'steamcommunity',
  'discord',
  'telegram',
  'whatsapp',
];

const CRYPTO_DRAINER_KEYWORDS = [
  'airdrop',
  'claim-free',
  'walletconnect',
  'wallet-connect',
  'seed-phrase',
  'drainer',
  'free-nft',
  'crypto-giveaway',
  'mint-pass',
  'presale-tokens',
];

const SUSPICIOUS_PATH_KEYWORDS = [
  'login',
  'signin',
  'verify',
  'banking',
  'secure-account',
  'update-password',
  'auth-token',
  'confirm-identity',
];

const HIGH_RISK_TLDS = new Set([
  '.xyz',
  '.top',
  '.click',
  '.buzz',
  '.cam',
  '.work',
  '.rest',
  '.loan',
  '.tk',
  '.ml',
  '.ga',
  '.cf',
  '.gq',
  '.fit',
  '.kim',
]);

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

@Injectable()
export class SentinelAiService implements OnModuleInit {
  private readonly logger = new Logger(SentinelAiService.name);
  private static readonly REDIS_BLOCKLIST_KEY = 'sentinel:blocked_domains';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.syncBlocklistToRedis();
  }

  /**
   * Evaluates an arbitrary URL in-process using Shannon entropy,
   * homoglyph heuristics, and lexical risk classification in <18ms without external tokens.
   */
  async evaluateUrl(rawUrl: string): Promise<SentinelEvaluationResult> {
    const startTime = performance.now();

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`Invalid URL format: "${rawUrl}"`);
    }

    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const signals: string[] = [];
    let riskScore = 0;
    let threatType: ThreatType | undefined;

    // Layer 0: Check Redis fast global blocklist (<1ms O(1) lookup)
    const isGloballyBlocked = await this.redis.sismember(
      SentinelAiService.REDIS_BLOCKLIST_KEY,
      hostname,
    );

    if (isGloballyBlocked) {
      signals.push('Matched active Redis domain blocklist');
      return {
        isSafe: false,
        riskScore: 1.0,
        threatType: ThreatType.SPAM,
        aiConfidence: 0.9999,
        action: 'BLOCK_IMMEDIATE',
        signals,
        entropy: calculateShannonEntropy(hostname),
        normalizedDomain: hostname,
        latencyMs: Math.round((performance.now() - startTime) * 100) / 100,
      };
    }

    // Layer 1: Raw IP Address as hostname (phishing / C2 server indicator)
    if (IPV4_REGEX.test(hostname)) {
      riskScore += 0.75;
      threatType = ThreatType.PHISHING;
      signals.push(`Host is a raw IP address (${hostname}) instead of a qualified domain`);
    }

    // Layer 2: Homoglyph and Punycode spoofing detection
    // WHATWG URL parser automatically encodes unicode characters in hostname to Punycode (xn--)
    const rawHostMatch = rawUrl.match(/^[a-zA-Z]+:\/\/([^/?#:]+)/);
    const rawHost = rawHostMatch ? rawHostMatch[1].toLowerCase() : hostname;
    const homoglyphResult = scanForHomoglyphs(rawHost);

    if (homoglyphResult.hasHomoglyphs || hostname.includes('xn--')) {
      riskScore += 0.85;
      threatType = ThreatType.PHISHING;
      if (homoglyphResult.detectedChars.length > 0) {
        signals.push(
          `Cyrillic/Greek homoglyphs detected mimicking Latin letters: [${homoglyphResult.detectedChars.join(', ')}]`,
        );
      }
      if (hostname.includes('xn--') || homoglyphResult.isPunycode) {
        signals.push('Punycode internationalized domain (IDN) detected');
      }
    }

    // Layer 3: High Shannon Entropy (algorithmic DGA domain randomness)
    const domainParts = hostname.split('.');
    const primaryLabel = domainParts.length > 1 ? domainParts[domainParts.length - 2] : hostname;
    const entropy = calculateShannonEntropy(primaryLabel);

    if (entropy >= 3.5 && primaryLabel.length >= 10) {
      riskScore += 0.50;
      signals.push(`High Shannon entropy (${entropy} bits/char) indicates algorithmic DGA domain`);
      if (!threatType) threatType = ThreatType.MALWARE;
    }

    // Layer 4: High-Value Brand Impersonation / Typosquatting
    const normalizedDomain = homoglyphResult.normalizedString;
    for (const brand of HIGH_VALUE_BRANDS) {
      if (normalizedDomain.includes(brand)) {
        // Legitimate brand check: must be exactly brand.tld or brand.com / brand.org etc.
        const isOfficial =
          normalizedDomain === `${brand}.com` ||
          normalizedDomain.endsWith(`.${brand}.com`) ||
          normalizedDomain === `${brand}.org` ||
          normalizedDomain.endsWith(`.${brand}.org`);

        if (!isOfficial) {
          riskScore += 0.80;
          threatType = ThreatType.PHISHING;
          signals.push(`Impersonation of protected brand "${brand}" in non-official domain`);
          break;
        }
      }
    }

    // Layer 5: Crypto Drainer & Wallet Phishing keywords
    const fullUrlString = `${hostname}${pathname}`;
    for (const keyword of CRYPTO_DRAINER_KEYWORDS) {
      if (fullUrlString.includes(keyword)) {
        riskScore += 0.70;
        threatType = ThreatType.CRYPTO_DRAINER;
        signals.push(`Crypto drainer / wallet-theft keyword pattern found: "${keyword}"`);
        break;
      }
    }

    // Layer 6: Suspicious Path Keywords in non-authoritative hostnames
    for (const pathKey of SUSPICIOUS_PATH_KEYWORDS) {
      if (pathname.includes(pathKey) && riskScore > 0.2) {
        riskScore += 0.20;
        signals.push(`Credential phishing path detected: "${pathKey}"`);
        break;
      }
    }

    // Layer 7: High-Risk TLD multiplier
    for (const tld of HIGH_RISK_TLDS) {
      if (hostname.endsWith(tld)) {
        if (signals.length > 0) {
          riskScore += 0.25;
          signals.push(`High-risk top-level domain (${tld}) associated with fraudulent activity`);
        }
        break;
      }
    }

    // Layer 8: Excessive Subdomain Stacking (e.g. login.secure.bank.scam.xyz)
    if (domainParts.length >= 4) {
      riskScore += 0.20;
      signals.push(`Excessive subdomain depth (${domainParts.length} levels) indicates evasion tactic`);
    }

    // Clamp risk score to [0.0, 1.0]
    const finalRiskScore = Math.min(1.0, Math.round(riskScore * 10000) / 10000);

    // AI Confidence is elevated when multiple distinct security signals align
    const baseConfidence = signals.length === 0 ? 0.99 : Math.min(0.98, 0.75 + signals.length * 0.08);
    const aiConfidence = Math.round(baseConfidence * 10000) / 10000;

    let action: 'ALLOW' | 'FLAG_FOR_REVIEW' | 'BLOCK_IMMEDIATE' = 'ALLOW';
    if (finalRiskScore >= 0.75) {
      action = 'BLOCK_IMMEDIATE';
      if (!threatType) threatType = ThreatType.PHISHING;
    } else if (finalRiskScore >= 0.45) {
      action = 'FLAG_FOR_REVIEW';
      if (!threatType) threatType = ThreatType.SPAM;
    }

    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      isSafe: action === 'ALLOW',
      riskScore: finalRiskScore,
      threatType: action !== 'ALLOW' ? threatType : undefined,
      aiConfidence,
      action,
      signals,
      entropy,
      normalizedDomain: homoglyphResult.normalizedString,
      latencyMs,
    };
  }

  /**
   * Persists an immutable security violation flag in the database
   */
  async recordSecurityFlag(params: SecurityFlagCreationParams) {
    try {
      return await this.prisma.securityFlag.create({
        data: {
          userId: params.userId,
          submittedUrl: params.submittedUrl,
          riskScore: params.riskScore,
          threatType: params.threatType,
          aiConfidence: params.aiConfidence,
          ipAddress: params.ipAddress,
          status: params.status,
          resolutionNotes: params.resolutionNotes,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to record security flag: ${msg}`);
      return null;
    }
  }

  /**
   * Synchronizes active domain blocklists from PostgreSQL to Redis for O(1) lookups
   */
  async syncBlocklistToRedis(): Promise<number> {
    try {
      const activeBlocks = await this.prisma.domainBlocklist.findMany({
        select: { domainPattern: true },
      });

      if (activeBlocks.length > 0) {
        const patterns = activeBlocks.map((b) => b.domainPattern.toLowerCase());
        await this.redis.sadd(SentinelAiService.REDIS_BLOCKLIST_KEY, ...patterns);
        this.logger.log(`Synchronized ${patterns.length} domain blocklists to Redis`);
        return patterns.length;
      }
      return 0;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not sync blocklist to Redis: ${msg}`);
      return 0;
    }
  }

  /**
   * Manually adds a domain pattern to blocklist and updates Redis immediately
   */
  async addDomainToBlocklist(domainPattern: string, reason: string, adminUserId?: string) {
    const pattern = domainPattern.toLowerCase().trim();

    const record = await this.prisma.domainBlocklist.upsert({
      where: { domainPattern: pattern },
      update: { reason },
      create: {
        domainPattern: pattern,
        reason,
        addedById: adminUserId,
      },
    });

    await this.redis.sadd(SentinelAiService.REDIS_BLOCKLIST_KEY, pattern);
    return record;
  }
}
