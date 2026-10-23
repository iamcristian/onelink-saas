import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { SentinelAiModule } from '../sentinel-ai/sentinel-ai.module';

@Module({
  imports: [SentinelAiModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
