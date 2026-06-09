import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const siteHost = process.env.TIWLO_INDEXNOW_HOST || 'tiwlo.com';
const key = process.env.TIWLO_INDEXNOW_KEY || 'tiwlo-indexnow-2026';
const endpoint = process.env.TIWLO_INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const keyLocation = process.env.TIWLO_INDEXNOW_KEY_LOCATION || `https://${siteHost}/${key}.txt`;
const sitemapPath = process.env.TIWLO_SITEMAP_PATH || path.resolve('public', 'sitemap.xml');

const xml = await readFile(sitemapPath, 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1].trim())
  .filter((url) => {
    try {
      return new URL(url).hostname === siteHost;
    } catch {
      return false;
    }
  });

if (!urls.length) {
  throw new Error(`No ${siteHost} URLs found in ${sitemapPath}`);
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: siteHost,
    key,
    keyLocation,
    urlList: urls
  })
});

if (!response.ok) {
  const body = await response.text().catch(() => '');
  throw new Error(`IndexNow submit failed: ${response.status} ${response.statusText} ${body}`.trim());
}

console.log(`Submitted ${urls.length} URLs to ${endpoint}`);
