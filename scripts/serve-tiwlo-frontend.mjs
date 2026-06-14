import express from 'express';
import compression from 'compression';
import http from 'node:http';
import https from 'node:https';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
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
  '/data',
  '/discord',
  '/automation',
  '/ai',
  '/tpanel/api',
  '/tpanel/install.sh'
];

const requestPathname = (url = '/') => {
  try {
    return new URL(url, 'http://tiwlo.local').pathname;
  } catch {
    return url.split('?')[0] || '/';
  }
};

const shouldProxy = (url = '') => {
  const pathname = requestPathname(url);
  if (frontendOnlyPaths.has(pathname)) return false;
  return proxyPrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`));
};

const isInstallerRequest = (url = '') => url === '/tpanel/install.sh' || url.startsWith('/tpanel/install.sh?');

const immutableAssetPattern = /[/\\]assets[/\\].+\.(?:js|css|woff2?|png|jpe?g|webp|gif|svg)$/i;
const publicAssetPattern = /[/\\](?:brand|media|uploads)[/\\].+\.(?:mp4|webm|png|jpe?g|webp|gif|svg|ico)$/i;
const siteOrigin = 'https://tiwlo.com';
const defaultRobots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const frontendOnlyPaths = new Set(['/api']);
const legacyRedirects = {
  '/api': '/developers'
};

const seoRoutes = {
  '/': {
    title: 'Tiwlo - Cloud Hosting, tPanel, Ecommerce, ISP Billing, Domains, SSL, and Payments',
    description: 'Tiwlo is a cloud hosting and business automation platform for tPanel servers, ecommerce stores, ISP billing, domains, DNS, SSL, payments, client dashboards, and infrastructure management.',
    keywords: 'Tiwlo, tPanel, Tiwlo hosting, Bangladesh web hosting, cloud VPS hosting, ecommerce hosting, ISP billing software, WHMCS alternative, domain management, DNS manager, SSL automation'
  },
  '/about': {
    title: 'About Tiwlo - Cloud Hosting, tPanel, Ecommerce, Payments, tFiber',
    description: 'Learn about Tiwlo, a technology company for cloud hosting, web hosting, VPS, tPanel software, AI tools, business automation, ecommerce services, digital payments, and tFiber internet infrastructure.',
    keywords: 'about Tiwlo, Tiwlo company, Al Imran Niloy, Tiwlo cloud, tPanel, tFiber, Tiwlo Pay'
  },
  '/products': {
    title: 'Products - Tiwlo',
    description: 'Pick Tiwlo modules for cloud hosting, tPanel accounts, Tiwlo Pay, Cloud Store, ISP billing, domains, DNS, SSL, and connected user workflows.',
    keywords: 'Tiwlo products, cloud hosting products, tPanel hosting, Tiwlo Pay, Cloud Store, ISP billing'
  },
  '/services': {
    title: 'Solutions - Tiwlo',
    description: 'Tiwlo keeps billing, hosting, identity review, support, and admin controls connected from signup to renewal for infrastructure and online business teams.',
    keywords: 'Tiwlo solutions, hosting operations, cloud support, ecommerce operations, ISP billing, business automation'
  },
  '/developers': {
    title: 'Developers - Tiwlo',
    description: 'Use Tiwlo developer tools, API credentials, webhooks, runtime selectors, package metadata, and provisioning records to automate cloud and hosting operations.',
    keywords: 'Tiwlo developers, Tiwlo API, cloud API, hosting automation API, developer tools, webhooks'
  },
  '/partners': {
    title: 'Partners - Tiwlo',
    description: 'Bring hosting, ISP, store, payment, or support operations into Tiwlo with partner workflows for modules, verified users, billing, and support routing.',
    keywords: 'Tiwlo partners, hosting partner, ISP partner, commerce partner, payment partner, support partner'
  },
  '/pricing': {
    title: 'Pricing - Tiwlo',
    description: 'Tiwlo pricing supports package-based cloud hosting, module options, credit billing, upgrade paths, Tiwlo Pay, and administrator-defined service limits.',
    keywords: 'Tiwlo pricing, cloud hosting pricing, hosting packages, Tiwlo Pay pricing, module pricing, billing credits'
  },
  '/support': {
    title: 'Support - Tiwlo',
    description: 'Get Tiwlo support for cloud hosting, billing, identity review, live chat, Discord tickets, payment help, and account or resource issues.',
    keywords: 'Tiwlo support, hosting support, cloud support, billing help, identity review, Discord tickets'
  },
  '/documentation': {
    title: 'Documentation - Tiwlo Cloud Hosting, API, DNS, and Billing Guides',
    description: 'Read Tiwlo documentation for cloud hosting, droplets, networking, DNS, storage, databases, monitoring, billing, API usage, and security workflows.',
    keywords: 'Tiwlo documentation, cloud hosting docs, VPS documentation, DNS guide, API documentation, hosting support docs'
  },
  '/commerce': {
    title: 'Commerce - Tiwlo Cloud Store, Checkout, Inventory, and Payments',
    description: 'Tiwlo Commerce helps teams launch storefronts, products, orders, customers, checkout, inventory, analytics, and payment workflows from one connected cloud platform.',
    keywords: 'Tiwlo commerce, Cloud Store, ecommerce platform, storefront builder, Tiwlo Pay, inventory management'
  },
  '/broadband': {
    title: 'Broadband - Tiwlo tFiber ISP Billing and Connectivity Operations',
    description: 'Tiwlo Broadband and tFiber workflows help operators manage connectivity services, subscriber records, routers, ISP billing, support, and network operations.',
    keywords: 'Tiwlo broadband, tFiber, ISP billing, broadband billing, router management, subscriber management'
  },
  '/terms': {
    title: 'Terms of Service - Tiwlo',
    description: 'Read the Tiwlo terms for cloud hosting, tPanel, ecommerce, ISP billing, domains, DNS, SSL, payment, support, automation, and account usage.',
    keywords: 'Tiwlo terms, terms of service, cloud hosting terms, Tiwlo legal'
  },
  '/privacy': {
    title: 'Privacy Policy - Tiwlo',
    description: 'Read how Tiwlo handles account, cloud, hosting, billing, ecommerce, ISP, payment, verification, support, security, and service telemetry data.',
    keywords: 'Tiwlo privacy, privacy policy, cloud hosting privacy, data protection'
  },
  '/bangladesh-hosting': {
    title: 'Bangladesh Hosting - Tiwlo',
    description: 'Tiwlo helps customers compare Bangladesh web hosting, BDIX hosting needs, cloud hosting, VPS hosting, domains, SSL, support, and tPanel control workflows.',
    keywords: 'Bangladesh web hosting, hosting BD, BDIX hosting, Bangladesh cloud hosting, Tiwlo hosting BD'
  },
  '/cloud-vps-hosting': {
    title: 'Cloud VPS Hosting - Tiwlo',
    description: 'Explore Tiwlo cloud VPS hosting for server deployment, packages, DNS, SSL, payments, and customer operations across Bangladesh, India, and global use cases.',
    keywords: 'cloud VPS hosting, Bangladesh VPS, VPS hosting BD, cloud server hosting, Tiwlo VPS'
  },
  '/tpanel-hosting': {
    title: 'tPanel Hosting - Tiwlo',
    description: 'Tiwlo uses tPanel-focused hosting workflows for packages, accounts, DNS, SSL, files, databases, support, and billing from the Tiwlo platform.',
    keywords: 'tPanel hosting, Tiwlo tPanel, custom hosting panel, cPanel alternative Bangladesh, hosting control panel'
  },
  '/whmcs-alternative': {
    title: 'WHMCS Alternative - Tiwlo',
    description: 'Tiwlo explains its portal and tPanel hosting workflow as an alternative to WHMCS-style hosting operations for billing, support, services, and automation.',
    keywords: 'WHMCS alternative, hosting billing software, hosting client portal, Tiwlo portal, tPanel billing'
  },
  '/hosting-free-credit': {
    title: '$100 Free Credit - Tiwlo',
    description: 'Tiwlo can offer $100 free credit for eligible new users, with admin-controlled verification, payment, credit, and account review settings.',
    keywords: '$100 free credit, Tiwlo free credit, free hosting credit, cloud hosting trial, VPS free credit'
  },
  '/hosting-features': {
    title: 'Hosting Features - Tiwlo',
    description: 'Compare Tiwlo hosting features across cloud hosting, tPanel, domains, DNS, SSL, payments, customer portal, support, and tSecurity workflows.',
    keywords: 'Tiwlo hosting features, cloud hosting features, tPanel features, DNS hosting features, SSL hosting features'
  }
};

const serveInstallerFallback = (res) => {
  const fallback = join(distDir, 'tpanel', 'install.sh');
  if (!existsSync(fallback)) return false;
  res.status(200);
  res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(fallback).pipe(res);
  return true;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const replaceOrInsertHeadTag = (html, pattern, tag) => {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
};

const readIndexHtml = () => readFileSync(join(distDir, 'index.html'), 'utf8');

const injectSeo = (html, pathname) => {
  const route = seoRoutes[pathname];
  if (!route) return html;

  const canonical = new URL(pathname, siteOrigin).toString();
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const keywords = escapeHtml(route.keywords);
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: route.title,
        description: route.description,
        dateModified: '2026-06-14',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://tiwlo.com/#website' },
        publisher: { '@id': 'https://tiwlo.com/#organization' }
      }
    ]
  }).replace(/</g, '\\u003c');

  let next = html;
  next = replaceOrInsertHeadTag(next, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  next = replaceOrInsertHeadTag(next, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${description}" />`);
  next = replaceOrInsertHeadTag(next, /<meta\s+name="keywords"[^>]*>/i, `<meta name="keywords" content="${keywords}" />`);
  next = replaceOrInsertHeadTag(next, /<meta\s+name="robots"[^>]*>/i, `<meta name="robots" content="${defaultRobots}" />`);
  next = replaceOrInsertHeadTag(next, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  next = replaceOrInsertHeadTag(next, /<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`);
  next = replaceOrInsertHeadTag(next, /<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`);
  next = replaceOrInsertHeadTag(next, /<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}" />`);
  next = replaceOrInsertHeadTag(next, /<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`);
  next = replaceOrInsertHeadTag(next, /<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${description}" />`);
  next = replaceOrInsertHeadTag(next, /<script\s+id="tiwlo-page-schema"\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script id="tiwlo-page-schema" type="application/ld+json">${schema}</script>`);
  return next;
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

app.get('*', (req, res) => {
  const url = new URL(req.originalUrl || req.url || '/', 'http://tiwlo.local');
  const legacyTarget = legacyRedirects[url.pathname];
  if (legacyTarget) {
    url.pathname = legacyTarget;
    res.redirect(301, `${url.pathname}${url.search}`);
    return;
  }
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
    res.redirect(301, `${url.pathname}${url.search}`);
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  if (seoRoutes[url.pathname]) {
    res.type('html').send(injectSeo(readIndexHtml(), url.pathname));
    return;
  }
  res.sendFile(join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Tiwlo frontend ready on http://0.0.0.0:${port}`);
  console.log(`Proxying API routes to ${backendUrl.href}`);
});
