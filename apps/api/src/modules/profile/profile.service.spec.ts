import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { ProfileAccessService } from '../../common/services/profile-access.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: {
    profile: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    customTheme: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    socialLink: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      updateMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    teamMember: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  const mockProfile = {
    id: '22222222-2222-2222-2222-222222222222',
    userId: '33333333-3333-3333-3333-333333333333',
    username: 'alexrivera',
    title: 'Alex Rivera',
    bio: 'Creator & Tech Lead',
    avatarUrl: 'https://cdn.onelink.bio/avatar.webp',
    isPublished: true,
    seoTitle: 'Alex Rivera Links',
    seoDesc: 'Explore all projects and socials',
    ogImageUrl: null,
    theme: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Minimal Dark',
      bgType: 'SOLID',
      bgValue: '#09090b',
    },
    customTheme: null,
    links: [
      {
        id: '44444444-4444-4444-4444-444444444444',
        title: 'YouTube',
        url: 'https://youtube.com/@alexrivera',
        type: 'LINK',
        position: 0,
        thumbnailUrl: null,
      },
    ],
    socialLinks: [
      {
        id: '55555555-5555-5555-5555-555555555555',
        platform: 'TWITTER',
        url: 'https://x.com/alexrivera',
        position: 0,
      },
    ],
    user: {
      name: 'Alex Rivera',
      isBanned: false,
    },
  };

  beforeEach(async () => {
    prisma = {
      profile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customTheme: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      socialLink: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      teamMember: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        ProfileAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicProfile (Cache-Aside)', () => {
    it('should return cached profile from Redis if present (fast path)', async () => {
      const cachedPayload = { username: 'alexrivera', title: 'Alex Rivera' };
      redis.get.mockResolvedValue(cachedPayload);

      const result = await service.getPublicProfile('alexrivera');

      expect(redis.get).toHaveBeenCalledWith('profile:alexrivera');
      expect(prisma.profile.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(cachedPayload);
    });

    it('should query PostgreSQL, cache in Redis, and return profile on cache miss', async () => {
      redis.get.mockResolvedValue(null);
      prisma.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getPublicProfile('alexrivera');

      expect(redis.get).toHaveBeenCalledWith('profile:alexrivera');
      expect(prisma.profile.findUnique).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'profile:alexrivera',
        expect.objectContaining({ username: 'alexrivera' }),
        3600,
      );
      expect(result.username).toBe('alexrivera');
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      redis.get.mockResolvedValue(null);
      prisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.getPublicProfile('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if creator user is banned', async () => {
      redis.get.mockResolvedValue(null);
      prisma.profile.findUnique.mockResolvedValue({
        ...mockProfile,
        user: { name: 'Banned User', isBanned: true },
      });

      await expect(service.getPublicProfile('alexrivera')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields and invalidate Redis cache', async () => {
      prisma.profile.findUnique.mockResolvedValue({
        id: mockProfile.id,
        userId: mockProfile.userId,
        username: mockProfile.username,
      });
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        bio: 'Updated Bio',
      });

      const result = await service.updateProfile(
        mockProfile.id,
        mockProfile.userId,
        { bio: 'Updated Bio' },
      );

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: mockProfile.id },
        data: expect.objectContaining({ bio: 'Updated Bio' }),
        include: { theme: true, customTheme: true },
      });
      expect(redis.del).toHaveBeenCalledWith('profile:alexrivera');
      expect(result.bio).toBe('Updated Bio');
    });

    it('should throw ForbiddenException if user is not profile owner', async () => {
      prisma.profile.findUnique.mockResolvedValue({
        id: mockProfile.id,
        userId: 'other-user-id',
        username: mockProfile.username,
      });

      await expect(
        service.updateProfile(mockProfile.id, mockProfile.userId, { bio: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('upsertCustomTheme', () => {
    it('should upsert custom theme and invalidate Redis cache', async () => {
      prisma.profile.findUnique.mockResolvedValue({
        id: mockProfile.id,
        userId: mockProfile.userId,
        username: mockProfile.username,
      });
      prisma.customTheme.upsert.mockResolvedValue({
        id: 'theme-uuid',
        profileId: mockProfile.id,
        bgValue: '#000000',
      });

      const customDto = {
        bgType: 'SOLID' as const,
        bgValue: '#000000',
        btnStyle: 'FILLED' as const,
        btnColor: '#ffffff',
        btnTextColor: '#000000',
        fontFamily: 'Inter',
        textColor: '#ffffff',
        btnRadius: 9999,
      };

      const result = await service.upsertCustomTheme(
        mockProfile.id,
        mockProfile.userId,
        customDto,
      );

      expect(prisma.customTheme.upsert).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith('profile:alexrivera');
      expect(result.bgValue).toBe('#000000');
    });
  });

  describe('createSocialLink', () => {
    it('should append social link with auto-incremented position and invalidate cache', async () => {
      prisma.profile.findUnique.mockResolvedValue({
        id: mockProfile.id,
        userId: mockProfile.userId,
        username: mockProfile.username,
      });
      prisma.socialLink.findFirst.mockResolvedValue({ position: 2 });
      prisma.socialLink.create.mockResolvedValue({
        id: 'new-social-id',
        profileId: mockProfile.id,
        platform: 'GITHUB',
        url: 'https://github.com/alexrivera',
        position: 3,
        isActive: true,
      });

      const result = await service.createSocialLink(
        mockProfile.id,
        mockProfile.userId,
        {
          platform: 'GITHUB',
          url: 'https://github.com/alexrivera',
        },
      );

      expect(prisma.socialLink.create).toHaveBeenCalledWith({
        data: {
          profileId: mockProfile.id,
          platform: 'GITHUB',
          url: 'https://github.com/alexrivera',
          position: 3,
          isActive: true,
        },
      });
      expect(redis.del).toHaveBeenCalledWith('profile:alexrivera');
      expect(result.position).toBe(3);
    });
  });
});
