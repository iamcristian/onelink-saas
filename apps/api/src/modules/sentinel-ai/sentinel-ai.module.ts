import { Module } from '@nestjs/common';
import { SentinelAiService } from './sentinel-ai.service';
import { SentinelAiController } from './sentinel-ai.controller';
import { AdminSecurityController } from './admin-security.controller';

@Module({
  controllers: [SentinelAiController, AdminSecurityController],
  providers: [SentinelAiService],
  exports: [SentinelAiService],
})
export class SentinelAiModule {}
