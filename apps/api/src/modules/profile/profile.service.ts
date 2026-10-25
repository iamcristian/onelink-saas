import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { ProfileAccessService, CollaboratorPermissionLevel } from '../../common/services/profile-access.service';
import { SentinelAiService } from '../sentinel-ai/sentinel-ai.service';
import {
  UpdateProfileDto,
  UpdateCustomThemeDto,
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
  ReorderSocialItemDto,
} from './dto/profile.dto';
import { RESERVED_USERNAMES, isValidWebUrl, CANONICAL_THEME_PRESETS } from '@repo/shared';
import { SecurityFlagStatus } from '@repo/prisma';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly profileAccess: ProfileAccessService,
    private readonly sentinelAi: SentinelAiService,
  ) {}

  /**
   * Helper to verify profile ownership or collaborator/admin authority
   */
  async verifyOwnership(
    profileId: string,
    userId: string,
    role?: string,
    level: CollaboratorPermissionLevel = 'EDITOR',
  ) {
    return await this.profileAccess.verifyProfileAccess(profileId, userId, role, level);
  }

  /**
   * Invalidate profile cache in Redis
   */
  async invalidateProfileCache(username: string): Promise<void> {
    const cacheKey = `profile:${username.toLowerCase().trim()}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Filters out links whose scheduled active time-window has not yet started or has passed.
   */
  private filterActiveWindowLinks<T extends { startsAt?: Date | string | null; expiresAt?: Date | string | null }>(
    links: T[],
  ): T[] {
    const now = Date.now();
    return (links || []).filter((l) => {
      if (l.startsAt && new Date(l.startsAt).getTime() > now) return false;
      if (l.expiresAt && new Date(l.expiresAt).getTime() < now) return false;
      return true;
    });
  }

  /**
   * Public Hot Path: Resolves profile by vanity username.
   * Utilizes Redis Cache-Aside for sub-15ms response times.
   * Redacts secret destination URLs for PIN-protected links to prevent client disclosure.
   */
  async getPublicProfile(username: string): Promise<any> {
    const cleanUsername = username.toLowerCase().trim();
    const cacheKey = `profile:${cleanUsername}`;

    // 1. Check Redis cache
    const cached = await this.redis.get<Record<string, any>>(cacheKey);
    if (cached) {
      return {
        ...cached,
        links: this.filterActiveWindowLinks(cached.links || []),
      };
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
          },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            url: true,
            content: true,
            type: true,
            position: true,
            thumbnailUrl: true,
            badge: true,
            startsAt: true,
            expiresAt: true,
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

    // Redact URLs of password-protected links
    const sanitizedLinks = profile.links.map((link) => ({
      ...link,
      url: link.isPasswordProtected ? null : link.url,
    }));

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
      links: sanitizedLinks,
      socialLinks: profile.socialLinks,
      removeBranding,
      planCode,
    };

    // 3. Cache in Redis (TTL: 3600 seconds)
    await this.redis.set(cacheKey, payload, 3600);

    return {
      ...payload,
      links: this.filterActiveWindowLinks(sanitizedLinks),
    };
  }

  /**
   * Fetches profile by user ID for the authenticated user session.
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
      throw new NotFoundException('Profile not found for this user');
    }

    return profile;
  }

  /**
   * Fetches full profile entity with custom themes and links for studio dashboard.
   */
  async getProfileById(profileId: string, userId: string, role?: string) {
    await this.verifyOwnership(profileId, userId, role, 'VIEWER');

    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        theme: true,
        customTheme: true,
        socialLinks: {
          orderBy: { position: 'asc' },
        },
        links: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            profileId: true,
            title: true,
            url: true,
            content: true,
            type: true,
            position: true,
            thumbnailUrl: true,
            isActive: true,
            clickCount: true,
            startsAt: true,
            expiresAt: true,
            isPasswordProtected: true,
            isAgeRestricted: true,
            badge: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile not found`);
    }

    return profile;
  }

  /**
   * Checks if a vanity username handle is valid and available.
   */
  async checkUsernameAvailability(rawUsername: string) {
    const username = (rawUsername || '').replace(/^@/, '').toLowerCase().trim();

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
    if (RESERVED_USERNAMES.includes(username as any)) {
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
    const existing = await this.verifyOwnership(profileId, userId, role, 'EDITOR');

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
    const existing = await this.verifyOwnership(profileId, userId, role, 'EDITOR');

    // Check if user is a platform founder or has administrative privileges
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });
    const isFounder =
      user?.email &&
      ['cris@onelink.bio', 'crisarando10@gmail.com', 'crisarandosyse@gmail.com'].includes(
        user.email.toLowerCase(),
      );
    const isPrivileged = role === 'OWNER' || role === 'ADMIN' || user?.role === 'OWNER' || isFounder;

    // Check if the theme matches any of the canonical platform presets (free for all users)
    const matchingPreset = CANONICAL_THEME_PRESETS.find(
      (p) =>
        p.bgValue.trim().toLowerCase() === dto.bgValue.trim().toLowerCase() ||
        (p.bgType === dto.bgType && p.btnColor.toLowerCase() === dto.btnColor.toLowerCase()),
    );
    const isStandardPreset = Boolean(matchingPreset);

    if (!isPrivileged && !isStandardPreset) {
      const sub = await this.prisma.subscription.findFirst({
        where: { userId: existing.userId, status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
      const features = (sub?.plan?.features as Record<string, any>) || {};
      if (!features.customThemes && sub?.plan?.code === 'FREE') {
        throw new ForbiddenException(
          'Custom theme engine is only available on Creator Pro and Enterprise Studio plans.',
        );
      }
    }

    if (matchingPreset && this.prisma.theme) {
      const dbTheme = await this.prisma.theme.findFirst({
        where: { name: matchingPreset.name },
      });
      if (dbTheme) {
        await this.prisma.profile.update({
          where: { id: profileId },
          data: { themeId: dbTheme.id },
        });
      }
    }

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
    const existing = await this.verifyOwnership(profileId, userId, role, 'EDITOR');

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
   * Normalizes and inspects social URLs against Sentinel AI
   */
  private async validateAndNormalizeSocialUrl(
    platform: string,
    rawUrl: string,
    userId: string,
    clientIp?: string,
  ): Promise<string> {
    let clean = rawUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      const handle = clean.replace(/^@/, '');
      switch (platform.toUpperCase()) {
        case 'INSTAGRAM':
          clean = `https://instagram.com/${handle}`;
          break;
        case 'TIKTOK':
          clean = `https://tiktok.com/@${handle}`;
          break;
        case 'TWITTER':
          clean = `https://x.com/${handle}`;
          break;
        case 'YOUTUBE':
          clean = `https://youtube.com/@${handle}`;
          break;
        case 'GITHUB':
          clean = `https://github.com/${handle}`;
          break;
        case 'LINKEDIN':
          clean = `https://linkedin.com/in/${handle}`;
          break;
        case 'TWITCH':
          clean = `https://twitch.tv/${handle}`;
          break;
        case 'EMAIL':
          clean = clean.startsWith('mailto:') ? clean : `mailto:${clean}`;
          return clean;
        default:
          clean = `https://${clean}`;
      }
    }

    if (!isValidWebUrl(clean)) {
      throw new BadRequestException('Invalid social destination URL');
    }

    // Inspect with Sentinel AI
    const evaluation = await this.sentinelAi.evaluateUrl(clean);
    if (evaluation.action === 'BLOCK_IMMEDIATE') {
      await this.sentinelAi.recordSecurityFlag({
        userId,
        submittedUrl: clean,
        riskScore: evaluation.riskScore,
        threatType: evaluation.threatType!,
        aiConfidence: evaluation.aiConfidence,
        ipAddress: clientIp,
        status: SecurityFlagStatus.BLOCKED_AUTO,
        resolutionNotes: `Auto-blocked social link by Sentinel AI: ${evaluation.signals.join('; ')}`,
      });
      throw new BadRequestException('Social link was flagged and blocked by Sentinel AI threat inspection.');
    }

    return clean;
  }

  /**
   * Creates a new social link icon with URL validation and Sentinel AI inspection
   */
  async createSocialLink(
    profileId: string,
    userId: string,
    dto: CreateSocialLinkDto,
    role?: string,
    clientIp?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role, 'EDITOR');
    const normalizedUrl = await this.validateAndNormalizeSocialUrl(
      dto.platform,
      dto.url,
      userId,
      clientIp,
    );

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
        url: normalizedUrl,
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
    clientIp?: string,
  ) {
    const existing = await this.verifyOwnership(profileId, userId, role, 'EDITOR');

    const link = await this.prisma.socialLink.findFirst({
      where: { id: linkId, profileId },
    });
    if (!link) {
      throw new NotFoundException(`Social link with ID ${linkId} not found`);
    }

    let normalizedUrl = link.url;
    if (dto.url !== undefined) {
      normalizedUrl = await this.validateAndNormalizeSocialUrl(
        dto.platform || link.platform,
        dto.url,
        userId,
        clientIp,
      );
    }

    const updated = await this.prisma.socialLink.update({
      where: { id: linkId },
      data: {
        platform: dto.platform,
        url: normalizedUrl,
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
    const existing = await this.verifyOwnership(profileId, userId, role, 'EDITOR');

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
    const existing = await this.verifyOwnership(profileId, userId, role, 'EDITOR');

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
