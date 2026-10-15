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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateLinkSchema, UpdateLinkSchema, ReorderLinksSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LinkService } from './link.service';
import { CreateLinkDto, UpdateLinkDto, ReorderLinksDto } from './dto/link.dto';

@ApiTags('Links Management')
@Controller('links')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post('profile/:profileId')
  @UsePipes(new ZodValidationPipe(CreateLinkSchema))
  @ApiOperation({ summary: 'Create a new link or section header' })
  @ApiResponse({ status: 201, description: 'Link created successfully' })
  @ApiResponse({ status: 400, description: 'URL rejected by Sentinel AI threat engine' })
  async createLink(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreateLinkDto,
    @Req() req: Request,
  ) {
    // In production, userId will be injected by JWT AuthGuard; for now, extract or fallback
    const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
    const clientIp = req.ip || req.socket.remoteAddress;
    return await this.linkService.createLink(profileId, userId, dto, clientIp);
  }

  @Get('profile/:profileId')
  @ApiOperation({ summary: 'Get all links for a profile sorted by position' })
  async getLinks(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return await this.linkService.getLinksByProfile(profileId);
  }

  @Patch(':id/profile/:profileId')
  @UsePipes(new ZodValidationPipe(UpdateLinkSchema))
  @ApiOperation({ summary: 'Update an existing link' })
  async updateLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateLinkDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
    const clientIp = req.ip || req.socket.remoteAddress;
    return await this.linkService.updateLink(id, profileId, userId, dto, clientIp);
  }

  @Delete(':id/profile/:profileId')
  @ApiOperation({ summary: 'Delete a link' })
  async deleteLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return await this.linkService.deleteLink(id, profileId);
  }

  @Put('profile/:profileId/reorder')
  @UsePipes(new ZodValidationPipe(ReorderLinksSchema))
  @ApiOperation({ summary: 'Atomically reorder links within a profile' })
  async reorderLinks(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: ReorderLinksDto,
  ) {
    return await this.linkService.reorderLinks(profileId, dto.items);
  }
}
