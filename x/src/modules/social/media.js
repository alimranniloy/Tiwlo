import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { extname, join } from 'node:path';
import { appendFile, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import express from 'express';
import multer from 'multer';
import { getSettings } from './service.js';
import { moderateMediaFile, recordModerationDecision } from './moderation.js';
import { resolveSocialFfmpegPath } from './ffmpeg.js';
import { inspectAudioRights } from './audioFingerprint.js';

const safeId = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
const safeProcessingId = (value) => String(value || '').replace(/[^a-zA-Z0-9._-]/g, '');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.mkv', '.webm', '.m4v', '.mp3', '.m4a', '.aac', '.wav', '.ogg', '.pdf']);
const restrictedUserStatuses = new Set(['disabled', 'banned', 'blocked', 'suspended']);
const isAllowedMime = (mime = '') => /^(image|video|audio)\//i.test(mime) || mime === 'application/pdf' || mime === 'application/octet-stream';
const chunkBytes = 768 * 1024;

const sniffMediaMime = async (filePath, claimedMime, filename, kind) => {
  const claimed = String(claimedMime || '').trim().toLowerCase();
  if (/^(image|video)\//.test(claimed)) return claimed;
  const handle = await open(filePath, 'r');
  const header = Buffer.alloc(32);
  try { await handle.read(header, 0, header.length, 0); } finally { await handle.close(); }
  if (header[0] === 0xff && header[1] === 0xd8) return 'image/jpeg';
  if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (header.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (header.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  if (/\.(?:mp4|mov|mkv|webm|m4v)$/i.test(filename) || /^(?:reel|video)$/i.test(String(kind || ''))) return 'video/mp4';
  return claimed;
};

const runProcess = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true });
  let details = '';
  child.stderr.on('data', (chunk) => {
    details = `${details}${chunk}`.slice(-12000);
  });
  child.once('error', reject);
  child.once('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(details.trim() || `${command} exited with code ${code}`));
  });
});

const probeVideoDimensions = (command, inputPath) => new Promise((resolve) => {
  const child = spawn(command, ['-hide_banner', '-i', inputPath], { windowsHide: true });
  let details = '';
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    const match = details.match(/Video:.*?(\d{2,5})x(\d{2,5})(?:[\s,])/s);
    resolve(match ? { width: Number(match[1]), height: Number(match[2]) } : null);
  };
  child.stderr.on('data', (chunk) => { details = `${details}${chunk}`.slice(-24000); });
  child.once('error', finish);
  child.once('close', finish);
});

