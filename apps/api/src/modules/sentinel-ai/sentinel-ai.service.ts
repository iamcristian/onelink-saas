import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { domainToUnicode } from 'url';
import * as ort from 'onnxruntime-node';
import { ThreatType, SecurityFlagStatus, Role } from '@repo/prisma';
import { isValidWebUrl } from '@repo/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { scanForHomoglyphs } from './utils/homoglyph.util';
import { extractUrlFeatures, ExtractedFeatures } from './utils/features.util';
import { isAuthoritativeDomain } from './utils/allowlist.util';
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

@Injectable()
export class SentinelAiService implements OnModuleInit {
  private readonly logger = new Logger(SentinelAiService.name);
  private static readonly REDIS_BLOCKLIST_KEY = 'sentinel:blocked_domains';
  private onnxSession: ort.InferenceSession | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.initOnnxModel();
    await this.syncBlocklistToRedis();
  }

  /**
   * Initializes the ONNX URL classification model in-process for zero-token inference.
   */
  private async initOnnxModel() {
    const candidatePaths = [
      path.resolve(__dirname, 'models/sentinel-url-classifier.onnx'),
      path.resolve(__dirname, '../models/sentinel-url-classifier.onnx'),
      path.resolve(process.cwd(), 'src/modules/sentinel-ai/models/sentinel-url-classifier.onnx'),
      path.resolve(process.cwd(), 'apps/api/src/modules/sentinel-ai/models/sentinel-url-classifier.onnx'),
      path.resolve(process.cwd(), 'dist/modules/sentinel-ai/models/sentinel-url-classifier.onnx'),
    ];

    let modelPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        modelPath = p;
        break;
      }
    }

    if (!modelPath) {
      this.logger.warn(
        `ONNX model not found in any candidate path. Sentinel AI will run in heuristic-only mode.`,
      );
      return;
    }

    try {
      this.onnxSession = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });
      this.logger.log(`ONNX Security Model loaded successfully from ${modelPath}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load ONNX model: ${msg}`);
    }
  }

  /**
   * Evaluates an arbitrary URL in-process using trained ONNX Random Forest model,
   * Shannon entropy, homoglyph heuristics, and lexical risk classification in <18ms without external tokens.
   */
  async evaluateUrl(rawUrl: string): Promise<SentinelEvaluationResult> {
    const startTime = performance.now();

    const trimmed = rawUrl ? rawUrl.trim() : '';
    if (!isValidWebUrl(trimmed)) {
      throw new BadRequestException(
        `Invalid URL format: "${rawUrl}". A valid domain or web link is required (e.g., https://example.com). Plain text is not allowed.`,
      );
    }

    const normalized =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;

    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new BadRequestException(`Invalid URL format: "${rawUrl}"`);
    }

    const hostname = parsed.hostname.toLowerCase();
    const signals: string[] = [];
    let riskScore = 0;
    let threatType: ThreatType | undefined;
    let mlRiskScore = 0;
    let mlConfidence = 0.99;

    // Layer 0: Authoritative Domain Fast Bypass (Guarantees zero false positives for legitimate link-in-bio services)
    if (isAuthoritativeDomain(hostname)) {
      const unicodeDomain = domainToUnicode(hostname);
      const homoglyphCheck = scanForHomoglyphs(unicodeDomain);
      if (!homoglyphCheck.hasHomoglyphs) {
        signals.push('Authoritative domain allowlist match');
        return {
          isSafe: true,
          riskScore: 0.0,
          aiConfidence: 0.9999,
          action: 'ALLOW',
          signals,
          entropy: 0.0,
          normalizedDomain: hostname,
          latencyMs: Math.round((performance.now() - startTime) * 100) / 100,
        };
      }
    }

    // Layer 1: Redis Global Blocklist (O(1) fast lookup <1ms) with wildcard / subdomain suffix checking
    try {
      const parts = hostname.split('.');
      const candidateDomains: string[] = [];
      for (let i = 0; i <= parts.length - 2; i++) {
        candidateDomains.push(parts.slice(i).join('.'));
      }

      let isGloballyBlocked = false;
      for (const candidate of candidateDomains) {
        if (await this.redis.sismember(SentinelAiService.REDIS_BLOCKLIST_KEY, candidate)) {
          isGloballyBlocked = true;
          break;
        }
      }

      if (isGloballyBlocked) {
        signals.push('Matched active Redis domain blocklist');
        return {
          isSafe: false,
          riskScore: 1.0,
          threatType: ThreatType.SPAM,
          aiConfidence: 0.9999,
          action: 'BLOCK_IMMEDIATE',
          signals,
          entropy: 0.0,
          normalizedDomain: hostname,
          latencyMs: Math.round((performance.now() - startTime) * 100) / 100,
        };
      }
    } catch (err: unknown) {
      this.logger.warn(`Redis blocklist check error: ${err}`);
    }

    // Layer 2: Extract 16 lexical and structural numerical features
    const features: ExtractedFeatures = extractUrlFeatures(rawUrl);

    // Layer 3: ONNX Machine Learning Inference
    if (this.onnxSession) {
      try {
        const inputTensor = new ort.Tensor('float32', features.vector, [1, 16]);
        const results = await this.onnxSession.run({ float_input: inputTensor });
        const probTensor = results.probabilities as ort.Tensor;
        const probs = probTensor.data as Float32Array;

        // Index 0: Benign, Index 1: Malicious
        const probBenign = probs[0];
        const probMalicious = probs[1];

        mlRiskScore = Math.round(probMalicious * 10000) / 10000;
        mlConfidence = Math.round(Math.max(probBenign, probMalicious) * 10000) / 10000;

        if (mlRiskScore >= 0.75) {
          signals.push(`Sentinel ML classified URL as malicious (confidence: ${(mlConfidence * 100).toFixed(1)}%)`);
          if (!threatType) threatType = ThreatType.PHISHING;
        } else if (mlRiskScore >= 0.45) {
          signals.push(`Sentinel ML flagged URL for review (risk: ${mlRiskScore})`);
        }
      } catch (err: unknown) {
        this.logger.warn(`ONNX inference failed: ${err}`);
      }
    }

    riskScore = mlRiskScore;

    // Layer 4: Deterministic Security Safety Net
    // 4A: Homoglyph spoofing detection (Cyrillic, Greek, or mixed scripts mimicking protected ASCII)
    const rawHostMatch = rawUrl.match(/^[a-zA-Z]+:\/\/([^/?#:]+)/);
    const rawHost = rawHostMatch ? rawHostMatch[1].toLowerCase() : hostname;
    // Decode Punycode to Unicode for accurate homoglyph scanning (e.g. xn--pple-43d -> аpple)
    const unicodeHost = domainToUnicode(rawHost);
    const homoglyphResult = scanForHomoglyphs(unicodeHost);

    if (homoglyphResult.hasHomoglyphs) {
      riskScore = Math.max(riskScore, 0.95);
      if (!threatType) threatType = ThreatType.PHISHING;
      if (homoglyphResult.detectedChars.length > 0) {
        signals.push(
          `Cyrillic/Greek homoglyphs detected mimicking Latin letters: [${homoglyphResult.detectedChars.join(', ')}]`,
        );
      }
      if (features.isPunycode) {
        signals.push('Punycode internationalized domain (IDN) spoofing indicator');
      }
    } else if (features.isPunycode && features.hasSuspiciousTld) {
      riskScore = Math.max(riskScore, 0.85);
      if (!threatType) threatType = ThreatType.PHISHING;
      signals.push('Punycode internationalized domain on high-risk TLD detected');
    }

    // 4B: Raw IP Address Host
    if (features.hasIp) {
      riskScore = Math.max(riskScore, 0.85);
      if (!threatType) threatType = ThreatType.PHISHING;
      signals.push(`Host is a raw IP address (${hostname}) instead of a qualified domain`);
    }

    // 4C: Crypto Drainer and Wallet Phishing Keywords
    if (features.hasCryptoKeywords) {
      riskScore = Math.max(riskScore, 0.85);
      threatType = ThreatType.CRYPTO_DRAINER;
      signals.push(`Crypto drainer / wallet-theft keyword pattern found in URL`);
    }

    // 4D: High Shannon Entropy (Algorithmic DGA domain randomness)
    if (features.entropy >= 3.85 && features.primaryLabel.length >= 10) {
      riskScore = Math.max(riskScore, 0.70);
      signals.push(`High Shannon entropy (${features.entropy} bits/char) indicates algorithmic DGA domain`);
      if (!threatType) threatType = ThreatType.MALWARE;
    }

    // 4E: URL Shorteners (Require destination review to prevent evasion)
    if (features.isShortener) {
      riskScore = Math.max(riskScore, 0.50);
      signals.push('URL shortener masks target destination — requires manual review');
      if (!threatType) threatType = ThreatType.SPAM;
    }

    // 4F: Token-Based High-Value Brand Impersonation
    const domainTokens = hostname.split(/[.-]/);
    for (const brand of HIGH_VALUE_BRANDS) {
      if (domainTokens.includes(brand)) {
        const isOfficial =
          hostname === `${brand}.com` ||
          hostname.endsWith(`.${brand}.com`) ||
          hostname === `${brand}.org` ||
          hostname.endsWith(`.${brand}.org`) ||
          hostname === `${brand}.me` ||
          hostname.endsWith(`.${brand}.me`) ||
          hostname === `${brand}.gg` ||
          hostname.endsWith(`.${brand}.gg`);

        if (!isOfficial) {
          riskScore = Math.max(riskScore, 0.85);
          if (!threatType || threatType === ThreatType.PHISHING) {
            threatType = ThreatType.PHISHING;
          }
          signals.push(`Impersonation of protected brand "${brand}" in non-official domain`);
          break;
        }
      }
    }

    // Clamp risk score to [0.0, 1.0]
    const finalRiskScore = Math.min(1.0, Math.round(riskScore * 10000) / 10000);

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
      aiConfidence: mlConfidence,
      action,
      signals,
      entropy: features.entropy,
      normalizedDomain: homoglyphResult.normalizedString || hostname,
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
   * Adds a domain pattern to both PostgreSQL and Redis blocklist cache
   */
  async addDomainToBlocklist(domainPattern: string, reason: string, adminUserId?: string) {
    let pattern = domainPattern.toLowerCase().trim();
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      try {
        pattern = new URL(pattern).hostname.toLowerCase();
      } catch {
        // keep pattern as trimmed
      }
    }
    pattern = pattern.replace(/^\*\./, '').replace(/\/.*$/, '');

    const entry = await this.prisma.domainBlocklist.upsert({
      where: { domainPattern: pattern },
      update: { reason, addedById: adminUserId },
      create: { domainPattern: pattern, reason, addedById: adminUserId },
    });

    await this.redis.sadd(SentinelAiService.REDIS_BLOCKLIST_KEY, pattern);
    this.logger.log(`Added "${pattern}" to global blocklist`);

    if (adminUserId) {
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'BLOCKLIST_DOMAIN_ADD',
          targetType: 'DOMAIN',
          targetId: entry.id,
          reason,
          metadata: { domainPattern: pattern },
        },
      });
    }

    return entry;
  }

  /**
   * Removes a domain pattern from PostgreSQL and Redis blocklist cache
   */
  async removeDomainFromBlocklist(id: string, adminUserId?: string) {
    const entry = await this.prisma.domainBlocklist.findUnique({ where: { id } });
    if (!entry) {
      throw new BadRequestException('Domain blocklist entry not found.');
    }

    await this.prisma.domainBlocklist.delete({ where: { id } });
    await this.redis.srem(SentinelAiService.REDIS_BLOCKLIST_KEY, entry.domainPattern.toLowerCase());
    this.logger.log(`Removed "${entry.domainPattern}" from global blocklist`);

    if (adminUserId) {
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'BLOCKLIST_DOMAIN_REMOVE',
          targetType: 'DOMAIN',
          targetId: id,
          reason: 'Removed by security administrator',
          metadata: { domainPattern: entry.domainPattern },
        },
      });
    }

    return { success: true, removedPattern: entry.domainPattern };
  }

  /**
   * Updates status of a SecurityFlag (e.g. RESOLVED_BENIGN, BANNED, BLOCKED_AUTO)
   */
  async updateThreatStatus(
    flagId: string,
    status: SecurityFlagStatus,
    notes?: string,
    adminUserId?: string,
  ) {
    const existing = await this.prisma.securityFlag.findUnique({ where: { id: flagId } });
    if (!existing) {
      throw new NotFoundException(`Security flag ${flagId} not found`);
    }

    const flag = await this.prisma.securityFlag.update({
      where: { id: flagId },
      data: {
        status,
        resolutionNotes: notes,
        reviewedById: adminUserId,
      },
    });

    if (adminUserId) {
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: `FLAG_STATUS_CHANGE_${status}`,
          targetType: 'SECURITY_FLAG',
          targetId: flagId,
          reason: notes || `Threat marked as ${status}`,
          metadata: { url: flag.submittedUrl, previousStatus: existing.status, newStatus: status },
        },
      });
    }

    return flag;
  }

  /**
   * Suspends or reinstates a user account, updates Redis session ban set,
   * evicts public profile cache, and deactivates links on suspension
   */
  async suspendUser(
    userId: string,
    isBanned: boolean,
    reason: string,
    adminUserId?: string,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned },
      include: { profile: true },
    });

    if (isBanned) {
      // Add to Redis blacklist to immediately block all existing JWTs
      await this.redis.sadd('auth:banned_users', userId);

      // Deactivate all links in DB
      if (user.profile) {
        await this.prisma.link.updateMany({
          where: { profileId: user.profile.id },
          data: { isActive: false },
        });
      }

      // Evict cached profile in Redis
      if (user.profile?.username) {
        await this.redis.del(`profile:username:${user.profile.username.toLowerCase()}`);
      }
      if (user.profile?.id) {
        await this.redis.del(`profile:id:${user.profile.id}`);
      }

      this.logger.warn(`User ${user.email} suspended. Session invalidated and links deactivated.`);
    } else {
      // Reinstated: remove from Redis banned users
      await this.redis.srem('auth:banned_users', userId);
      if (user.profile?.username) {
        await this.redis.del(`profile:username:${user.profile.username.toLowerCase()}`);
      }
      this.logger.log(`User ${user.email} reinstated.`);
    }

    if (adminUserId) {
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: isBanned ? 'USER_SUSPEND' : 'USER_REINSTATE',
          targetType: 'USER',
          targetId: userId,
          reason,
          metadata: { email: user.email, username: user.profile?.username },
        },
      });
    }

    return {
      userId: user.id,
      email: user.email,
      isBanned: user.isBanned,
      username: user.profile?.username,
    };
  }

  /**
   * Fetches latest moderation audit logs
   */
  async getAuditLogs(limit = 25) {
    const take = Math.min(100, Math.max(1, limit));
    return await this.prisma.adminAuditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        adminUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Returns engine telemetry including flag counts and active layers
   */
  async getTelemetry() {
    const flagCounts = await this.prisma.securityFlag.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const totalBlocked = flagCounts.reduce((acc, curr) => acc + curr._count.id, 0);

    return {
      status: 'ONLINE',
      mode: 'IN_PROCESS_ZERO_TOKEN',
      latencySlaMs: 18,
      layersActive: [
        'REDIS_O1_GLOBAL_BLOCKLIST',
        'PUNYCODE_HOMOGLYPH_DETECTION',
        'SHANNON_ENTROPY_ANALYSIS',
        'BRAND_TYPOSQUATTING_CLASSIFIER',
        'CRYPTO_DRAINER_HEURISTICS',
        'HIGH_RISK_TLD_CLASSIFIER',
      ],
      totalFlagsRecorded: totalBlocked,
      breakdown: flagCounts,
    };
  }

  /**
   * Lists recent threats detected by Sentinel AI
   */
  async listThreats(limit = 50) {
    const take = Math.min(100, Math.max(1, limit));
    return await this.prisma.securityFlag.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isBanned: true,
            profile: {
              select: {
                username: true,
                title: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lists domain blocklists
   */
  async listBlocklist() {
    return await this.prisma.domainBlocklist.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lists all platform users with profile, threat count and ban status
   */
  async listUsers(search?: string) {
    const where: any = {};
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { profile: { username: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            username: true,
            title: true,
            avatarUrl: true,
            isPublished: true,
            _count: {
              select: { links: true },
            },
          },
        },
        _count: {
          select: {
            securityFlags: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
      username: u.profile?.username || null,
      title: u.profile?.title || null,
      avatarUrl: u.profile?.avatarUrl || null,
      isPublished: u.profile?.isPublished ?? false,
      linksCount: u.profile?._count?.links ?? 0,
      threatCount: u._count?.securityFlags ?? 0,
    }));
  }

  /**
   * Updates user platform role with strict privilege checks and audit log
   */
  async updateUserRole(targetUserId: string, newRole: Role, admin: AuthenticatedUser) {
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Only OWNER can modify an OWNER account
    if (targetUser.role === Role.OWNER && admin.role !== Role.OWNER) {
      throw new ForbiddenException('Only platform owners can modify an OWNER account');
    }
    // Only OWNER can promote a user to OWNER
    if (newRole === Role.OWNER && admin.role !== Role.OWNER) {
      throw new ForbiddenException('Only platform owners can promote a user to OWNER');
    }
    // Only OWNER can change the role of a SUPER_ADMIN
    if (targetUser.role === Role.SUPER_ADMIN && admin.role !== Role.OWNER) {
      throw new ForbiddenException('Only platform owners can change a SUPER_ADMIN account role');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: 'USER_ROLE_UPDATE',
        targetType: 'USER',
        targetId: targetUserId,
        reason: `Role changed to ${newRole} by ${admin.email} (${admin.role})`,
        metadata: { newRole, email: updated.email },
      },
    });

    return updated;
  }
}
