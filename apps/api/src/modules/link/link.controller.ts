import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Req,
  ParseUUIDPipe,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateLinkSchema, UpdateLinkSchema, ReorderLinksSchema, UnlockLinkSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { LinkService } from './link.service';
import { CreateLinkDto, UpdateLinkDto, ReorderLinksDto } from './dto/link.dto';

export class UnlockLinkDto {
  password!: string;
}

@ApiTags('Links Management')
@Controller('links')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post('profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(CreateLinkSchema))
  @ApiOperation({ summary: 'Create a new link or section header' })
  @ApiResponse({ status: 201, description: 'Link created successfully' })
  async createLink(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket?.remoteAddress;
    return await this.linkService.createLink(profileId, user.id, dto, clientIp, user.role);
  }

  @Get('profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all links for a profile ordered by position' })
  @ApiResponse({ status: 200, description: 'Links returned successfully' })
  async getLinks(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.linkService.getLinksByProfile(profileId, user.id, user.role);
  }

  @Patch(':id/profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(UpdateLinkSchema))
  @ApiOperation({ summary: 'Update link attributes, URL, active state, or security settings' })
  @ApiResponse({ status: 200, description: 'Link updated successfully' })
  async updateLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket?.remoteAddress;
    return await this.linkService.updateLink(id, profileId, user.id, dto, clientIp, user.role);
  }

  @Delete(':id/profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a link' })
  @ApiResponse({ status: 200, description: 'Link deleted successfully' })
  async deleteLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.linkService.deleteLink(id, profileId, user.id, user.role);
  }

  @Put('profile/:profileId/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(ReorderLinksSchema))
  @ApiOperation({ summary: 'Atomically reorder links within a profile' })
  async reorderLinks(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: ReorderLinksDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.linkService.reorderLinks(profileId, dto.items, user.id, user.role);
  }

  @Post(':id/unlock')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @UsePipes(new ZodValidationPipe(UnlockLinkSchema))
  @ApiOperation({ summary: 'Unlock a PIN or password-protected link' })
  @ApiResponse({ status: 200, description: 'PIN verified, returns destination URL' })
  @ApiResponse({ status: 400, description: 'Incorrect PIN or password' })
  async unlockLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UnlockLinkDto,
  ) {
    return await this.linkService.unlockLink(id, body.password);
  }
}
