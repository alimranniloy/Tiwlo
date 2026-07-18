import 'dotenv/config';
import { prisma } from '../db.js';
import { runSocialAiQueueOnce } from '../modules/social/ai.js';

// This is intentionally separate from the HTTP server.  Jobs are stored in
// PostgreSQL and claimed atomically, so the backend's lightweight worker and
// this systemd worker can coexist without processing the same job twice.
const intervalMs = Math.max(1_000, Math.min(Number(process.env.SOCIAL_AI_WORKER_INTERVAL_MS) || 3_000, 60_000));
let stopped = false;
let timer = null;

const tick = async () => {
  if (stopped) return;
  try {
    // Process a bounded burst so an active deployment queue catches up without
    // starving the event loop or a normal Social API request.
    for (let index = 0; index < 4; index += 1) {
      const worked = await runSocialAiQueueOnce({ prisma });
      if (!worked) break;
    }
  } catch (error) {
    console.error('[social-ai-worker] tick failed:', error?.message || error);
  }
};

const shutdown = async (signal) => {
  stopped = true;
  if (timer) clearInterval(timer);
  console.info(`[social-ai-worker] ${signal} received; disconnecting.`);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await tick();
timer = setInterval(tick, intervalMs);
console.info(`[social-ai-worker] online; polling every ${intervalMs}ms.`);
