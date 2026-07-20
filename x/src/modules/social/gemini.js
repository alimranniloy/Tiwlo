import { AppError } from '../../core/errors.js';

const DEFAULT_MODEL = 'gemini-flash-latest';
const DEFAULT_TIMEOUT_MS = 60_000;

const text = (value, limit = 20_000) => String(value ?? '').trim().slice(0, limit);

export const socialGeminiConfig = () => ({
  apiKey: text(process.env.SOCIAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY, 1_024),
  model: text(process.env.SOCIAL_GEMINI_MODEL, 120) || DEFAULT_MODEL,
  timeoutMs: Math.max(10_000, Math.min(Number(process.env.SOCIAL_GEMINI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS, 120_000))
});

export const isSocialGeminiConfigured = () => Boolean(socialGeminiConfig().apiKey);

export class SocialGeminiUnavailableError extends AppError {
  constructor(message) {
    super(message, 'SOCIAL_AI_MODEL_WARMING');
  }
}

const endpointFor = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const modelText = (payload) => (payload?.candidates || [])
  .flatMap((candidate) => candidate?.content?.parts || [])
  .map((part) => part?.text || '')
  .join('\n')
  .trim();

const parseJson = (value) => {
  const source = text(value, 32_000);
  try { return JSON.parse(source); } catch { /* try extracting the response object */ }
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(source.slice(start, end + 1)); } catch { return null; }
};

/**
 * Calls the hosted Gemini API. The secret is read only from the server
 * environment; neither the database nor the browser ever receives it.
 */
export const requestSocialGeminiJson = async ({ systemInstruction, prompt, inlineParts = [], maxOutputTokens = 512, temperature = 0 }) => {
  const config = socialGeminiConfig();
  if (!config.apiKey) throw new SocialGeminiUnavailableError('Social Gemini API is not configured on this server.');
  let response;
  try {
    response = await fetch(endpointFor(config.model), {
      method: 'POST',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: text(systemInstruction, 12_000) }] },
        contents: [{ role: 'user', parts: [{ text: text(prompt, 24_000) }, ...inlineParts] }],
        generationConfig: { temperature, maxOutputTokens: Math.max(64, Math.min(Number(maxOutputTokens) || 512, 2_048)), responseMimeType: 'application/json' }
      })
    });
  } catch (error) {
    throw new SocialGeminiUnavailableError(`Gemini API is not reachable: ${text(error?.message, 300)}`);
  }
  const raw = await response.text().catch(() => '');
  if (!response.ok) {
    const detail = text(raw, 700);
    if ([408, 429, 500, 502, 503, 504].includes(response.status)) throw new SocialGeminiUnavailableError(`Gemini API is temporarily unavailable (${response.status})${detail ? `: ${detail}` : ''}`);
    throw new AppError(`Gemini API returned ${response.status}${detail ? `: ${detail}` : ''}`, 'SOCIAL_AI_DEPENDENCY_ERROR');
  }
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new SocialGeminiUnavailableError('Gemini API returned an invalid response.'); }
  const json = parseJson(modelText(payload));
  if (!json) throw new SocialGeminiUnavailableError('Gemini API did not return the requested policy JSON result.');
  return { json, model: config.model };
};

export const socialGeminiHealth = async ({ test = false } = {}) => {
  const config = socialGeminiConfig();
  if (!config.apiKey) return { healthy: false, status: 'not_configured', model: config.model };
  if (!test) return { healthy: true, status: 'configured', model: config.model };
  const result = await requestSocialGeminiJson({
    systemInstruction: 'Return only JSON.',
    prompt: 'Return {"ok":true}.',
    maxOutputTokens: 64
  });
  return { healthy: result.json?.ok === true, status: result.json?.ok === true ? 'connected' : 'invalid_response', model: result.model };
};
