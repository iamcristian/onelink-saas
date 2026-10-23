import { Controller, Post, Get, Body, HttpCode, HttpStatus, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EvaluateUrlSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SentinelAiService } from './sentinel-ai.service';
import { SentinelEvaluationResult } from './sentinel-ai.types';

export class EvaluateUrlDto {
  url!: string;
}

@ApiTags('Sentinel AI Security')
@Controller('sentinel')
export class SentinelAiController {
  constructor(private readonly sentinelAi: SentinelAiService) {}

  @Post('evaluate')
  @UsePipes(new ZodValidationPipe(EvaluateUrlSchema))
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
    return await this.sentinelAi.getTelemetry();
  }
}
