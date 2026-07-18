import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAdmin, requireAdmin } from '../../core/auth.js';
import { AppError, notFound } from '../../core/errors.js';
import { removeUndefined } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../../..');
const SETTING_SCOPE = 'platform';
const SETTING_SCOPE_ID = '';
const SETTING_KEY = 'socialAi';
const MANAGER_PATH = process.env.TIWLO_SOCIAL_AI_MANAGER || join(ROOT, 'packages', 'ai', 'bin', 'manager.sh');
const WORKER_DELAY_MS = Math.max(1_000, Math.min(Number(process.env.SOCIAL_AI_WORKER_INTERVAL_MS) || 3_000, 60_000));
const MANAGER_TIMEOUT_MS = Math.max(10_000, Math.min(Number(process.env.SOCIAL_AI_MANAGER_TIMEOUT_MS) || 30 * 60_000, 90 * 60_000));

export const SOCIAL_AI_PACKAGE_CATALOG = Object.freeze([
  { id: 'searxng', name: 'SearXNG', role: 'Public notability search', requiredFor: ['verification', 'impersonation'], port: 8081 },
  { id: 'crawl4ai', name: 'Crawl4AI', role: 'Evidence collection', requiredFor: ['verification', 'reportReview'], port: 11235 },
  { id: 'llama-cpp', name: 'llama.cpp', role: 'Local policy analysis', requiredFor: ['verification', 'reportReview', 'postReview', 'commentReview', 'messageModeration'], port: 8082 },
  { id: 'queue-worker', name: 'Social AI Queue Worker', role: 'Persistent Social background processing', requiredFor: ['all'], port: null },
  { id: 'health-monitor', name: 'Social AI Health Monitor', role: 'Automatic service repair', requiredFor: ['all'], port: null }
]);

export const SOCIAL_AI_MODEL_CATALOG = Object.freeze([
  { id: 'text-policy', name: 'Qwen 2.5 Policy (adaptive)', kind: 'text', file: 'Auto-selects 0.5B or 3B Q4_K_M by server memory', default: true, requiredFor: ['verification', 'reportReview', 'postReview', 'commentReview', 'messageModeration', 'appeal'] },
  { id: 'moderation-vision', name: 'MobileNetV2 Mid NSFW', kind: 'moderation', file: 'nsfwjs-mobilenet-v2-mid', default: true, requiredFor: ['adultContent', 'imageModeration', 'videoCaptionModeration'] },
  { id: 'vision-review', name: 'Moondream 2', kind: 'vision', file: 'moondream2-text-model-f16.gguf', default: false, requiredFor: ['imageModeration', 'videoCaptionModeration', 'violence', 'weaponSale'] },
  { id: 'embedding', name: 'Nomic Embed Text v1.5', kind: 'embedding', file: 'nomic-embed-text-v1.5.Q4_K_M.gguf', default: true, requiredFor: ['spam', 'scam', 'duplicateContent', 'fakeAccount'] }
]);

const FEATURE_KEYS = Object.freeze([
  'verification', 'reportReview', 'postReview', 'commentReview', 'messageModeration', 'imageModeration', 'videoCaptionModeration',
  'spam', 'scam', 'fakeAccount', 'fakeProfile', 'impersonation', 'harassment', 'hateSpeech', 'threat', 'weaponSale', 'drugSale',
  'adultContent', 'violence', 'selfHarm', 'copyright', 'warning', 'strike', 'appeal', 'notificationAutomation'
]);

const FEATURE_REQUIREMENTS = Object.freeze({
  verification: { packages: ['searxng', 'crawl4ai', 'llama-cpp'], models: ['text-policy', 'embedding'] },
  reportReview: { packages: ['crawl4ai', 'llama-cpp'], models: ['text-policy'] },
  postReview: { packages: ['llama-cpp'], models: ['text-policy'] },
  commentReview: { packages: ['llama-cpp'], models: ['text-policy'] },
  messageModeration: { packages: ['llama-cpp'], models: ['text-policy'] },
  imageModeration: { packages: ['llama-cpp'], models: ['moderation-vision', 'vision-review'] },
  videoCaptionModeration: { packages: ['llama-cpp'], models: ['moderation-vision', 'vision-review'] },
  spam: { packages: ['llama-cpp'], models: ['text-policy', 'embedding'] },
  scam: { packages: ['llama-cpp'], models: ['text-policy', 'embedding'] },
  fakeAccount: { packages: ['llama-cpp'], models: ['embedding'] },
  fakeProfile: { packages: ['llama-cpp'], models: ['text-policy', 'embedding'] },
  impersonation: { packages: ['searxng', 'llama-cpp'], models: ['text-policy', 'embedding'] },
  harassment: { packages: ['llama-cpp'], models: ['text-policy'] },
  hateSpeech: { packages: ['llama-cpp'], models: ['text-policy'] },
  threat: { packages: ['llama-cpp'], models: ['text-policy'] },
  weaponSale: { packages: ['llama-cpp'], models: ['text-policy', 'vision-review'] },
  drugSale: { packages: ['llama-cpp'], models: ['text-policy'] },
  adultContent: { packages: ['llama-cpp'], models: ['moderation-vision'] },
  violence: { packages: ['llama-cpp'], models: ['text-policy', 'vision-review'] },
  selfHarm: { packages: ['llama-cpp'], models: ['text-policy'] },
  copyright: { packages: ['llama-cpp'], models: ['embedding'] },
  appeal: { packages: ['llama-cpp'], models: ['text-policy'] }
});

// A primary review pipeline may discover several policy categories. Individual
// category toggles remain authoritative: enabling a category queues the
// relevant source pipeline, while a disabled category can never take action.
const PIPELINE_FEATURES = Object.freeze({
  postReview: ['postReview', 'spam', 'scam', 'impersonation', 'harassment', 'hateSpeech', 'threat', 'weaponSale', 'drugSale', 'adultContent', 'violence', 'selfHarm', 'copyright'],
  commentReview: ['commentReview', 'spam', 'scam', 'harassment', 'hateSpeech', 'threat', 'weaponSale', 'drugSale', 'selfHarm'],
  messageModeration: ['messageModeration', 'spam', 'scam', 'harassment', 'hateSpeech', 'threat', 'weaponSale', 'drugSale', 'selfHarm'],
  profileReview: ['fakeProfile', 'fakeAccount', 'impersonation'],
  reportReview: ['reportReview'],
  verification: ['verification'],
  appeal: ['appeal']
});

const CATEGORY_FEATURES = Object.freeze({
  threat: 'threat', weapon_sale: 'weaponSale', drug_sale: 'drugSale', self_harm: 'selfHarm', scam: 'scam', spam: 'spam',
  harassment: 'harassment', hate_speech: 'hateSpeech', impersonation: 'impersonation', adult_content: 'adultContent', violence: 'violence', copyright: 'copyright'
});

