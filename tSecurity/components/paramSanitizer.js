import SqlString from 'sqlstring';
import { clean } from '../utils.js';

const dangerousPatterns = [
  { key: 'sql_boolean_injection', pattern: /(?:^|[\s'"])or\s+1\s*=\s*1(?:$|[\s'"])/i, reason: 'SQL Injection Pattern Detected' },
  { key: 'sql_union_injection', pattern: /\bunion\s+(?:all\s+)?select\b/i, reason: 'SQL Injection Pattern Detected' },
  { key: 'sql_comment_injection', pattern: /(?:--|\/\*|\*\/|#\s*$)/i, reason: 'SQL Injection Pattern Detected' },
  { key: 'sql_schema_probe', pattern: /\b(?:information_schema|pg_catalog|xp_cmdshell|benchmark\s*\(|sleep\s*\()\b/i, reason: 'SQL Injection Pattern Detected' },
  { key: 'xss_script_tag', pattern: /<\s*script\b|<\/\s*script\s*>/i, reason: 'XSS Payload Detected' },
  { key: 'xss_event_handler', pattern: /\bon[a-z]+\s*=/i, reason: 'XSS Payload Detected' },
  { key: 'html_tag_injection', pattern: /<\s*(?:iframe|object|embed|svg|meta|link|form|input|img)\b/i, reason: 'HTML Injection Detected' },
  { key: 'path_traversal', pattern: /(?:\.\.\/|\.\.\\|%2e%2e%2f|%252e%252e)/i, reason: 'Path Traversal Detected' }
];

const safeString = (value) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');

const isFilePath = (path) => /(?:^|\.)(files|file|attachments|uploads|documents|kycFiles)(?:\.|$)/i.test(path);

const scanString = (value, path, policy) => {
  const signals = [];
  const cleaned = safeString(value);
  if (cleaned !== value) {
    signals.push({
      key: 'control_character_input',
      label: 'Control characters removed from input',
      score: 55,
      block: policy.blockOnControlCharacters !== false,
      reason: 'Malformed Input Detected',
      path
    });
  }
  for (const entry of dangerousPatterns) {
    if (entry.pattern.test(value)) {
      signals.push({
        key: entry.key,
        label: 'Unsafe input pattern detected',
        score: policy.weights?.paramSanitizer || 115,
        block: policy.blockOnParamPollution !== false,
        reason: entry.reason,
        path,
        safePreview: SqlString.escape(value).slice(0, 120)
      });
      break;
    }
  }
  return { value: cleaned, signals };
};

const sanitizeNode = (value, path, policy) => {
  if (typeof value === 'string') return scanString(value, path, policy);
  if (!value || typeof value !== 'object') return { value, signals: [] };
  if (Array.isArray(value)) {
    const signals = [];
    if (!isFilePath(path) && value.length > 1) {
      signals.push({
        key: 'http_parameter_pollution',
        label: 'Repeated value for a scalar form field',
        score: policy.weights?.paramSanitizer || 115,
        block: policy.blockOnParamPollution !== false,
        reason: 'HTTP Parameter Pollution Detected',
        path,
        count: value.length
      });
    }
    const items = value.map((item, index) => {
      const child = sanitizeNode(item, `${path}.${index}`, policy);
      signals.push(...child.signals);
      return child.value;
    });
    return { value: items, signals };
  }

  const output = {};
  const signals = [];
  for (const [key, item] of Object.entries(value)) {
    const cleanKey = safeString(clean(key));
    if (cleanKey !== key || dangerousPatterns.some((entry) => entry.pattern.test(key))) {
      signals.push({
        key: 'unsafe_parameter_name',
        label: 'Unsafe parameter name',
        score: policy.weights?.paramSanitizer || 115,
        block: policy.blockOnParamPollution !== false,
        reason: 'Unsafe Parameter Name Detected',
        path: `${path}.${key}`
      });
    }
    const child = sanitizeNode(item, path ? `${path}.${cleanKey}` : cleanKey, policy);
    signals.push(...child.signals);
    output[cleanKey] = child.value;
  }
  return { value: output, signals };
};

export const paramSanitizer = ({ payload = {}, policy = {} }) => {
  const result = sanitizeNode(payload, 'payload', policy);
  return {
    passed: !result.signals.some((signal) => signal.block),
    score: result.signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals: result.signals,
    sanitizedPayload: result.value
  };
};
