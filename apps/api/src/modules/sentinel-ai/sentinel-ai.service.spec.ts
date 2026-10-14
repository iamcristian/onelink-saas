import { Test, TestingModule } from '@nestjs/testing';
import { ThreatType } from '@repo/prisma';
import { SentinelAiService } from './sentinel-ai.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

describe('SentinelAiService (Zero-Token AI Threat Detection)', () => {
  let service: SentinelAiService;
  let redisService: jest.Mocked<Partial<RedisService>>;
  let prismaService: jest.Mocked<Partial<PrismaService>>;

  beforeEach(async () => {
    redisService = {
      sismember: jest.fn().mockResolvedValue(false),
      sadd: jest.fn().mockResolvedValue(1),
    };

    prismaService = {
      domainBlocklist: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      } as any,
      securityFlag: {
        create: jest.fn().mockResolvedValue({ id: 'flag-uuid' }),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentinelAiService,
        { provide: RedisService, useValue: redisService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<SentinelAiService>(SentinelAiService);
  });

  describe('evaluateUrl - Benign URLs', () => {
    it('should classify legitimate YouTube URL as SAFE with low risk score', async () => {
      const result = await service.evaluateUrl('https://youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.isSafe).toBe(true);
      expect(result.action).toBe('ALLOW');
      expect(result.riskScore).toBeLessThan(0.3);
      expect(result.latencyMs).toBeLessThan(18); // Sub-18ms SLA
    });

    it('should classify legitimate GitHub repo link as SAFE', async () => {
      const result = await service.evaluateUrl('https://github.com/torvalds/linux');

      expect(result.isSafe).toBe(true);
      expect(result.action).toBe('ALLOW');
      expect(result.riskScore).toBeLessThan(0.3);
    });
  });

  describe('evaluateUrl - Phishing & IP Address Attacks', () => {
    it('should flag raw IP address as PHISHING threat', async () => {
      const result = await service.evaluateUrl('http://192.168.1.100/account/login');

      expect(result.isSafe).toBe(false);
      expect(result.threatType).toBe(ThreatType.PHISHING);
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('raw IP address')]),
      );
    });

    it('should detect Cyrillic homoglyph look-alike character spoofing', async () => {
      // "pаypal.com" where 'а' is Cyrillic \u0430
      const spoofedUrl = 'http://p\u0430ypal.com/signin';
      const result = await service.evaluateUrl(spoofedUrl);

      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('BLOCK_IMMEDIATE');
      expect(result.threatType).toBe(ThreatType.PHISHING);
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('homoglyphs detected')]),
      );
    });

    it('should detect Punycode IDN spoofing (xn--)', async () => {
      const punycodeUrl = 'https://xn--pple-43d.com/login';
      const result = await service.evaluateUrl(punycodeUrl);

      expect(result.isSafe).toBe(false);
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('Punycode')]),
      );
    });

    it('should detect protected brand impersonation in illegitimate domains', async () => {
      const brandPhishUrl = 'https://paypal-security-verification-portal.com/login';
      const result = await service.evaluateUrl(brandPhishUrl);

      expect(result.isSafe).toBe(false);
      expect(result.threatType).toBe(ThreatType.PHISHING);
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('Impersonation of protected brand "paypal"')]),
      );
    });
  });

  describe('evaluateUrl - Crypto Drainers & High Entropy DGA', () => {
    it('should flag crypto wallet drainer keywords on high-risk TLD', async () => {
      const drainerUrl = 'https://metamask-free-airdrop-claim.xyz/walletconnect';
      const result = await service.evaluateUrl(drainerUrl);

      expect(result.isSafe).toBe(false);
      expect(result.threatType).toBe(ThreatType.CRYPTO_DRAINER);
      expect(result.action).toBe('BLOCK_IMMEDIATE');
      expect(result.riskScore).toBeGreaterThanOrEqual(0.75);
    });

    it('should detect high Shannon entropy in algorithmic DGA domains', async () => {
      // "xj89akq-zp01m9x88" has high random character entropy
      const dgaUrl = 'https://xj89akq-zp01m9x88.info/download';
      const result = await service.evaluateUrl(dgaUrl);

      expect(result.entropy).toBeGreaterThan(3.5);
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('High Shannon entropy')]),
      );
    });
  });

  describe('evaluateUrl - Fast Redis Global Blocklist', () => {
    it('should immediately block domain if present in Redis blocklist cache (<1ms)', async () => {
      (redisService.sismember as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.evaluateUrl('https://known-fraudulent-malware.com/payload');

      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('BLOCK_IMMEDIATE');
      expect(result.riskScore).toBe(1.0);
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('Matched active Redis domain blocklist')]),
      );
    });
  });

  describe('recordSecurityFlag', () => {
    it('should persist a security violation flag in Prisma database', async () => {
      const flag = await service.recordSecurityFlag({
        userId: '11111111-1111-1111-1111-111111111111',
        submittedUrl: 'http://evil.com',
        riskScore: 0.95,
        threatType: ThreatType.PHISHING,
        aiConfidence: 0.98,
        status: 'BLOCKED_AUTO' as any,
        resolutionNotes: 'Blocked automatically by Sentinel AI',
      });

      expect(flag).toBeDefined();
      expect(prismaService.securityFlag?.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submittedUrl: 'http://evil.com',
            riskScore: 0.95,
          }),
        }),
      );
    });
  });
});