const defaultFeatures = () => Object.fromEntries(FEATURE_KEYS.map((key) => [key, false]));

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  autoBootstrap: true,
  autoRepair: true,
  autoStart: true,
  queueConcurrency: 1,
  runtime: {
    searxngUrl: 'http://127.0.0.1:8081',
    crawl4aiUrl: 'http://127.0.0.1:11235',
    // The OpenAI-compatible chat endpoint follows JSON instructions much more
    // reliably than the legacy completion endpoint on compact local models.
    llamaUrl: 'http://127.0.0.1:8082/v1/chat/completions',
    requestTimeoutMs: 30_000
  },
  features: defaultFeatures(),
  automaticActions: {
    highConfidence: 0.92,
    autoApproveVerification: false,
    autoRejectVerification: false,
    removeContent: false,
    restrictAccount: false,
    disableMonetization: false,
    sendWarnings: true,
    addStrikes: true
  }
});

const nowIso = () => new Date().toISOString();
const asText = (value, limit = 6_000) => String(value ?? '').trim().slice(0, limit);
const asObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const crawl4aiApiToken = () => {
  const supplied = asText(process.env.SOCIAL_AI_CRAWL4AI_API_TOKEN || process.env.CRAWL4AI_API_TOKEN, 512);
  if (supplied) return supplied;
  const dataDirectory = process.env.TIWLO_SOCIAL_AI_DATA_DIR || join(ROOT, '.data', 'social-ai');
  try { return asText(readFileSync(join(dataDirectory, 'secrets', 'crawl4ai-api-token'), 'utf8'), 512); } catch { return ''; }
};
const asBooleanMap = (value) => Object.fromEntries(FEATURE_KEYS.map((key) => [key, Boolean(asObject(value)[key]) ]));
const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
};
const normalizeLlamaUrl = (value) => {
  const url = asText(value || DEFAULT_SETTINGS.runtime.llamaUrl, 500);
  // Preserve a deliberately configured remote runtime, while transparently
  // migrating the former local /completion default to the supported chat API.
  return /^https?:\/\/(?:127\.0\.0\.1|localhost):8082\/completion\/?$/i.test(url)
    ? DEFAULT_SETTINGS.runtime.llamaUrl
    : url;
};

const normalizeSettings = (value = {}) => {
  const source = asObject(value);
  const runtime = asObject(source.runtime);
  const actions = asObject(source.automaticActions);
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    enabled: source.enabled !== false,
    autoBootstrap: source.autoBootstrap !== false,
    autoRepair: source.autoRepair !== false,
    autoStart: source.autoStart !== false,
    queueConcurrency: Math.floor(clamp(source.queueConcurrency, 1, 4, 1)),
    runtime: {
      ...DEFAULT_SETTINGS.runtime,
      ...runtime,
      searxngUrl: asText(runtime.searxngUrl || DEFAULT_SETTINGS.runtime.searxngUrl, 500).replace(/\/$/, ''),
      crawl4aiUrl: asText(runtime.crawl4aiUrl || DEFAULT_SETTINGS.runtime.crawl4aiUrl, 500).replace(/\/$/, ''),
      llamaUrl: normalizeLlamaUrl(runtime.llamaUrl),
      requestTimeoutMs: Math.floor(clamp(runtime.requestTimeoutMs, 5_000, 120_000, DEFAULT_SETTINGS.runtime.requestTimeoutMs))
    },
    features: asBooleanMap({ ...defaultFeatures(), ...asObject(source.features) }),
    automaticActions: {
      ...DEFAULT_SETTINGS.automaticActions,
      ...actions,
      highConfidence: clamp(actions.highConfidence, 0.5, 0.995, DEFAULT_SETTINGS.automaticActions.highConfidence),
      autoApproveVerification: Boolean(actions.autoApproveVerification),
      autoRejectVerification: Boolean(actions.autoRejectVerification),
      removeContent: Boolean(actions.removeContent),
      restrictAccount: Boolean(actions.restrictAccount),
      disableMonetization: Boolean(actions.disableMonetization),
      sendWarnings: actions.sendWarnings !== false,
      addStrikes: actions.addStrikes !== false
    }
  };
};

export const getSocialAiSettings = async (ctx) => {
  const setting = await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: SETTING_SCOPE, scopeId: SETTING_SCOPE_ID, key: SETTING_KEY } },
    create: { scope: SETTING_SCOPE, scopeId: SETTING_SCOPE_ID, key: SETTING_KEY, value: DEFAULT_SETTINGS },
    update: {}
  });
  return normalizeSettings(setting.value);
};

const saveSocialAiSettings = async (ctx, value) => {
  const normalized = normalizeSettings(value);
  await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: SETTING_SCOPE, scopeId: SETTING_SCOPE_ID, key: SETTING_KEY } },
    create: { scope: SETTING_SCOPE, scopeId: SETTING_SCOPE_ID, key: SETTING_KEY, value: normalized },
    update: { value: normalized }
  });
  return normalized;
};

const safeJson = (value) => {
  try { return JSON.parse(value); } catch { return null; }
};

const executeManager = async (args, { timeoutMs = MANAGER_TIMEOUT_MS, onLine } = {}) => {
  if (!existsSync(MANAGER_PATH)) {
    return { ok: false, status: 'unavailable', error: `Social AI manager is missing at ${MANAGER_PATH}. Deploy the Social AI package bundle.`, logs: [] };
  }
  return new Promise((resolveCommand) => {
    const command = process.platform === 'win32' ? 'bash' : '/usr/bin/env';
    const commandArgs = process.platform === 'win32' ? [MANAGER_PATH, ...args] : ['bash', MANAGER_PATH, ...args];
    const child = spawn(command, commandArgs, { cwd: ROOT, windowsHide: true, env: { ...process.env, TIWLO_ROOT: ROOT } });
    const logs = [];
    let stdout = '';
    let stderr = '';
    let finished = false;
    const append = (chunk, stream) => {
      const text = String(chunk || '');
      if (stream === 'stdout') stdout = `${stdout}${text}`.slice(-200_000);
      else stderr = `${stderr}${text}`.slice(-80_000);
      text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
        logs.push(line);
        if (logs.length > 160) logs.shift();
        onLine?.(line);
      });
    };
    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolveCommand({ ...value, logs });
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish({ ok: false, status: 'timeout', error: `Social AI manager exceeded ${Math.round(timeoutMs / 1000)} seconds.` });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => append(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => append(chunk, 'stderr'));
    child.once('error', (error) => finish({ ok: false, status: 'error', error: error.message }));
    child.once('close', (code) => {
      const jsonLine = stdout.split(/\r?\n/).map((line) => line.trim()).reverse().find((line) => line.startsWith('{') && line.endsWith('}'));
      const payload = jsonLine ? safeJson(jsonLine) : null;
      finish({ ok: code === 0 && payload?.ok !== false, status: payload?.status || (code === 0 ? 'ready' : 'error'), error: payload?.error || (code === 0 ? null : asText(stderr || stdout || `Manager exited with ${code}`, 2_000)), payload, exitCode: code });
    });
  });
};

const healthSnapshot = async () => {
  const result = await executeManager(['health', '--json'], { timeoutMs: 15_000 });
  const health = asObject(result.payload?.health);
  return {
    available: result.ok,
    checkedAt: nowIso(),
    manager: { status: result.status, error: result.error || null },
    packages: asObject(health.packages),
    models: asObject(health.models),
    services: asObject(health.services),
    logs: result.logs.slice(-20)
  };
};

