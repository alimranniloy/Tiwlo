import React from 'react';
import {
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Clock,
  ExternalLink,
  Hash,
  LifeBuoy,
  Link as LinkIcon,
  MessageCircle,
  Radio,
  Receipt,
  RefreshCw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  TimerReset,
  Users,
  Workflow
} from 'lucide-react';
import { fetchIntegrationsWithApi, getAuthToken, upsertIntegrationWithApi } from '../../lib/tiwloApi';

const DISCORD_KEY = 'discord-bot';
const DISCORD_GROUP = 'communications';

const permissionScopes = [
  'bot',
  'applications.commands',
  'Send Messages',
  'Read Message History',
  'Manage Channels',
  'Manage Messages',
  'Create Private Threads',
  'Manage Threads',
  'Attach Files',
  'Embed Links',
  'Mention Everyone',
  'Manage Webhooks',
  'View Audit Log',
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
  publicKey: '',
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
  adminRoleId: '',
  supportRoleId: '',
  billingRoleId: '',
  identityRoleId: '',
  webhookSecret: '',
  transcriptRetentionDays: 180,
  firstResponseSlaMinutes: 10,
  escalationSlaMinutes: 30,
  autoCloseAfterHours: 24,
  maxOpenTicketsPerUser: 3,
  spamMessageLimit: 6,
  spamWindowSeconds: 45,
  createTemporaryChannels: true,
  showRedDot: true,
  syncTicketNumbers: true,
  closeOnSolved: true,
  storeClosedThreads: true,
  sendIdentityImages: true,
  sendInvoiceProof: true,
  animatedLiveTyping: true,
  usePrivateThreads: true,
  mentionRoleOnUrgent: true,
  autoEscalateSla: true,
  sendTranscriptOnClose: true,
  saveTranscriptToAdmin: true,
  autoTagPriority: true,
  autoAssignStaff: true,
  detectLanguage: true,
  translateCustomerMessage: false,
  autoCreateInvoiceDisputeTicket: true,
  verifyPaymentProof: true,
  postAuditEmbeds: true,
  mirrorAdminActions: true,
  slashCommands: true,
  buttonActions: true,
  staffPresenceRouting: true,
  rateLimitUsers: true,
  blockSpamLinks: true,
  maskSensitiveData: true,
  requireModeratorForIdDocs: true,
  notifyCustomerByEmail: true,
  dailyDigest: true,
  incidentBroadcasts: true,
  aiSummaryOnClose: true,
  aiSuggestedReplies: true,
  syncCustomerProfileCard: true,
  showAccountRiskScore: true,
  detectDuplicateTickets: true,
  mergeDuplicateTickets: true,
  autoReopenOnCustomerReply: true,
  customerCooldownNotice: true,
  routeByProductArea: true,
  routeByCustomerTier: true,
  routeByTimezone: true,
  onCallRotation: true,
  afterHoursAutoResponder: true,
  emergencyPageAdmin: true,
  requireTwoPersonApproval: true,
  paymentFraudScoring: true,
  invoiceDunningAlerts: true,
  refundApprovalFlow: true,
  chargebackAlertFlow: true,
  kycExpiryReminder: true,
  kycResubmissionFlow: true,
  documentBlurDetection: true,
  documentTamperSignal: true,
  webhookRetryQueue: true,
  deadLetterQueueAlerts: true,
  botHealthHeartbeat: true,
  autoDisableBrokenRules: true,
  permissionDriftAlert: true,
  channelArchiveSchedule: true,
  transcriptExportCsv: true,
  transcriptExportPdf: true,
  tagSentiment: true,
  detectAngryCustomer: true,
  csatSurveyAfterClose: true,
  staffPerformanceDigest: true,
  queueLoadBalancing: true,
  cannedReplyLibrary: true,
  knowledgeBaseSuggestions: true,
  fileVirusScanGate: true,
  attachmentSizeGuard: true,
  piiExportApproval: true,
  retentionAutoPurge: true
};

const roleFields = [
  { key: 'adminRoleId', label: 'Admin role ID', placeholder: 'Discord admin role ID', icon: Users },
  { key: 'supportRoleId', label: 'Support role ID', placeholder: 'Support agent role ID', icon: LifeBuoy },
  { key: 'billingRoleId', label: 'Billing role ID', placeholder: 'Billing team role ID', icon: Receipt },
  { key: 'identityRoleId', label: 'Identity role ID', placeholder: 'KYC/ID review role ID', icon: ClipboardCheck },
  { key: 'webhookSecret', label: 'Webhook secret', placeholder: 'Shared secret for bot callbacks', icon: ShieldCheck }
];

