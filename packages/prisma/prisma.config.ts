import path from 'path';
import dotenv from 'dotenv';
import { defineConfig } from '@prisma/config';

// Ensure root .env is loaded for local Prisma migrations and generation
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: 'schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://dev_user:dev_password@localhost:5432/linktree_dev?schema=public',
  },
});
