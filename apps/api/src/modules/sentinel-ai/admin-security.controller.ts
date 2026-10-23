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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SecurityFlagStatus } from '@repo/prisma';
import {
  CreateBlocklistSchema,
  UpdateThreatStatusSchema,
  SuspendUserSchema,
  UpdateUserRoleSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
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

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role })
  role!: Role;
}

@ApiTags('Admin Security Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER)
@Controller('admin/security')
export class AdminSecurityController {
  constructor(private readonly sentinelAi: SentinelAiService) {}

  @Get('threats')
  @ApiOperation({ summary: 'List recent threats detected by Sentinel AI' })
  async listThreats(@Query('limit') limit = '50') {
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    return await this.sentinelAi.listThreats(take);
  }

  @Patch('threats/:id/status')
  @UsePipes(new ZodValidationPipe(UpdateThreatStatusSchema))
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
    return await this.sentinelAi.listBlocklist();
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
  @UsePipes(new ZodValidationPipe(SuspendUserSchema))
  @ApiOperation({ summary: 'Suspend or restore a creator user account' })
  async suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
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
    return await this.sentinelAi.listUsers(search);
  }

  @Patch('users/:id/role')
  @UsePipes(new ZodValidationPipe(UpdateUserRoleSchema))
  @ApiOperation({ summary: 'Update user platform role (CREATOR, SUPER_ADMIN, OWNER)' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return await this.sentinelAi.updateUserRole(id, dto.role, admin);
  }
}
