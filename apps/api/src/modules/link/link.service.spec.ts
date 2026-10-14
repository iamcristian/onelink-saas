import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThreatType, LinkType, SecurityFlagStatus } from '@repo/prisma';
import { LinkService } from './link.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SentinelAiService } from '../sentinel-ai/sentinel-ai.service';

describe('LinkService (with Sentinel AI Interception)', () => {
  let service: LinkService;
  let prismaService: jest.Mocked<Partial<PrismaService>>;
  let sentinelAiService: jest.Mocked<Partial<SentinelAiService>>;

  const mockProfileId = '22222222-2222-2222-2222-222222222222';
  const mockUserId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    prismaService = {
      link: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      } as any,
      $transaction: jest.fn((promises) => Promise.all(promises)) as any,
    };

    sentinelAiService = {
      evaluateUrl: jest.fn(),
      recordSecurityFlag: jest.fn().mockResolvedValue({ id: 'flag-uuid' } as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkService,
        { provide: PrismaService, useValue: prismaService },
        { provide: SentinelAiService, useValue: sentinelAiService },
      ],
    }).compile();

    service = module.get<LinkService>(LinkService);
  });

  describe('createLink', () => {
    it('should create link when Sentinel AI evaluates URL as SAFE', async () => {
      (sentinelAiService.evaluateUrl as jest.Mock).mockResolvedValue({
        isSafe: true,
        riskScore: 0.05,
        action: 'ALLOW',
        aiConfidence: 0.99,
        signals: [],
      });

      (prismaService.link?.findFirst as jest.Mock).mockResolvedValue(null); // First link in profile
      (prismaService.link?.create as jest.Mock).mockResolvedValue({
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
      expect(prismaService.link?.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profileId: mockProfileId,
            position: 0,
          }),
        }),
      );
    });

    it('should throw BadRequestException and record SecurityFlag when Sentinel AI detects a malicious URL', async () => {
      (sentinelAiService.evaluateUrl as jest.Mock).mockResolvedValue({
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
      expect(prismaService.link?.create).not.toHaveBeenCalled();
    });

    it('should create link and log PENDING_REVIEW flag when Sentinel AI returns intermediate suspicion', async () => {
      (sentinelAiService.evaluateUrl as jest.Mock).mockResolvedValue({
        isSafe: false,
        riskScore: 0.55,
        action: 'FLAG_FOR_REVIEW',
        threatType: ThreatType.SPAM,
        aiConfidence: 0.85,
        signals: ['Excessive subdomain depth'],
      });

      (prismaService.link?.findFirst as jest.Mock).mockResolvedValue({ position: 2 });
      (prismaService.link?.create as jest.Mock).mockResolvedValue({
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
    });
  });

  describe('updateLink', () => {
    it('should update link when changed URL is safe', async () => {
      (prismaService.link?.findFirst as jest.Mock).mockResolvedValue({
        id: 'link-1',
        profileId: mockProfileId,
        url: 'https://old-url.com',
      });

      (sentinelAiService.evaluateUrl as jest.Mock).mockResolvedValue({
        isSafe: true,
        action: 'ALLOW',
        signals: [],
      });

      (prismaService.link?.update as jest.Mock).mockResolvedValue({
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
    });

    it('should block update when changed URL is malicious', async () => {
      (prismaService.link?.findFirst as jest.Mock).mockResolvedValue({
        id: 'link-1',
        profileId: mockProfileId,
        url: 'https://old-url.com',
      });

      (sentinelAiService.evaluateUrl as jest.Mock).mockResolvedValue({
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

      expect(prismaService.link?.update).not.toHaveBeenCalled();
    });
  });

  describe('reorderLinks', () => {
    it('should invoke prisma transaction for atomic position updates', async () => {
      const items = [
        { id: 'link-a', position: 0 },
        { id: 'link-b', position: 1 },
      ];

      await service.reorderLinks(mockProfileId, items);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.link?.updateMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteLink', () => {
    it('should delete existing link', async () => {
      (prismaService.link?.findFirst as jest.Mock).mockResolvedValue({ id: 'link-1' });
      (prismaService.link?.delete as jest.Mock).mockResolvedValue({ id: 'link-1' });

      const result = await service.deleteLink('link-1', mockProfileId);
      expect(result.success).toBe(true);
      expect(prismaService.link?.delete).toHaveBeenCalledWith({ where: { id: 'link-1' } });
    });

    it('should throw NotFoundException when link does not exist', async () => {
      (prismaService.link?.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteLink('non-existent', mockProfileId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
