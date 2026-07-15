import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { AppError } from '../../core/errors.js';
import { writeAudit } from '../../core/audit.js';

const explicitTextRules = [
  { category: 'sexual/minors', score: 1, pattern: /\b(?:child|minor|underage|teen)\s+(?:porn|nude|sex)\b/i },
  { category: 'sexual/explicit', score: .99, pattern: /\b(?:hardcore\s+porn|rape\s+porn|xxx\s+video|pornographic\s+video|full\s+nude\s+sex)\b/i },
  { category: 'sexual/explicit', score: .99, pattern: /(?:\u09b6\u09bf\u09b6\u09c1\s*\u09aa\u09b0\u09cd\u09a8|\u09b9\u09be\u09b0\u09cd\u09a1\u0995\u09cb\u09b0\s*\u09aa\u09b0\u09cd\u09a8|\u09a7\u09b0\u09cd\u09b7\u09a3\s*\u09aa\u09b0\u09cd\u09a8|\u09a8\u0997\u09cd\u09a8\s*\u09b8\u09c7\u0995\u09cd\u09b8)/iu },
  { category: 'sexual/explicit', score: .98, pattern: /(?:চাইল্ড\s*পর্ন|শিশু\s*পর্ন|হার্ডকোর\s*পর্ন|ধর্ষণ\s*পর্ন|নগ্ন\s*সেক্স)/iu }
];

const likelihoodScore = Object.freeze({ UNKNOWN: 0, VERY_UNLIKELY: .02, UNLIKELY: .12, POSSIBLE: .45, LIKELY: .78, VERY_LIKELY: .98 });
const severity = Object.freeze({ allow: 0, review: 1, block: 2 });

const normalizeDecision = (value = {}) => {
  const decision = ['allow', 'review', 'block'].includes(String(value.decision || '').toLowerCase())
    ? String(value.decision).toLowerCase()
    : 'review';
  return {
    decision,
    category: String(value.category || 'unclassified').slice(0, 120),
    score: Math.max(0, Math.min(Number(value.score) || 0, 1)),
    reason: String(value.reason || 'Automated content review').slice(0, 1000),
    provider: String(value.provider || 'policy-engine').slice(0, 80),
    evidence: value.evidence && typeof value.evidence === 'object' ? value.evidence : {}
  };
};

const strongest = (values) => values.map(normalizeDecision).sort((left, right) => (
  severity[right.decision] - severity[left.decision] || right.score - left.score
))[0] || normalizeDecision({ decision: 'allow', reason: 'No policy violation detected' });

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true });
  let details = '';
  child.stderr.on('data', (chunk) => { details = `${details}${chunk}`.slice(-4000); });
  child.once('error', reject);
  child.once('close', (code) => code === 0 ? resolve() : reject(new Error(details || `${command} failed`)));
});