const packageStatus = (snapshot, id) => asObject(snapshot.packages)[id] || { status: 'unknown', healthy: false };
const modelStatus = (snapshot, id) => asObject(snapshot.models)[id] || { status: 'unknown', healthy: false };

const makeJobResult = (job) => ({
  ...job,
  payload: asObject(job.payload),
  result: job.result ? asObject(job.result) : null,
  progress: Math.max(0, Math.min(100, Number(job.progress) || 0))
});

export const enqueueSocialAiTask = async (ctx, input = {}) => {
  const type = asText(input.type, 80).toLowerCase();
  if (!type) throw new AppError('Social AI task type is required', 'BAD_USER_INPUT');
  const job = await ctx.prisma.socialAiJob.create({
    data: {
      type,
      priority: Math.floor(clamp(input.priority, -100, 100, 0)),
      payload: asObject(input.payload),
      requestedById: input.requestedById || ctx.user?.id || null,
      maxAttempts: Math.floor(clamp(input.maxAttempts, 1, 10, type === 'maintenance' ? 2 : 4)),
      runAfter: input.runAfter instanceof Date ? input.runAfter : new Date()
    }
  });
  return makeJobResult(job);
};

const taskFeature = (type, payload = {}) => {
  if (type === 'verification_review') return 'verification';
  if (type === 'report_review') return 'reportReview';
  if (type === 'profile_review') return 'fakeProfile';
  if (type === 'post_review') return 'postReview';
  if (type === 'comment_review') return 'commentReview';
  if (type === 'message_review') return 'messageModeration';
  if (type === 'appeal_review') return 'appeal';
  if (type === 'content_review') return String(payload.feature || 'postReview');
  return null;
};

const managerArgsForJob = (job) => {
  const payload = asObject(job.payload);
  if (job.type === 'bootstrap') return ['bootstrap', '--json'];
  if (job.type === 'maintenance') {
    const scope = asText(payload.scope, 30);
    const id = asText(payload.id, 80);
    const action = asText(payload.action, 30);
    if (scope === 'system' && action === 'clear_cache') return ['cleanup', '--json'];
    if (!['package', 'model', 'feature'].includes(scope) || !id || !action) throw new AppError('Invalid Social AI maintenance operation', 'BAD_USER_INPUT');
    return [scope, action, id, '--json'];
  }
  if (job.type === 'health_check') return ['health', '--json'];
  return null;
};

const parseProgress = (line) => {
  const match = /^PROGRESS\s+(\d{1,3})\s+(.+)$/i.exec(line);
  return match ? { progress: Math.max(0, Math.min(100, Number(match[1]))), phase: asText(match[2], 160) } : null;
};

const queueMaintenance = async (ctx, job) => {
  const args = managerArgsForJob(job);
  if (!args) return false;
  await ctx.prisma.socialAiJob.update({ where: { id: job.id }, data: { progress: 5, phase: 'starting manager' } });
  const result = await executeManager(args, {
    onLine: (line) => {
      const progress = parseProgress(line);
      if (progress) ctx.prisma.socialAiJob.update({ where: { id: job.id }, data: progress }).catch(() => undefined);
    }
  });
  if (!result.ok) throw new AppError(result.error || 'Social AI manager operation failed', 'SOCIAL_AI_MANAGER_ERROR');
  return { manager: result.payload || {}, logs: result.logs.slice(-80) };
};

const jsonFromModel = (value) => {
  const text = asText(value, 16_000);
  const direct = safeJson(text);
  if (direct && typeof direct === 'object') return direct;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? safeJson(text.slice(start, end + 1)) : null;
};

const policySignals = (text) => {
  const value = asText(text, 12_000).toLowerCase();
  const rules = [
    ['threat', /\b(kill you|murder you|shoot you|bomb threat|মেরে ফেল|হত্যা কর|গুলি কর)\b/i, .97, 'high'],
    ['weapon_sale', /\b(buy (a |an )?(gun|weapon)|sell (a |an )?(gun|weapon)|firearm for sale|অস্ত্র বিক্রি|বন্দুক বিক্রি)\b/i, .94, 'high'],
    ['drug_sale', /\b(buy (weed|cocaine|heroin|meth)|drug(s)? for sale|ড্রাগ বিক্রি|মাদক বিক্রি)\b/i, .94, 'high'],
    ['self_harm', /\b(kill myself|suicide plan|end my life|আত্মহত্যা করব|নিজেকে মেরে)\b/i, .92, 'high'],
    ['scam', /\b(send (your )?(otp|password|seed phrase)|guaranteed investment|double your money|otp দিন|পাসওয়ার্ড দিন)\b/i, .88, 'medium'],
    ['harassment', /\b(you are worthless|go die|তুই মরে যা|তোমাকে মেরে)\b/i, .86, 'medium']
  ];
  const found = rules.find(([, pattern]) => pattern.test(value));
  return found ? {
    category: found[0], confidence: found[2], severity: found[3], decision: 'violation',
    recommendation: found[3] === 'high' ? 'remove_content' : 'warning',
    reason: `High-confidence ${found[0].replace(/_/g, ' ')} policy signal`,
    evidenceSummary: 'A high-confidence local policy pattern was identified.', provider: 'social-policy-patterns'
  } : null;
};

