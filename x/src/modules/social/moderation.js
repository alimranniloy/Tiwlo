import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { AppError } from '../../core/errors.js';
import { writeAudit } from '../../core/audit.js';
import { resolveSocialFfmpegPath } from './ffmpeg.js';
import { requestSocialGeminiJson } from './gemini.js';

const explicitTextRules = [
  { category: 'sexual/explicit', score: .99, pattern: /\b(?:porn|porno|pornographic|hardcore|xxx|nudes?|naked|boobs?|tits?|pussy|blowjob|sex\s*video|rape\s*porn)\b/i },
  { category: 'sexual/explicit', score: .99, pattern: /(?:\u09aa\u09b0\u09cd\u09a8|\u09a8\u09c1\u09a1|\u09a8\u0997\u09cd\u09a8|\u09ac\u09c1\u09ac\u09b8|\u09b8\u09c7\u0995\u09cd\u09b8\s*\u09ad\u09bf\u09a1\u09bf\u0993)/iu },
  { category: 'sexual/minors', score: 1, pattern: /\b(?:child|minor|underage|teen)\s+(?:porn|nude|sex)\b/i },
  { category: 'sexual/explicit', score: .99, pattern: /\b(?:hardcore\s+porn|rape\s+porn|xxx\s+video|pornographic\s+video|full\s+nude\s+sex)\b/i },
  { category: 'sexual/explicit', score: .99, pattern: /(?:\u09b6\u09bf\u09b6\u09c1\s*\u09aa\u09b0\u09cd\u09a8|\u09b9\u09be\u09b0\u09cd\u09a1\u0995\u09cb\u09b0\s*\u09aa\u09b0\u09cd\u09a8|\u09a7\u09b0\u09cd\u09b7\u09a3\s*\u09aa\u09b0\u09cd\u09a8|\u09a8\u0997\u09cd\u09a8\s*\u09b8\u09c7\u0995\u09cd\u09b8)/iu },
  { category: 'sexual/explicit', score: .98, pattern: /(?:চাইল্ড\s*পর্ন|শিশু\s*পর্ন|হার্ডকোর\s*পর্ন|ধর্ষণ\s*পর্ন|নগ্ন\s*সেক্স)/iu }
];

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

// Kept only as a deterministic compatibility helper for historic moderation
// records/tests. It no longer loads TensorFlow or an on-server NSFW model.
export const decisionFromNsfwPredictions = (predictions = [], thresholds = {}) => {
  const scores = Object.fromEntries(predictions.map((item) => [String(item.className || '').toLowerCase(), Number(item.probability) || 0]));
  const porn = scores.porn || 0;
  const hentai = scores.hentai || 0;
  const sexy = scores.sexy || 0;
  const explicit = Math.min(1, porn + hentai);
  const blockAt = Math.min(Math.max(Number(thresholds.explicit) || .68, .6), .95);
  const reviewAt = Math.min(Math.max(Number(thresholds.review) || .38, .25), .8);
  const sexyBlockAt = Math.min(Math.max(Number(thresholds.sexyBlock) || .88, .72), .98);
  const evidence = { porn, hentai, sexy, neutral: scores.neutral || 0, drawing: scores.drawing || 0 };
  if (porn >= blockAt || hentai >= blockAt || explicit >= blockAt || sexy >= sexyBlockAt) {
    return normalizeDecision({ decision: 'block', category: 'sexual/explicit', score: Math.max(porn, hentai, explicit, sexy), reason: 'Pornographic, nude, or explicitly sexual media was detected by Tiwi automated safety', provider: 'legacy-score-compat', evidence });
  }
  if (explicit >= reviewAt || sexy >= .45) {
    return normalizeDecision({ decision: 'review', category: 'sexual/possible', score: Math.max(explicit, sexy), reason: 'Possible nude or sexually suggestive media requires administrator review before publication', provider: 'legacy-score-compat', evidence });
  }
  return normalizeDecision({ decision: 'allow', category: 'safe', score: Math.max(explicit, sexy * .25), reason: 'Historic classifier score contains no prohibited explicit content', provider: 'legacy-score-compat', evidence });
};

