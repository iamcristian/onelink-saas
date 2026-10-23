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
      srem: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };

    prismaService = {
      domainBlocklist: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'mock-id', domainPattern: 'evil.xyz' }),
        delete: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      } as any,
      securityFlag: {
        create: jest.fn().mockResolvedValue({ id: 'flag-uuid' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'flag-uuid', submittedUrl: 'http://evil.com', status: 'PENDING_REVIEW' }),
        update: jest.fn().mockResolvedValue({ id: 'flag-uuid', submittedUrl: 'http://evil.com', status: 'RESOLVED_BENIGN' }),
      } as any,
      user: {
        update: jest.fn().mockResolvedValue({ id: 'user-uuid', email: 'spammer@evil.com', isBanned: true, profile: { id: 'prof-id', username: 'spammer' } }),
      } as any,
      link: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      } as any,
      adminAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-uuid' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'log-uuid', action: 'USER_SUSPEND' }]),
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
    await service.onModuleInit();
  });

  describe('evaluateUrl - Benign URLs & Allowlist (Zero False Positives)', () => {
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

    it('should allow legitimate link-in-bio services without false positives (paypal.me, discord.gg)', async () => {
      const discord = await service.evaluateUrl('https://discord.gg/community');
      const paypal = await service.evaluateUrl('https://paypal.me/alexrivera');
      const amazon = await service.evaluateUrl('https://amazon.de/dp/B0C1234');

      expect(discord.isSafe).toBe(true);
      expect(discord.action).toBe('ALLOW');
      expect(paypal.isSafe).toBe(true);
      expect(paypal.action).toBe('ALLOW');
      expect(amazon.isSafe).toBe(true);
      expect(amazon.action).toBe('ALLOW');
    });

    it('should not flag legitimate vocabulary containing brand substrings (pineapple, purchase.edu)', async () => {
      const pineapple = await service.evaluateUrl('https://pineapple.com/products/fresh');
      const purchase = await service.evaluateUrl('https://www.purchase.edu/programs/arts');

      expect(pineapple.isSafe).toBe(true);
      expect(pineapple.action).toBe('ALLOW');
      expect(purchase.isSafe).toBe(true);
      expect(purchase.action).toBe('ALLOW');
    });

    it('should allow legitimate internationalized domains (münchen.de) without false positives', async () => {
      const result = await service.evaluateUrl('https://münchen.de/');

      expect(result.isSafe).toBe(true);
      expect(result.action).toBe('ALLOW');
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

    it('should detect Punycode IDN spoofing (xn--pple-43d.com)', async () => {
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

    it('should detect high Shannon entropy in algorithmic DGA domains (>3.85 bits/char)', async () => {
      // "xkj89aqzp01m9x74b3" has high random character entropy (3.95 bits/char)
      const dgaUrl = 'https://xkj89aqzp01m9x74b3.info/download';
      const result = await service.evaluateUrl(dgaUrl);

      expect(result.entropy).toBeGreaterThan(3.85);
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('High Shannon entropy')]),
      );
    });

    it('should flag URL shorteners for destination review', async () => {
      const result = await service.evaluateUrl('https://bit.ly/3xYzAbC');

      expect(result.action).toBe('FLAG_FOR_REVIEW');
      expect(result.signals).toEqual(
        expect.arrayContaining([expect.stringContaining('URL shortener')]),
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

  describe('moderation operations (Trust & Safety)', () => {
    it('should update threat status and write audit log', async () => {
      const result = await service.updateThreatStatus(
        'flag-uuid',
        'RESOLVED_BENIGN' as any,
        'False positive verified by admin',
        'admin-uuid',
      );

      expect(result).toBeDefined();
      expect(prismaService.securityFlag?.update).toHaveBeenCalledWith({
        where: { id: 'flag-uuid' },
        data: {
          status: 'RESOLVED_BENIGN',
          resolutionNotes: 'False positive verified by admin',
          reviewedById: 'admin-uuid',
        },
      });
      expect(prismaService.adminAuditLog?.create).toHaveBeenCalled();
    });

    it('should suspend user and deactivate their links', async () => {
      const result = await service.suspendUser(
        'user-uuid',
        true,
        'Repeated malware distribution',
        'admin-uuid',
      );

      expect(result.isBanned).toBe(true);
      expect(prismaService.user?.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid' },
          data: { isBanned: true },
        }),
      );
      expect(prismaService.link?.updateMany).toHaveBeenCalledWith({
        where: { profileId: 'prof-id' },
        data: { isActive: false },
      });
    });

    it('should remove domain from blocklist in DB and Redis', async () => {
      const result = await service.removeDomainFromBlocklist('mock-id', 'admin-uuid');

      expect(result.success).toBe(true);
      expect(prismaService.domainBlocklist?.delete).toHaveBeenCalledWith({ where: { id: 'mock-id' } });
      expect(redisService.srem).toHaveBeenCalledWith(expect.any(String), 'evil.xyz');
    });

    it('should retrieve audit logs', async () => {
      const logs = await service.getAuditLogs(10);
      expect(logs).toHaveLength(1);
      expect(prismaService.adminAuditLog?.findMany).toHaveBeenCalled();
    });
  });
});
