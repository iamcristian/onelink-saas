import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SecurityFlagStatus, LinkType } from '@repo/prisma';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SentinelAiService } from '../sentinel-ai/sentinel-ai.service';
import { CreateLinkDto, UpdateLinkDto, ReorderItemDto } from './dto/link.dto';

@Injectable()
export class LinkService {
  private readonly logger = new Logger(LinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sentinelAi: SentinelAiService,
  ) {}

  /**
   * Creates a new link or header item with real-time Sentinel AI inspection
   */
  async createLink(
    profileId: string,
    userId: string,
    dto: CreateLinkDto,
    clientIp?: string,
  ) {
    // 1. If this is an outbound link with a URL, run in-process Sentinel AI evaluation
    if ((dto.type === LinkType.LINK || !dto.type) && dto.url) {
      const evaluation = await this.sentinelAi.evaluateUrl(dto.url);

      if (evaluation.action === 'BLOCK_IMMEDIATE') {
        // Log automated security violation flag
        await this.sentinelAi.recordSecurityFlag({
          userId,
          submittedUrl: dto.url,
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
          submittedUrl: dto.url,
          riskScore: evaluation.riskScore,
          threatType: evaluation.threatType!,
          aiConfidence: evaluation.aiConfidence,
          ipAddress: clientIp,
          status: SecurityFlagStatus.PENDING_REVIEW,
          resolutionNotes: `Flagged for Super Admin review: ${evaluation.signals.join('; ')}`,
        });
      }
    }

    // 2. Compute next position index for the profile
    const lastItem = await this.prisma.link.findFirst({
      where: { profileId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    // 3. Persist link to PostgreSQL
    return await this.prisma.link.create({
      data: {
        profileId,
        title: dto.title,
        url: dto.url,
        type: dto.type || LinkType.LINK,
        thumbnailUrl: dto.thumbnailUrl,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        position,
      },
    });
  }

  /**
   * Retrieves all links for a profile sorted by ascending position
   */
  async getLinksByProfile(profileId: string) {
    return await this.prisma.link.findMany({
      where: { profileId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Updates an existing link with Sentinel AI re-validation on URL changes
   */
  async updateLink(
    linkId: string,
    profileId: string,
    userId: string,
    dto: UpdateLinkDto,
    clientIp?: string,
  ) {
    const existing = await this.prisma.link.findFirst({
      where: { id: linkId, profileId },
    });

    if (!existing) {
      throw new NotFoundException(`Link with ID ${linkId} not found in profile ${profileId}`);
    }

    // If target URL is being changed, re-evaluate through Sentinel AI
    if (dto.url && dto.url !== existing.url) {
      const evaluation = await this.sentinelAi.evaluateUrl(dto.url);

      if (evaluation.action === 'BLOCK_IMMEDIATE') {
        await this.sentinelAi.recordSecurityFlag({
          userId,
          submittedUrl: dto.url,
          riskScore: evaluation.riskScore,
          threatType: evaluation.threatType!,
          aiConfidence: evaluation.aiConfidence,
          ipAddress: clientIp,
          status: SecurityFlagStatus.BLOCKED_AUTO,
          resolutionNotes: `Auto-blocked update by Sentinel AI: ${evaluation.signals.join('; ')}`,
        });

        throw new BadRequestException({
          statusCode: 400,
          error: 'Malicious Link Detected',
          message: 'The updated URL was blocked by OneLink Sentinel AI.',
          threatType: evaluation.threatType,
          riskScore: evaluation.riskScore,
          signals: evaluation.signals,
        });
      }
    }

    return await this.prisma.link.update({
      where: { id: linkId },
      data: {
        title: dto.title,
        url: dto.url,
        type: dto.type,
        thumbnailUrl: dto.thumbnailUrl,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Deletes a link and compacts remaining positions
   */
  async deleteLink(linkId: string, profileId: string) {
    const existing = await this.prisma.link.findFirst({
      where: { id: linkId, profileId },
    });

    if (!existing) {
      throw new NotFoundException(`Link with ID ${linkId} not found`);
    }

    await this.prisma.link.delete({
      where: { id: linkId },
    });

    return { success: true, deletedId: linkId };
  }

  /**
   * Executes atomic reordering of links in an interactive transaction
   */
  async reorderLinks(profileId: string, items: ReorderItemDto[]) {
    return await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.link.updateMany({
          where: { id: item.id, profileId },
          data: { position: item.position },
        }),
      ),
    );
  }
}
