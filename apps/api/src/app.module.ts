import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { EmailModule } from './infrastructure/email/email.module';
import { CommonModule } from './common/common.module';
import { SentinelAiModule } from './modules/sentinel-ai/sentinel-ai.module';
import { LinkModule } from './modules/link/link.module';
import { AuthModule } from './modules/auth/auth.module';
import { ThemeModule } from './modules/theme/theme.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BillingModule } from './modules/billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    CacheModule,
    EmailModule,
    CommonModule,
    AuthModule,
    ThemeModule,
    ProfileModule,
    SentinelAiModule,
    LinkModule,
    AnalyticsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
