import React from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  Download,
  HardDrive,
  Loader2,
  MessageSquare,
  Play,
  Power,
  RefreshCcw,
  Save,
  Send,
  Square,
  Terminal
} from 'lucide-react';
import {
  downloadAiModelWithApi,
  fetchAuditLogs,
  fetchAiModelOverviewWithApi,
  startAiModelWithApi,
  stopAiModelWithApi,
  streamAiModelChatWithApi,
  type AiModelStreamEvent,
  updateAiModelSettingsWithApi
} from '../../lib/tiwloApi';

const defaultConfig = {
  enabled: false,
  autoStart: true,
  modelName: 'qwen-1.5-1.8b',
  modelFile: 'qwen1_5-1_8b-chat-q4_k_m.gguf',
  modelUri: 'hf:Qwen/Qwen1.5-1.8B-Chat-GGUF/qwen1_5-1_8b-chat-q4_k_m.gguf',
  modelUrl: 'https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat-GGUF/resolve/main/qwen1_5-1_8b-chat-q4_k_m.gguf?download=true',
  modelPath: '',
  contextSize: 2048,
  maxTokens: 180,
  temperature: 0.7,
  systemPrompt: 'You are Tiwlo local AI, the calm support brain inside the Tiwlo portal. Reply in the customer language when possible, including Bangla, keep answers short, and escalate urgent or risky issues to human support.'
};

function formatBytes(value?: number) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function statusClass(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value === 'running') return 'border-green-100 bg-green-50 text-green-700';
  if (value === 'starting' || value === 'downloading') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (value === 'missing_model' || value === 'error') return 'border-red-100 bg-red-50 text-red-700';
  return 'border-gray-100 bg-gray-50 text-gray-600';
}

function logTime(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '-';
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-12 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-60 ${value ? 'bg-[#0069ff]' : 'bg-gray-200'}`}
      aria-label={value ? 'Turn AI off' : 'Turn AI on'}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${value ? 'right-1' : 'left-1'}`}></span>
    </button>
  );
}

