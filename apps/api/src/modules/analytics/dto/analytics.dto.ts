import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackClickDto {
  @ApiProperty({ description: 'Target link UUID' })
  linkId!: string;

  @ApiProperty({ description: 'Profile UUID' })
  profileId!: string;

  @ApiPropertyOptional({ description: 'HTTP Referrer string' })
  referrer?: string;
}

export class TrackPageViewDto {
  @ApiProperty({ description: 'Profile UUID' })
  profileId!: string;

  @ApiPropertyOptional({ description: 'HTTP Referrer string' })
  referrer?: string;
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  clicks: number;
}

export interface LinkPerformanceMetric {
  id: string;
  title: string;
  url: string | null;
  clicks: number;
  ctr: number;
}

export interface CategorizedMetric {
  name: string;
  count: number;
  percentage: number;
}

export interface ProfileAnalyticsResponse {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalViews: number;
    viewsGrowth: number;
    totalClicks: number;
    clicksGrowth: number;
    ctr: number;
    activeLinksCount: number;
  };
  timeSeries: TimeSeriesPoint[];
  topLinks: LinkPerformanceMetric[];
  trafficSources: CategorizedMetric[];
  deviceBreakdown: CategorizedMetric[];
  osBreakdown: CategorizedMetric[];
}
