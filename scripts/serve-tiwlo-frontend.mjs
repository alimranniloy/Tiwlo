import express from 'express';
import compression from 'compression';
import http from 'node:http';
import https from 'node:https';
import { createReadStream, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = join(rootDir, 'dist');
const app = express();

const readArg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
};

const port = Number(readArg('--port', process.env.FRONTEND_PORT || process.env.PORT || 3000));
const backendUrl = new URL((process.env.BACKEND_URL || process.env.API_BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, ''));

const proxyPrefixes = [
  '/graphql',
  '/admin',
  '/health',
  '/payments',
  '/webhooks',
  '/api',
  '/discord',
  '/automation',
  '/ai',
  '/tpanel/api',
  '/tpanel/install.sh'
];

const shouldProxy = (url = '') => proxyPrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`));

const isInstallerRequest = (url = '') => url === '/tpanel/install.sh' || url.startsWith('/tpanel/install.sh?');

const immutableAssetPattern = /[/\\]assets[/\\].+\.(?:js|css|woff2?|png|jpe?g|webp|gif|svg)$/i;
const publicAssetPattern = /[/\\](?:brand|media|uploads)[/\\].+\.(?:mp4|webm|png|jpe?g|webp|gif|svg|ico)$/i;

const serveInstallerFallback = (res) => {
  const fallback = join(distDir, 'tpanel', 'install.sh');
  if (!existsSync(fallback)) return false;
  res.status(200);
  res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(fallback).pipe(res);
  return true;
};

const proxyRequest = (req, res) => {
  const target = new URL(req.originalUrl || req.url, backendUrl);
  const transport = target.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: target.host };

  const upstream = transport.request(target, {
    method: req.method,
    headers
  }, (upstreamRes) => {
    if (isInstallerRequest(req.originalUrl || req.url) && (upstreamRes.statusCode || 500) >= 400) {
      upstreamRes.resume();
      if (serveInstallerFallback(res)) return;
    }
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });

  upstream.on('error', () => {
    if (isInstallerRequest(req.originalUrl || req.url) && serveInstallerFallback(res)) return;
    res.status(502).json({ ok: false, message: 'Backend service is not reachable.' });
  });

  req.pipe(upstream);
};

app.use((req, res, next) => {
  if (shouldProxy(req.originalUrl || req.url)) {
    proxyRequest(req, res);
    return;
  }
  next();
});

app.use(compression({
  threshold: 1024,
  filter(req, res) {
    if (/\.(?:mp4|webm|zip|gz|br)$/i.test(req.path)) return false;
    return compression.filter(req, res);
  }
}));

app.use(express.static(distDir, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.sh')) {
      res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return;
    }
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
      return;
    }
    if (immutableAssetPattern.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }
    if (publicAssetPattern.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  }
}));

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Tiwlo frontend ready on http://0.0.0.0:${port}`);
  console.log(`Proxying API routes to ${backendUrl.href}`);
});
