import { Module } from '@nestjs/common';
import { SentinelAiService } from './sentinel-ai.service';
import { SentinelAiController, AdminSecurityController } from './sentinel-ai.controller';

@Module({
  controllers: [SentinelAiController, AdminSecurityController],
  providers: [SentinelAiService],
  exports: [SentinelAiService],
})
export class SentinelAiModule {}
