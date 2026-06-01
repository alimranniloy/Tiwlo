import { createHmac, randomBytes } from 'node:crypto';
import { AppError } from '../../core/errors.js';

const text = (value, fallback = '') => String(value ?? fallback).trim();
const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };

const fetchJson = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { raw };
    }

    if (!response.ok || payload?.ok === false) {
      throw new AppError(payload?.message || `tPanel API returned HTTP ${response.status}`, 'UPSTREAM_ERROR');
    }
    return payload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err?.name === 'AbortError'
      ? 'tPanel API request timed out'
      : `Unable to reach tPanel API: ${err.message || err}`;
    throw new AppError(message, 'UPSTREAM_ERROR');
  } finally {
    clearTimeout(timer);
  }
};

export const tPanelNodeBaseUrl = (node) => {
  const host = text(node?.hostname || node?.ip);
  if (!host) throw new AppError('tPanel server host is missing', 'BAD_USER_INPUT');
  const protocol = text(node?.metadata?.protocol || (node?.metadata?.ssl ? 'https' : 'http'), 'http').replace(/:$/, '');
  const port = Number(node?.port || 2086);
  const needsPort = port && !['80', '443'].includes(String(port));
  return `${protocol}://${host}${needsPort ? `:${port}` : ''}`;
};

const tPanelAdminCredentials = (node) => {
  const username = text(node?.username || 'admin', 'admin');
  const password = text(node?.passwordSecret || node?.password || node?.rootPassword);
  if (!password) {
    throw new AppError('tPanel admin password is required for this server. Update the compute node credentials.', 'BAD_USER_INPUT');
  }
  return { username, password };
};

export const loginTPanelNode = async (node) => {
  const baseUrl = tPanelNodeBaseUrl(node);
  const credentials = tPanelAdminCredentials(node);
  const result = await fetchJson(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials)
  });
  if (!result?.token || result.role !== 'admin') {
    throw new AppError('tPanel admin login failed for the selected server.', 'UPSTREAM_ERROR');
  }
  return { baseUrl, token: result.token };
};

