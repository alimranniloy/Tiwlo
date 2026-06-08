import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

loadEnv({ path: resolve(__dirname, '.env') });

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
});