const geminiVisualClassification = async (payload, targetType, thresholds) => {
  const { json, model } = await requestSocialGeminiJson({
    systemInstruction: [
      'You are Tiwi Social Safety Vision. Classify only the supplied media.',
      'Return exactly one JSON object: decision (allow, review, block), category, score (0..1), reason, evidenceSummary.',
      'Block explicit nudity, pornography, sexual content involving minors, graphic violence, weapon/drug sale, or credible self-harm imagery.',
      'Use review for uncertain or context-dependent material. Never invent facts outside the image.'
    ].join(' '),
    prompt: `Review this ${targetType}. The configured explicit threshold is ${thresholds.explicit}.`,
    inlineParts: [{ inline_data: { mime_type: 'image/jpeg', data: payload.content } }],
    maxOutputTokens: 260
  });
  const decision = String(json.decision || '').toLowerCase() === 'violation' ? 'block' : String(json.decision || '').toLowerCase();
  return normalizeDecision({
    decision: ['allow', 'review', 'block'].includes(decision) ? decision : 'review',
    category: json.category || 'visual-review',
    score: json.score ?? json.confidence,
    reason: json.reason || 'Gemini completed a visual safety review.',
    provider: `gemini-${model}`,
    evidence: { frame: payload.metadata?.frame || null, summary: String(json.evidenceSummary || '').slice(0, 700) }
  });
};