const numericFields = [
  { key: 'firstResponseSlaMinutes', label: 'First response SLA', suffix: 'min', min: 1, max: 240 },
  { key: 'escalationSlaMinutes', label: 'Escalation SLA', suffix: 'min', min: 5, max: 1440 },
  { key: 'autoCloseAfterHours', label: 'Auto close solved', suffix: 'hours', min: 1, max: 720 },
  { key: 'transcriptRetentionDays', label: 'Transcript retention', suffix: 'days', min: 1, max: 3650 },
  { key: 'maxOpenTicketsPerUser', label: 'Max open tickets/user', suffix: 'tickets', min: 1, max: 50 },
  { key: 'spamMessageLimit', label: 'Spam message limit', suffix: 'msgs', min: 1, max: 100 },
  { key: 'spamWindowSeconds', label: 'Spam window', suffix: 'sec', min: 5, max: 3600 }
];

const automationGroups = [
  {
    title: 'Ticket and Live Chat Flow',
    icon: Ticket,
    items: [
      ['createTemporaryChannels', 'Create temporary channels', 'New ticket or live chat opens a temporary Discord channel.'],
      ['usePrivateThreads', 'Use private threads', 'Keep each customer case isolated under the mapped channel.'],
      ['syncTicketNumbers', 'Sync ticket numbers', 'Discord embeds include ticket/session ID and admin deep link.'],
      ['buttonActions', 'Discord action buttons', 'Approve, decline, assign, solved, reopen, and close buttons are available on embeds.'],
      ['closeOnSolved', 'Close on solved', 'Solved/closed status closes the temporary Discord workflow.'],
      ['sendTranscriptOnClose', 'Send close transcript', 'Post a transcript summary when a case is closed.'],
      ['saveTranscriptToAdmin', 'Store transcript in admin', 'Closed ticket/live-chat history stays in admin records.'],
      ['animatedLiveTyping', 'Animated live typing', 'Live chat widget can show animated typing while staff replies.']
    ]
  },
  {
    title: 'Routing and Escalation',
    icon: TimerReset,
    items: [
      ['showRedDot', 'Show red dot queue', 'New tickets and chats show red notification dots with ticket number.'],
      ['mentionRoleOnUrgent', 'Mention role on urgent', 'High-priority cases ping the matching support, billing, or identity role.'],
      ['autoEscalateSla', 'Auto escalate SLA', 'Cases breaching SLA move to escalation and mention admin role.'],
      ['autoTagPriority', 'Auto tag priority', 'Bot tags urgent, billing, identity, abuse, and outage messages automatically.'],
      ['autoAssignStaff', 'Auto assign staff', 'New cases can be assigned to available staff automatically.'],
      ['staffPresenceRouting', 'Staff presence routing', 'Prefer online staff before assigning a Discord case.'],
      ['dailyDigest', 'Daily digest', 'Send daily open, solved, overdue, and invoice review summary.'],
      ['incidentBroadcasts', 'Incident broadcasts', 'Send outage and maintenance announcements to mapped channels.']
    ]
  },
  {
    title: 'Identity and Invoice Automation',
    icon: ClipboardCheck,
    items: [
      ['sendIdentityImages', 'Send ID documents', 'Identity verification sends user, email, and document image metadata.'],
      ['requireModeratorForIdDocs', 'Restrict ID documents', 'Only mapped identity/admin roles can see document channels.'],
      ['sendInvoiceProof', 'Send invoice proof', 'Invoice paid/unpaid proof is routed to invoice channel.'],
      ['verifyPaymentProof', 'Review payment proof', 'Payment proof embeds include approve, reject, and mark paid actions.'],
      ['autoCreateInvoiceDisputeTicket', 'Create dispute tickets', 'Failed or disputed invoice proof can open a support ticket automatically.'],
      ['notifyCustomerByEmail', 'Email customer updates', 'Approval, decline, solved, and payment status changes notify the user.']
    ]
  },
  {
    title: 'Security, AI, and Logs',
    icon: ShieldAlert,
    items: [
      ['slashCommands', 'Slash commands', '/ticket, /live, /assign, /solved, /invoice, /idreview, and /broadcast are enabled.'],
      ['postAuditEmbeds', 'Audit embeds', 'Admin actions and bot actions are posted to the log channel.'],
      ['mirrorAdminActions', 'Mirror admin actions', 'Actions from the web admin panel are mirrored back to Discord.'],
      ['rateLimitUsers', 'Rate limit users', 'Throttle users who exceed the message window.'],
      ['blockSpamLinks', 'Block spam links', 'Flag suspicious links and keep them out of customer replies.'],
      ['maskSensitiveData', 'Mask sensitive data', 'Hide tokens, card-like numbers, passwords, and private keys in Discord embeds.'],
      ['detectLanguage', 'Detect language', 'Detect Bangla/English and tag the case for the right staff.'],
      ['translateCustomerMessage', 'Translate message', 'Add translated customer message text for staff when available.'],
      ['aiSummaryOnClose', 'AI close summary', 'Create a short close summary for transcript and admin history.'],
      ['aiSuggestedReplies', 'AI suggested replies', 'Show staff-only suggested replies before sending to customer.']
    ]
  },
  {
    title: 'Customer Intelligence',
    icon: Brain,
    items: [
      ['syncCustomerProfileCard', 'Customer profile card', 'Discord embeds show account age, plan, email, invoices, and last cases.'],
      ['showAccountRiskScore', 'Account risk score', 'Flag new, banned, overdue, or high-risk customers before staff replies.'],
      ['detectDuplicateTickets', 'Detect duplicate tickets', 'Find same-user or same-subject duplicate support requests.'],
      ['mergeDuplicateTickets', 'Merge duplicate tickets', 'Let staff merge duplicate Discord threads into one admin ticket.'],
      ['autoReopenOnCustomerReply', 'Auto reopen on reply', 'Closed cases reopen when the customer replies again.'],
      ['customerCooldownNotice', 'Cooldown notice', 'Warn users when they open too many tickets too quickly.'],
      ['tagSentiment', 'Sentiment tagging', 'Tag calm, confused, angry, urgent, or churn-risk messages.'],
      ['detectAngryCustomer', 'Angry customer alert', 'Escalate heated conversations before they turn into churn.']
    ]
  },
  {
    title: 'Smart Routing and On-call',
    icon: Users,
    items: [
      ['routeByProductArea', 'Route by product area', 'Send cloud, billing, tPanel, ISP, email, and store issues to matching roles.'],
      ['routeByCustomerTier', 'Route by customer tier', 'VIP, enterprise, and overdue customers follow separate routing rules.'],
      ['routeByTimezone', 'Route by timezone', 'Prefer staff whose local time is inside working hours.'],
      ['onCallRotation', 'On-call rotation', 'Rotate urgent after-hours pings across configured admin/support roles.'],
      ['afterHoursAutoResponder', 'After-hours responder', 'Send a customer-safe response when no staff is online.'],
      ['emergencyPageAdmin', 'Emergency page admin', 'Page admin role when outage, fraud, or security keywords appear.'],
      ['queueLoadBalancing', 'Queue load balancing', 'Avoid assigning new cases to overloaded staff.'],
      ['cannedReplyLibrary', 'Canned reply library', 'Expose approved reply templates in Discord actions.']
    ]
  },
  {
    title: 'Billing, Fraud, and KYC Guardrails',
    icon: Receipt,
    items: [
      ['requireTwoPersonApproval', 'Two-person approval', 'Require second admin approval for risky refunds, KYC, or payment changes.'],
      ['paymentFraudScoring', 'Payment fraud scoring', 'Score suspicious invoice proof, repeated failures, and mismatched payer data.'],
      ['invoiceDunningAlerts', 'Invoice dunning alerts', 'Post overdue, failed retry, and grace-period warnings to invoice channel.'],
      ['refundApprovalFlow', 'Refund approval flow', 'Create refund review cards with approve, reject, and request-info actions.'],
      ['chargebackAlertFlow', 'Chargeback alert flow', 'Open high-priority billing tickets when chargeback signals arrive.'],
      ['kycExpiryReminder', 'KYC expiry reminders', 'Warn identity channel before document evidence expires.'],
      ['kycResubmissionFlow', 'KYC resubmission flow', 'Ask users for missing or rejected documents after decline.'],
      ['documentBlurDetection', 'Document blur signal', 'Flag unreadable document images for manual review.'],
      ['documentTamperSignal', 'Document tamper signal', 'Flag suspicious document metadata or edits for admin review.']
    ]
  },
  {
    title: 'Reliability and Data Controls',
    icon: ShieldCheck,
    items: [
      ['webhookRetryQueue', 'Webhook retry queue', 'Retry failed Discord callbacks before marking automation failed.'],
      ['deadLetterQueueAlerts', 'Dead-letter alerts', 'Notify log channel when bot jobs fail permanently.'],
      ['botHealthHeartbeat', 'Bot health heartbeat', 'Post periodic online, latency, queue depth, and permission status.'],
      ['autoDisableBrokenRules', 'Auto-disable broken rules', 'Disable a failing automation rule after repeated errors.'],
      ['permissionDriftAlert', 'Permission drift alert', 'Alert when bot loses required permissions or channel access.'],
      ['channelArchiveSchedule', 'Channel archive schedule', 'Archive stale temporary threads on a schedule.'],
      ['transcriptExportCsv', 'CSV transcript export', 'Allow CSV export for support and audit reviews.'],
      ['transcriptExportPdf', 'PDF transcript export', 'Allow PDF transcript export for compliance evidence.'],
      ['fileVirusScanGate', 'Attachment scan gate', 'Hold risky attachments until scanner or staff approval passes.'],
      ['attachmentSizeGuard', 'Attachment size guard', 'Block oversized files before they reach Discord threads.'],
      ['piiExportApproval', 'PII export approval', 'Require admin approval before exporting sensitive customer evidence.'],
      ['retentionAutoPurge', 'Retention auto purge', 'Purge old transcripts and attachments after retention period.'],
      ['csatSurveyAfterClose', 'CSAT after close', 'Ask customer for satisfaction after solved ticket or live chat.'],
      ['staffPerformanceDigest', 'Staff performance digest', 'Summarize response time, solved count, and overdue cases by staff.'],
      ['knowledgeBaseSuggestions', 'Knowledge suggestions', 'Suggest docs and runbooks based on message subject.']
    ]
  }
];

