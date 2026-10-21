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
import { CreateLinkSchema, UpdateLinkSchema, ReorderLinksSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { LinkService } from './link.service';
import { CreateLinkDto, UpdateLinkDto, ReorderLinksDto } from './dto/link.dto';

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
  @ApiResponse({ status: 400, description: 'URL rejected by Sentinel AI threat engine' })
  async createLink(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return await this.linkService.createLink(profileId, user.id, dto, clientIp, user.role);
  }

  @Get('profile/:profileId')
  @ApiOperation({ summary: 'Get all links for a profile sorted by position (Public Hot Path)' })
  async getLinks(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return await this.linkService.getLinksByProfile(profileId);
  }

  @Patch(':id/profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(UpdateLinkSchema))
  @ApiOperation({ summary: 'Update an existing link' })
  async updateLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return await this.linkService.updateLink(id, profileId, user.id, dto, clientIp, user.role);
  }

  @Delete(':id/profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a link' })
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
  @ApiOperation({ summary: 'Unlock a PIN or password-protected link' })
  @ApiResponse({ status: 200, description: 'PIN verified, returns destination URL' })
  @ApiResponse({ status: 400, description: 'Incorrect PIN or password' })
  async unlockLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { password?: string },
  ) {
    return await this.linkService.unlockLink(id, body.password || '');
  }
}

