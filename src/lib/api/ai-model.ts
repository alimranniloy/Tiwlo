import { GRAPHQL_URL, getAuthToken, graphQL } from './client';

const configFields = `
  enabled
  autoStart
  modelName
  modelFile
  modelPath
  modelUri
  modelUrl
  contextSize
  maxTokens
  temperature
  systemPrompt
`;

const runtimeFields = `
  status
  running
  modelExists
  modelSizeBytes
  modelPath
  downloadStatus
  downloadedBytes
  totalBytes
  lastError
  startedAt
  updatedAt
  chatCount
`;

const historyFields = `
  id
  role
  content
  createdAt
`;

const overviewFields = `
  config { ${configFields} }
  runtime { ${runtimeFields} }
  history { ${historyFields} }
`;

export async function fetchAiModelOverviewWithApi() {
  const data = await graphQL<{ aiModelOverview: any }>(
    `query AiModelOverview {
      aiModelOverview { ${overviewFields} }
    }`
  );

  return data.aiModelOverview;
}

export async function updateAiModelSettingsWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateAiModelSettings: any }>(
    `mutation UpdateAiModelSettings($input: AiModelSettingsInput!) {
      updateAiModelSettings(input: $input) { ${overviewFields} }
    }`,
    { input }
  );

  return data.updateAiModelSettings;
}

export async function startAiModelWithApi() {
  const data = await graphQL<{ startAiModel: any }>(
    `mutation StartAiModel {
      startAiModel { ${overviewFields} }
    }`
  );

  return data.startAiModel;
}

export async function stopAiModelWithApi() {
  const data = await graphQL<{ stopAiModel: any }>(
    `mutation StopAiModel {
      stopAiModel { ${overviewFields} }
    }`
  );

  return data.stopAiModel;
}

export async function downloadAiModelWithApi() {
  const data = await graphQL<{ downloadAiModel: any }>(
    `mutation DownloadAiModel {
      downloadAiModel { ${overviewFields} }
    }`
  );

  return data.downloadAiModel;
}

export async function chatWithAiModelWithApi(input: { message: string; reset?: boolean }) {
  const data = await graphQL<{ chatWithAiModel: any }>(
    `mutation ChatWithAiModel($input: AiModelChatInput!) {
      chatWithAiModel(input: $input) {
        ok
        message
        error
        runtime { ${runtimeFields} }
      }
    }`,
    { input }
  );

  return data.chatWithAiModel;
}

export type AiModelStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; ok?: boolean; message?: string; error?: string; runtime?: unknown }
  | { type: 'error'; error: string };

export async function streamAiModelChatWithApi(
  input: { message: string; reset?: boolean },
  onEvent: (event: AiModelStreamEvent) => void,
  options: { signal?: AbortSignal } = {}
) {
  const token = getAuthToken();
  const response = await fetch(`${GRAPHQL_URL.replace(/\/graphql\/?$/, '')}/ai/model/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(input),
    signal: options.signal
  });

  if (!response.ok) throw new Error(`AI model stream failed: ${response.status}`);
  if (!response.body) throw new Error('AI model stream is not available in this browser');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalEvent: AiModelStreamEvent | null = null;
  let streamError = '';

  const emit = (raw: string) => {
    const data = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();
    if (!data) return;
    const event = JSON.parse(data) as AiModelStreamEvent;
    finalEvent = event;
    if (event.type === 'error') streamError = event.error;
    onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const parts = buffer.split(/\n\n/);
    buffer = parts.pop() || '';
    parts.forEach(emit);
    if (done) break;
  }

  if (buffer.trim()) emit(buffer);
  if (streamError) throw new Error(streamError);
  return finalEvent;
}
