import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { TrackClickSchema, TrackPageViewSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AnalyticsService } from './analytics.service';
import { TrackClickDto, TrackPageViewDto } from './dto/analytics.dto';

@ApiTags('Telemetry & Tracking')
@Controller('track')
export class TrackController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('click')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(TrackClickSchema))
  @ApiOperation({
    summary: 'Client Beacon: Ingests outbound link click event (returns 204 immediately)',
  })
  @ApiResponse({ status: 204, description: 'Click event registered successfully' })
  async trackClick(@Body() dto: TrackClickDto, @Req() req: Request): Promise<void> {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined;
    const userAgent = req.headers['user-agent'];

    await this.analyticsService.recordClick(dto, clientIp, userAgent);
  }

  @Post('view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(TrackPageViewSchema))
  @ApiOperation({
    summary: 'Client Beacon: Ingests profile page view event (returns 204 immediately)',
  })
  @ApiResponse({ status: 204, description: 'Page view event registered successfully' })
  async trackPageView(@Body() dto: TrackPageViewDto, @Req() req: Request): Promise<void> {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined;
    const userAgent = req.headers['user-agent'];

    await this.analyticsService.recordPageView(dto, clientIp, userAgent);
  }
}
