import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SecurityFlagStatus } from '@repo/prisma';
import { CreateBlocklistSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SentinelAiService } from './sentinel-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

export class UpdateThreatStatusDto {
  @ApiProperty({ enum: SecurityFlagStatus })
  status!: SecurityFlagStatus;

  @ApiPropertyOptional({ example: 'Verified malicious drainer' })
  notes?: string;
}

export class SuspendUserDto {
  @ApiProperty({ example: true })
  isBanned!: boolean;

  @ApiProperty({ example: 'Phishing campaign detected' })
  reason!: string;
}

export class AddBlocklistDto {
  domainPattern!: string;
  reason!: string;
}

@ApiTags('Admin Security Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER)
@Controller('admin/security')
export class AdminSecurityController {
  constructor(
    private readonly sentinelAi: SentinelAiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('threats')
  @ApiOperation({ summary: 'List recent threats detected by Sentinel AI' })
  async listThreats(@Query('limit') limit = '50') {
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    return await this.prisma.securityFlag.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isBanned: true,
            profile: {
              select: {
                username: true,
                title: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  @Patch('threats/:id/status')
  @ApiOperation({ summary: 'Update threat status (Resolve, Ban, Auto-Block)' })
  async updateThreatStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateThreatStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return await this.sentinelAi.updateThreatStatus(id, dto.status, dto.notes, admin.id);
  }

  @Get('blocklist')
  @ApiOperation({ summary: 'List active domain blocklists' })
  async listBlocklist() {
    return await this.prisma.domainBlocklist.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  @Post('blocklist')
  @UsePipes(new ZodValidationPipe(CreateBlocklistSchema))
  @ApiOperation({ summary: 'Add domain to global blocklist' })
  async addBlocklist(
    @Body() dto: AddBlocklistDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return await this.sentinelAi.addDomainToBlocklist(dto.domainPattern, dto.reason, admin.id);
  }

  @Delete('blocklist/:id')
  @ApiOperation({ summary: 'Remove domain from global blocklist' })
  async removeBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return await this.sentinelAi.removeDomainFromBlocklist(id, admin.id);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend or restore a creator user account' })
  async suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (targetUser.role === Role.OWNER) {
      throw new BadRequestException('Platform OWNER accounts cannot be suspended');
    }
    if (targetUser.role === Role.SUPER_ADMIN && admin.role !== Role.OWNER) {
      throw new ForbiddenException('Only platform owners can suspend a SUPER_ADMIN account');
    }
    return await this.sentinelAi.suspendUser(id, dto.isBanned, dto.reason, admin.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs for moderation actions' })
  async getAuditLogs(@Query('limit') limit = '30') {
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    return await this.sentinelAi.getAuditLogs(take);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users with profile, threat count and ban status' })
  async listUsers(@Query('search') search?: string) {
    const where: any = {};
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { profile: { username: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            username: true,
            title: true,
            avatarUrl: true,
            isPublished: true,
            _count: {
              select: { links: true },
            },
          },
        },
        _count: {
          select: {
            securityFlags: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
      username: u.profile?.username || null,
      title: u.profile?.title || null,
      avatarUrl: u.profile?.avatarUrl || null,
      isPublished: u.profile?.isPublished ?? false,
      linksCount: u.profile?._count?.links ?? 0,
      threatCount: u._count?.securityFlags ?? 0,
    }));
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user platform role (CREATOR, SUPER_ADMIN, OWNER)' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: Role,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Only OWNER can modify an OWNER account
    if (targetUser.role === Role.OWNER && admin.role !== Role.OWNER) {
      throw new ForbiddenException('Only platform owners can modify an OWNER account');
    }
    // Only OWNER can promote a user to OWNER
    if (role === Role.OWNER && admin.role !== Role.OWNER) {
      throw new ForbiddenException('Only platform owners can promote a user to OWNER');
    }
    // Only OWNER can change the role of a SUPER_ADMIN
    if (targetUser.role === Role.SUPER_ADMIN && admin.role !== Role.OWNER) {
      throw new ForbiddenException('Only platform owners can change a SUPER_ADMIN account role');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: 'USER_ROLE_UPDATE',
        targetType: 'USER',
        targetId: id,
        reason: `Role changed to ${role} by ${admin.email} (${admin.role})`,
        metadata: { newRole: role, email: updated.email },
      },
    });

    return updated;
  }
}
