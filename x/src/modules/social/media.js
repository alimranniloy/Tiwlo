import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { extname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import express from 'express';
import multer from 'multer';
import { getSettings } from './service.js';

const safeId = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
const safeProcessingId = (value) => String(value || '').replace(/[^a-zA-Z0-9._-]/g, '');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.mkv', '.webm', '.m4v', '.mp3', '.m4a', '.aac', '.wav', '.ogg', '.pdf']);
const restrictedUserStatuses = new Set(['disabled', 'banned', 'blocked', 'suspended']);
const isAllowedMime = (mime = '') => /^(image|video|audio)\//i.test(mime) || mime === 'application/pdf' || mime === 'application/octet-stream';

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

const writeStatus = async (file, value) => {
  await writeFile(file, JSON.stringify({ ...value, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
};

const transcodeVideo = async ({ inputPath, outputDir, publicBase, statusFile }) => {
  const ffmpeg = process.env.SOCIAL_FFMPEG_PATH || 'ffmpeg';
  const qualities = [
    { name: '360p', height: 360, bandwidth: 800000, resolution: '640x360' },
    { name: '480p', height: 480, bandwidth: 1400000, resolution: '854x480' },
    { name: '720p', height: 720, bandwidth: 2800000, resolution: '1280x720' }
  ];
  try {
    await mkdir(outputDir, { recursive: true });
    await writeStatus(statusFile, { status: 'processing', progress: 2, sourceUrl: publicBase.sourceUrl, hlsUrl: publicBase.hlsUrl });
    for (let index = 0; index < qualities.length; index += 1) {
      const quality = qualities[index];
      const qualityDir = join(outputDir, quality.name);
      await mkdir(qualityDir, { recursive: true });
      await runProcess(ffmpeg, [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
        '-vf', `scale=-2:min(${quality.height}\\,ih)`,
        '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
        '-hls_time', '4', '-hls_playlist_type', 'vod', '-hls_flags', 'independent_segments',
        '-hls_segment_filename', join(qualityDir, 'segment-%05d.ts'),
        join(qualityDir, 'index.m3u8')
      ]);
      await writeStatus(statusFile, {
        status: 'processing',
        progress: Math.round(((index + 1) / qualities.length) * 90),
        sourceUrl: publicBase.sourceUrl,
        hlsUrl: publicBase.hlsUrl
      });
    }
    const master = ['#EXTM3U', '#EXT-X-VERSION:3'];
    for (const quality of qualities) {
      master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},RESOLUTION=${quality.resolution}`);
      master.push(`${quality.name}/index.m3u8`);
    }
    await writeFile(join(outputDir, 'master.m3u8'), `${master.join('\n')}\n`, 'utf8');
    await writeStatus(statusFile, {
      status: 'ready',
      progress: 100,
      sourceUrl: publicBase.sourceUrl,
      hlsUrl: publicBase.hlsUrl,
      qualities: qualities.map((quality) => quality.name)
    });
  } catch (error) {
    await writeStatus(statusFile, {
      status: 'failed',
      progress: 0,
      sourceUrl: publicBase.sourceUrl,
      hlsUrl: null,
      error: String(error?.message || error).slice(0, 1000)
    }).catch(() => undefined);
  }
};

export const registerSocialRoutes = (app, { prisma, userFromRequest, rootDir }) => {
  const uploadRoot = join(rootDir, 'public', 'uploads', 'social');
  const maxBytes = Math.max(1, Math.min(Number(process.env.SOCIAL_MEDIA_MAX_MB || 500), 2048)) * 1024 * 1024;
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
      req.socialUser = user;
      next();
    } catch (error) {
      next(error);
    }
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
      const filename = req.file.filename;
      const publicRoot = '/api/social/media/files';
      const sourceUrl = `${publicRoot}/${userId}/${filename}`;
      const isVideo = String(req.file.mimetype || '').startsWith('video/');
      const settings = await getSettings({ prisma });
      const processingId = filename.replace(/[^a-zA-Z0-9._-]/g, '');
      const outputName = `${processingId}-hls`;
      const outputDir = join(uploadRoot, userId, outputName);
      const statusFile = join(outputDir, 'status.json');
      const hlsUrl = `${publicRoot}/${userId}/${outputName}/master.m3u8`;
      if (isVideo && settings.autoTranscode) {
        await mkdir(outputDir, { recursive: true });
        await writeStatus(statusFile, { status: 'queued', progress: 0, sourceUrl, hlsUrl });
        setImmediate(() => {
          transcodeVideo({
            inputPath: req.file.path,
            outputDir,
            statusFile,
            publicBase: { sourceUrl, hlsUrl }
          });
        });
      }
      res.status(201).json({
        ok: true,
        processingId,
        kind: boundedKind(req.body?.kind),
        mimeType: req.file.mimetype,
        size: req.file.size,
        sourceUrl,
        hlsUrl: isVideo && settings.autoTranscode ? hlsUrl : null,
        processingStatus: isVideo && settings.autoTranscode ? 'queued' : 'ready'
      });
    });
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
