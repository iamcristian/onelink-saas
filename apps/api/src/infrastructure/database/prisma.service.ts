import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@repo/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { CANONICAL_THEME_PRESETS } from '@repo/shared';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://dev_user:dev_password@localhost:5432/linktree_dev?schema=public';
    const adapter = new PrismaPg({ connectionString });
    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Successfully connected to PostgreSQL (TimescaleDB)');
    await this.ensureSchemaSync();
  }

  private async ensureSchemaSync() {
    const migrations = [
      'ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "content" TEXT',
      'ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMP(3)',
      'ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)',
      'ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "is_password_protected" BOOLEAN DEFAULT false',
      'ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "password" VARCHAR(100)',
      'ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "is_age_restricted" BOOLEAN DEFAULT false',
      'ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "badge" VARCHAR(50)',
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_banned" BOOLEAN DEFAULT false',
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ban_reason" TEXT',
    ];

    for (const sql of migrations) {
      try {
        await this.$executeRawUnsafe(sql);
      } catch (err: unknown) {
        this.logger.debug(`Schema sync notice: ${sql} -> ${err instanceof Error ? err.message : err}`);
      }
    }

    const enums = [
      "ALTER TYPE \"LinkType\" ADD VALUE IF NOT EXISTS 'DONATION'",
      "ALTER TYPE \"LinkType\" ADD VALUE IF NOT EXISTS 'NOTE'",
    ];

    for (const sql of enums) {
      try {
        await this.$executeRawUnsafe(sql);
      } catch {
        // Enums may already have the value or type might not exist yet
      }
    }

    // Ensure all 8 canonical preset themes exist in the Theme table
    for (const theme of CANONICAL_THEME_PRESETS) {
      try {
        const existing = await this.theme.findFirst({ where: { name: theme.name } });
        if (!existing) {
          await this.theme.create({
            data: {
              name: theme.name,
              bgType: theme.bgType as any,
              bgValue: theme.bgValue,
              btnStyle: theme.btnStyle as any,
              btnColor: theme.btnColor,
              btnTextColor: theme.btnTextColor,
              fontFamily: theme.fontFamily,
              textColor: theme.textColor,
              isDefault: Boolean(theme.isDefault),
            },
          });
        }
      } catch (err: unknown) {
        this.logger.debug(`Theme sync notice for ${theme.name}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Ensure founder accounts have OWNER role and active ENTERPRISE subscription
    const founderEmails = [
      'cris@onelink.bio',
      'crisarando10@gmail.com',
      'crisarandosyse@gmail.com',
    ];
    for (const email of founderEmails) {
      try {
        const u = await this.user.findUnique({ where: { email } });
        if (u) {
          if (u.role !== 'OWNER') {
            await this.user.update({ where: { id: u.id }, data: { role: 'OWNER' } });
          }
          const enterprisePlan = await this.plan.findUnique({ where: { code: 'ENTERPRISE' } });
          if (enterprisePlan) {
            const sub = await this.subscription.findFirst({ where: { userId: u.id, status: 'ACTIVE' } });
            if (!sub) {
              await this.subscription.create({ data: { userId: u.id, planId: enterprisePlan.id, status: 'ACTIVE' } });
            } else if (sub.planId !== enterprisePlan.id) {
              await this.subscription.update({ where: { id: sub.id }, data: { planId: enterprisePlan.id } });
            }
          }
        }
      } catch (err: unknown) {
        this.logger.debug(`Founder sync notice for ${email}: ${err instanceof Error ? err.message : err}`);
      }
    }

    this.logger.log('Database schema synchronization completed.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }
}
