import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, env } from '@prisma/config';

// Ensure root .env is loaded for local Prisma migrations and generation
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: 'schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