const writeStatus = async (file, value) => {
  await writeFile(file, JSON.stringify({ ...value, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
};

const transcodeVideo = async ({ inputPath, outputDir, publicBase, statusFile }) => {
  const ffmpeg = resolveSocialFfmpegPath();
  let thumbnailReady = false;
  const qualityLadder = [
    { name: '120p', height: 120, bandwidth: 180000 },
    { name: '240p', height: 240, bandwidth: 350000 },
    { name: '320p', height: 320, bandwidth: 600000 },
    { name: '480p', height: 480, bandwidth: 1200000 },
    { name: '720p', height: 720, bandwidth: 2500000 },
    { name: '1080p', height: 1080, bandwidth: 5000000 },
    { name: '1440p', height: 1440, bandwidth: 9000000 },
    { name: '2160p', height: 2160, bandwidth: 18000000 }
  ];
  const dimensions = await probeVideoDimensions(ffmpeg, inputPath);
  const sourceHeight = Number(dimensions?.height || 0);
  const qualities = sourceHeight > 0
    ? qualityLadder.filter((quality) => quality.height <= sourceHeight)
    : qualityLadder;
  if (!qualities.length) qualities.push(qualityLadder[0]);
  try {
    await mkdir(outputDir, { recursive: true });
    await writeStatus(statusFile, { status: 'processing', progress: 2, sourceUrl: publicBase.sourceUrl, hlsUrl: publicBase.hlsUrl, thumbnailUrl: null });
    const thumbnailPath = join(outputDir, 'thumbnail.jpg');
    try {
      await runProcess(ffmpeg, [
        '-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', inputPath,
        '-frames:v', '1', '-vf', 'scale=960:-2:force_original_aspect_ratio=decrease', '-q:v', '3', thumbnailPath
      ]);
      thumbnailReady = true;
    } catch {
      try {
        await runProcess(ffmpeg, [
          '-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
          '-frames:v', '1', '-vf', 'scale=960:-2:force_original_aspect_ratio=decrease', '-q:v', '3', thumbnailPath
        ]);
        thumbnailReady = true;
      } catch {
        thumbnailReady = false;
      }
    }
    await writeStatus(statusFile, {
      status: 'processing',
      progress: 5,
      sourceUrl: publicBase.sourceUrl,
      hlsUrl: publicBase.hlsUrl,
      thumbnailUrl: thumbnailReady ? publicBase.thumbnailUrl : null
    });
    for (let index = 0; index < qualities.length; index += 1) {
      const quality = qualities[index];
      const qualityDir = join(outputDir, quality.name);
      await mkdir(qualityDir, { recursive: true });
      await runProcess(ffmpeg, [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
        '-vf', `scale=-2:min(${quality.height}\\,ih)`,
        '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'veryfast', '-crf', '23',
        '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
        '-c:a', 'aac', '-b:a', quality.height <= 320 ? '64k' : quality.height < 720 ? '96k' : '128k', '-ac', '2',
        '-hls_time', '4', '-hls_playlist_type', 'vod', '-hls_flags', 'independent_segments',
        '-hls_segment_filename', join(qualityDir, 'segment-%05d.ts'),
        join(qualityDir, 'index.m3u8')
      ]);
      await writeStatus(statusFile, {
        status: 'processing',
        progress: Math.round(((index + 1) / qualities.length) * 90),
        sourceUrl: publicBase.sourceUrl,
        hlsUrl: publicBase.hlsUrl,
        thumbnailUrl: thumbnailReady ? publicBase.thumbnailUrl : null
      });
    }
    const master = ['#EXTM3U', '#EXT-X-VERSION:3'];
    for (const quality of qualities) {
      master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},AVERAGE-BANDWIDTH=${Math.round(quality.bandwidth * 0.82)}`);
      master.push(`${quality.name}/index.m3u8`);
    }
    await writeFile(join(outputDir, 'master.m3u8'), `${master.join('\n')}\n`, 'utf8');
    await writeStatus(statusFile, {
      status: 'ready',
      progress: 100,
      sourceUrl: publicBase.sourceUrl,
      hlsUrl: publicBase.hlsUrl,
      thumbnailUrl: thumbnailReady ? publicBase.thumbnailUrl : null,
      qualities: qualities.map((quality) => quality.name)
    });
  } catch (error) {
    await writeStatus(statusFile, {
      status: 'failed',
      progress: 0,
      sourceUrl: publicBase.sourceUrl,
      hlsUrl: null,
      thumbnailUrl: thumbnailReady ? publicBase.thumbnailUrl : null,
      error: String(error?.message || error).slice(0, 1000)
    }).catch(() => undefined);
  }
};

export const registerSocialRoutes = (app, { prisma, userFromRequest, rootDir }) => {
  const uploadRoot = join(rootDir, 'public', 'uploads', 'social');
  const maxBytes = Math.max(1, Math.min(Number(process.env.SOCIAL_MEDIA_MAX_MB || 2048), 2048)) * 1024 * 1024;
  const storage = multer.diskStorage({
    destination: (req, _file, callback) => {
      const directory = join(uploadRoot, safeId(req.socialUser?.id));
      mkdir(directory, { recursive: true }).then(() => callback(null, directory)).catch(callback);
    },
    filename: (_req, file, callback) => {
      const original = extname(file.originalname || '').toLowerCase();
      const extension = allowedExtensions.has(original) ? original : '';
      callback(null, `${Date.now()}-${randomBytes(12).toString('hex')}${extension}`);
    }
  });
  const upload = multer({
    storage,
    limits: { fileSize: maxBytes, files: 1, fields: 20 },
    fileFilter: (_req, file, callback) => callback(isAllowedMime(file.mimetype) ? null : new Error('Unsupported media type'), isAllowedMime(file.mimetype))
  });

  const authenticate = async (req, res, next) => {
    try {
      const user = await userFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (restrictedUserStatuses.has(String(user.status || '').trim().toLowerCase())) {
        res.status(403).json({ error: 'This account cannot upload media' });
        return;
      }
      if (user.signupSource === 'social_app' && !user.emailVerifiedAt) {
        res.status(403).json({ error: 'Verify your email before uploading media' });
        return;
      }
      req.socialUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };

  const finishUpload = async ({ user, userId, filename, filePath, mimeType, size, kind }) => {
    const publicRoot = '/api/social/media/files';
    const sourceUrl = `${publicRoot}/${userId}/${filename}`;
    const inspectedMimeType = await sniffMediaMime(filePath, mimeType, filename, kind);
    const isVideo = inspectedMimeType.startsWith('video/');
    const settings = await getSettings({ prisma });
    const processingId = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const outputName = `${processingId}-hls`;
    const outputDir = join(uploadRoot, userId, outputName);
    const statusFile = join(outputDir, 'status.json');
    const hlsUrl = `${publicRoot}/${userId}/${outputName}/master.m3u8`;
    const thumbnailUrl = `${publicRoot}/${userId}/${outputName}/thumbnail.jpg`;
    const visualModeration = await moderateMediaFile({
      filePath, mimeType: inspectedMimeType, targetType: boundedKind(kind),
      thresholds: {
        explicit: settings.moderation?.explicitThreshold,
        review: settings.moderation?.reviewThreshold,
        sexyBlock: settings.moderation?.sexyBlockThreshold
      }
    });
    const audioRights = await inspectAudioRights({ filePath, mimeType: inspectedMimeType });
    const moderation = audioRights?.decision === 'block' || audioRights?.decision === 'review' ? audioRights : visualModeration;
    await recordModerationDecision(
      { prisma, user },
      {
        userId,
        targetType: boundedKind(kind),
        targetId: processingId,
        result: moderation,
        disableUser: moderation.category !== 'copyright/match' && settings.moderation?.autoDisableExplicit !== false
      }
    );
    if (moderation.decision === 'block') {
      await rm(filePath, { force: true }).catch(() => undefined);
      const copyright = moderation.category === 'copyright/match';
      const accountAction = copyright ? 'The media was permanently deleted because its audio matches protected content.' : settings.moderation?.autoDisableExplicit === false ? 'The media was permanently deleted.' : 'The media was permanently deleted and the account was disabled for administrator review.';
      throw new Error(`MEDIA_BLOCKED: ${copyright ? 'Protected audio was detected.' : 'Explicit sexual content detected.'} ${accountAction}`);
    }
    if (moderation.decision === 'review') {
      await rm(filePath, { force: true }).catch(() => undefined);
      throw new Error(moderation.category === 'copyright/match'
        ? 'MEDIA_REVIEW: The audio matches a protected reference and requires rights review. It was not published.'
        : 'MEDIA_REVIEW: This upload may contain nudity or sexually suggestive content. It was not published and was removed for safety.');
    }
    if (isVideo && settings.autoTranscode) {
      await mkdir(outputDir, { recursive: true });
      await writeStatus(statusFile, { status: 'queued', progress: 0, sourceUrl, hlsUrl, thumbnailUrl: null });
      setImmediate(() => {
        transcodeVideo({
          inputPath: filePath,
          outputDir,
          statusFile,
          publicBase: { sourceUrl, hlsUrl, thumbnailUrl }
        });
      });
    }
    return {
      ok: true,
      processingId,
      kind: boundedKind(kind),
      mimeType: inspectedMimeType,
      size,
      sourceUrl,
      hlsUrl: isVideo && settings.autoTranscode ? hlsUrl : null,
      thumbnailUrl: null,
      processingStatus: isVideo && settings.autoTranscode ? 'queued' : 'ready'
    };
  };

  app.use('/api/social/media/files', express.static(uploadRoot, {
    dotfiles: 'deny',
    fallthrough: false,
    index: false,
    maxAge: '1d',
    immutable: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  }));

  app.get('/api/social/config', authenticate, async (req, res) => {
    const settings = await getSettings({ prisma });
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      enabled: settings.enabled,
      features: {
        posts: settings.postingEnabled,
        messages: settings.messagingEnabled,
        calls: settings.callsEnabled,
        live: settings.liveEnabled
      },
      mediaMaxMb: settings.mediaMaxMb,
      autoTranscode: settings.autoTranscode,
      stunServers: settings.stunServers,
      graphqlUrl: '/graphql',
      uploadUrl: '/api/social/media'
    });
  });

  app.post('/api/social/media', authenticate, (req, res) => {
    upload.single('file')(req, res, async (error) => {
      if (error) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        res.status(status).json({ error: error.code === 'LIMIT_FILE_SIZE' ? `Media exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB upload limit` : error.message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Select a media file' });
        return;
      }
      const userId = safeId(req.socialUser.id);
      try {
        res.status(201).json(await finishUpload({
          user: req.socialUser, userId, filename: req.file.filename, filePath: req.file.path,
          mimeType: req.file.mimetype, size: req.file.size, kind: req.body?.kind
        }));
      } catch (failure) {
        const blocked = String(failure?.message || '').startsWith('MEDIA_BLOCKED:');
        res.status(blocked ? 403 : 422).json({ error: String(failure?.message || 'Media validation failed').replace(/^MEDIA_(?:BLOCKED|REVIEW):\s*/, '') });
      }
    });
  });

  app.post('/api/social/media/chunks/start', authenticate, async (req, res) => {
    const size = Number(req.body?.size || 0);
    const mimeType = String(req.body?.mimeType || 'application/octet-stream').trim().toLowerCase();
    const originalName = String(req.body?.name || 'upload').trim();
    if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
      res.status(413).json({ error: `Media exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB upload limit` });
      return;
    }
    if (!isAllowedMime(mimeType)) {
      res.status(400).json({ error: 'Unsupported media type' });
      return;
    }
    const userId = safeId(req.socialUser.id);
    const directory = join(uploadRoot, userId);
    await mkdir(directory, { recursive: true });
    const uploadId = randomBytes(20).toString('hex');
    const originalExtension = extname(originalName).toLowerCase();
    const extension = allowedExtensions.has(originalExtension) ? originalExtension : '';
    const filename = `${Date.now()}-${randomBytes(12).toString('hex')}${extension}`;
    const metadataPath = join(directory, `.chunk-${uploadId}.json`);
    const partPath = join(directory, `.chunk-${uploadId}.part`);
    await writeFile(partPath, Buffer.alloc(0));
    await writeFile(metadataPath, JSON.stringify({
      uploadId,
      filename,
      mimeType,
      size,
      kind: boundedKind(req.body?.kind),
      nextIndex: 0,
      receivedBytes: 0,
      createdAt: new Date().toISOString()
    }), 'utf8');
    res.status(201).json({ ok: true, uploadId, chunkSize: chunkBytes, maxBytes });
  });

  app.post('/api/social/media/chunks/:uploadId/:index(\\d+)', authenticate, express.raw({ type: () => true, limit: `${chunkBytes + 1024}b` }), async (req, res) => {
    const uploadId = safeId(req.params.uploadId);
    const index = Number(req.params.index);
    if (!uploadId || uploadId !== req.params.uploadId || !Number.isSafeInteger(index) || index < 0 || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'Invalid media chunk' });
      return;
    }
    const directory = join(uploadRoot, safeId(req.socialUser.id));
    const metadataPath = join(directory, `.chunk-${uploadId}.json`);
    const partPath = join(directory, `.chunk-${uploadId}.part`);
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      if (metadata.nextIndex !== index) {
        res.status(409).json({ error: `Expected chunk ${metadata.nextIndex}`, nextIndex: metadata.nextIndex });
        return;
      }
      if (metadata.receivedBytes + req.body.length > metadata.size) {
        res.status(400).json({ error: 'Chunk exceeds declared media size' });
        return;
      }
      await appendFile(partPath, req.body);
      metadata.nextIndex += 1;
      metadata.receivedBytes += req.body.length;
      await writeFile(metadataPath, JSON.stringify(metadata), 'utf8');
      res.json({ ok: true, nextIndex: metadata.nextIndex, receivedBytes: metadata.receivedBytes, size: metadata.size });
    } catch {
      res.status(404).json({ error: 'Chunked upload was not found' });
    }
  });

  app.post('/api/social/media/chunks/:uploadId/complete', authenticate, async (req, res) => {
    const uploadId = safeId(req.params.uploadId);
    if (!uploadId || uploadId !== req.params.uploadId) {
      res.status(400).json({ error: 'Invalid upload id' });
      return;
    }
    const userId = safeId(req.socialUser.id);
    const directory = join(uploadRoot, userId);
    const metadataPath = join(directory, `.chunk-${uploadId}.json`);
    const partPath = join(directory, `.chunk-${uploadId}.part`);
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      if (metadata.receivedBytes !== metadata.size) {
        res.status(409).json({ error: 'Media upload is incomplete', receivedBytes: metadata.receivedBytes, size: metadata.size });
        return;
      }
      const finalPath = join(directory, metadata.filename);
      await rename(partPath, finalPath);
      await rm(metadataPath, { force: true });
      res.status(201).json(await finishUpload({
        user: req.socialUser, userId, filename: metadata.filename, filePath: finalPath,
        mimeType: metadata.mimeType, size: metadata.size, kind: metadata.kind
      }));
    } catch (failure) {
      const message = String(failure?.message || '');
      const blocked = message.startsWith('MEDIA_BLOCKED:');
      res.status(blocked ? 403 : message ? 422 : 404).json({ error: message ? message.replace(/^MEDIA_(?:BLOCKED|REVIEW):\s*/, '') : 'Chunked upload was not found' });
    }
  });

  app.get('/api/social/media/:processingId/status', authenticate, async (req, res) => {
    const processingId = safeProcessingId(req.params.processingId).replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
    if (!processingId || processingId !== req.params.processingId) {
      res.status(400).json({ error: 'Invalid processing id' });
      return;
    }
    const statusFile = join(uploadRoot, safeId(req.socialUser.id), `${processingId}-hls`, 'status.json');
    try {
      const status = JSON.parse(await readFile(statusFile, 'utf8'));
      res.setHeader('Cache-Control', 'no-store');
      res.json(status);
    } catch {
      res.status(404).json({ error: 'Processing job was not found' });
    }
  });
};

const boundedKind = (value) => {
  const kind = String(value || 'post').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
  return kind || 'post';
};
