import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThreatType, SecurityFlagStatus } from '@repo/prisma';
import { LinkService } from './link.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SentinelAiService } from '../sentinel-ai/sentinel-ai.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { ProfileAccessService } from '../../common/services/profile-access.service';

describe('LinkService (with Sentinel AI Interception)', () => {
  let service: LinkService;
  let prismaService: {
    profile: {
      findUnique: jest.Mock;
    };
    link: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    teamMember: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let sentinelAiService: {
    evaluateUrl: jest.Mock;
    recordSecurityFlag: jest.Mock;
  };
  let redisService: {
    del: jest.Mock;
  };

  const mockProfileId = '22222222-2222-2222-2222-222222222222';
  const mockUserId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockProfileId,
          userId: mockUserId,
          username: 'alexrivera',
        }),
      },
      link: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      teamMember: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    sentinelAiService = {
      evaluateUrl: jest.fn(),
      recordSecurityFlag: jest.fn().mockResolvedValue({ id: 'flag-uuid' }),
    };

    redisService = {
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkService,
        ProfileAccessService,
        { provide: PrismaService, useValue: prismaService },
        { provide: SentinelAiService, useValue: sentinelAiService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<LinkService>(LinkService);
  });

  describe('createLink', () => {
    it('should throw ForbiddenException if user attempts to modify someone else profile', async () => {
      prismaService.profile.findUnique.mockResolvedValueOnce({
        id: mockProfileId,
        userId: 'different-user-id',
      });

      await expect(
        service.createLink(mockProfileId, mockUserId, {
          title: 'Hacked Link',
          url: 'https://youtube.com',
        }),
      ).rejects.toThrow('You do not have permission to manage this profile');
    });

    it('should create link when Sentinel AI evaluates URL as SAFE', async () => {
      sentinelAiService.evaluateUrl.mockResolvedValue({
        isSafe: true,
        riskScore: 0.05,
        action: 'ALLOW',
        aiConfidence: 0.99,
        signals: [],
      });

      prismaService.link.findFirst.mockResolvedValue(null); // First link in profile
      prismaService.link.create.mockResolvedValue({
        id: 'link-1',
        profileId: mockProfileId,
        title: 'My Channel',
        url: 'https://youtube.com/@alexrivera',
        position: 0,
      });

      const result = await service.createLink(mockProfileId, mockUserId, {
        title: 'My Channel',
        url: 'https://youtube.com/@alexrivera',
      });

      expect(result).toBeDefined();
      expect(result.position).toBe(0);
      expect(sentinelAiService.evaluateUrl).toHaveBeenCalledWith('https://youtube.com/@alexrivera');
      expect(prismaService.link.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profileId: mockProfileId,
            position: 0,
          }),
        }),
      );
      expect(redisService.del).toHaveBeenCalledWith('profile:alexrivera');
    });

    it('should throw BadRequestException and record SecurityFlag when Sentinel AI detects a malicious URL', async () => {
      sentinelAiService.evaluateUrl.mockResolvedValue({
        isSafe: false,
        riskScore: 0.95,
        action: 'BLOCK_IMMEDIATE',
        threatType: ThreatType.PHISHING,
        aiConfidence: 0.98,
        signals: ['Cyrillic homoglyphs detected mimicking Latin letters: [а]'],
      });

      await expect(
        service.createLink(mockProfileId, mockUserId, {
          title: 'Fake Login',
          url: 'http://pаypal.com/signin',
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify Sentinel AI recorded the flag
      expect(sentinelAiService.recordSecurityFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          submittedUrl: 'http://pаypal.com/signin',
          riskScore: 0.95,
          threatType: ThreatType.PHISHING,
          status: SecurityFlagStatus.BLOCKED_AUTO,
        }),
      );

      // Verify the link was NOT saved in database
      expect(prismaService.link.create).not.toHaveBeenCalled();
    });

    it('should create link and log PENDING_REVIEW flag when Sentinel AI returns intermediate suspicion', async () => {
      sentinelAiService.evaluateUrl.mockResolvedValue({
        isSafe: false,
        riskScore: 0.55,
        action: 'FLAG_FOR_REVIEW',
        threatType: ThreatType.SPAM,
        aiConfidence: 0.85,
        signals: ['Excessive subdomain depth'],
      });

      prismaService.link.findFirst.mockResolvedValue({ position: 2 });
      prismaService.link.create.mockResolvedValue({
        id: 'link-2',
        position: 3,
      });

      const result = await service.createLink(mockProfileId, mockUserId, {
        title: 'Subdomain Link',
        url: 'https://deep.sub.domain.sample.com',
      });

      expect(result.position).toBe(3);
      expect(sentinelAiService.recordSecurityFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SecurityFlagStatus.PENDING_REVIEW,
        }),
      );
      expect(redisService.del).toHaveBeenCalledWith('profile:alexrivera');
    });

    it('should throw BadRequestException when URL is plain text without domain (e.g. asdfasdf)', async () => {
      await expect(
        service.createLink(mockProfileId, mockUserId, {
          title: 'Invalid Plain Text',
          url: 'asdfasdf',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(sentinelAiService.evaluateUrl).not.toHaveBeenCalled();
      expect(prismaService.link.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URL is empty or whitespace for outbound link', async () => {
      await expect(
        service.createLink(mockProfileId, mockUserId, {
          title: 'Empty URL',
          url: '   ',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(sentinelAiService.evaluateUrl).not.toHaveBeenCalled();
      expect(prismaService.link.create).not.toHaveBeenCalled();
    });
  });

  describe('updateLink', () => {
    it('should update link when changed URL is safe', async () => {
      prismaService.link.findFirst.mockResolvedValue({
        id: 'link-1',
        profileId: mockProfileId,
        url: 'https://old-url.com',
      });

      sentinelAiService.evaluateUrl.mockResolvedValue({
        isSafe: true,
        action: 'ALLOW',
        signals: [],
      });

      prismaService.link.update.mockResolvedValue({
        id: 'link-1',
        title: 'New Title',
        url: 'https://new-safe-url.com',
      });

      const updated = await service.updateLink('link-1', mockProfileId, mockUserId, {
        title: 'New Title',
        url: 'https://new-safe-url.com',
      });

      expect(updated.title).toBe('New Title');
      expect(sentinelAiService.evaluateUrl).toHaveBeenCalledWith('https://new-safe-url.com');
      expect(redisService.del).toHaveBeenCalledWith('profile:alexrivera');
    });

    it('should block update when changed URL is malicious', async () => {
      prismaService.link.findFirst.mockResolvedValue({
        id: 'link-1',
        profileId: mockProfileId,
        url: 'https://old-url.com',
      });

      sentinelAiService.evaluateUrl.mockResolvedValue({
        isSafe: false,
        action: 'BLOCK_IMMEDIATE',
        threatType: ThreatType.CRYPTO_DRAINER,
        signals: ['Crypto drainer keyword pattern found'],
      });

      await expect(
        service.updateLink('link-1', mockProfileId, mockUserId, {
          url: 'https://metamask-drainer.xyz/claim',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.link.update).not.toHaveBeenCalled();
    });

    it('should reject update if changed URL is plain text without domain', async () => {
      prismaService.link.findFirst.mockResolvedValue({
        id: 'link-1',
        profileId: mockProfileId,
        url: 'https://old-url.com',
      });

      await expect(
        service.updateLink('link-1', mockProfileId, mockUserId, {
          url: 'justsometext',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(sentinelAiService.evaluateUrl).not.toHaveBeenCalled();
      expect(prismaService.link.update).not.toHaveBeenCalled();
    });
  });

  describe('reorderLinks', () => {
    it('should invoke prisma transaction for atomic position updates', async () => {
      const items = [
        { id: 'link-a', position: 0 },
        { id: 'link-b', position: 1 },
      ];

      await service.reorderLinks(mockProfileId, items, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.link.updateMany).toHaveBeenCalledTimes(2);
      expect(redisService.del).toHaveBeenCalledWith('profile:alexrivera');
    });
  });

  describe('deleteLink', () => {
    it('should delete existing link and compact remaining positions', async () => {
      prismaService.link.findFirst.mockResolvedValue({ id: 'link-1' });
      prismaService.link.delete.mockResolvedValue({ id: 'link-1' });
      prismaService.link.findMany.mockResolvedValue([{ id: 'link-2', position: 1 }]);

      const result = await service.deleteLink('link-1', mockProfileId, mockUserId);
      expect(result.success).toBe(true);
      expect(prismaService.link.delete).toHaveBeenCalledWith({ where: { id: 'link-1' } });
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith('profile:alexrivera');
    });

    it('should throw NotFoundException when link does not exist', async () => {
      prismaService.link.findFirst.mockResolvedValue(null);

      await expect(service.deleteLink('non-existent', mockProfileId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unlockLink (PIN & Password Protection with Bcrypt)', () => {
    it('should unlock password-protected link when PIN matches bcrypt hash', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('1234', 10);

      prismaService.link.findUnique.mockResolvedValue({
        id: 'protected-link-1',
        url: 'https://patreon.com/vip',
        isPasswordProtected: true,
        password: hash,
        isActive: true,
      });

      const res = await service.unlockLink('protected-link-1', '1234');
      expect(res.success).toBe(true);
      expect(res.url).toBe('https://patreon.com/vip');
    });

    it('should reject unlock when incorrect PIN is provided', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('1234', 10);

      prismaService.link.findUnique.mockResolvedValue({
        id: 'protected-link-1',
        url: 'https://patreon.com/vip',
        isPasswordProtected: true,
        password: hash,
        isActive: true,
      });

      await expect(service.unlockLink('protected-link-1', 'wrong-pin')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
