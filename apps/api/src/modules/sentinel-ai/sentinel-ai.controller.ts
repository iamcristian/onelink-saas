import { Controller, Post, Get, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SentinelAiService } from './sentinel-ai.service';
import { SentinelEvaluationResult } from './sentinel-ai.types';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export class EvaluateUrlDto {
  url!: string;
}

export class AddBlocklistDto {
  domainPattern!: string;
  reason!: string;
}

@ApiTags('Sentinel AI Security')
@Controller('sentinel')
export class SentinelAiController {
  constructor(
    private readonly sentinelAi: SentinelAiService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Evaluate URL with Sentinel AI',
    description: 'In-process sub-18ms threat evaluation using Shannon entropy and homoglyph detection without external tokens.',
  })
  @ApiResponse({ status: 200, description: 'Evaluation completed successfully' })
  async evaluateUrl(@Body() dto: EvaluateUrlDto): Promise<SentinelEvaluationResult> {
    return await this.sentinelAi.evaluateUrl(dto.url);
  }

  @Get('telemetry')
  @ApiOperation({ summary: 'Get Sentinel AI Engine Telemetry' })
  async getTelemetry() {
    const flagCounts = await this.prisma.securityFlag.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const totalBlocked = flagCounts.reduce((acc, curr) => acc + curr._count.id, 0);

    return {
      status: 'ONLINE',
      mode: 'IN_PROCESS_ZERO_TOKEN',
      latencySlaMs: 18,
      layersActive: [
        'REDIS_O1_GLOBAL_BLOCKLIST',
        'PUNYCODE_HOMOGLYPH_DETECTION',
        'SHANNON_ENTROPY_ANALYSIS',
        'BRAND_TYPOSQUATTING_CLASSIFIER',
        'CRYPTO_DRAINER_HEURISTICS',
        'HIGH_RISK_TLD_CLASSIFIER',
      ],
      totalFlagsRecorded: totalBlocked,
      breakdown: flagCounts,
    };
  }
}

@ApiTags('Admin Security Moderation')
@Controller('admin/security')
export class AdminSecurityController {
  constructor(
    private readonly sentinelAi: SentinelAiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('threats')
  @ApiOperation({ summary: 'List recent threats detected by Sentinel AI' })
  async listThreats(@Query('limit') limit = '20') {
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
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
          },
        },
      },
    });
  }

  @Post('blocklist')
  @ApiOperation({ summary: 'Add domain to global blocklist' })
  async addBlocklist(@Body() dto: AddBlocklistDto) {
    return await this.sentinelAi.addDomainToBlocklist(dto.domainPattern, dto.reason);
  }
}
