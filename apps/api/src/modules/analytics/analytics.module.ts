import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackController } from './track.controller';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [TrackController, AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