const workflowPreview = [
  { title: 'New ticket', detail: 'Create thread, red dot, ticket number, role mention, admin link.', icon: Ticket },
  { title: 'Live chat', detail: 'Open live thread, show typing state, route to online staff.', icon: Radio },
  { title: 'ID verification', detail: 'Post user, email, submitted docs, image metadata, approve/decline buttons.', icon: ClipboardCheck },
  { title: 'Invoice proof', detail: 'Post paid/non-paid proof, payment actions, dispute ticket option.', icon: Receipt },
  { title: 'SLA breach', detail: 'Escalate, mention admin role, log event, keep transcript.', icon: Clock },
  { title: 'Fraud/KYC risk', detail: 'Score payment proof and document risk before approve/decline.', icon: ShieldAlert },
  { title: 'Webhook failure', detail: 'Retry job, then dead-letter alert with action context.', icon: TimerReset },
  { title: 'Case closed', detail: 'Close thread, save transcript, CSAT survey, post AI summary.', icon: Sparkles }
];

const developerPortalUrls = [
  {
    label: 'Interactions Endpoint URL',
    value: 'https://tiwlo.com/api/discord/interactions',
    detail: 'Use this in Discord Developer Portal when the bot should receive slash commands and buttons over HTTP.'
  },
  {
    label: 'Linked Roles Verification URL',
    value: 'https://tiwlo.com/discord/verify',
    detail: 'Use this if a Discord server role requires Tiwlo account verification.'
  },
  {
    label: 'Terms of Service URL',
    value: 'https://tiwlo.com/terms',
    detail: 'Use this in the application legal settings.'
  },
  {
    label: 'Privacy Policy URL',
    value: 'https://tiwlo.com/privacy',
    detail: 'Use this in the application legal settings.'
  }
];

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
  const [provisioning, setProvisioning] = React.useState(false);
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

  const updateConfig = (key: string, value: string | boolean | number) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const persistSettings = async () => {
    const connected = Boolean(config.botToken.trim() && config.clientId.trim() && config.publicKey.trim());
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
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await persistSettings();
      setNotice('Discord bot settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save Discord settings');
    } finally {
      setSaving(false);
    }
  };

  const provisionServer = async () => {
    setProvisioning(true);
    setError('');
    setNotice('');
    try {
      await persistSettings();
      const token = getAuthToken();
      const response = await fetch('/api/discord/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({})
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Discord server provisioning failed');
      setConfig(safeConfig(payload?.config));
      setStatus('active');
      const created = Array.isArray(payload?.channels) ? payload.channels.filter((item: any) => item.created).length : 0;
      setNotice(`Discord server provisioned. ${created} new channels created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to provision Discord server');
    } finally {
      setProvisioning(false);
    }
  };

  const connected = status === 'active' && config.botToken && config.clientId && config.publicKey;
  const url = inviteUrl(config.clientId);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      setNotice('URL copied.');
    } catch {
      setError('Unable to copy URL');
    }
  };

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
          <button type="button" onClick={provisionServer} disabled={provisioning || saving} className="inline-flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
            <Server className="h-4 w-4" /> {provisioning ? 'Provisioning...' : 'Provision Server'}
          </button>
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
              ['publicKey', 'Application public key', 'Discord interactions public key'],
              ['guildId', 'Server / guild ID', 'Optional target server ID for automation'],
              ['ticketCategoryName', 'Ticket category', 'Temporary ticket channels category'],
              ['liveChatCategoryName', 'Live chat category', 'Temporary live chat channels category']
            ].map(([key, label, placeholder]) => (
              <label key={key} className={key === 'botToken' || key === 'publicKey' ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
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
              <span className="text-sm font-black">{connected ? 'Discord API connected' : 'Add bot token, client ID, and public key to connect'}</span>
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
          <p className="mt-1 text-[12px] text-[#4a4a4a]">Click Provision Server after inviting the bot. Tiwlo will create missing categories/channels and save the Discord links here.</p>
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
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Discord Developer Portal URLs</h2>
          <p className="mt-1 text-[12px] text-[#4a4a4a]">When creating or configuring another Discord bot application, use these Tiwlo links in the Developer Portal.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 xl:grid-cols-2">
          {developerPortalUrls.map((item) => (
            <div key={item.label} className="rounded border border-[#e5e8ed] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">{item.label}</p>
                <button type="button" onClick={() => copyText(item.value)} className="inline-flex items-center gap-1 rounded border border-[#d8dee9] px-2 py-1 text-[11px] font-black text-[#374151] hover:bg-[#f8f9fa]">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <p className="break-all rounded border border-blue-100 bg-blue-50 px-3 py-2 font-mono text-[12px] font-bold text-blue-800">{item.value}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e8ed] bg-white">
        <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Roles, Security, and SLA</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_1fr]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {roleFields.map((field) => (
              <label key={field.key} className={field.key === 'webhookSecret' ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500"><field.icon className="h-3.5 w-3.5" />{field.label}</span>
                <input
                  type={field.key === 'webhookSecret' ? 'password' : 'text'}
                  value={(config as any)[field.key]}
                  onChange={(event) => updateConfig(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded border border-[#d8dee9] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {numericFields.map((field) => (
              <label key={field.key} className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{field.label}</span>
                <div className="flex overflow-hidden rounded border border-[#d8dee9] bg-white focus-within:border-[#0069ff]">
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={(config as any)[field.key]}
                    onChange={(event) => updateConfig(field.key, Number(event.target.value || field.min))}
                    className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                  />
                  <span className="flex items-center border-l border-[#e5e8ed] bg-[#f8f9fa] px-3 text-[11px] font-black uppercase text-gray-400">{field.suffix}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {automationGroups.map((group) => (
        <section key={group.title} className="rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center gap-2 border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4">
            <group.icon className="h-4 w-4 text-[#0069ff]" />
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">{group.title}</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
            {group.items.map(([key, title, detail]) => (
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
      ))}

      <section className="rounded-lg border border-[#e5e8ed] bg-white">
        <div className="flex items-center gap-2 border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4">
          <Brain className="h-4 w-4 text-[#0069ff]" />
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Automation Logic Preview</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {workflowPreview.map((item) => (
            <div key={item.title} className="rounded border border-[#e5e8ed] p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[#2e3d49]">
                <item.icon className="h-4 w-4 text-[#0069ff]" />
                {item.title}
              </div>
              <p className="text-[12px] leading-relaxed text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-[13px] font-medium leading-relaxed text-blue-950">
        Discord bot worker note: this page stores the complete automation policy in the `discord-bot` integration. The worker should read this config, create channels or private threads, post embed cards with buttons, validate webhook callbacks with the secret, enforce SLA/rate-limit rules, write audit logs, and update support, identity, and invoice records when staff replies or clicks actions.
      </section>
    </form>
  );
}
