import path from 'node:path';
import { clean } from '../utils.js';

const executableExtensions = new Set(['exe', 'scr', 'bat', 'cmd', 'com', 'msi', 'ps1', 'vbs', 'js', 'jar', 'sh', 'php', 'phtml']);
const allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf']);
const mimeByExt = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf'
};

const filesFromPayload = (payload = {}) => {
  const form = payload.form && typeof payload.form === 'object' ? payload.form : payload;
  const candidates = [
    payload.files,
    payload.file,
    payload.attachments,
    payload.kycFiles,
    form.files,
    form.file,
    form.attachments,
    form.kycFiles,
    form.documents
  ].filter(Boolean);
  return candidates.flatMap((item) => Array.isArray(item) ? item : [item]).filter((item) => item && typeof item === 'object');
};

const bytesFromFile = (file = {}) => {
  if (Array.isArray(file.headBytes)) return Buffer.from(file.headBytes.map((item) => Number(item) & 255));
  if (file.magicHex) return Buffer.from(clean(file.magicHex).replace(/[^a-f0-9]/gi, '').slice(0, 64), 'hex');
  const base64 = clean(file.base64 || file.data || file.previewBase64).replace(/^data:[^;]+;base64,/i, '');
  if (!base64) return Buffer.alloc(0);
  return Buffer.from(base64.slice(0, 128), 'base64');
};

const detectMagic = (buffer) => {
  if (!buffer?.length) return '';
  const hex = buffer.subarray(0, 16).toString('hex');
  if (hex.startsWith('89504e47')) return 'png';
  if (hex.startsWith('ffd8ff')) return 'jpg';
  if (hex.startsWith('25504446')) return 'pdf';
  if (hex.startsWith('47494638')) return 'gif';
  if (hex.startsWith('52494646') && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return '';
};

const extensionParts = (name) => clean(name).toLowerCase().split('.').filter(Boolean);

export const mimeShield = ({ payload = {}, policy = {} }) => {
  const signals = [];
  const files = filesFromPayload(payload);
  if (!files.length) {
    return { passed: true, score: 0, signals };
  }

  for (const file of files) {
    const name = clean(file.name || file.filename || file.originalname);
    const parts = extensionParts(name);
    const ext = clean(path.extname(name).replace('.', '') || parts.at(-1)).toLowerCase();
    const priorExecutable = parts.slice(0, -1).some((part) => executableExtensions.has(part));
    const executableFinal = executableExtensions.has(ext);
    if (priorExecutable || executableFinal || (ext && !allowedExtensions.has(ext))) {
      signals.push({
        key: 'file_extension_spoof',
        label: 'Suspicious file extension in upload metadata',
        score: policy.weights?.mimeSpoof || 120,
        block: policy.blockOnMimeSpoof !== false,
        reason: 'File MIME Spoof Detected',
        fileName: name,
        extension: ext
      });
      continue;
    }

    const detected = detectMagic(bytesFromFile(file));
    const providedMime = clean(file.type || file.mime || file.mimetype).toLowerCase();
    if (detected && ext && mimeByExt[detected] && mimeByExt[ext] && mimeByExt[detected] !== mimeByExt[ext]) {
      signals.push({
        key: 'file_magic_extension_mismatch',
        label: 'File magic bytes do not match extension',
        score: policy.weights?.mimeSpoof || 120,
        block: policy.blockOnMimeSpoof !== false,
        reason: 'File MIME Spoof Detected',
        fileName: name,
        extension: ext,
        detected
      });
      continue;
    }

    if (detected && providedMime && mimeByExt[detected] && providedMime !== mimeByExt[detected]) {
      signals.push({
        key: 'file_magic_mime_mismatch',
        label: 'File magic bytes do not match MIME type',
        score: policy.weights?.mimeSpoof || 120,
        block: policy.blockOnMimeSpoof !== false,
        reason: 'File MIME Spoof Detected',
        fileName: name,
        providedMime,
        detected
      });
    }
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
