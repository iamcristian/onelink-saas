import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SecurityFlagStatus, LinkType } from '@repo/prisma';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SentinelAiService } from '../sentinel-ai/sentinel-ai.service';
import { ProfileAccessService, CollaboratorPermissionLevel } from '../../common/services/profile-access.service';
import { CreateLinkDto, UpdateLinkDto, ReorderItemDto } from './dto/link.dto';
import { isValidWebUrl } from '@repo/shared';

@Injectable()
export class LinkService {
  private readonly logger = new Logger(LinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sentinelAi: SentinelAiService,
    private readonly redis: RedisService,
    private readonly profileAccess: ProfileAccessService,
  ) {}

  /**
   * Invalidates cached public profile in Redis.
   */
  private async invalidateProfileCache(username?: string) {
    if (username) {
      await this.redis.del(`profile:${username.toLowerCase().trim()}`);
    }
  }

  /**
   * Verifies that the requesting user owns the targeted profile or is an authorized collaborator/admin.
   */
  async verifyProfileOwnership(
    profileId: string,
    userId: string,
    role?: string,
    requiredLevel: CollaboratorPermissionLevel = 'EDITOR',
  ) {
    return await this.profileAccess.verifyProfileAccess(profileId, userId, role, requiredLevel);
  }

  /**
   * Centralized outbound URL inspection through Sentinel AI engine.
   */
  private async validateOutboundUrl(
    url: string | null | undefined,
    userId: string,
    clientIp?: string,
  ): Promise<void> {
    if (!url || url === '#') {
      return;
    }

    if (!isValidWebUrl(url)) {
      throw new BadRequestException(
        'Invalid destination URL format. A valid domain or web link is required (e.g., https://example.com). Plain text is not allowed.',
      );
    }

    const normalizedUrl =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

    const evaluation = await this.sentinelAi.evaluateUrl(normalizedUrl);

    if (evaluation.action === 'BLOCK_IMMEDIATE') {
      await this.sentinelAi.recordSecurityFlag({
        userId,
        submittedUrl: url,
        riskScore: evaluation.riskScore,
        threatType: evaluation.threatType!,
        aiConfidence: evaluation.aiConfidence,
        ipAddress: clientIp,
        status: SecurityFlagStatus.BLOCKED_AUTO,
        resolutionNotes: `Auto-blocked by Sentinel AI: ${evaluation.signals.join('; ')}`,
      });

      throw new BadRequestException({
        statusCode: 400,
        error: 'Malicious Link Detected',
        message: 'The submitted URL was blocked by OneLink Sentinel AI.',
        threatType: evaluation.threatType,
        riskScore: evaluation.riskScore,
        signals: evaluation.signals,
      });
    }

    if (evaluation.action === 'FLAG_FOR_REVIEW') {
      await this.sentinelAi.recordSecurityFlag({
        userId,
        submittedUrl: url,
        riskScore: evaluation.riskScore,
        threatType: evaluation.threatType!,
        aiConfidence: evaluation.aiConfidence,
        ipAddress: clientIp,
        status: SecurityFlagStatus.PENDING_REVIEW,
        resolutionNotes: `Flagged for Super Admin review: ${evaluation.signals.join('; ')}`,
      });
    }
  }

