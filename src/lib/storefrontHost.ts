const ROOT_DOMAIN = ((import.meta as any).env?.VITE_STOREFRONT_ROOT_DOMAIN || 'tiwlo.com').toLowerCase();

const RESERVED_ROOT_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'billing',
  'cloud',
  'dashboard',
  'docs',
  'documentation',
  'login',
  'mail',
  'management',
  'pay',
  'signup',
  'support',
  'www'
]);

const IGNORED_HOST_SUFFIXES = [
  '.localhost',
  '.local'
];

function cleanHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^\.+|\.+$/g, '');
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

export type StorefrontHostContext = {
  hostname: string;
  slug?: string;
  domain?: string;
  rootDomain: string;
};

export function getStorefrontHostContext(hostname = window.location.hostname): StorefrontHostContext | null {
  const host = cleanHostname(hostname);
  if (!host || isLocalHost(host)) return null;
  if (IGNORED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return null;

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const label = host.slice(0, -(`.${ROOT_DOMAIN}`.length));
    if (!label || label.includes('.') || RESERVED_ROOT_SUBDOMAINS.has(label)) return null;
    return { hostname: host, slug: label, rootDomain: ROOT_DOMAIN };
  }

  return { hostname: host, domain: host, rootDomain: ROOT_DOMAIN };
}
