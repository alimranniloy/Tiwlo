import React from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Hash,
  LifeBuoy,
  Link as LinkIcon,
  MessageCircle,
  Receipt,
  RefreshCw,
  Save,
  ShieldCheck,
  Ticket,
  Workflow
} from 'lucide-react';
import { fetchIntegrationsWithApi, upsertIntegrationWithApi } from '../../lib/tiwloApi';

const DISCORD_KEY = 'discord-bot';
const DISCORD_GROUP = 'communications';

const permissionScopes = [
  'bot',
  'applications.commands',
  'Send Messages',
  'Read Message History',
  'Manage Channels',
  'Create Private Threads',
  'Attach Files',
  'Embed Links',
  'Use Slash Commands'
];

const channelFields = [
  { key: 'ticketChannelName', label: 'Ticket channel', placeholder: 'support-tickets', icon: Ticket },
  { key: 'ticketChannelLink', label: 'Ticket channel link', placeholder: 'https://discord.com/channels/...', icon: LinkIcon },
  { key: 'liveChatChannelName', label: 'Live chat channel', placeholder: 'live-support', icon: MessageCircle },
  { key: 'liveChatChannelLink', label: 'Live chat channel link', placeholder: 'https://discord.com/channels/...', icon: LinkIcon },
  { key: 'idVerifiedChannelName', label: 'ID verified channel', placeholder: 'id-verified', icon: ClipboardCheck },
  { key: 'idVerifiedChannelLink', label: 'ID verified channel link', placeholder: 'https://discord.com/channels/...', icon: LinkIcon },
  { key: 'invoiceChannelName', label: 'Invoice channel', placeholder: 'invoices', icon: Receipt },
  { key: 'invoiceChannelLink', label: 'Invoice channel link', placeholder: 'https://discord.com/channels/...', icon: LinkIcon },
  { key: 'logChannelName', label: 'Log channel', placeholder: 'system-logs', icon: Hash },
  { key: 'logChannelLink', label: 'Log channel link', placeholder: 'https://discord.com/channels/...', icon: LinkIcon }
];

const defaultConfig = {
  botToken: '',
  clientId: '',
  guildId: '',
  ticketCategoryName: 'Tiwlo Tickets',
  liveChatCategoryName: 'Tiwlo Live Chat',
  ticketChannelName: 'support-tickets',
  ticketChannelLink: '',
  liveChatChannelName: 'live-support',
  liveChatChannelLink: '',
  idVerifiedChannelName: 'id-verified',
  idVerifiedChannelLink: '',
  invoiceChannelName: 'invoices',
  invoiceChannelLink: '',
  logChannelName: 'system-logs',
  logChannelLink: '',
  createTemporaryChannels: true,
  showRedDot: true,
  syncTicketNumbers: true,
  closeOnSolved: true,
  storeClosedThreads: true,
  sendIdentityImages: true,
  sendInvoiceProof: true,
  animatedLiveTyping: true
};

function safeConfig(value: any) {
  return { ...defaultConfig, ...(value && typeof value === 'object' ? value : {}) };
}