  /**
   * Creates a new link or header item with real-time Sentinel AI inspection and hashed PIN protection.
   */
  async createLink(
    profileId: string,
    userId: string,
    dto: CreateLinkDto,
    clientIp?: string,
    role?: string,
  ) {
    const profile = await this.verifyProfileOwnership(profileId, userId, role, 'EDITOR');

    // 1. Sentinel AI URL safety validation
    const isOutbound = dto.type === LinkType.LINK || dto.type === LinkType.DONATION || !dto.type;
    if (isOutbound) {
      if (!dto.url || !dto.url.trim()) {
        throw new BadRequestException('A valid destination URL is required for links and donation blocks.');
      }
      await this.validateOutboundUrl(dto.url, userId, clientIp);
    }

    // 2. Enforce subscription benefit quotas & feature gates (using workspace owner's subscription)
    const ownerSubscription = await this.prisma.subscription.findFirst({
      where: { userId: profile.userId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const features = (ownerSubscription?.plan?.features as Record<string, any>) || {
      maxLinks: 5,
      scheduledLinks: false,
      passwordProtection: false,
      ageRestriction: false,
    };

    if ((dto.startsAt || dto.expiresAt) && !features.scheduledLinks) {
      throw new ForbiddenException(
        'Link scheduling is only available on Creator Pro and Enterprise Studio plans.',
      );
    }
    if (dto.isPasswordProtected && !features.passwordProtection) {
      throw new ForbiddenException(
        'PIN / Password protection is an Enterprise Studio plan feature.',
      );
    }
    if (dto.isAgeRestricted && !features.ageRestriction) {
      throw new ForbiddenException(
        'Age verification restriction is an Enterprise Studio plan feature.',
      );
    }

    const maxLinks = features.maxLinks ?? 5;
    if (dto.type === LinkType.LINK || !dto.type) {
      const currentCount = await this.prisma.link.count({
        where: { profileId, type: LinkType.LINK },
      });
      if (currentCount >= maxLinks) {
        throw new BadRequestException(
          `Plan limit reached (${currentCount}/${maxLinks} links). Upgrade to Creator Pro for unlimited links.`,
        );
      }
    }

    // 3. Compute next position index for the profile
    const lastItem = await this.prisma.link.findFirst({
      where: { profileId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    // 4. Secure password hashing for PIN-protected links
    let hashedPassword: string | null = null;
    if (dto.isPasswordProtected && dto.password && dto.password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(dto.password.trim(), 10);
    }

    // 5. Persist link to PostgreSQL
    const created = await this.prisma.link.create({
      data: {
        profileId,
        title: dto.title,
        url: dto.url,
        content: dto.content,
        type: dto.type || LinkType.LINK,
        thumbnailUrl: dto.thumbnailUrl,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        position,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isPasswordProtected: Boolean(dto.isPasswordProtected),
        password: hashedPassword,
        isAgeRestricted: Boolean(dto.isAgeRestricted),
        badge: dto.badge || null,
      },
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
    });

    await this.invalidateProfileCache(profile.username);
    return {
      ...created,
      clickCount: Number(created.clickCount),
    };
  }

  /**
   * Retrieves all links for a profile sorted by ascending position.
   * Requires authenticated viewer/collaborator access and strips password hashes.
   */
  async getLinksByProfile(profileId: string, userId: string, role?: string) {
    await this.verifyProfileOwnership(profileId, userId, role, 'VIEWER');

    const links = await this.prisma.link.findMany({
      where: { profileId },
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
    });

    return links.map((l) => ({ ...l, clickCount: Number(l.clickCount) }));
  }

  /**
   * Updates an existing link with Sentinel AI re-validation on URL changes.
   */
  async updateLink(
    linkId: string,
    profileId: string,
    userId: string,
    dto: UpdateLinkDto,
    clientIp?: string,
    role?: string,
  ) {
    const profile = await this.verifyProfileOwnership(profileId, userId, role, 'EDITOR');

    const existing = await this.prisma.link.findFirst({
      where: { id: linkId, profileId },
    });

    if (!existing) {
      throw new NotFoundException(`Link with ID ${linkId} not found in profile ${profileId}`);
    }

    // Feature gates check on update
    const ownerSubscription = await this.prisma.subscription.findFirst({
      where: { userId: profile.userId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const features = (ownerSubscription?.plan?.features as Record<string, any>) || {
      maxLinks: 5,
      scheduledLinks: false,
      passwordProtection: false,
      ageRestriction: false,
    };

    if (
      (dto.startsAt !== undefined || dto.expiresAt !== undefined) &&
      (dto.startsAt || dto.expiresAt) &&
      !features.scheduledLinks
    ) {
      throw new ForbiddenException(
        'Link scheduling is only available on Creator Pro and Enterprise Studio plans.',
      );
    }
    if (dto.isPasswordProtected && !features.passwordProtection) {
      throw new ForbiddenException(
        'PIN / Password protection is an Enterprise Studio plan feature.',
      );
    }
    if (dto.isAgeRestricted && !features.ageRestriction) {
      throw new ForbiddenException(
        'Age verification restriction is an Enterprise Studio plan feature.',
      );
    }

    // If target URL is being changed, re-evaluate through Sentinel AI
    const isOutbound =
      dto.type === LinkType.LINK ||
      dto.type === LinkType.DONATION ||
      (!dto.type &&
        existing.type !== LinkType.HEADER &&
        existing.type !== LinkType.DIVIDER &&
        existing.type !== LinkType.NOTE);
    if (isOutbound && dto.url !== undefined) {
      if (!dto.url || !dto.url.trim()) {
        throw new BadRequestException('A valid destination URL is required for links and donation blocks.');
      }
      if (dto.url !== existing.url) {
        await this.validateOutboundUrl(dto.url, userId, clientIp);
      }
    }

    // Secure password hashing for updated PIN-protected links
    let hashedPassword: string | null | undefined = undefined;
    if (dto.password !== undefined) {
      hashedPassword =
        dto.password && dto.password.trim().length > 0
          ? await bcrypt.hash(dto.password.trim(), 10)
          : null;
    }

    const updated = await this.prisma.link.update({
      where: { id: linkId },
      data: {
        title: dto.title,
        url: dto.url,
        content: dto.content,
        type: dto.type,
        thumbnailUrl: dto.thumbnailUrl,
        isActive: dto.isActive,
        startsAt: dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : undefined,
        expiresAt: dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : undefined,
        isPasswordProtected: dto.isPasswordProtected,
        password: hashedPassword,
        isAgeRestricted: dto.isAgeRestricted,
        badge: dto.badge !== undefined ? dto.badge : undefined,
      },
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
    });

    await this.invalidateProfileCache(profile.username);
    return {
      ...updated,
      clickCount: Number(updated.clickCount),
    };
  }

  /**
   * Validates PIN/password for a protected link using cryptographic comparison and returns destination URL.
   */
  async unlockLink(linkId: string, passwordAttempt: string) {
    const link = await this.prisma.link.findUnique({
      where: { id: linkId },
      select: {
        id: true,
        url: true,
        isPasswordProtected: true,
        password: true,
        isActive: true,
      },
    });

    if (!link || !link.isActive) {
      throw new NotFoundException('Link not found or currently inactive');
    }

    if (!link.isPasswordProtected) {
      return { success: true, url: link.url };
    }

    if (link.password) {
      const isBcrypt = link.password.startsWith('$2a$') || link.password.startsWith('$2b$');
      const matches = isBcrypt
        ? await bcrypt.compare(passwordAttempt.trim(), link.password)
        : link.password.trim() === passwordAttempt.trim();

      if (matches) {
        return { success: true, url: link.url };
      }
    }

    throw new BadRequestException('Incorrect access PIN or password');
  }

  /**
   * Deletes a link and compacts remaining positions.
   */
  async deleteLink(linkId: string, profileId: string, userId: string, role?: string) {
    const profile = await this.verifyProfileOwnership(profileId, userId, role, 'EDITOR');

    const existing = await this.prisma.link.findFirst({
      where: { id: linkId, profileId },
    });

    if (!existing) {
      throw new NotFoundException(`Link with ID ${linkId} not found`);
    }

    await this.prisma.link.delete({
      where: { id: linkId },
    });

    // Compact remaining positions
    const remaining = await this.prisma.link.findMany({
      where: { profileId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    if (remaining.length > 0) {
      await this.prisma.$transaction(
        remaining.map((link, idx) =>
          this.prisma.link.update({
            where: { id: link.id },
            data: { position: idx },
          }),
        ),
      );
    }

    await this.invalidateProfileCache(profile.username);
    return { success: true, deletedId: linkId };
  }

  /**
   * Executes atomic reordering of links in an interactive transaction.
   */
  async reorderLinks(
    profileId: string,
    items: ReorderItemDto[],
    userId: string,
    role?: string,
  ) {
    const profile = await this.verifyProfileOwnership(profileId, userId, role, 'EDITOR');

    const results = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.link.updateMany({
          where: { id: item.id, profileId },
          data: { position: item.position },
        }),
      ),
    );

    await this.invalidateProfileCache(profile.username);
    return results;
  }
}
