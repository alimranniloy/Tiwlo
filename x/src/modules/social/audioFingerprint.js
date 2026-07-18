import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const MAX_OUTPUT_BYTES = 96 * 1024;
const FINGERPRINT_TIMEOUT_MS = 45_000;

const runFingerprint = (filePath) => new Promise((resolve) => {
  const command = String(process.env.SOCIAL_CHROMAPRINT_PATH || 'fpcalc').trim();
  if (!command) return resolve(null);
  const child = spawn(command, ['-json', '-length', '120', filePath], { windowsHide: true });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => child.kill(), FINGERPRINT_TIMEOUT_MS);
  child.stdout.on('data', (chunk) => { stdout = `${stdout}${chunk}`.slice(-MAX_OUTPUT_BYTES); });
  child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4_000); });
  child.once('error', () => { clearTimeout(timer); resolve(null); });
  child.once('close', (code) => {
    clearTimeout(timer);
    if (code !== 0) return resolve(null);
    try {
      const value = JSON.parse(stdout);
      const fingerprint = String(value.fingerprint || '').trim();
      if (!fingerprint) return resolve(null);
      resolve({ fingerprint, durationSeconds: Number(value.duration) || 0, stderr: stderr || undefined });
    } catch { resolve(null); }
  });
});

const rightsCatalog = () => {
  try {
    const raw = JSON.parse(process.env.SOCIAL_AUDIO_RIGHTS_CATALOG_JSON || '[]');
    return Array.isArray(raw) ? raw.slice(0, 20_000) : [];
  } catch { return []; }
};

const fingerprintHash = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Checks an audio signal against the operator's rights catalog.  Chromaprint
 * works on the decoded signal rather than titles, tags, or container metadata,
 * so changing a video's title/editor metadata cannot bypass this check.
 *
 * A commercial/global copyright decision is intentionally not inferred from a
 * public metadata lookup. Only reference tracks that the operator has added to
 * SOCIAL_AUDIO_RIGHTS_CATALOG_JSON can be blocked automatically.
 */
export const inspectAudioRights = async ({ filePath, mimeType }) => {
  if (!/^(audio|video)\//i.test(String(mimeType || ''))) return null;
  const result = await runFingerprint(filePath);
  if (!result) return null;
  const hash = fingerprintHash(result.fingerprint);
  const match = rightsCatalog().find((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const candidateHash = String(entry.fingerprintHash || '').trim().toLowerCase();
    const candidateFingerprint = String(entry.fingerprint || '').trim();
    return candidateHash === hash || (candidateFingerprint && candidateFingerprint === result.fingerprint);
  });
  if (!match) return {
    decision: 'allow',
    category: 'copyright/unmatched',
    score: 0,
    reason: 'Audio fingerprint did not match the configured rights catalog',
    provider: 'chromaprint-rights-catalog',
    evidence: { fingerprintHash: hash, durationSeconds: result.durationSeconds }
  };
  const policy = String(match.policy || 'block').toLowerCase();
  if (policy === 'allow') return {
    decision: 'allow',
    category: 'copyright/licensed',
    score: 1,
    reason: 'Audio is licensed in the configured rights catalog',
    provider: 'chromaprint-rights-catalog',
    evidence: { fingerprintHash: hash, durationSeconds: result.durationSeconds, referenceId: String(match.id || ''), owner: String(match.owner || '') }
  };
  return {
    decision: policy === 'review' ? 'review' : 'block',
    category: 'copyright/match',
    score: 0.99,
    reason: `Audio matches protected reference${match.title ? `: ${String(match.title).slice(0, 160)}` : ''}`,
    provider: 'chromaprint-rights-catalog',
    evidence: { fingerprintHash: hash, durationSeconds: result.durationSeconds, referenceId: String(match.id || ''), owner: String(match.owner || ''), policy }
  };
};
