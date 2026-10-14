import { Module } from '@nestjs/common';
import { LinkService } from './link.service';
import { LinkController } from './link.controller';
import { SentinelAiModule } from '../sentinel-ai/sentinel-ai.module';

@Module({
  imports: [SentinelAiModule],
  controllers: [LinkController],
  providers: [LinkService],
  exports: [LinkService],
})
export class LinkModule {}
