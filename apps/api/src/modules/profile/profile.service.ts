import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { ProfileAccessService } from '../../common/services/profile-access.service';
import {
  UpdateProfileDto,
  UpdateCustomThemeDto,
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
  ReorderSocialItemDto,
} from './dto/profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly profileAccess: ProfileAccessService,
  ) {}

  /**
   * Helper to verify profile ownership or collaborator/admin authority
   */
  async verifyOwnership(profileId: string, userId: string, role?: string) {
    return await this.profileAccess.verifyProfileAccess(profileId, userId, role);
  }

  /**
   * Invalidate profile cache in Redis
   */
  async invalidateProfileCache(username: string): Promise<void> {
    const cacheKey = `profile:${username.toLowerCase().trim()}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Public Hot Path: Resolves profile by vanity username.
   * Utilizes Redis Cache-Aside for sub-15ms response times.
   */
  async getPublicProfile(username: string) {
    const cleanUsername = username.toLowerCase().trim();
    const cacheKey = `profile:${cleanUsername}`;

    // 1. Check Redis cache
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Query PostgreSQL with active links & theme
    const profile = await this.prisma.profile.findUnique({
      where: { username: cleanUsername },
      include: {
        theme: true,
        customTheme: true,
        links: {
          where: {
            isActive: true,
            AND: [
              {
                OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
              },
              {
                OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
              },
            ],
          },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            url: true,
            type: true,
            position: true,
            thumbnailUrl: true,
            badge: true,
            isPasswordProtected: true,
            isAgeRestricted: true,
          },
        },
        socialLinks: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            platform: true,
            url: true,
            position: true,
          },
        },
        user: {
          select: {
            name: true,
            isBanned: true,
            subscriptions: {
              where: { status: 'ACTIVE' },
              include: { plan: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!profile || profile.user.isBanned) {
      throw new NotFoundException(`Profile @${cleanUsername} not found`);
    }

    if (!profile.isPublished) {
      throw new NotFoundException(`PROFILE_UNPUBLISHED:@${cleanUsername}`);
    }

    const activeSub = profile.user.subscriptions?.[0];
    const planCode = activeSub?.plan?.code || 'FREE';
    const removeBranding =
      planCode === 'PRO' ||
      planCode === 'ENTERPRISE' ||
      Boolean((activeSub?.plan?.features as any)?.removeBranding);

    const payload = {
      id: profile.id,
      username: profile.username,
      title: profile.title,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      seoTitle: profile.seoTitle,
      seoDesc: profile.seoDesc,
      ogImageUrl: profile.ogImageUrl,
      theme: profile.theme,
      customTheme: profile.customTheme,
      links: profile.links,
      socialLinks: profile.socialLinks,
      removeBranding,
      planCode,
    };

    // 3. Cache in Redis (TTL: 3600 seconds)
    await this.redis.set(cacheKey, payload, 3600);

    return payload;
  }

  /**
   * Authenticated Creator: Get the profile owned by current user (includes draft/inactive links)
   */
  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        theme: true,
        customTheme: true,
        links: {
          orderBy: { position: 'asc' },
        },
        socialLinks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Creator profile not found for this user');
    }

    return profile;
  }

  /**
   * Checks if a vanity username handle is valid and available.
   */
  async checkUsernameAvailability(rawUsername: string) {
    const username = (rawUsername || '').replace(/^@/, '').toLowerCase().trim();
    const RESERVED_USERNAMES = new Set([
      'admin',
      'api',
      'studio',
      'auth',
      'login',
      'register',
      'signup',
      'billing',
      'analytics',
      'appearance',
      'settings',
      'help',
      'support',
      'terms',
      'privacy',
      'about',
      'pricing',
      'onelink',
      'user',
    ]);

    if (!username || username.length < 3) {
      return { available: false, username, reason: 'Username must be at least 3 characters' };
    }
    if (username.length > 30) {
      return { available: false, username, reason: 'Username cannot exceed 30 characters' };
    }
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return {
        available: false,
        username,
        reason: 'Username can only contain lowercase letters, numbers, hyphens, and underscores',
      };
    }
    if (RESERVED_USERNAMES.has(username)) {
      return { available: false, username, reason: 'This username is reserved by the platform' };
    }

    const existing = await this.prisma.profile.findUnique({
      where: { username },
      select: { id: true },
    });

    return {
      available: !existing,
      username,
      reason: existing ? 'Username is already taken' : 'Username is available',
    };
  }

  /**
   * Update profile metadata (username, avatarUrl, bio, title, themeId, isPublished, SEO)
   */
  async updateProfile(
    profileId: string,
    userId: string,
    dto: UpdateProfileDto,
    role?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role);

    let newUsername = existing.username;
    if (dto.username) {
      const clean = dto.username.replace(/^@/, '').toLowerCase().trim();
      if (clean !== existing.username) {
        const check = await this.checkUsernameAvailability(clean);
        if (!check.available) {
          throw new ConflictException(check.reason);
        }
        newUsername = clean;
      }
    }

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        username: newUsername,
        title: dto.title !== undefined ? dto.title : undefined,
        bio: dto.bio !== undefined ? dto.bio : undefined,
        avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : undefined,
        themeId: dto.themeId !== undefined ? dto.themeId : undefined,
        isPublished: dto.isPublished !== undefined ? dto.isPublished : undefined,
        seoTitle: dto.seoTitle !== undefined ? dto.seoTitle : undefined,
        seoDesc: dto.seoDesc !== undefined ? dto.seoDesc : undefined,
      },
      include: {
        theme: true,
        customTheme: true,
      },
    });

    await this.invalidateProfileCache(existing.username);
    if (newUsername !== existing.username) {
      await this.invalidateProfileCache(newUsername);
    }
    return updated;
  }

  /**
   * Upserts custom theme CSS variables for the profile
   */
  async upsertCustomTheme(
    profileId: string,
    userId: string,
    dto: UpdateCustomThemeDto,
    role?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role);

    const customTheme = await this.prisma.customTheme.upsert({
      where: { profileId },
      create: {
        profileId,
        bgType: dto.bgType,
        bgValue: dto.bgValue,
        btnStyle: dto.btnStyle,
        btnColor: dto.btnColor,
        btnTextColor: dto.btnTextColor,
        fontFamily: dto.fontFamily,
        textColor: dto.textColor,
        btnRadius: dto.btnRadius,
      },
      update: {
        bgType: dto.bgType,
        bgValue: dto.bgValue,
        btnStyle: dto.btnStyle,
        btnColor: dto.btnColor,
        btnTextColor: dto.btnTextColor,
        fontFamily: dto.fontFamily,
        textColor: dto.textColor,
        btnRadius: dto.btnRadius,
      },
    });

    await this.invalidateProfileCache(existing.username);
    return customTheme;
  }

  /**
   * Deletes custom theme for the profile, reverting to preset theme
   */
  async deleteCustomTheme(profileId: string, userId: string, role?: string) {
    const existing = await this.verifyOwnership(profileId, userId, role);

    await this.prisma.customTheme.deleteMany({
      where: { profileId },
    });

    await this.invalidateProfileCache(existing.username);
    return { success: true, message: 'Custom theme removed' };
  }

  // ==========================================================================
  // Social Links Sub-resource Management
  // ==========================================================================

  /**
   * Retrieves all social links for a profile
   */
  async getSocialLinks(profileId: string) {
    return await this.prisma.socialLink.findMany({
      where: { profileId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Adds a new social link with automatic position indexing
   */
  async createSocialLink(
    profileId: string,
    userId: string,
    dto: CreateSocialLinkDto,
    role?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role);

    const lastItem = await this.prisma.socialLink.findFirst({
      where: { profileId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    const created = await this.prisma.socialLink.create({
      data: {
        profileId,
        platform: dto.platform,
        url: dto.url,
        position,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    await this.invalidateProfileCache(existing.username);
    return created;
  }

  /**
   * Updates an existing social link
   */
  async updateSocialLink(
    linkId: string,
    profileId: string,
    userId: string,
    dto: UpdateSocialLinkDto,
    role?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role);

    const link = await this.prisma.socialLink.findFirst({
      where: { id: linkId, profileId },
    });
    if (!link) {
      throw new NotFoundException(`Social link with ID ${linkId} not found`);
    }

    const updated = await this.prisma.socialLink.update({
      where: { id: linkId },
      data: {
        platform: dto.platform,
        url: dto.url,
        isActive: dto.isActive,
      },
    });

    await this.invalidateProfileCache(existing.username);
    return updated;
  }

  /**
   * Deletes a social link and re-indexes remaining positions
   */
  async deleteSocialLink(
    linkId: string,
    profileId: string,
    userId: string,
    role?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role);

    const link = await this.prisma.socialLink.findFirst({
      where: { id: linkId, profileId },
    });
    if (!link) {
      throw new NotFoundException(`Social link with ID ${linkId} not found`);
    }

    await this.prisma.socialLink.delete({
      where: { id: linkId },
    });

    const remaining = await this.prisma.socialLink.findMany({
      where: { profileId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    if (remaining.length > 0) {
      await this.prisma.$transaction(
        remaining.map((item, idx) =>
          this.prisma.socialLink.update({
            where: { id: item.id },
            data: { position: idx },
          }),
        ),
      );
    }

    await this.invalidateProfileCache(existing.username);
    return { success: true, deletedId: linkId };
  }

  /**
   * Atomically reorders social links
   */
  async reorderSocialLinks(
    profileId: string,
    items: ReorderSocialItemDto[],
    userId: string,
    role?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role);

    const results = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.socialLink.updateMany({
          where: { id: item.id, profileId },
          data: { position: item.position },
        }),
      ),
    );

    await this.invalidateProfileCache(existing.username);
    return results;
  }
}