const imagePayload = async (filePath) => {
  const image = sharp(filePath, { failOn: 'error', limitInputPixels: 80_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new AppError('The image could not be decoded', 'BAD_USER_INPUT');
  const content = await image.autoOrient().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return { content: content.toString('base64'), metadata: { width: metadata.width, height: metadata.height, format: metadata.format, pages: metadata.pages || 1 } };
};

const videoPayloads = async (filePath) => {
  const tempDir = join(dirname(filePath), `.moderation-${randomBytes(8).toString('hex')}`);
  await mkdir(tempDir, { recursive: true });
  const pattern = join(tempDir, 'frame-%02d.jpg');
  try {
    await run(process.env.SOCIAL_FFMPEG_PATH || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', filePath,
      '-vf', 'fps=1/12,scale=960:-2:force_original_aspect_ratio=decrease', '-frames:v', '6', '-q:v', '4', pattern
    ]);
    const frames = [];
    for (let index = 1; index <= 6; index += 1) {
      const frame = join(tempDir, `frame-${String(index).padStart(2, '0')}.jpg`);
      try { frames.push({ content: (await readFile(frame)).toString('base64'), metadata: { frame: index } }); } catch { /* no frame */ }
    }
    if (!frames.length) throw new Error('No video frames could be decoded');
    return frames;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
};

const googleSafeSearch = async (payload, thresholds) => {
  const key = String(process.env.GOOGLE_CLOUD_VISION_API_KEY || '').trim();
  if (!key) return null;
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: payload.content }, features: [{ type: 'SAFE_SEARCH_DETECTION' }] }] }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Google SafeSearch returned ${response.status}`);
  const annotation = (await response.json())?.responses?.[0]?.safeSearchAnnotation || {};
  const adult = likelihoodScore[annotation.adult] || 0;
  const racy = likelihoodScore[annotation.racy] || 0;
  if (adult >= thresholds.explicit) return normalizeDecision({ decision: 'block', category: 'sexual/explicit', score: adult, reason: 'High-confidence explicit adult nudity detected', provider: 'google-safe-search', evidence: { adult: annotation.adult, racy: annotation.racy } });
  if (adult >= thresholds.review) return normalizeDecision({ decision: 'review', category: 'sexual/possible', score: adult, reason: 'Possible explicit nudity requires review', provider: 'google-safe-search', evidence: { adult: annotation.adult, racy: annotation.racy } });
  return normalizeDecision({ decision: 'allow', category: racy >= .95 ? 'swimwear-or-suggestive' : 'safe', score: adult, reason: 'No high-confidence explicit nudity detected', provider: 'google-safe-search', evidence: { adult: annotation.adult, racy: annotation.racy } });
};

const moderationWebhook = async ({ payload, mimeType, targetType }) => {
  const url = String(process.env.SOCIAL_MODERATION_WEBHOOK_URL || '').trim();
  if (!url) return null;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(process.env.SOCIAL_MODERATION_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.SOCIAL_MODERATION_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ targetType, mimeType, imageBase64: payload.content, metadata: payload.metadata }),
    signal: AbortSignal.timeout(25_000)
  });
  if (!response.ok) throw new Error(`Moderation provider returned ${response.status}`);
  return normalizeDecision({ ...(await response.json()), provider: 'moderation-webhook' });
};

export const moderateText = (text) => {
  const value = String(text || '');
  const match = explicitTextRules.find((rule) => rule.pattern.test(value));
  return match
    ? normalizeDecision({ decision: 'block', category: match.category, score: match.score, reason: 'Explicit pornographic solicitation or prohibited sexual content detected', provider: 'tiwlo-policy-engine', evidence: { rule: match.category } })
    : normalizeDecision({ decision: 'allow', category: 'text-safe', score: 0, reason: 'No high-confidence explicit text rule matched', provider: 'tiwlo-policy-engine' });
};

export const moderateMediaFile = async ({ filePath, mimeType, targetType = 'media', thresholds = {} }) => {
  if (!/^(image|video)\//i.test(String(mimeType || ''))) return normalizeDecision({ decision: 'allow', category: 'non-visual-media', score: 0, reason: 'No visual moderation required', provider: 'sharp-media-inspector' });
  const payloads = String(mimeType || '').startsWith('video/') ? await videoPayloads(filePath) : [await imagePayload(filePath)];
  const decisions = [];
  const classifierConfigured = Boolean(String(process.env.GOOGLE_CLOUD_VISION_API_KEY || '').trim() || String(process.env.SOCIAL_MODERATION_WEBHOOK_URL || '').trim());
  const configuredThresholds = {
    explicit: Math.max(.8, Math.min(Number(thresholds.explicit) || .95, 1)),
    review: Math.max(.5, Math.min(Number(thresholds.review) || .72, .95))
  };
  for (const payload of payloads) {
    const providers = await Promise.allSettled([googleSafeSearch(payload, configuredThresholds), moderationWebhook({ payload, mimeType, targetType })]);
    providers.forEach((result) => { if (result.status === 'fulfilled' && result.value) decisions.push(result.value); });
  }
  if (!decisions.length && classifierConfigured) return normalizeDecision({ decision: 'review', category: 'classifier-unavailable', score: 0, reason: 'The configured visual classifier was unavailable; publication requires review', provider: 'moderation-fail-safe', evidence: { frames: payloads.length } });
  if (!decisions.length) return normalizeDecision({ decision: 'allow', category: 'file-validated', score: 0, reason: 'Media decoded safely; no remote classifier is configured', provider: 'sharp-media-inspector', evidence: { frames: payloads.length } });
  return strongest(decisions);
};

export const recordModerationDecision = async (ctx, { userId, postId, targetType, targetId, result }) => {
  const normalized = normalizeDecision(result);
  const event = await ctx.prisma.socialModerationEvent.create({ data: {
    userId, postId: postId || null, targetType, targetId: targetId || null, provider: normalized.provider,
    decision: normalized.decision, category: normalized.category, score: normalized.score, reason: normalized.reason, evidence: normalized.evidence
  } });
  if (normalized.decision === 'block') {
    await ctx.prisma.user.update({ where: { id: userId }, data: {
      status: 'disabled', socialRestrictionCode: `auto_${normalized.category.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      socialRestrictionReason: normalized.reason, socialRestrictedAt: new Date(), socialModerationScore: normalized.score
    } });
    if (postId) await ctx.prisma.socialPost.update({ where: { id: postId }, data: { status: 'rejected', moderationStatus: 'blocked', moderationReason: normalized.reason, moderationScore: normalized.score } }).catch(() => undefined);
    await writeAudit({ ...ctx, user: ctx.user || { id: userId } }, 'auto_disable_social_user', 'user', userId, { moderationEventId: event.id, category: normalized.category, score: normalized.score, reason: normalized.reason });
  }
  return { ...normalized, eventId: event.id };
};

export const enforceTextModeration = async (ctx, { userId, text, targetType, targetId }) => {
  const result = moderateText(text);
  if (result.decision === 'block') {
    await recordModerationDecision(ctx, { userId, targetType, targetId, result });
    throw new AppError('This content violates Tiwi sexual-safety rules. The account was disabled and sent for administrator review.', 'FORBIDDEN');
  }
  return result;
};
