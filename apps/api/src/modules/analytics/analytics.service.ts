import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProfileAccessService } from '../../common/services/profile-access.service';
import {
  TrackClickDto,
  TrackPageViewDto,
  ProfileAnalyticsResponse,
  TimeSeriesPoint,
  LinkPerformanceMetric,
  CategorizedMetric,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileAccess: ProfileAccessService,
  ) {}

  /**
   * Parses basic device, browser, and OS from User-Agent string
   */
  private parseUserAgent(ua?: string): { device: string; browser: string; os: string } {
    if (!ua) {
      return { device: 'desktop', browser: 'Other', os: 'Other' };
    }

    const u = ua.toLowerCase();

    // Device classification
    let device = 'desktop';
    if (u.includes('ipad') || u.includes('tablet') || (u.includes('android') && !u.includes('mobile'))) {
      device = 'tablet';
    } else if (u.includes('mobile') || u.includes('iphone') || u.includes('ipod') || u.includes('android')) {
      device = 'mobile';
    }

    // OS classification
    let os = 'Other';
    if (u.includes('iphone') || u.includes('ipad') || u.includes('ios')) {
      os = 'iOS';
    } else if (u.includes('android')) {
      os = 'Android';
    } else if (u.includes('macintosh') || u.includes('mac os x')) {
      os = 'macOS';
    } else if (u.includes('windows')) {
      os = 'Windows';
    } else if (u.includes('linux')) {
      os = 'Linux';
    }

    // Browser classification
    let browser = 'Other';
    if (u.includes('edg/') || u.includes('edge/')) {
      browser = 'Edge';
    } else if (u.includes('chrome') && !u.includes('edg/')) {
      browser = 'Chrome';
    } else if (u.includes('safari') && !u.includes('chrome')) {
      browser = 'Safari';
    } else if (u.includes('firefox')) {
      browser = 'Firefox';
    } else if (u.includes('opr/') || u.includes('opera/')) {
      browser = 'Opera';
    }

    return { device, browser, os };
  }

  /**
   * Hashes an IP address with SHA-256 for GDPR/privacy compliance
   */
  private hashIp(ip?: string): string | undefined {
    if (!ip) return undefined;
    return crypto.createHash('sha256').update(ip.trim()).digest('hex');
  }

  /**
   * Categorizes a raw referrer URL into recognized platforms
   */
  private categorizeReferrer(referrer?: string | null): string {
    if (!referrer || referrer.trim() === '' || referrer === '#') {
      return 'Direct';
    }

    const r = referrer.toLowerCase();
    if (r.includes('instagram.com') || r.includes('ig.me')) return 'Instagram';
    if (r.includes('tiktok.com')) return 'TikTok';
    if (r.includes('youtube.com') || r.includes('youtu.be')) return 'YouTube';
    if (r.includes('twitter.com') || r.includes('t.co') || r.includes('x.com')) return 'X / Twitter';
    if (r.includes('linkedin.com')) return 'LinkedIn';
    if (r.includes('google.com') || r.includes('google.')) return 'Google';
    if (r.includes('facebook.com') || r.includes('fb.com')) return 'Facebook';
    if (r.includes('threads.net')) return 'Threads';
    if (r.includes('substack.com')) return 'Substack';

    return 'Other Sites';
  }

  /**
   * Records a link click event and atomically increments click_count
   */
  async recordClick(dto: TrackClickDto, clientIp?: string, userAgent?: string): Promise<void> {
    const { device, browser, os } = this.parseUserAgent(userAgent);
    const ipHash = this.hashIp(clientIp);

    try {
      await this.prisma.$transaction([
        this.prisma.clickEvent.create({
          data: {
            linkId: dto.linkId,
            profileId: dto.profileId,
            referrer: dto.referrer,
            device,
            browser,
            os,
            ipHash,
          },
        }),
        this.prisma.link.update({
          where: { id: dto.linkId },
          data: { clickCount: { increment: 1 } },
        }),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to record click event: ${msg}`);
    }
  }

  /**
   * Records an anonymous profile page view event
   */
  async recordPageView(dto: TrackPageViewDto, clientIp?: string, userAgent?: string): Promise<void> {
    const { device, browser, os } = this.parseUserAgent(userAgent);
    const ipHash = this.hashIp(clientIp);

    try {
      await this.prisma.pageView.create({
        data: {
          profileId: dto.profileId,
          referrer: dto.referrer,
          device,
          browser,
          os,
          ipHash,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to record page view event: ${msg}`);
    }
  }

  /**
   * Verifies profile ownership or administrative/collaborator authority
   */
  async verifyOwnership(profileId: string, userId: string, role?: string) {
    return await this.profileAccess.verifyProfileAccess(profileId, userId, role);
  }

  /**
   * Aggregates analytics metrics for a given profile over a day range (default: 30 days)
   */
  async getProfileAnalytics(profileId: string, days = 30): Promise<ProfileAnalyticsResponse> {
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

    // Fetch page views and clicks for current and previous period
    const [
      currentViews,
      previousViews,
      currentClicks,
      previousClicks,
      links,
      rawViews,
      rawClicks,
    ] = await Promise.all([
      this.prisma.pageView.count({
        where: { profileId, timestamp: { gte: currentStart } },
      }),
      this.prisma.pageView.count({
        where: { profileId, timestamp: { gte: previousStart, lt: currentStart } },
      }),
      this.prisma.clickEvent.count({
        where: { profileId, timestamp: { gte: currentStart } },
      }),
      this.prisma.clickEvent.count({
        where: { profileId, timestamp: { gte: previousStart, lt: currentStart } },
      }),
      this.prisma.link.findMany({
        where: { profileId },
        select: { id: true, title: true, url: true, clickCount: true, isActive: true },
      }),
      this.prisma.pageView.findMany({
        where: { profileId, timestamp: { gte: currentStart } },
        select: { timestamp: true, referrer: true, device: true, os: true },
      }),
      this.prisma.clickEvent.findMany({
        where: { profileId, timestamp: { gte: currentStart } },
        select: { timestamp: true, linkId: true },
      }),
    ]);

    // Percentage Growth calculation
    const calcGrowth = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    const viewsGrowth = calcGrowth(currentViews, previousViews);
    const clicksGrowth = calcGrowth(currentClicks, previousClicks);
    const ctr = currentViews > 0 ? Number(((currentClicks / currentViews) * 100).toFixed(1)) : 0;

    // Build Daily Time Series map
    const dateMap = new Map<string, { views: number; clicks: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, { views: 0, clicks: 0 });
    }

    for (const v of rawViews) {
      const key = v.timestamp.toISOString().split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.views += 1;
    }

    for (const c of rawClicks) {
      const key = c.timestamp.toISOString().split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.clicks += 1;
    }

    const timeSeries: TimeSeriesPoint[] = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      views: data.views,
      clicks: data.clicks,
    }));

    // Top Links Performance
    const clickMap = new Map<string, number>();
    for (const c of rawClicks) {
      clickMap.set(c.linkId, (clickMap.get(c.linkId) || 0) + 1);
    }

    const topLinks: LinkPerformanceMetric[] = links.map((l) => {
      const clicks = clickMap.get(l.id) || Number(l.clickCount);
      const linkCtr = currentViews > 0 ? Number(((clicks / currentViews) * 100).toFixed(1)) : 0;
      return {
        id: l.id,
        title: l.title,
        url: l.url,
        clicks,
        ctr: linkCtr,
      };
    }).sort((a, b) => b.clicks - a.clicks);

    // Traffic Sources Categorization
    const sourceCount = new Map<string, number>();
    for (const v of rawViews) {
      const cat = this.categorizeReferrer(v.referrer);
      sourceCount.set(cat, (sourceCount.get(cat) || 0) + 1);
    }

    const totalTrackedViews = rawViews.length || 1;
    const trafficSources: CategorizedMetric[] = Array.from(sourceCount.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / totalTrackedViews) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // Device Breakdown Categorization
    const deviceCount = new Map<string, number>();
    for (const v of rawViews) {
      const dev = v.device ? v.device.charAt(0).toUpperCase() + v.device.slice(1) : 'Desktop';
      deviceCount.set(dev, (deviceCount.get(dev) || 0) + 1);
    }

    const deviceBreakdown: CategorizedMetric[] = Array.from(deviceCount.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / totalTrackedViews) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // OS Breakdown Categorization
    const osCount = new Map<string, number>();
    for (const v of rawViews) {
      const osName = v.os || 'Other';
      osCount.set(osName, (osCount.get(osName) || 0) + 1);
    }

    const osBreakdown: CategorizedMetric[] = Array.from(osCount.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / totalTrackedViews) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      period: {
        days,
        startDate: currentStart.toISOString(),
        endDate: now.toISOString(),
      },
      metrics: {
        totalViews: currentViews,
        viewsGrowth,
        totalClicks: currentClicks,
        clicksGrowth,
        ctr,
        activeLinksCount: links.filter((l) => l.isActive).length,
      },
      timeSeries,
      topLinks,
      trafficSources,
      deviceBreakdown,
      osBreakdown,
    };
  }
}
