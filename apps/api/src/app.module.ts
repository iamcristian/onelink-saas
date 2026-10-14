import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { SentinelAiModule } from './modules/sentinel-ai/sentinel-ai.module';
import { LinkModule } from './modules/link/link.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    CacheModule,
    SentinelAiModule,
    LinkModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