function inviteUrl(clientId: string) {
  if (!clientId.trim()) return '';
  const permissions = '274878155840';
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId.trim())}&permissions=${permissions}&scope=bot%20applications.commands`;
}

export default function AdminDiscordBot() {
  const [config, setConfig] = React.useState(defaultConfig);
  const [status, setStatus] = React.useState('inactive');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const loadDiscord = React.useCallback(() => {
    setLoading(true);
    setError('');
    fetchIntegrationsWithApi(DISCORD_GROUP)
      .then((items) => {
        const discord = items.find((item) => item.key === DISCORD_KEY);
        if (discord) {
          setConfig(safeConfig(discord.config));
          setStatus(discord.status || 'inactive');
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load Discord settings'))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadDiscord();
  }, [loadDiscord]);

  const updateConfig = (key: string, value: string | boolean) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const connected = Boolean(config.botToken.trim() && config.clientId.trim() && config.guildId.trim());
      await upsertIntegrationWithApi({
        key: DISCORD_KEY,
        group: DISCORD_GROUP,
        name: 'Discord Bot',
        status: connected ? 'active' : status,
        config,
        health: {
          status: connected ? 'connected' : 'needs_credentials',
          checkedAt: new Date().toISOString(),
          requiredScopes: permissionScopes
        }
      });
      setStatus(connected ? 'active' : status);
      setNotice('Discord bot settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save Discord settings');
    } finally {
      setSaving(false);
    }
  };

  const connected = status === 'active' && config.botToken && config.clientId && config.guildId;
  const url = inviteUrl(config.clientId);

  return (
    <form onSubmit={saveSettings} className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Discord Bot System</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Connect Discord API, map channels, and control ticket, live chat, ID, invoice, and log automation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadDiscord} className="inline-flex items-center gap-2 rounded border border-[#d8dee9] bg-white px-4 py-2 text-[13px] font-bold text-[#374151] hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded border border-indigo-100 bg-indigo-50 px-4 py-2 text-[13px] font-bold text-indigo-700 hover:bg-indigo-100">
              <ExternalLink className="h-4 w-4" /> Invite Bot
            </a>
          )}
          <button disabled={saving} className="inline-flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}
      {notice && <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{notice}</div>}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Discord API Connection</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            {[
              ['botToken', 'Bot token', 'Paste Discord bot token'],
              ['clientId', 'Application client ID', 'Discord application ID'],
              ['guildId', 'Server / guild ID', 'Target Discord server ID'],
              ['ticketCategoryName', 'Ticket category', 'Temporary ticket channels category'],
              ['liveChatCategoryName', 'Live chat category', 'Temporary live chat channels category']
            ].map(([key, label, placeholder]) => (
              <label key={key} className={key === 'botToken' ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
                <input
                  type={key === 'botToken' ? 'password' : 'text'}
                  value={(config as any)[key]}
                  onChange={(event) => updateConfig(key, event.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded border border-[#d8dee9] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Required Allows</h2>
          </div>
          <div className="space-y-3 p-5">
            <div className={`flex items-center gap-3 rounded border px-4 py-3 ${connected ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
              <Bot className="h-5 w-5" />
              <span className="text-sm font-black">{connected ? 'Discord API connected' : 'Add bot token, client ID, and guild ID to connect'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {permissionScopes.map((scope) => (
                <div key={scope} className="flex items-center gap-2 rounded border border-[#e5e8ed] px-3 py-2 text-[12px] font-bold text-[#374151]">
                  <ShieldCheck className="h-4 w-4 text-[#0069ff]" /> {scope}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e8ed] bg-white">
        <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Channel Mapping</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {channelFields.map((field) => (
            <label key={field.key} className="space-y-2">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500"><field.icon className="h-3.5 w-3.5" />{field.label}</span>
              <input
                value={(config as any)[field.key]}
                onChange={(event) => updateConfig(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded border border-[#d8dee9] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e8ed] bg-white">
        <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Automation Rules</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['createTemporaryChannels', 'Create temporary channels', 'New ticket or live chat opens a temporary Discord channel.'],
            ['showRedDot', 'Show red dot queue', 'New tickets and chats show red notification dots with ticket number.'],
            ['syncTicketNumbers', 'Sync ticket numbers', 'Discord message includes ticket/session ID and channel link.'],
            ['closeOnSolved', 'Close on solved', 'Solved/closed status closes the temporary Discord workflow.'],
            ['storeClosedThreads', 'Store closed threads', 'Closed ticket/live-chat history stays in admin records.'],
            ['sendIdentityImages', 'Send ID documents', 'Identity verification sends user, email, and document image metadata.'],
            ['sendInvoiceProof', 'Send invoice proof', 'Invoice paid/unpaid proof is routed to invoice channel.'],
            ['animatedLiveTyping', 'Animated live typing', 'Live chat widget can show animated typing while staff replies.']
          ].map(([key, title, detail]) => (
            <label key={key} className="flex cursor-pointer gap-3 rounded border border-[#e5e8ed] p-4 hover:bg-[#f8f9fa]">
              <input type="checkbox" checked={Boolean((config as any)[key])} onChange={(event) => updateConfig(key, event.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300" />
              <span>
                <span className="flex items-center gap-2 text-[13px] font-black text-[#2e3d49]"><Workflow className="h-4 w-4 text-[#0069ff]" />{title}</span>
                <span className="mt-1 block text-[12px] leading-relaxed text-gray-500">{detail}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-[13px] font-medium leading-relaxed text-blue-950">
        Discord bot worker note: this page stores the connection and channel policy in the `discord-bot` integration. The automation worker should read this config, create ticket/live-chat temporary channels, post ID and invoice embeds, and update support records when staff replies or clicks solved.
      </section>
    </form>
  );
}
