const http = require('node:http');

const FRONTEND = process.env.TIWLO_FRONTEND_URL || 'http://127.0.0.1:3001';
const BACKEND = process.env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000';
const PORTS = (process.env.TIWLO_PROXY_PORTS || '3000,8787')
  .split(',')
  .map((port) => Number(port.trim()))
  .filter(Boolean);

const backendPrefixes = [
  '/graphql',
  '/admin',
  '/health',
  '/webhooks/',
  '/automation/',
  '/ai/',
  '/payments/',
];

function targetFor(path) {
  return backendPrefixes.some((prefix) => path.startsWith(prefix)) ? BACKEND : FRONTEND;
}

function createServer() {
  const server = http.createServer((req, res) => {
    const path = req.url || '/';
    const targetUrl = new URL(path, targetFor(path));
    const headers = { ...req.headers, host: targetUrl.host };

    const proxyReq = http.request(targetUrl, { method: req.method, headers }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`Proxy error: ${error.message}`);
    });

    req.pipe(proxyReq);
  });
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.timeout = 0;
  return server;
}

for (const port of PORTS) {
  const server = createServer();
  server.on('upgrade', (_req, socket) => socket.destroy());
  server.listen(port, '127.0.0.1', () => {
    console.log(`Tiwlo public proxy listening on http://127.0.0.1:${port}`);
  });
}
