import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { ProfileAccessService } from '../../common/services/profile-access.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: {
    profile: {
      findUnique: jest.Mock;
    };
    link: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    pageView: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    clickEvent: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockProfileId = '22222222-2222-2222-2222-222222222222';
  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockLinkId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockProfileId,
          userId: mockUserId,
        }),
      },
      link: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: mockLinkId,
            title: 'My Video',
            url: 'https://youtube.com',
            clickCount: 42n,
            isActive: true,
          },
        ]),
        update: jest.fn(),
      },
      pageView: {
        create: jest.fn().mockResolvedValue({ id: 'pv-1' }),
        count: jest.fn().mockResolvedValue(100),
        findMany: jest.fn().mockResolvedValue([
          {
            timestamp: new Date(),
            referrer: 'https://instagram.com/p/123',
            device: 'mobile',
            os: 'iOS',
          },
        ]),
      },
      clickEvent: {
        create: jest.fn().mockResolvedValue({ id: 'ce-1' }),
        count: jest.fn().mockResolvedValue(25),
        findMany: jest.fn().mockResolvedValue([
          {
            timestamp: new Date(),
            linkId: mockLinkId,
          },
        ]),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        ProfileAccessService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('recordClick', () => {
    it('should create click event and increment link clickCount', async () => {
      await service.recordClick(
        { linkId: mockLinkId, profileId: mockProfileId, referrer: 'https://instagram.com' },
        '192.168.1.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('recordPageView', () => {
    it('should create an anonymized page view entry', async () => {
      await service.recordPageView(
        { profileId: mockProfileId, referrer: 'https://google.com' },
        '203.0.113.195',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      );

      expect(prismaService.pageView.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profileId: mockProfileId,
            referrer: 'https://google.com',
            device: 'desktop',
            os: 'Windows',
          }),
        }),
      );
    });
  });

  describe('verifyOwnership', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      prismaService.profile.findUnique.mockResolvedValue(null);

      await expect(service.verifyOwnership(mockProfileId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not profile owner and not admin', async () => {
      prismaService.profile.findUnique.mockResolvedValue({
        id: mockProfileId,
        userId: 'other-user',
      });

      await expect(service.verifyOwnership(mockProfileId, mockUserId, 'CREATOR')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should pass if user is admin even if not owner', async () => {
      prismaService.profile.findUnique.mockResolvedValue({
        id: mockProfileId,
        userId: 'other-user',
      });

      const res = await service.verifyOwnership(mockProfileId, mockUserId, 'SUPER_ADMIN');
      expect(res).toBeDefined();
    });
  });

  describe('getProfileAnalytics', () => {
    it('should return calculated metrics, timeSeries, and breakdowns', async () => {
      const result = await service.getProfileAnalytics(mockProfileId, 7);

      expect(result).toBeDefined();
      expect(result.period.days).toBe(7);
      expect(result.metrics.totalViews).toBe(100);
      expect(result.metrics.totalClicks).toBe(25);
      expect(result.metrics.ctr).toBe(25);
      expect(result.timeSeries).toHaveLength(7);
      expect(result.topLinks).toHaveLength(1);
      expect(result.topLinks[0].title).toBe('My Video');
      expect(result.trafficSources[0].name).toBe('Instagram');
    });
  });
});
