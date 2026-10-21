import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { ProfileAnalyticsResponse } from './dto/analytics.dto';

@ApiTags('Analytics & Telemetry')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get creator analytics dashboard metrics for a profile (7d / 30d time series)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of past days to aggregate (default 30)',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Analytics data payload' })
  @ApiResponse({ status: 403, description: 'Forbidden profile access' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfileAnalytics(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Query('days') daysParam?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProfileAnalyticsResponse> {
    if (user) {
      await this.analyticsService.verifyOwnership(profileId, user.id, user.role);
    }
    const days = daysParam ? parseInt(daysParam, 10) || 30 : 30;
    return await this.analyticsService.getProfileAnalytics(profileId, days);
  }
}