const loadTaskContext = async (ctx, job) => {
  const payload = asObject(job.payload);
  if (job.type === 'post_review' || job.type === 'content_review') {
    const postId = asText(payload.postId || payload.targetId, 120);
    const post = postId ? await ctx.prisma.socialPost.findUnique({ where: { id: postId }, include: { author: { include: { socialProfile: true } } } }) : null;
    if (!post) throw new AppError('Social post is no longer available', 'NOT_FOUND');
    return { subjectUserId: post.authorId, sourceType: 'post', sourceId: post.id, text: post.body || '', context: { type: post.type, media: post.media, visibility: post.visibility, profile: post.author.socialProfile ? { username: post.author.socialProfile.username, bio: post.author.socialProfile.bio, category: post.author.socialProfile.category, website: post.author.socialProfile.website } : null } };
  }
  if (job.type === 'comment_review') {
    const commentId = asText(payload.commentId || payload.targetId, 120);
    const comment = commentId ? await ctx.prisma.socialComment.findUnique({ where: { id: commentId }, include: { post: true } }) : null;
    if (!comment) throw new AppError('Social comment is no longer available', 'NOT_FOUND');
    return { subjectUserId: comment.authorId, sourceType: 'comment', sourceId: comment.id, text: comment.body || '', context: { postId: comment.postId, replyToId: comment.replyToId } };
  }
  if (job.type === 'message_review') {
    const messageId = asText(payload.messageId || payload.targetId, 120);
    const message = messageId ? await ctx.prisma.socialMessage.findUnique({ where: { id: messageId }, select: { id: true, senderId: true, conversationId: true, type: true, body: true, media: true } }) : null;
    if (!message) throw new AppError('Social message is no longer available', 'NOT_FOUND');
    return { subjectUserId: message.senderId, sourceType: 'message', sourceId: message.id, text: message.body || '', context: { messageType: message.type, media: message.media, conversationId: message.conversationId } };
  }
  if (job.type === 'profile_review') {
    const userId = asText(payload.userId || payload.targetId, 120);
    const profile = userId ? await ctx.prisma.socialProfile.findUnique({ where: { userId }, include: { user: true } }) : null;
    if (!profile) throw new AppError('Social profile is no longer available', 'NOT_FOUND');
    return { subjectUserId: profile.userId, sourceType: 'profile', sourceId: profile.id, text: `${profile.username}\n${profile.bio || ''}\n${profile.about || ''}`, context: { username: profile.username, bio: profile.bio, about: profile.about, category: profile.category, website: profile.website, location: profile.location, accountCreatedAt: profile.createdAt } };
  }
  if (job.type === 'report_review') {
    const reportId = asText(payload.reportId || payload.targetId, 120);
    const report = reportId ? await ctx.prisma.socialReport.findUnique({ where: { id: reportId } }) : null;
    if (!report) throw new AppError('Social report is no longer available', 'NOT_FOUND');
    // A report review receives only the reported item and the submitted reason;
    // it never receives unrelated messages, feed items, or profile data.
    const targetType = asText(report.targetType, 40).toLowerCase();
    let subjectUserId = null;
    let target = null;
    if (targetType === 'post' || report.postId) {
      const post = await ctx.prisma.socialPost.findUnique({ where: { id: report.postId || report.targetId }, select: { id: true, authorId: true, body: true, media: true, type: true, visibility: true } });
      if (post) {
        subjectUserId = post.authorId;
        target = { id: post.id, type: 'post', body: asText(post.body, 10_000), media: post.media, postType: post.type, visibility: post.visibility };
      }
    } else if (targetType === 'comment') {
      const comment = await ctx.prisma.socialComment.findUnique({ where: { id: report.targetId }, select: { id: true, authorId: true, postId: true, body: true, replyToId: true } });
      if (comment) {
        subjectUserId = comment.authorId;
        target = { id: comment.id, type: 'comment', body: asText(comment.body, 10_000), postId: comment.postId, replyToId: comment.replyToId };
      }
    } else if (targetType === 'message') {
      const message = await ctx.prisma.socialMessage.findUnique({ where: { id: report.targetId }, select: { id: true, senderId: true, type: true, body: true, media: true } });
      if (message) {
        subjectUserId = message.senderId;
        target = { id: message.id, type: 'message', body: asText(message.body, 10_000), messageType: message.type, media: message.media };
      }
    } else if (targetType === 'profile' || targetType === 'user') {
      const profile = await ctx.prisma.socialProfile.findFirst({ where: { OR: [{ id: report.targetId }, { userId: report.targetId }] }, select: { id: true, userId: true, username: true, bio: true, about: true, category: true, website: true, location: true } });
      if (profile) {
        subjectUserId = profile.userId;
        target = { id: profile.id, type: 'profile', username: profile.username, bio: profile.bio, about: profile.about, category: profile.category, website: profile.website, location: profile.location };
      }
    }
    return {
      subjectUserId: subjectUserId || report.reporterId,
      sourceType: 'report', sourceId: report.id,
      text: `${report.reason}\n${report.details || ''}\n${target?.body || target?.bio || ''}`,
      context: { targetType, targetId: report.targetId, reportReason: report.reason, reportDetails: report.details || '', target }
    };
  }
  if (job.type === 'verification_review') {
    const reportId = asText(payload.reportId || payload.targetId, 120);
    const report = reportId ? await ctx.prisma.socialReport.findUnique({ where: { id: reportId } }) : null;
    if (!report || report.targetType !== 'verification') throw new AppError('Verification request is no longer available', 'NOT_FOUND');
    const profile = await ctx.prisma.socialProfile.findUnique({ where: { userId: report.targetId }, include: { user: true } });
    if (!profile) throw new AppError('Verification profile is unavailable', 'NOT_FOUND');
    return { subjectUserId: profile.userId, sourceType: 'verification', sourceId: report.id, text: `${profile.user.name}\n${profile.username}\n${profile.bio || ''}\n${profile.about || ''}`, context: { profile: { name: profile.user.name, username: profile.username, bio: profile.bio, about: profile.about, category: profile.category, website: profile.website, location: profile.location }, request: asText(report.details, 4_000) } };
  }
  if (job.type === 'appeal_review') {
    const caseId = asText(payload.caseId, 120);
    const socialCase = caseId ? await ctx.prisma.socialAiCase.findUnique({ where: { id: caseId } }) : null;
    if (!socialCase) throw new AppError('Social AI appeal is no longer available', 'NOT_FOUND');
    return { subjectUserId: socialCase.subjectUserId, sourceType: 'appeal', sourceId: socialCase.id, text: socialCase.appealText || '', context: { originalDecision: socialCase.decision, category: socialCase.category, evidence: socialCase.evidence } };
  }
  throw new AppError(`Unsupported Social AI task: ${job.type}`, 'BAD_USER_INPUT');
};

const searchNotability = async (settings, query) => {
  const url = new URL('/search', settings.runtime.searxngUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('categories', 'general');
  const response = await fetch(url, { signal: AbortSignal.timeout(settings.runtime.requestTimeoutMs), headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`SearXNG returned ${response.status}`);
  const result = await response.json();
  return (Array.isArray(result?.results) ? result.results : []).slice(0, 8).map((item) => ({ title: asText(item?.title, 240), url: asText(item?.url, 1000), content: asText(item?.content, 900), engine: asText(item?.engine, 80) }));
};

const crawlEvidence = async (settings, url) => {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const token = crawl4aiApiToken();
  const response = await fetch(`${settings.runtime.crawl4aiUrl}/crawl`, {
    method: 'POST', signal: AbortSignal.timeout(settings.runtime.requestTimeoutMs), headers: { 'content-type': 'application/json', accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ urls: [url], browser_config: { headless: true }, crawler_config: { word_count_threshold: 20, cache_mode: 'BYPASS' } })
  });
  if (!response.ok) throw new Error(`Crawl4AI returned ${response.status}`);
  const result = await response.json();
  const item = Array.isArray(result?.results) ? result.results[0] : result?.result || result;
  return item ? { url, title: asText(item?.metadata?.title || item?.title, 240), markdown: asText(item?.markdown || item?.markdown_v2?.raw_markdown || item?.fit_markdown, 5_000) } : null;
};

const modelWarmingError = (message) => new AppError(message, 'SOCIAL_AI_MODEL_WARMING');

const policyDecision = (value) => {
  const normalized = asText(value, 30).toLowerCase();
  if (['allow', 'review', 'violation'].includes(normalized)) return normalized;
  if (['yes', 'safe', 'approved', 'no action'].includes(normalized)) return 'allow';
  if (['unsafe', 'blocked', 'block', 'deny'].includes(normalized)) return 'violation';
  return 'review';
};

const policyConfidence = (value) => {
  const text = asText(value, 40);
  if (text.endsWith('%')) return clamp(Number(text.slice(0, -1)) / 100, 0, 1, 0);
  return clamp(text, 0, 1, 0);
};

const policyAction = (value, decision) => {
  const action = asText(value, 100).toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['none', 'warning', 'strike', 'remove_content', 'restrict_account', 'approve_verification', 'reject_verification', 'manual_review']);
  if (allowed.has(action)) return action;
  if (/no_action|no.*recommended|allow/.test(action)) return 'none';
  return decision === 'allow' ? 'none' : 'manual_review';
};