const videoPayloads = async (filePath) => {
  const tempDir = join(dirname(filePath), `.moderation-${randomBytes(8).toString('hex')}`);
  await mkdir(tempDir, { recursive: true });
  const pattern = join(tempDir, 'frame-%02d.jpg');
  try {
    await run(resolveSocialFfmpegPath(), [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', filePath,
      '-vf', 'select=eq(n\\,0)+gte(t-prev_selected_t\\,8),scale=960:-2:force_original_aspect_ratio=decrease',
      '-fps_mode', 'vfr', '-frames:v', '4', '-q:v', '4', pattern
    ]);
    const frames = [];
    for (let index = 1; index <= 4; index += 1) {
      const frame = join(tempDir, `frame-${String(index).padStart(2, '0')}.jpg`);
      try { frames.push({ content: (await readFile(frame)).toString('base64'), metadata: { frame: index } }); } catch { /* no frame */ }
    }
    if (!frames.length) throw new Error('No video frames could be decoded');
    return frames;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
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
  const configuredThresholds = {
    explicit: Math.max(.6, Math.min(Number(thresholds.explicit) || .68, .95)),
    review: Math.max(.25, Math.min(Number(thresholds.review) || .38, .8)),
    sexyBlock: Math.max(.72, Math.min(Number(thresholds.sexyBlock) || .88, .98))
  };
  for (const payload of payloads) {
    const providers = await Promise.allSettled([geminiVisualClassification(payload, targetType, configuredThresholds), moderationWebhook({ payload, mimeType, targetType })]);
    providers.forEach((result) => { if (result.status === 'fulfilled' && result.value) decisions.push(result.value); });
  }
  if (!decisions.length) return normalizeDecision({ decision: 'review', category: 'classifier-unavailable', score: 0, reason: 'Gemini visual moderation was unavailable; publication requires administrator review', provider: 'moderation-fail-safe', evidence: { frames: payloads.length } });
  return strongest(decisions);
};

export const recordModerationDecision = async (ctx, { userId, postId, targetType, targetId, result, disableUser = true }) => {
  const normalized = normalizeDecision(result);
  const event = await ctx.prisma.socialModerationEvent.create({ data: {
    userId, postId: postId || null, targetType, targetId: targetId || null, provider: normalized.provider,
    decision: normalized.decision, category: normalized.category, score: normalized.score, reason: normalized.reason, evidence: normalized.evidence
  } });
  if (normalized.decision === 'block' && disableUser) {
    await ctx.prisma.user.update({ where: { id: userId }, data: {
      status: 'disabled', socialRestrictionCode: `auto_${normalized.category.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      socialRestrictionReason: normalized.reason, socialRestrictedAt: new Date(), socialModerationScore: normalized.score
    } });
    if (postId) await ctx.prisma.socialPost.update({ where: { id: postId }, data: { status: 'rejected', moderationStatus: 'blocked', moderationReason: normalized.reason, moderationScore: normalized.score } }).catch(() => undefined);
    await writeAudit({ ...ctx, user: ctx.user || { id: userId } }, 'auto_disable_social_user', 'user', userId, { moderationEventId: event.id, category: normalized.category, score: normalized.score, reason: normalized.reason });
  } else if (normalized.decision === 'block') {
    if (postId) await ctx.prisma.socialPost.update({ where: { id: postId }, data: { status: 'rejected', moderationStatus: 'blocked', moderationReason: normalized.reason, moderationScore: normalized.score } }).catch(() => undefined);
    await writeAudit({ ...ctx, user: ctx.user || { id: userId } }, 'auto_block_social_media', targetType, targetId || userId, { moderationEventId: event.id, category: normalized.category, score: normalized.score, reason: normalized.reason });
  }
  return { ...normalized, eventId: event.id };
};

let moderationBackfillRunning = false;

const localSocialMediaPath = (rootDir, authorId, value) => {
  let pathname = '';
  try { pathname = new URL(String(value || ''), 'https://tiwlo.invalid').pathname; } catch { return null; }
  const newPrefix = `/api/tiwi/media/files/${authorId}/`;
  const legacyPrefix = `/api/social/media/files/${authorId}/`;
  const prefix = pathname.startsWith(newPrefix) ? newPrefix : pathname.startsWith(legacyPrefix) ? legacyPrefix : null;
  if (!pathname.startsWith(prefix)) return null;
  let relativePath = '';
  try { relativePath = decodeURIComponent(pathname.slice(prefix.length)).replace(/^[/\\]+/, ''); } catch { return null; }
  if (!relativePath || relativePath.includes('..')) return null;
  const mediaRoots = prefix === newPrefix
    ? [resolve(rootDir, '.data', 'Tiwi', 'social', 'media', 'users')]
    : [
      resolve(rootDir, '.data', 'Tiwi', 'social', 'media', 'legacy'),
      resolve(rootDir, 'public', 'uploads', 'social')
    ];
  for (const mediaRoot of mediaRoots) {
    const directory = resolve(mediaRoot, authorId);
    const filePath = resolve(directory, relativePath);
    if (filePath.startsWith(`${directory}${sep}`)) return filePath;
  }
  return null;
};

const removeModeratedAsset = async (filePath) => {
  await rm(filePath, { force: true }).catch(() => undefined);
  await rm(join(dirname(filePath), `${basename(filePath)}-hls`), { recursive: true, force: true }).catch(() => undefined);
};

const backfillPostModeration = async ({ prisma, rootDir }, post) => {
  const visualMedia = (Array.isArray(post.media) ? post.media : []).filter((item) => ['image', 'video'].includes(String(item?.type || '').toLowerCase()));
  const evaluated = [];
  for (const item of visualMedia) {
    const filePath = localSocialMediaPath(rootDir, post.authorId, item?.url);
    if (!filePath) continue;
    const exists = await access(filePath).then(() => true, () => false);
    if (!exists) continue;
    const mimeType = String(item.type).toLowerCase() === 'video' ? 'video/mp4' : 'image/jpeg';
    const result = await moderateMediaFile({ filePath, mimeType, targetType: 'post-backfill' }).catch((error) => normalizeDecision({
      decision: 'review', category: 'classifier-unavailable', score: 0,
      reason: `Existing media requires administrator review: ${String(error?.message || error).slice(0, 700)}`,
      provider: 'moderation-fail-safe-v2-mid'
    }));
    evaluated.push({
      filePath,
      result: result.provider === 'moderation-fail-safe' ? { ...result, provider: 'moderation-fail-safe-v2-mid' } : result
    });
  }
  const overall = strongest(evaluated.map((item) => item.result));
  const finalResult = evaluated.length ? overall : normalizeDecision({
    decision: 'allow', category: 'no-visual-media', score: 0,
    reason: 'No locally stored visual media required a backfill scan', provider: 'moderation-backfill-v2-mid'
  });
  await recordModerationDecision(
    { prisma, user: { id: post.authorId } },
    { userId: post.authorId, postId: post.id, targetType: 'post-backfill', targetId: post.id, result: finalResult }
  );
  if (finalResult.decision === 'block') {
    await Promise.all(evaluated.filter((item) => item.result.decision === 'block').map((item) => removeModeratedAsset(item.filePath)));
  } else if (finalResult.decision === 'review') {
    await prisma.socialPost.update({ where: { id: post.id }, data: {
      moderationStatus: 'pending_review', moderationReason: finalResult.reason, moderationScore: finalResult.score
    } }).catch(() => undefined);
  } else {
    await prisma.socialPost.update({ where: { id: post.id }, data: {
      moderationStatus: 'approved', moderationReason: null, moderationScore: finalResult.score
    } }).catch(() => undefined);
  }
};

export const startSocialModerationBackfill = async ({ prisma, rootDir, batchSize = 20 }) => {
  if (moderationBackfillRunning) return;
  moderationBackfillRunning = true;
  try {
    while (true) {
      const posts = await prisma.socialPost.findMany({
        where: {
          status: 'published',
          OR: [
            { moderationEvents: { none: {} } },
            {
              moderationStatus: 'pending_review',
              moderationEvents: {
                some: { provider: { in: ['moderation-fail-safe', 'moderation-backfill'] } },
                none: { provider: { notIn: ['moderation-fail-safe', 'moderation-backfill'] } }
              }
            },
            {
              moderationStatus: 'approved',
              moderationEvents: {
                some: { provider: { startsWith: 'legacy-score-' } },
                none: { provider: { in: ['gemini-gemini-flash-latest', 'moderation-backfill-v2-mid'] } }
              }
            }
          ]
        },
        select: { id: true, authorId: true, media: true },
        orderBy: { publishedAt: 'asc' },
        take: Math.max(1, Math.min(Number(batchSize) || 20, 50))
      });
      if (!posts.length) break;
      for (const post of posts) {
        await backfillPostModeration({ prisma, rootDir }, post).catch(async (error) => {
          console.warn('[social-moderation] backfill post failed:', post.id, error?.message || error);
          const result = normalizeDecision({
            decision: 'review', category: 'backfill-failed', score: 0,
            reason: 'Existing media could not be classified and requires administrator review', provider: 'moderation-fail-safe-v2-mid',
            evidence: { error: String(error?.message || error).slice(0, 500) }
          });
          await recordModerationDecision(
            { prisma, user: { id: post.authorId } },
            { userId: post.authorId, postId: post.id, targetType: 'post-backfill', targetId: post.id, result }
          ).catch(() => undefined);
          await prisma.socialPost.update({ where: { id: post.id }, data: {
            moderationStatus: 'pending_review', moderationReason: result.reason, moderationScore: 0
          } }).catch(() => undefined);
        });
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 125));
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
    }
  } finally {
    moderationBackfillRunning = false;
  }
};

export const enforceTextModeration = async (ctx, { userId, text, targetType, targetId }) => {
  const result = moderateText(text);
  if (result.decision === 'block') {
    await recordModerationDecision(ctx, { userId, targetType, targetId, result });
    throw new AppError('This content violates Tiwi sexual-safety rules. The account was disabled and sent for administrator review.', 'FORBIDDEN');
  }
  return result;
};
