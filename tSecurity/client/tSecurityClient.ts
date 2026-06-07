const GRAPHQL_URL = (import.meta as any).env?.VITE_GRAPHQL_URL || '/graphql';
const GATEWAY_PATH = (import.meta as any).env?.VITE_TSECURITY_GATEWAY_PATH || '/data/v3/sync-state';
const ADMIN_BLOCKS_PATH = (import.meta as any).env?.VITE_TSECURITY_ADMIN_BLOCKS_PATH || '/data/v3/control-plane/user-blocks';
const TOKEN_KEY = 'tiwlo_auth_token';
const BLOCK_REASON_KEY = 'tiwlo_tsecurity_block_reason';
const SESSION_LOCK_KEY = 'tiwlo_tsecurity_session_lock';

type GatewayState = {
  id: string;
  key: string;
  salt: string;
  alg: string;
  expiresAt: string;
};

type GatewayResult = {
  ok: boolean;
  blocked?: boolean;
  reason?: string;
  redirect?: string;
  token?: string;
  availability?: any;
  error?: string;
};

const apiBase = () => GRAPHQL_URL.replace(/\/graphql\/?$/, '');

const endpoint = (path: string) => `${apiBase()}${path}`;

const textEncoder = new TextEncoder();

const metrics = {
  pageLoadedAt: Date.now(),
  firstInteractionAt: 0,
  keystrokes: 0,
  pointerEvents: 0,
  pasteEvents: 0,
  inputEvents: 0,
  focusEvents: 0,
  inspectKeyCount: 0,
  devtoolsOpenSamples: 0,
  lastDevtoolsSampleAt: 0
};

if (typeof window !== 'undefined') {
  const mark = () => {
    if (!metrics.firstInteractionAt) metrics.firstInteractionAt = Date.now();
  };
  const sampleDevtools = () => {
    const threshold = 160;
    const suspected = Math.abs(window.outerWidth - window.innerWidth) > threshold
      || Math.abs(window.outerHeight - window.innerHeight) > threshold;
    if (suspected) metrics.devtoolsOpenSamples += 1;
    metrics.lastDevtoolsSampleAt = Date.now();
  };
  window.addEventListener('keydown', (event) => {
    metrics.keystrokes += 1;
    const key = String(event.key || '').toUpperCase();
    if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(key))) {
      metrics.inspectKeyCount += 1;
    }
    mark();
  }, { passive: true });
  window.addEventListener('pointerdown', () => {
    metrics.pointerEvents += 1;
    mark();
  }, { passive: true });
  window.addEventListener('paste', () => {
    metrics.pasteEvents += 1;
    mark();
  }, { passive: true });
  window.addEventListener('input', () => {
    metrics.inputEvents += 1;
    mark();
  }, { passive: true });
  window.addEventListener('focusin', () => {
    metrics.focusEvents += 1;
    mark();
  }, { passive: true });
  window.setInterval(sampleDevtools, 1500);
}

const b64url = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  view.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromB64url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const getChallenge = async (): Promise<GatewayState> => {
  const response = await fetch(endpoint(GATEWAY_PATH), {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.state) throw new Error(payload?.error || 'tSecurity sync failed.');
  return payload.state;
};

const deriveGatewayKey = async (state: GatewayState) => {
  const clientKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits', 'deriveKey']
  );
  const serverPublicKey = await crypto.subtle.importKey(
    'raw',
    fromB64url(state.key),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: serverPublicKey
    },
    clientKeys.privateKey,
    256
  );
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: fromB64url(state.salt),
      info: textEncoder.encode('tiwlo-tsecurity-gateway-v1')
    },
    hkdfKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
  const publicKey = await crypto.subtle.exportKey('raw', clientKeys.publicKey);
  return { key, publicKey: b64url(publicKey) };
};

const sealPayload = async (state: GatewayState, payload: unknown) => {
  const { key, publicKey } = await deriveGatewayKey(state);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: textEncoder.encode(state.id) },
    key,
    encoded
  );
  return {
    key,
    envelope: {
      sealed: true,
      cid: state.id,
      pub: publicKey,
      iv: b64url(iv),
      data: b64url(encrypted)
    }
  };
};

const openPayload = async (state: GatewayState, key: CryptoKey, payload: any): Promise<GatewayResult> => {
  if (!payload?.sealed) return payload;
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromB64url(payload.iv),
      additionalData: textEncoder.encode(state.id)
    },
    key,
    fromB64url(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
};

const sessionLockFor = (metadata: Record<string, unknown>) => {
  if (typeof window === 'undefined') return {};
  const current = {
    userAgent: String(metadata.userAgent || ''),
    platform: String(metadata.platform || ''),
    vendor: String(metadata.vendor || ''),
    language: String(metadata.language || ''),
    timezone: String(metadata.timezone || ''),
    screen: String(metadata.screen || ''),
    createdAt: Date.now()
  };
  try {
    const raw = localStorage.getItem(SESSION_LOCK_KEY);
    if (!raw) {
      localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify(current));
      return { ...current, changedFields: [] };
    }
    const stored = JSON.parse(raw);
    const changedFields = ['userAgent', 'platform', 'vendor', 'language', 'timezone', 'screen']
      .filter((key) => String(stored?.[key] || '') && String(stored?.[key] || '') !== String(current[key as keyof typeof current] || ''));
    return {
      ...stored,
      changedFields,
      seenAt: Date.now()
    };
  } catch {
    return { ...current, changedFields: [] };
  }
};