const askPolicyModel = async (settings, task, taskContext, supplemental = {}) => {
  // Compact VPS instances use a 2k-token local context.  Avoid sending raw
  // media metadata or crawled pages wholesale: oversized prompts were the
  // source of llama.cpp 400 responses and served no moderation purpose.
  const context = {
    text: asText(taskContext.text, 2_600),
    metadata: asText(JSON.stringify(taskContext.context || {}), 1_000),
    supplemental: asText(JSON.stringify(supplemental || {}), 700)
  };
  const system = [
    'You are Tiwi Social Safety AI.',
    'Return exactly one JSON object and no prose or markdown.',
    'Analyze only supplied content. Never infer protected traits.',
    'Use decision exactly allow, review, or violation.',
    'Required keys: decision, category, confidence as a number from 0 to 1, severity as low/medium/high/critical, reason, recommendedAction, evidenceSummary.',
    'recommendedAction must be one of none, warning, strike, remove_content, restrict_account, approve_verification, reject_verification, manual_review.'
  ].join(' ');
  const user = `Task: ${task}\nContext: ${JSON.stringify(context)}`;
  const request = (body) => fetch(settings.runtime.llamaUrl, {
    method: 'POST', signal: AbortSignal.timeout(settings.runtime.requestTimeoutMs), headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body)
  });
  let response;
  try {
    response = await request({
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.1,
      max_tokens: 260,
      response_format: { type: 'json_object' }
    });
    // A few older llama.cpp builds do not implement response_format. Retry
    // once with the same constrained prompt rather than failing the review.
    if (response.status === 400) {
      response = await request({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.1, max_tokens: 260 });
    }
  } catch (error) {
    throw modelWarmingError(`llama.cpp is not reachable: ${asText(error?.message, 300)}`);
  }
  if (!response.ok) {
    const detail = asText(await response.text().catch(() => ''), 400);
    if ([408, 429, 500, 502, 503, 504].includes(response.status)) throw modelWarmingError(`llama.cpp is warming or unavailable (${response.status})${detail ? `: ${detail}` : ''}`);
    throw new Error(`llama.cpp returned ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || payload?.content || payload?.response || '';
  const parsed = jsonFromModel(content);
  if (!parsed) throw new Error('llama.cpp did not return a policy JSON result');
  const decision = policyDecision(parsed.decision);
  const severity = ['low', 'medium', 'high', 'critical'].includes(asText(parsed.severity, 30).toLowerCase()) ? asText(parsed.severity, 30).toLowerCase() : 'medium';
  return {
    decision,
    category: asText(parsed.category || 'unclassified', 120),
    confidence: policyConfidence(parsed.confidence),
    severity,
    reason: asText(parsed.reason || 'Social AI completed a policy review.', 1_000),
    recommendation: policyAction(parsed.recommendedAction, decision),
    evidenceSummary: asText(parsed.evidenceSummary, 1_500),
    provider: 'social-llama-cpp'
  };
};

const requiredForFeature = (feature) => FEATURE_REQUIREMENTS[feature] || { packages: [], models: [] };

const missingDependencies = (snapshot, feature) => {
  const needed = requiredForFeature(feature);
  return {
    packages: needed.packages.filter((id) => !Boolean(packageStatus(snapshot, id).healthy)),
    models: needed.models.filter((id) => !Boolean(modelStatus(snapshot, id).healthy))
  };
};

const createSocialAiNotification = async (ctx, ownerId, type, title, message, metadata = {}) => ctx.prisma.notification.create({
  data: { ownerId, scope: 'social', scopeId: asText(metadata.caseId || metadata.reportId || '', 160), type, title: asText(title, 180), message: asText(message, 1_000), metadata: { ...metadata, destination: 'support_center', socialAi: true } }
});

const recordCase = async (ctx, task, analysis, actionTaken = null) => {
  if (analysis.decision === 'allow') return null;
  const settings = await getSocialAiSettings(ctx);
  const warningEnabled = settings.features.warning && settings.automaticActions.sendWarnings;
  const strikeEnabled = settings.features.strike && settings.automaticActions.addStrikes;
  const priorStrikes = strikeEnabled ? await ctx.prisma.socialAiCase.count({ where: { subjectUserId: task.subjectUserId, strikeCount: { gt: 0 } } }) : 0;
  const isStrike = analysis.recommendation === 'strike' || ['high', 'critical'].includes(analysis.severity);
  const socialCase = await ctx.prisma.socialAiCase.create({
    data: {
      subjectUserId: task.subjectUserId, sourceType: task.sourceType, sourceId: task.sourceId,
      category: analysis.category, decision: analysis.decision, severity: analysis.severity, confidence: analysis.confidence,
      recommendation: analysis.recommendation, actionTaken, status: analysis.decision === 'review' ? 'manual_review' : 'open',
      warningMessage: warningEnabled && analysis.decision !== 'allow' ? analysis.reason : null,
      strikeCount: strikeEnabled && isStrike ? priorStrikes + 1 : 0,
      evidence: { provider: analysis.provider, summary: analysis.evidenceSummary || '', context: task.context, createdAt: nowIso() }
    }
  });
  if (settings.features.notificationAutomation && warningEnabled) {
    await createSocialAiNotification(ctx, task.subjectUserId, 'social_ai_warning', 'Tiwi Community Standards notice', analysis.reason, { caseId: socialCase.id, category: analysis.category, actionTaken }).catch(() => undefined);
  }
  return socialCase;
};

const applyAutomatedAction = async (ctx, task, analysis) => {
  const settings = await getSocialAiSettings(ctx);
  if (analysis.decision !== 'violation' || analysis.confidence < settings.automaticActions.highConfidence) return null;
  const recommendation = analysis.recommendation;
  const reportedTarget = task.sourceType === 'report' ? asObject(task.context).target : null;
  const targetType = reportedTarget?.type || task.sourceType;
  const targetId = reportedTarget?.id || task.sourceId;
  if (task.sourceType === 'verification') {
    const report = await ctx.prisma.socialReport.findUnique({ where: { id: task.sourceId } });
    if (report && recommendation === 'approve_verification' && settings.automaticActions.autoApproveVerification) {
      await ctx.prisma.socialReport.update({ where: { id: report.id }, data: { status: 'resolved', resolution: 'High-confidence Social AI verification recommendation; administrator audit retained.' } });
      return 'verification_approved';
    }
    if (report && recommendation === 'reject_verification' && settings.automaticActions.autoRejectVerification) {
      await ctx.prisma.socialReport.update({ where: { id: report.id }, data: { status: 'dismissed', resolution: 'High-confidence Social AI verification recommendation; administrator audit retained.' } });
      return 'verification_rejected';
    }
    return null;
  }
  if (targetType === 'post' && settings.automaticActions.removeContent && ['remove_content', 'restrict_account'].includes(recommendation)) {
    await ctx.prisma.socialPost.update({ where: { id: targetId }, data: { status: 'removed', deletedAt: new Date(), moderationStatus: 'ai_removed', moderationReason: analysis.reason, moderationScore: analysis.confidence } });
    if (settings.automaticActions.disableMonetization) {
      const post = await ctx.prisma.socialPost.findUnique({ where: { id: targetId }, select: { metadata: true } });
      await ctx.prisma.socialPost.update({ where: { id: targetId }, data: { metadata: { ...asObject(post?.metadata), monetizationDisabled: true, monetizationDisabledReason: 'social_ai_policy', monetizationDisabledAt: nowIso() } } });
    }
    if (settings.automaticActions.restrictAccount && recommendation === 'restrict_account') {
      await ctx.prisma.user.update({ where: { id: task.subjectUserId }, data: { status: 'disabled', socialRestrictionCode: `ai_${analysis.category.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`, socialRestrictionReason: analysis.reason, socialRestrictedAt: new Date(), socialModerationScore: analysis.confidence } });
      return 'content_removed_account_restricted';
    }
    return 'content_removed';
  }
  if (targetType === 'comment' && settings.automaticActions.removeContent && ['remove_content', 'restrict_account'].includes(recommendation)) {
    await ctx.prisma.socialComment.update({ where: { id: targetId }, data: { status: 'deleted', body: '' } });
    return 'comment_removed';
  }
  return null;
};

const runAnalysisJob = async (ctx, job, settings) => {
  const feature = taskFeature(job.type, asObject(job.payload));
  const pipelineFeatures = PIPELINE_FEATURES[feature] || (feature ? [feature] : []);
  if (feature && !pipelineFeatures.some((key) => settings.features[key])) {
    return { status: 'skipped', result: { reason: `${feature} is disabled in Social AI settings.` } };
  }
  const task = await loadTaskContext(ctx, job);
  const signal = policySignals(task.text);
  let supplemental = {};
  if (job.type === 'verification_review') {
    const profile = asObject(task.context).profile || {};
    const query = [profile.name, profile.username, profile.category, profile.location].filter(Boolean).join(' ');
    try {
      const search = await searchNotability(settings, query);
      const crawl = await crawlEvidence(settings, profile.website);
      supplemental = { search, crawl };
    } catch (error) {
      throw new AppError(`Verification evidence collection is unavailable: ${asText(error?.message, 800)}`, 'SOCIAL_AI_DEPENDENCY_ERROR');
    }
  }
  let analysis = signal;
  if (!analysis || signal.confidence < 0.95) {
    try { analysis = await askPolicyModel(settings, job.type, task, supplemental); }
    catch (error) {
      if (signal) analysis = { ...signal, provider: 'policy-pattern-fallback', evidenceSummary: 'Local policy signal was recorded while the language model was unavailable.' };
      else if (error?.extensions?.code === 'SOCIAL_AI_MODEL_WARMING') throw error;
      else throw new AppError(`Social AI model is unavailable: ${asText(error?.message, 800)}`, 'SOCIAL_AI_DEPENDENCY_ERROR');
    }
  }
  const categoryFeature = CATEGORY_FEATURES[analysis.category];
  if (analysis.decision !== 'allow' && categoryFeature && !settings.features[categoryFeature]) {
    return { status: 'skipped', result: { reason: `${categoryFeature} is disabled in Social AI settings.`, analysis } };
  }
  const actionTaken = await applyAutomatedAction(ctx, task, analysis);
  const socialCase = await recordCase(ctx, task, analysis, actionTaken);
  const reportedTarget = task.sourceType === 'report' ? asObject(task.context).target : null;
  const moderationPostId = task.sourceType === 'post' ? task.sourceId : reportedTarget?.type === 'post' ? reportedTarget.id : null;
  if (moderationPostId) {
    await ctx.prisma.socialModerationEvent.create({ data: { userId: task.subjectUserId, postId: moderationPostId, targetType: task.sourceType === 'report' ? 'social_ai_report' : 'social_ai', targetId: moderationPostId, provider: analysis.provider || 'social-ai', decision: analysis.decision, category: analysis.category, score: analysis.confidence, reason: analysis.reason, evidence: { summary: analysis.evidenceSummary || '', actionTaken, caseId: socialCase?.id || null, reportId: task.sourceType === 'report' ? task.sourceId : null } } }).catch(() => undefined);
  }
  return { status: analysis.decision === 'review' ? 'manual_review' : 'completed', result: { analysis, supplemental, caseId: socialCase?.id || null, actionTaken } };
};

const delayForAttempt = (attempts) => Math.min(30 * 60_000, 5_000 * (2 ** Math.max(0, attempts - 1)));
let workerTimer = null;
let workerRunning = false;
let lastStaleRecoveryAt = 0;
let transientFailureRecoveryDone = false;

const recoverStaleSocialAiJobs = async (prisma) => {
  const now = Date.now();
  if (now - lastStaleRecoveryAt < 30_000) return 0;
  lastStaleRecoveryAt = now;
  const threshold = new Date(now - MANAGER_TIMEOUT_MS - 60_000);
  const result = await prisma.socialAiJob.updateMany({
    where: { status: 'running', lockedAt: { lt: threshold } },
    data: { status: 'queued', phase: 'recovered after worker restart', lockedAt: null, runAfter: new Date(), error: 'Recovered after an interrupted Social AI worker.' }
  });
  return result.count;
};

// Jobs that exhausted their retry count only while the previous legacy model
// endpoint or an early model load was broken are safe to retry after this
// runtime repair.  Do not reset policy/content failures in general.
const recoverTransientModelFailures = async (prisma) => {
  if (transientFailureRecoveryDone) return 0;
  transientFailureRecoveryDone = true;
  const result = await prisma.socialAiJob.updateMany({
    where: {
      status: 'failed',
      OR: [
        { error: { contains: 'llama.cpp returned 400' } },
        { error: { contains: 'llama.cpp did not return a policy JSON result' } },
        { error: { contains: 'Loading model' } }
      ]
    },
    data: {
      status: 'queued',
      attempts: 0,
      progress: 0,
      phase: 'queued after Social AI runtime repair',
      error: null,
      runAfter: new Date(),
      finishedAt: null,
      lockedAt: null
    }
  });
  return result.count;
};

const claimNextJob = async (prisma) => {
  const candidate = await prisma.socialAiJob.findFirst({ where: { status: 'queued', runAfter: { lte: new Date() } }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
  if (!candidate) return null;
  const claimed = await prisma.socialAiJob.updateMany({ where: { id: candidate.id, status: 'queued' }, data: { status: 'running', startedAt: new Date(), lockedAt: new Date(), attempts: { increment: 1 }, phase: 'running', progress: Math.max(1, candidate.progress || 0), error: null } });
  return claimed.count ? prisma.socialAiJob.findUnique({ where: { id: candidate.id } }) : null;
};

const processJob = async (ctx, job) => {
  const settings = await getSocialAiSettings(ctx);
  try {
    const managerResult = await queueMaintenance(ctx, job);
    const outcome = managerResult ? { status: 'completed', result: managerResult } : await runAnalysisJob(ctx, job, settings);
    const terminal = ['completed', 'skipped', 'manual_review'].includes(outcome.status) ? outcome.status : 'completed';
    await ctx.prisma.socialAiJob.update({ where: { id: job.id }, data: { status: terminal, progress: terminal === 'skipped' ? 100 : 100, phase: terminal.replace(/_/g, ' '), result: outcome.result || {}, finishedAt: new Date(), lockedAt: null } });
  } catch (error) {
    const message = asText(error?.message || error, 2_000);
    const current = await ctx.prisma.socialAiJob.findUnique({ where: { id: job.id }, select: { attempts: true, maxAttempts: true } });
    const waitingForModel = error?.extensions?.code === 'SOCIAL_AI_MODEL_WARMING';
    const retry = current && current.attempts < current.maxAttempts;
    await ctx.prisma.socialAiJob.update({ where: { id: job.id }, data: waitingForModel
      ? { status: 'queued', attempts: { decrement: 1 }, phase: 'waiting for local model', error: message, runAfter: new Date(Date.now() + 30_000), lockedAt: null }
      : retry
        ? { status: 'queued', phase: 'retry scheduled', error: message, runAfter: new Date(Date.now() + delayForAttempt(current.attempts)), lockedAt: null }
        : { status: 'failed', phase: 'failed', error: message, finishedAt: new Date(), lockedAt: null }
    });
  }
};

export const runSocialAiQueueOnce = async (ctx) => {
  if (workerRunning) return false;
  workerRunning = true;
  try {
    const settings = await getSocialAiSettings(ctx);
    if (!settings.enabled) return false;
    await recoverStaleSocialAiJobs(ctx.prisma);
    await recoverTransientModelFailures(ctx.prisma);
    const job = await claimNextJob(ctx.prisma);
    if (!job) return false;
    await processJob(ctx, job);
    return true;
  } finally { workerRunning = false; }
};

export const startSocialAiInfrastructure = async (ctx) => {
  const settings = await getSocialAiSettings(ctx);
  if (settings.autoBootstrap) {
    const existing = await ctx.prisma.socialAiJob.findFirst({ where: { type: 'bootstrap', status: { in: ['queued', 'running'] } } });
    if (!existing) await enqueueSocialAiTask(ctx, { type: 'bootstrap', priority: 100, maxAttempts: 2, payload: { source: 'server_start' } });
  }
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = setInterval(() => runSocialAiQueueOnce(ctx).catch((error) => console.warn('[social-ai] queue worker failed:', error?.message || error)), WORKER_DELAY_MS);
  workerTimer.unref?.();
  runSocialAiQueueOnce(ctx).catch((error) => console.warn('[social-ai] initial queue run failed:', error?.message || error));
};

export const socialAiOverview = async (ctx) => {
  await requireAdmin(ctx);
  const [settings, health, jobs, cases, counts] = await Promise.all([
    getSocialAiSettings(ctx), healthSnapshot(),
    ctx.prisma.socialAiJob.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }),
    ctx.prisma.socialAiCase.findMany({ include: { subjectUser: { select: { id: true, name: true, email: true, avatar: true } }, reviewedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 80 }),
    ctx.prisma.socialAiJob.groupBy({ by: ['status'], _count: { _all: true } })
  ]);
  const runningFeatures = FEATURE_KEYS.filter((key) => settings.features[key]);
  return {
    settings, health, catalog: { packages: SOCIAL_AI_PACKAGE_CATALOG, models: SOCIAL_AI_MODEL_CATALOG, requirements: FEATURE_REQUIREMENTS },
    jobs: jobs.map(makeJobResult), cases, queue: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
    runningFeatures, managerPath: MANAGER_PATH
  };
};

export const listAdminSocialAiJobs = async (ctx, status, limit = 100) => {
  await requireAdmin(ctx);
  const normalizedStatus = asText(status, 40).toLowerCase();
  const take = Math.floor(clamp(limit, 1, 300, 100));
  const rows = await ctx.prisma.socialAiJob.findMany({
    where: normalizedStatus ? { status: normalizedStatus } : {},
    orderBy: { createdAt: 'desc' }, take
  });
  return rows.map(makeJobResult);
};

export const listAdminSocialAiCases = async (ctx, status, limit = 100) => {
  await requireAdmin(ctx);
  const normalizedStatus = asText(status, 60).toLowerCase();
  const take = Math.floor(clamp(limit, 1, 300, 100));
  return ctx.prisma.socialAiCase.findMany({
    where: normalizedStatus ? { status: normalizedStatus } : {},
    orderBy: { createdAt: 'desc' }, take
  });
};

export const updateSocialAiSettings = async (ctx, input) => {
  const actor = await requireAdmin(ctx);
  const current = await getSocialAiSettings(ctx);
  const source = asObject(input);
  const next = normalizeSettings({
    ...current, ...removeUndefined(source),
    runtime: source.runtime === undefined ? current.runtime : { ...current.runtime, ...asObject(source.runtime) },
    features: source.features === undefined ? current.features : { ...current.features, ...asObject(source.features) },
    automaticActions: source.automaticActions === undefined ? current.automaticActions : { ...current.automaticActions, ...asObject(source.automaticActions) }
  });
  const enabledFeatures = FEATURE_KEYS.filter((key) => next.features[key] && !current.features[key]);
  await saveSocialAiSettings(ctx, next);
  await Promise.all(enabledFeatures.map((feature) => enqueueSocialAiTask(ctx, { type: 'maintenance', priority: 80, requestedById: actor.id, payload: { scope: 'feature', action: 'ensure', id: feature } })));
  await writeAudit(ctx, 'admin_update_social_ai_settings', 'systemSetting', SETTING_KEY, { enabledFeatures, enabled: next.enabled });
  return socialAiOverview(ctx);
};

const validOperation = (input) => {
  const source = asObject(input);
  const scope = asText(source.scope, 30);
  const action = asText(source.action, 30);
  const id = asText(source.id, 100);
  if (scope === 'system' && ['install_all', 'bootstrap', 'health_check', 'repair_all', 'clear_cache'].includes(action)) return { scope, action, id: action === 'health_check' ? 'health' : action === 'clear_cache' ? 'cache' : 'all' };
  if (scope === 'package' && SOCIAL_AI_PACKAGE_CATALOG.some((item) => item.id === id) && ['install', 'update', 'repair', 'enable', 'disable', 'start', 'stop', 'restart', 'autostart', 'health', 'test', 'logs'].includes(action)) return { scope, action, id };
  if (scope === 'model' && SOCIAL_AI_MODEL_CATALOG.some((item) => item.id === id) && ['download', 'resume', 'install', 'load', 'run', 'restart', 'update', 'repair', 'delete', 'default', 'autoload', 'health'].includes(action)) return { scope, action, id };
  throw new AppError('Unsupported Social AI operation', 'BAD_USER_INPUT');
};

export const operateSocialAi = async (ctx, input) => {
  const actor = await requireAdmin(ctx);
  const operation = validOperation(input);
  if (operation.scope === 'system' && operation.action === 'health_check') {
    const health = await healthSnapshot();
    await writeAudit(ctx, 'admin_social_ai_health_check', 'socialAi', 'health', { actorId: actor.id, ok: health.available });
    return { immediate: true, health };
  }
  if (operation.scope === 'package' && operation.action === 'logs') {
    const logs = await executeManager(['package', 'logs', operation.id, '--json'], { timeoutMs: 15_000 });
    await writeAudit(ctx, 'admin_social_ai_logs', 'socialAiPackage', operation.id, { actorId: actor.id, ok: logs.ok });
    return { immediate: true, logs };
  }
  const isCacheCleanup = operation.scope === 'system' && operation.action === 'clear_cache';
  const job = await enqueueSocialAiTask(ctx, {
    type: operation.scope === 'system' && !isCacheCleanup ? 'bootstrap' : 'maintenance', priority: 100, requestedById: actor.id,
    payload: operation.scope === 'system' && !isCacheCleanup ? { source: `admin_${operation.action}`, action: operation.action } : operation
  });
  await writeAudit(ctx, 'admin_social_ai_operation', `socialAi${operation.scope}`, operation.id, { action: operation.action, jobId: job.id });
  return { immediate: false, job };
};

export const resolveSocialAiCase = async (ctx, id, input = {}) => {
  const actor = await requireAdmin(ctx);
  const socialCase = await ctx.prisma.socialAiCase.findUnique({ where: { id } });
  if (!socialCase) notFound('Social AI case');
  const action = asText(asObject(input).action || 'manual_review', 80);
  const resolution = asText(asObject(input).resolution, 1_500);
  const allowed = new Set(['manual_review', 'dismiss', 'warn', 'strike', 'remove_content', 'restrict_account', 'approve_verification', 'reject_verification']);
  if (!allowed.has(action)) throw new AppError('Invalid Social AI case action', 'BAD_USER_INPUT');
  let actionTaken = action;
  const caseContext = asObject(asObject(socialCase.evidence).context);
  const reportedTarget = socialCase.sourceType === 'report' ? asObject(caseContext.target) : null;
  const targetType = reportedTarget?.type || socialCase.sourceType;
  const targetId = reportedTarget?.id || socialCase.sourceId;
  if (action === 'remove_content' && targetType === 'post' && targetId) {
    await ctx.prisma.socialPost.update({ where: { id: targetId }, data: { status: 'removed', deletedAt: new Date(), moderationStatus: 'admin_removed', moderationReason: resolution || socialCase.warningMessage } });
  }
  if (action === 'remove_content' && targetType === 'comment' && targetId) {
    await ctx.prisma.socialComment.update({ where: { id: targetId }, data: { status: 'deleted', body: '' } });
  }
  if (action === 'restrict_account') await ctx.prisma.user.update({ where: { id: socialCase.subjectUserId }, data: { status: 'disabled', socialRestrictionCode: 'social_ai_admin_action', socialRestrictionReason: resolution || socialCase.warningMessage || 'Restricted after Social AI review', socialRestrictedAt: new Date() } });
  if (action === 'approve_verification' && socialCase.sourceType === 'verification') {
    const report = socialCase.sourceId ? await ctx.prisma.socialReport.findUnique({ where: { id: socialCase.sourceId } }) : null;
    if (report) await ctx.prisma.socialReport.update({ where: { id: report.id }, data: { status: 'resolved', resolution: resolution || 'Approved after Social AI and administrator review.' } });
  }
  if (action === 'reject_verification' && socialCase.sourceType === 'verification') {
    const report = socialCase.sourceId ? await ctx.prisma.socialReport.findUnique({ where: { id: socialCase.sourceId } }) : null;
    if (report) await ctx.prisma.socialReport.update({ where: { id: report.id }, data: { status: 'dismissed', resolution: resolution || 'Not approved after Social AI and administrator review.' } });
  }
  const updated = await ctx.prisma.socialAiCase.update({ where: { id }, data: {
    actionTaken, status: action === 'manual_review' ? 'manual_review' : 'resolved', reviewedById: actor.id, resolvedAt: action === 'manual_review' ? null : new Date(),
    warningMessage: action === 'warn' ? (resolution || socialCase.warningMessage || 'A private Community Standards warning was issued.') : socialCase.warningMessage,
    strikeCount: action === 'strike' ? Math.max(1, Number(socialCase.strikeCount || 0) + 1) : socialCase.strikeCount,
    evidence: { ...asObject(socialCase.evidence), administratorResolution: resolution || null, resolvedAt: nowIso() }
  } });
  await createSocialAiNotification(ctx, socialCase.subjectUserId, action === 'warn' || action === 'strike' ? 'social_ai_warning' : 'social_ai_case_updated', action === 'warn' || action === 'strike' ? 'Tiwi Community Standards notice' : 'Your Tiwi review was updated', resolution || `A Social AI case was reviewed: ${action.replace(/_/g, ' ')}.`, { caseId: updated.id, actionTaken });
  await writeAudit(ctx, 'admin_resolve_social_ai_case', 'socialAiCase', id, { action, resolution });
  return updated;
};

export const requestSocialAiAppeal = async (ctx, id, text) => {
  if (!ctx.user) throw new AppError('Login is required', 'UNAUTHENTICATED');
  const socialCase = await ctx.prisma.socialAiCase.findUnique({ where: { id } });
  if (!socialCase || (socialCase.subjectUserId !== ctx.user.id && !isAdmin(ctx.user))) throw new AppError('Appeal case was not found', 'NOT_FOUND');
  const appealText = asText(text, 2_000);
  if (!appealText) throw new AppError('Appeal details are required', 'BAD_USER_INPUT');
  const updated = await ctx.prisma.socialAiCase.update({ where: { id }, data: { appealStatus: 'requested', appealText, status: 'appeal_pending' } });
  const settings = await getSocialAiSettings(ctx);
  if (settings.features.appeal) await enqueueSocialAiTask(ctx, { type: 'appeal_review', priority: 65, requestedById: ctx.user.id, payload: { caseId: id } });
  return updated;
};

export const getMySocialAiCases = async (ctx) => {
  if (!ctx.user) throw new AppError('Login is required', 'UNAUTHENTICATED');
  return ctx.prisma.socialAiCase.findMany({ where: { subjectUserId: ctx.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
};

export const enqueueSocialAiIfEnabled = async (ctx, feature, task) => {
  // Lightweight unit contexts intentionally omit persistent settings. The
  // production Prisma client always has this delegate; skipping here keeps a
  // normal Social write independent from a non-production queue stub.
  if (typeof ctx?.prisma?.systemSetting?.upsert !== 'function') return null;
  const settings = await getSocialAiSettings(ctx);
  const enabledPipeline = (PIPELINE_FEATURES[feature] || [feature]).some((key) => settings.features[key]);
  if (!settings.enabled || !enabledPipeline) return null;
  return enqueueSocialAiTask(ctx, task);
};