export const callTPanelNodeApi = async (node, path, { method = 'GET', body } = {}) => {
  const session = await loginTPanelNode(node);
  return fetchJson(`${session.baseUrl}${path}`, {
    method,
    headers: { ...jsonHeaders, Authorization: `Bearer ${session.token}` },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
};

export const listTPanelNodeAccounts = async (node) => {
  const result = await callTPanelNodeApi(node, '/api/panel/accounts');
  return Array.isArray(result?.accounts) ? result.accounts : [];
};

const cleanUsername = (value) => text(value).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);

const parseSize = (value, unit) => {
  if (value === undefined || value === null || value === '') return 0;
  if (Number.isFinite(Number(value))) return Number(value);
  const raw = text(value).toLowerCase().replace(/,/g, '');
  const amount = Number(raw.match(/[\d.]+/)?.[0] || 0);
  if (!amount) return 0;
  if (unit === 'mb') {
    if (raw.includes('tb')) return Math.round(amount * 1024 * 1024);
    if (raw.includes('gb')) return Math.round(amount * 1024);
    return Math.round(amount);
  }
  if (raw.includes('tb')) return Math.round(amount * 1024);
  if (raw.includes('mb')) return Math.max(1, Math.round(amount / 1024));
  return Math.round(amount);
};

export const checkTPanelNodeUsername = async (node, username, domain = '') => {
  const clean = cleanUsername(username);
  const requestedDomain = text(domain).toLowerCase();
  const accounts = await listTPanelNodeAccounts(node);
  const existing = accounts.find((account) => {
    const accountStatus = text(account.status).toLowerCase();
    if (['terminated', 'deleted'].includes(accountStatus)) return false;
    return text(account.username).toLowerCase() === clean
      || (requestedDomain && text(account.domain).toLowerCase() === requestedDomain);
  });
  return { available: !existing, existing: existing || null, accounts };
};

export const createTPanelNodeAccount = async (node, input = {}) => {
  const username = cleanUsername(input.username);
  const password = text(input.password);
  if (!username || username.length < 3) {
    throw new AppError('tPanel username must be at least 3 characters.', 'BAD_USER_INPUT');
  }
  if (password.length < 8) {
    throw new AppError('tPanel account password must be at least 8 characters.', 'BAD_USER_INPUT');
  }

  const limits = input.limits || {};
  const quotaMb = Number(limits.quotaMb || limits.diskMB || limits.diskMb || 0)
    || parseSize(limits.disk || limits.diskGb || limits.diskGB, 'mb');
  const bandwidthGb = Number(limits.bandwidthGb || limits.bandwidthGB || 0)
    || parseSize(limits.bandwidth || limits.transfer || limits.transferGb, 'gb');
  const result = await callTPanelNodeApi(node, '/api/panel/accounts', {
    method: 'POST',
    body: {
      username,
      password,
      domain: text(input.domain || `${username}.tpanel.local`).toLowerCase(),
      displayName: text(input.displayName || input.ownerName || input.domain || username),
      ownerEmail: text(input.ownerEmail || input.contactEmail),
      contactEmail: text(input.contactEmail || input.ownerEmail),
      packageId: text(input.packageId || input.packageCode),
      packageName: text(input.packageName || input.planName),
      runtime: text(input.runtime || 'php'),
      permissionProfile: text(input.permissionProfile || 'developer'),
      shellAccess: input.shellAccess !== false,
      quotaMb: quotaMb || undefined,
      bandwidthGb: bandwidthGb || undefined,
      maxDomains: Number(limits.domains || limits.maxDomains || 0) || undefined,
      maxDatabases: Number(limits.databases || limits.maxDatabases || 0) || undefined,
      maxEmailAccounts: Number(limits.emailAccounts || limits.maxEmailAccounts || 0) || undefined,
      maxNodeApps: Number(limits.nodeApps || limits.maxNodeApps || 0) || undefined,
      cloudPlan: {
        code: text(input.packageCode || input.planCode || input.packageId),
        name: text(input.packageName || input.planName),
        limits
      }
    }
  });
  return result?.account || result;
};

export const findTPanelNodeAccount = async (node, account) => {
  const username = cleanUsername(account?.username || account);
  const domain = text(account?.domain).toLowerCase();
  const accounts = await listTPanelNodeAccounts(node);
  return accounts.find((item) => text(item.username).toLowerCase() === username
    || (domain && text(item.domain).toLowerCase() === domain)) || null;
};

export const updateTPanelNodeAccountStatus = async (node, account, status) => {
  const username = cleanUsername(account?.username || account);
  if (!username) throw new AppError('tPanel account username is missing.', 'BAD_USER_INPUT');
  const next = text(status).toLowerCase();
  const action = ['active', 'running', 'on'].includes(next)
    ? 'unsuspend'
    : ['terminated', 'deleted', 'destroyed'].includes(next)
      ? 'terminate'
      : 'suspend';
  return callTPanelNodeApi(node, `/api/panel/accounts/${encodeURIComponent(username)}/${action}`, {
    method: 'POST',
    body: {}
  });
};

export const changeTPanelNodeAccountPassword = async (node, account, password) => {
  const username = cleanUsername(account?.username || account);
  if (!username) throw new AppError('tPanel account username is missing.', 'BAD_USER_INPUT');
  return callTPanelNodeApi(node, `/api/panel/accounts/${encodeURIComponent(username)}/password`, {
    method: 'POST',
    body: { password }
  });
};

export const createTPanelNodeSsoUrl = (node, account, options = {}) => {
  const username = cleanUsername(account?.username || account);
  if (!username) throw new AppError('tPanel account username is missing.', 'BAD_USER_INPUT');
  const baseUrl = tPanelNodeBaseUrl(node);
  const secret = text(node?.passwordSecret || node?.password || node?.rootPassword);
  if (!secret) return `${baseUrl}/login?username=${encodeURIComponent(username)}`;
  const payload = Buffer.from(JSON.stringify({
    username,
    domain: text(account?.domain),
    allowActivate: Boolean(options.allowActivate),
    exp: Date.now() + 5 * 60 * 1000,
    nonce: randomBytes(12).toString('hex')
  })).toString('base64url');
  const signature = createHmac('sha256', `${secret}:tpanel-sso`).update(payload).digest('base64url');
  return `${baseUrl}/sso?token=${encodeURIComponent(`${payload}.${signature}`)}`;
};