const collectDeviceEvidence = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { deviceFingerprint: 'server', deviceMetadata: {}, behavior: {} };
  }
  const screenText = typeof window.screen !== 'undefined'
    ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
    : '';
  const metadata = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    language: navigator.language || '',
    platform: navigator.platform || '',
    vendor: navigator.vendor || '',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    screen: screenText,
    userAgent: navigator.userAgent || '',
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    webdriver: (navigator as Navigator & { webdriver?: boolean }).webdriver === true
  };
  const sessionLock = sessionLockFor(metadata);
  const submittedAt = Date.now();
  const deviceFingerprint = [
    metadata.userAgent,
    metadata.language,
    metadata.platform,
    metadata.vendor,
    metadata.timezone,
    metadata.screen,
    metadata.hardwareConcurrency,
    metadata.deviceMemory,
    metadata.maxTouchPoints
  ].join('|');
  return {
    deviceFingerprint,
    deviceMetadata: {
      ...metadata,
      sessionLock
    },
    behavior: {
      ...metrics,
      submittedAt,
      clientEpochMs: submittedAt,
      requestIssuedAt: metrics.pageLoadedAt,
      requestTtlMs: 10 * 60 * 1000,
      timezoneOffsetMinutes: metadata.timezoneOffsetMinutes,
      consoleSignals: {
        inspectKeyCount: metrics.inspectKeyCount,
        devtoolsOpenSamples: metrics.devtoolsOpenSamples,
        devtoolsSuspected: metrics.inspectKeyCount > 0 || metrics.devtoolsOpenSamples >= 2,
        lastSampleAt: metrics.lastDevtoolsSampleAt
      },
      webdriver: metadata.webdriver
    }
  };
};

const rememberBlockAndRedirect = (result: GatewayResult) => {
  try {
    localStorage.removeItem(BLOCK_REASON_KEY);
  } catch {
    // Ignore storage failures; the block page remains generic.
  }
  const target = result.redirect || '/blocked';
  window.location.assign(target);
};

export const getStoredTSecurityBlockReason = () => {
  try {
    return localStorage.getItem(BLOCK_REASON_KEY) || '';
  } catch {
    return '';
  }
};

export async function tSecurityGateway(action: string, form: Record<string, unknown> = {}): Promise<GatewayResult> {
  if (!crypto?.subtle) throw new Error('Secure browser crypto is required for tSecurity.');
  const state = await getChallenge();
  const payload = {
    action,
    payload: {
      form,
      ...collectDeviceEvidence()
    }
  };
  const { key, envelope } = await sealPayload(state, payload);
  const response = await fetch(endpoint(GATEWAY_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(envelope),
    cache: 'no-store'
  });
  const raw = await response.json().catch(() => null);
  const result = raw ? await openPayload(state, key, raw) : { ok: false, error: 'Empty tSecurity response.' };
  if (result.blocked && result.redirect) rememberBlockAndRedirect(result);
  if (!response.ok || !result.ok) throw new Error(result.error || result.reason || 'tSecurity verification failed.');
  return result;
}

export async function createTSecurityAuthToken(action: 'login' | 'signup', form: Record<string, unknown>) {
  const result = await tSecurityGateway(action, form);
  if (!result.token) throw new Error('tSecurity did not issue an auth token.');
  return result.token;
}

export async function checkSignupAvailabilityViaTSecurity(input: Record<string, unknown>) {
  const result = await tSecurityGateway('signupAvailability', input);
  return result.availability;
}

const authHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export async function fetchTSecurityBlockSummary() {
  const response = await fetch(endpoint(`${ADMIN_BLOCKS_PATH}/summary`), {
    headers: authHeaders(),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Unable to load tSecurity summary.');
  return payload.summary;
}

export async function fetchTSecurityBlockEvents(params: { search?: string; reason?: string; limit?: number; offset?: number } = {}) {
  const url = new URL(endpoint(ADMIN_BLOCKS_PATH), window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), {
    headers: authHeaders(),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Unable to load tSecurity blocks.');
  return payload.events || [];
}

export async function fetchTSecurityPolicy() {
  const response = await fetch(endpoint(`${ADMIN_BLOCKS_PATH}/policy`), {
    headers: authHeaders(),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Unable to load tSecurity policy.');
  return payload.policy;
}

export async function saveTSecurityPolicy(policy: Record<string, unknown>) {
  const response = await fetch(endpoint(`${ADMIN_BLOCKS_PATH}/policy`), {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ policy }),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Unable to save tSecurity policy.');
  return payload.policy;
}

export async function releaseTSecurityBlockEvent(id: string) {
  const response = await fetch(endpoint(`${ADMIN_BLOCKS_PATH}/${encodeURIComponent(id)}/release`), {
    method: 'POST',
    headers: authHeaders(),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Unable to release tSecurity block.');
  return payload.result;
}