export default function AdminAiModel() {
  const [overview, setOverview] = React.useState<any | null>(null);
  const [config, setConfig] = React.useState<any>(defaultConfig);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [aiLogs, setAiLogs] = React.useState<any[]>([]);
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState('');
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const chatBottomRef = React.useRef<HTMLDivElement | null>(null);
  const streamRef = React.useRef<AbortController | null>(null);

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [data, logs] = await Promise.all([
        fetchAiModelOverviewWithApi(),
        fetchAuditLogs()
      ]);
      setOverview(data);
      setConfig({ ...defaultConfig, ...(data.config || {}) });
      setMessages(data.history || []);
      setAiLogs(logs.filter((log: any) => String(log.action || '').startsWith('ai_')).slice(0, 12));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load AI model control plane');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  React.useEffect(() => () => streamRef.current?.abort(), []);

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const payload = (extra: Record<string, unknown> = {}) => ({
    enabled: Boolean(config.enabled),
    autoStart: Boolean(config.autoStart),
    modelName: String(config.modelName || defaultConfig.modelName),
    modelFile: String(config.modelFile || defaultConfig.modelFile),
    modelUri: String(config.modelUri || defaultConfig.modelUri),
    modelUrl: String(config.modelUrl || defaultConfig.modelUrl),
    contextSize: Number(config.contextSize || defaultConfig.contextSize),
    maxTokens: Number(config.maxTokens || defaultConfig.maxTokens),
    temperature: Number(config.temperature ?? defaultConfig.temperature),
    systemPrompt: String(config.systemPrompt || defaultConfig.systemPrompt),
    ...extra
  });

  const applyOverview = (data: any) => {
    setOverview(data);
    setConfig({ ...defaultConfig, ...(data.config || {}) });
    setMessages(data.history || []);
  };

  const saveSettings = async () => {
    setWorking('save');
    setError('');
    setSaved(false);
    try {
      applyOverview(await updateAiModelSettingsWithApi(payload()));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save AI model settings');
    } finally {
      setWorking('');
    }
  };

  const toggleAi = async () => {
    setWorking('toggle');
    setError('');
    setSaved(false);
    try {
      if (config.enabled) {
        applyOverview(await stopAiModelWithApi());
      } else {
        applyOverview(await updateAiModelSettingsWithApi(payload({ enabled: true, autoStart: true })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change AI model power state');
    } finally {
      setWorking('');
    }
  };

  const startModel = async () => {
    setWorking('start');
    setError('');
    try {
      applyOverview(await startAiModelWithApi());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start AI model');
    } finally {
      setWorking('');
    }
  };

  const stopModel = async () => {
    setWorking('stop');
    setError('');
    try {
      applyOverview(await stopAiModelWithApi());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to stop AI model');
    } finally {
      setWorking('');
    }
  };

  const downloadModel = async () => {
    setWorking('download');
    setError('');
    try {
      applyOverview(await downloadAiModelWithApi());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start model download');
    } finally {
      setWorking('');
    }
  };

  const sendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const body = prompt.trim();
    if (!body) return;

    streamRef.current?.abort();
    const controller = new AbortController();
    streamRef.current = controller;
    const streamId = `stream-${Date.now()}`;
    let draft = '';

    setPrompt('');
    setWorking('chat');
    setError('');
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: 'user', content: body, createdAt: new Date().toISOString() },
      { id: streamId, role: 'assistant', content: '', createdAt: new Date().toISOString() }
    ]);

    try {
      await streamAiModelChatWithApi({ message: body }, (event: AiModelStreamEvent) => {
        if (event.type === 'chunk') {
          draft += event.text;
          setMessages((current) => current.map((message) => (
            message.id === streamId ? { ...message, content: draft } : message
          )));
        }
        if (event.type === 'done' && !event.ok) {
          setError(event.error || 'AI model did not return a response');
        }
      }, { signal: controller.signal });
      await load(true);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Unable to chat with AI model');
      }
    } finally {
      setWorking('');
    }
  };

  const runtime = overview?.runtime || {};
  const downloadTotal = Number(runtime.totalBytes || 0);
  const downloadCurrent = Number(runtime.downloadedBytes || 0);
  const downloadPercent = downloadTotal > 0 ? Math.min(100, Math.round((downloadCurrent / downloadTotal) * 100)) : 0;
  const canChat = Boolean(config.enabled && runtime.running && working !== 'chat');

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">AI Model</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Local node-llama-cpp runtime with Qwen GGUF chat for Tiwlo Team.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 rounded border border-[#d7e3ff] bg-white px-3 py-2 text-[12px] font-bold text-[#0069ff] hover:bg-blue-50">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={saveSettings} disabled={Boolean(working) || loading} className="flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
            {working === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
          </button>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertTriangle className="mt-0.5 h-4 w-4" /> {error}</div>}
      {saved && <div className="flex items-start gap-2 rounded border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700"><CheckCircle2 className="mt-0.5 h-4 w-4" /> AI model settings saved.</div>}

      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-[#e5e8ed] bg-white text-sm font-bold text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading AI model control plane...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {[
              { label: 'Runtime', value: runtime.status || 'stopped', icon: Cpu, className: statusClass(runtime.status) },
              { label: 'Model File', value: runtime.modelExists ? 'available' : 'missing', icon: HardDrive, className: runtime.modelExists ? 'border-green-100 bg-green-50 text-green-700' : 'border-amber-100 bg-amber-50 text-amber-700' },
              { label: 'Download', value: runtime.downloadStatus || 'idle', icon: Download, className: statusClass(runtime.downloadStatus) },
              { label: 'Chats', value: runtime.chatCount || 0, icon: MessageSquare, className: 'border-blue-100 bg-blue-50 text-blue-700' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`rounded-lg border p-4 ${item.className}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-xl font-black">{item.value}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="rounded-lg border border-[#e5e8ed] bg-white shadow-sm xl:col-span-5">
              <div className="flex flex-col gap-4 border-b border-[#f3f5f9] bg-[#f8faff] px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-blue-50 p-2 text-[#0069ff]">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Model Power</h2>
                    <p className="mt-1 text-[12px] text-[#4a4a4a]">Saved on/off state controls auto-run after backend restart.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${config.enabled ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                    {config.enabled ? 'AI On' : 'AI Off'}
                  </span>
                  <Toggle value={Boolean(config.enabled)} onChange={toggleAi} disabled={Boolean(working)} />
                </div>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button onClick={startModel} disabled={Boolean(working) || runtime.running} className="flex items-center justify-center gap-2 rounded border border-green-100 bg-green-50 px-3 py-2 text-[12px] font-bold text-green-700 hover:bg-green-100 disabled:opacity-60">
                    {working === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start
                  </button>
                  <button onClick={stopModel} disabled={Boolean(working) || !config.enabled} className="flex items-center justify-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-[12px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                    {working === 'stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />} Stop
                  </button>
                  <button onClick={downloadModel} disabled={Boolean(working) || runtime.downloadStatus === 'downloading' || runtime.modelExists} className="flex items-center justify-center gap-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60">
                    {working === 'download' || runtime.downloadStatus === 'downloading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
                  </button>
                </div>

                <div className="rounded border border-[#e5e8ed] bg-[#f8f9fa] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Model Storage</span>
                    <span className="text-[11px] font-bold text-[#4a4a4a]">{formatBytes(runtime.modelSizeBytes || downloadCurrent)} / {downloadTotal ? formatBytes(downloadTotal) : 'unknown'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#0069ff]" style={{ width: `${runtime.modelExists ? 100 : downloadPercent}%` }}></div>
                  </div>
                  <p className="mt-3 break-all font-mono text-[11px] text-gray-500">{runtime.modelPath || config.modelPath}</p>
                </div>

                {runtime.lastError && (
                  <div className="rounded border border-red-100 bg-red-50 p-4 text-[12px] font-bold text-red-700">
                    {runtime.lastError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 text-[12px] font-bold text-[#4a4a4a] sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded border border-[#f3f5f9] p-3">
                    <input type="checkbox" checked={Boolean(config.autoStart)} onChange={(event) => setConfig((current: any) => ({ ...current, autoStart: event.target.checked }))} />
                    Auto-run after restart
                  </label>
                  <label className="flex items-center gap-2 rounded border border-[#f3f5f9] p-3">
                    <Power className="h-4 w-4 text-[#0069ff]" />
                    {runtime.running ? 'Runtime active' : 'Runtime inactive'}
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e8ed] bg-white shadow-sm xl:col-span-7">
              <div className="flex items-center gap-2 border-b border-[#f3f5f9] px-6 py-4">
                <Terminal className="h-4 w-4 text-[#0069ff]" />
                <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Runtime Settings</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Model Name</span>
                  <input value={config.modelName} onChange={(event) => setConfig((current: any) => ({ ...current, modelName: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">GGUF File</span>
                  <input value={config.modelFile} onChange={(event) => setConfig((current: any) => ({ ...current, modelFile: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 font-mono text-sm" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Model URI</span>
                  <input value={config.modelUri} onChange={(event) => setConfig((current: any) => ({ ...current, modelUri: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 font-mono text-sm" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Download URL</span>
                  <input value={config.modelUrl} onChange={(event) => setConfig((current: any) => ({ ...current, modelUrl: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 font-mono text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Context Tokens</span>
                  <input type="number" min="512" value={config.contextSize} onChange={(event) => setConfig((current: any) => ({ ...current, contextSize: Number(event.target.value || 0) }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Max Reply Tokens</span>
                  <input type="number" min="32" value={config.maxTokens} onChange={(event) => setConfig((current: any) => ({ ...current, maxTokens: Number(event.target.value || 0) }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Temperature</span>
                  <input type="number" min="0" max="2" step="0.1" value={config.temperature} onChange={(event) => setConfig((current: any) => ({ ...current, temperature: Number(event.target.value || 0) }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">System Prompt</span>
                  <textarea value={config.systemPrompt} onChange={(event) => setConfig((current: any) => ({ ...current, systemPrompt: event.target.value }))} rows={4} className="w-full resize-none rounded border border-[#e5e8ed] px-3 py-2 text-sm leading-6" />
                </label>
              </div>
            </div>
          </div>

          <div className="border border-[#e5e8ed] bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#0069ff]" />
                <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Local AI Chat</h2>
              </div>
              <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${statusClass(runtime.status)}`}>{runtime.status || 'stopped'}</span>
            </div>
            <div className="h-[430px] overflow-auto bg-[#f8f9fa] p-5">
              <div className="mx-auto flex max-w-4xl flex-col gap-3">
                {messages.length ? messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] border px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'border-blue-100 bg-[#0069ff] text-white' : 'border-[#e5e8ed] bg-white text-[#2e3d49]'}`}>
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest opacity-70">{message.role === 'user' ? 'You' : 'AI Model'}</div>
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    </div>
                  </div>
                )) : (
                  <div className="flex h-72 flex-col items-center justify-center text-center text-sm font-bold text-gray-400">
                    <Bot className="mb-3 h-9 w-9 text-gray-300" />
                    Turn AI on, make sure the model file is available, then chat here.
                  </div>
                )}
                <div ref={chatBottomRef}></div>
              </div>
            </div>
            <form onSubmit={sendMessage} className="flex flex-col gap-3 border-t border-[#f3f5f9] p-4 md:flex-row">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={!canChat}
                placeholder={canChat ? 'Ask the local Qwen model...' : 'AI must be on and running before chat'}
                className="min-w-0 flex-1 border border-[#e5e8ed] px-4 py-3 text-sm focus:border-[#0069ff] focus:outline-none disabled:bg-gray-50"
              />
              <button type="submit" disabled={!canChat || !prompt.trim()} className="flex items-center justify-center gap-2 bg-[#0069ff] px-5 py-3 text-[12px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                {working === 'chat' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
              </button>
            </form>
          </div>

          <div className="border border-[#e5e8ed] bg-white">
            <div className="flex items-center gap-2 border-b border-[#f3f5f9] px-6 py-4">
              <Terminal className="h-4 w-4 text-[#0069ff]" />
              <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Support AI Logs</h2>
            </div>
            <div className="divide-y divide-[#f3f5f9]">
              {aiLogs.length ? aiLogs.map((log) => (
                <div key={log.id} className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-[180px_1fr_auto] md:items-center">
                  <span className="font-mono text-[11px] text-gray-400">{logTime(log.createdAt)}</span>
                  <div>
                    <div className="text-[13px] font-bold text-[#2e3d49]">{String(log.action || '').replace(/_/g, ' ')}</div>
                    <div className="mt-1 text-[12px] text-gray-500">{log.resource} {log.resourceId || ''}</div>
                  </div>
                  <span className={`w-fit rounded border px-2 py-1 text-[10px] font-black uppercase ${log.metadata?.safety && log.metadata.safety !== 'normal' ? 'border-red-100 bg-red-50 text-red-700' : log.metadata?.needsHuman ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
                    {log.metadata?.safety && log.metadata.safety !== 'normal' ? 'Security' : log.metadata?.needsHuman ? 'Human' : 'AI'}
                  </span>
                </div>
              )) : (
                <div className="p-8 text-center text-sm font-bold text-gray-400">No support AI actions yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
