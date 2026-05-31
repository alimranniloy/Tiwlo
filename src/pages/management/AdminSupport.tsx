import React from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  LifeBuoy,
  Loader2,
  MessageCircle,
  MessageSquare,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  User,
  UserCheck,
  X
} from 'lucide-react';
import {
  assignLiveChatSessionWithApi,
  assignSupportTicketWithApi,
  createSupportTicketWithApi,
  createTicketFromLiveChatWithApi,
  fetchIntegrationsWithApi,
  fetchLiveChatSessionWithApi,
  fetchLiveChatSessionsWithApi,
  fetchSupportTicketWithApi,
  fetchSupportTicketsWithApi,
  fetchUsersForAdmin,
  startIdentityVerificationWithApi,
  replySupportTicketWithApi,
  sendLiveChatMessageWithApi,
  updateLiveChatSessionStatusWithApi,
  updateSupportTicketStatusWithApi
} from '../../lib/tiwloApi';

const staffRoles = new Set(['super_admin', 'admin', 'manager', 'staff']);
const discordChannelKeys = {
  tickets: 'ticketChannelLink',
  liveChat: 'liveChatChannelLink'
};

function getStoredUser() {
  try {
    const saved = localStorage.getItem('tiwlo_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function isStaffMessage(message: any) {
  const role = String(message.authorRole || message.senderRole || '').toLowerCase();
  return role === 'support' || staffRoles.has(role);
}

function ticketMessages(ticket: any) {
  if (!ticket) return [];
  if (Array.isArray(ticket.messages) && ticket.messages.length > 0) return ticket.messages;
  return [{
    id: `${ticket.id}-initial`,
    authorName: ticket.owner?.name || 'Customer',
    authorRole: 'user',
    body: ticket.message,
    visibility: 'public',
    createdAt: ticket.createdAt
  }];
}

function statusPill(status: string) {
  const normalized = String(status || '').toLowerCase();
  if (['resolved', 'closed'].includes(normalized)) return 'bg-green-50 text-green-700 border-green-100';
  if (normalized === 'assigned') return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  if (normalized === 'pending') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-blue-50 text-blue-700 border-blue-100';
}

function aiMeta(item: any) {
  return item?.metadata?.ai || {};
}

function aiBadge(item: any) {
  const ai = aiMeta(item);
  if (!ai?.lastReplyBy && !ai?.needsHuman && !ai?.safety) return null;
  if (ai.safety && ai.safety !== 'normal') {
    return <span className="inline-flex items-center gap-1 rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase text-red-700"><ShieldAlert className="h-3 w-3" /> Security</span>;
  }
  if (ai.needsHuman) {
    return <span className="inline-flex items-center gap-1 rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700"><UserCheck className="h-3 w-3" /> Human</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700"><Bot className="h-3 w-3" /> AI</span>;
}

function isDisabledAccountCase(item: any) {
  const metadata = item?.metadata || {};
  const label = `${metadata.caseLabel || ''} ${metadata.label || ''} ${metadata.source || ''} ${item?.subject || ''}`.toLowerCase();
  return label.includes('disable account')
    || label.includes('disabled account')
    || label.includes('restricted-account')
    || Boolean(metadata.accountUserId);
}

export default function AdminSupport() {
  const currentUser = React.useMemo(getStoredUser, []);
  const [activeView, setActiveView] = React.useState<'tickets' | 'liveChat'>('tickets');
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [chatSessions, setChatSessions] = React.useState<any[]>([]);
  const [staffUsers, setStaffUsers] = React.useState<any[]>([]);
  const [discordConfig, setDiscordConfig] = React.useState<any | null>(null);
  const [search, setSearch] = React.useState('');
  const [chatSearch, setChatSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [chatStatusFilter, setChatStatusFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [chatLoading, setChatLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [selectedTicket, setSelectedTicket] = React.useState<any | null>(null);
  const [selectedChat, setSelectedChat] = React.useState<any | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [replyBody, setReplyBody] = React.useState('');
  const [replyVisibility, setReplyVisibility] = React.useState('public');
  const [chatReplyBody, setChatReplyBody] = React.useState('');
  const [isMemoOpen, setIsMemoOpen] = React.useState(false);
  const [memo, setMemo] = React.useState({
    subject: '',
    category: 'internal',
    priority: 'medium',
    message: ''
  });

  const loadTickets = React.useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    fetchSupportTicketsWithApi(statusFilter || undefined, search || undefined)
      .then(setTickets)
      .catch((err) => {
        setTickets([]);
        setError(err instanceof Error ? err.message : 'Unable to load support tickets');
      })
      .finally(() => {
        if (!quiet) setLoading(false);
      });
  }, [statusFilter, search]);

  const loadChats = React.useCallback((quiet = false) => {
    if (!quiet) setChatLoading(true);
    fetchLiveChatSessionsWithApi(chatStatusFilter || undefined, chatSearch || undefined)
      .then(setChatSessions)
      .catch((err) => {
        setChatSessions([]);
        setError(err instanceof Error ? err.message : 'Unable to load live chats');
      })
      .finally(() => {
        if (!quiet) setChatLoading(false);
      });
  }, [chatStatusFilter, chatSearch]);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      loadTickets(true);
      loadChats(true);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [loadTickets, loadChats]);

  React.useEffect(() => {
    fetchUsersForAdmin()
      .then((users) => setStaffUsers(users.filter((user: any) => staffRoles.has(String(user.role || '').toLowerCase()))))
      .catch(() => setStaffUsers([]));
  }, []);

  React.useEffect(() => {
    fetchIntegrationsWithApi('communications', 'active')
      .then((items) => {
        const discord = items.find((item: any) => item.key === 'discord-bot');
        setDiscordConfig(discord?.config || null);
      })
      .catch(() => setDiscordConfig(null));
  }, []);

  const createMemo = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createSupportTicketWithApi(memo);
      setMemo({ subject: '', category: 'internal', priority: 'medium', message: '' });
      setIsMemoOpen(false);
      loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create internal memo');
    } finally {
      setSaving(false);
    }
  };

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    setSelectedChat(null);
    setDetailLoading(true);
    setReplyBody('');
    setReplyVisibility('public');
    try {
      setSelectedTicket(await fetchSupportTicketWithApi(ticket.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load ticket details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openChat = async (session: any) => {
    setSelectedChat(session);
    setSelectedTicket(null);
    setDetailLoading(true);
    setChatReplyBody('');
    try {
      setSelectedChat(await fetchLiveChatSessionWithApi(session.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load live chat');
    } finally {
      setDetailLoading(false);
    }
  };

  const mergeTicket = (ticket: any) => {
    setTickets((current) => current.map((item) => item.id === ticket.id ? ticket : item));
    setSelectedTicket(ticket);
  };

  const mergeChat = (session: any) => {
    setChatSessions((current) => current.map((item) => item.id === session.id ? session : item));
    setSelectedChat(session);
  };

  const setTicketStatus = async (id: string, status: string) => {
    setError('');
    try {
      const updated = await updateSupportTicketStatusWithApi(id, status);
      mergeTicket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update ticket status');
    }
  };

  const assignTicket = async (id: string, assigneeId?: string | null) => {
    setError('');
    try {
      mergeTicket(await assignSupportTicketWithApi(id, assigneeId || null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign ticket');
    }
  };

  const submitTicketReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTicket || !replyBody.trim()) return;
    setSaving(true);
    setError('');
    try {
      await replySupportTicketWithApi(selectedTicket.id, {
        body: replyBody.trim(),
        visibility: replyVisibility
      });
      const fresh = await fetchSupportTicketWithApi(selectedTicket.id);
      mergeTicket(fresh);
      setReplyBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reply');
    } finally {
      setSaving(false);
    }
  };

  const assignChat = async (id: string, assigneeId?: string | null) => {
    setError('');
    try {
      mergeChat(await assignLiveChatSessionWithApi(id, assigneeId || null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign chat');
    }
  };

  const setChatStatus = async (id: string, status: string) => {
    setError('');
    try {
      mergeChat(await updateLiveChatSessionStatusWithApi(id, status));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update chat status');
    }
  };

  const submitChatReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedChat || !chatReplyBody.trim()) return;
    setSaving(true);
    setError('');
    try {
      await sendLiveChatMessageWithApi(selectedChat.id, { body: chatReplyBody.trim() });
      const fresh = await fetchLiveChatSessionWithApi(selectedChat.id);
      mergeChat(fresh);
      setChatReplyBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send live chat message');
    } finally {
      setSaving(false);
    }
  };

  const convertChatToTicket = async () => {
    if (!selectedChat) return;
    setSaving(true);
    setError('');
    try {
      const ticket = await createTicketFromLiveChatWithApi(selectedChat.id, selectedChat.subject || 'Live chat follow-up');
      setTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);
      const freshChat = await fetchLiveChatSessionWithApi(selectedChat.id);
      mergeChat(freshChat);
      setActiveView('tickets');
      setSelectedChat(null);
      setSelectedTicket(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to convert chat to ticket');
    } finally {
      setSaving(false);
    }
  };

  const sendIdentityVerification = async (item: any, kind: 'ticket' | 'chat') => {
    const ownerId = item?.metadata?.accountUserId || item?.ownerId;
    if (!ownerId) {
      setError('This support case does not have a linked account.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const request = await startIdentityVerificationWithApi({
        ownerId,
        flow: 'account_recovery',
        source: 'support',
        supportTicketId: kind === 'ticket' ? item.id : undefined,
        liveChatSessionId: kind === 'chat' ? item.id : undefined
      });
      setNotice(`ID verification request sent to ${item.owner?.email || ownerId}.`);
      if (kind === 'ticket' && selectedTicket?.id === item.id) {
        setSelectedTicket((current: any) => ({ ...(current || item), metadata: { ...(current?.metadata || item.metadata || {}), identityVerificationId: request.id } }));
      }
      if (kind === 'chat' && selectedChat?.id === item.id) {
        setSelectedChat((current: any) => ({ ...(current || item), metadata: { ...(current?.metadata || item.metadata || {}), identityVerificationId: request.id } }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send ID verification');
    } finally {
      setSaving(false);
    }
  };

  const openCount = tickets.filter((ticket) => ['open', 'pending'].includes(String(ticket.status).toLowerCase())).length;
  const resolvedCount = tickets.filter((ticket) => ['resolved', 'closed'].includes(String(ticket.status).toLowerCase())).length;
  const highCount = tickets.filter((ticket) => String(ticket.priority).toLowerCase() === 'high').length;
  const activeChatCount = chatSessions.filter((session) => ['open', 'assigned'].includes(String(session.status).toLowerCase())).length;
  const newTicketCount = tickets.filter((ticket) => ['open', 'pending'].includes(String(ticket.status).toLowerCase())).length;
  const newLiveChatCount = chatSessions.filter((session) => ['open', 'assigned'].includes(String(session.status).toLowerCase())).length;
  const showDiscordDots = discordConfig?.showRedDot !== false;
  const discordTicketLink = discordConfig?.[discordChannelKeys.tickets];
  const discordLiveChatLink = discordConfig?.[discordChannelKeys.liveChat];
  const filteredTickets = tickets.filter((ticket) => {
    const haystack = `${ticket.subject} ${ticket.category} ${ticket.priority} ${ticket.status} ${ticket.owner?.name || ''} ${ticket.assignedTo?.name || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const filteredChats = chatSessions.filter((session) => {
    const haystack = `${session.subject || ''} ${session.status} ${session.priority} ${session.owner?.name || ''} ${session.assignedTo?.name || ''}`.toLowerCase();
    return haystack.includes(chatSearch.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Staff Support Center</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Tickets, replies, assignees, and live chat queues are synced with the API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadTickets(); loadChats(); }} className="flex items-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] transition-colors hover:bg-gray-50">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setIsMemoOpen(true)} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white transition-all hover:bg-[#0056cc]">
            <MessageSquare className="h-4 w-4" /> Internal Memo
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {[
          { label: 'Open Tickets', value: openCount, color: 'text-blue-600' },
          { label: 'Live Chats', value: activeChatCount, color: 'text-indigo-600' },
          { label: 'High Priority', value: highCount, color: 'text-amber-500' },
          { label: 'Resolved', value: resolvedCount, color: 'text-[#24ad5f]' }
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#e5e8ed] bg-white p-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {discordConfig && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { label: 'Discord ticket channel', href: discordTicketLink, count: newTicketCount, name: discordConfig.ticketChannelName || 'support-tickets' },
            { label: 'Discord live chat channel', href: discordLiveChatLink, count: newLiveChatCount, name: discordConfig.liveChatChannelName || 'live-support' }
          ].map((channel) => (
            <div key={channel.label} className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e8ed] bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">{channel.label}</p>
                <p className="mt-1 flex min-w-0 items-center gap-2 text-[13px] font-bold text-[#2e3d49]">
                  {showDiscordDots && channel.count > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]" />}
                  <span className="truncate">#{channel.name}</span>
                  <span className="rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">{channel.count}</span>
                </p>
              </div>
              {channel.href ? (
                <a href={channel.href} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded border border-indigo-100 bg-indigo-50 px-3 py-2 text-[12px] font-bold text-indigo-700 hover:bg-indigo-100">
                  <ExternalLink className="h-4 w-4" /> Open
                </a>
              ) : (
                <span className="shrink-0 text-[11px] font-bold text-gray-400">No link</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex rounded-lg border border-[#e5e8ed] bg-white p-1">
        <button onClick={() => setActiveView('tickets')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-[13px] font-bold ${activeView === 'tickets' ? 'bg-[#0069ff] text-white' : 'text-[#4a4a4a] hover:bg-gray-50'}`}>
          <LifeBuoy className="h-4 w-4" /> Tickets
        </button>
        <button onClick={() => setActiveView('liveChat')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-[13px] font-bold ${activeView === 'liveChat' ? 'bg-[#0069ff] text-white' : 'text-[#4a4a4a] hover:bg-gray-50'}`}>
          <MessageCircle className="h-4 w-4" /> Live Chat
        </button>
      </div>

      {activeView === 'tickets' ? (
        <div className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Active Inquiries</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter tickets..." className="rounded border border-[#e5e8ed] bg-white py-1 pl-9 pr-3 text-[12px]" />
              </div>
              <button onClick={() => setStatusFilter((current) => current === 'open' ? '' : 'open')} className={`rounded border border-[#e5e8ed] p-1.5 hover:bg-gray-100 ${statusFilter ? 'bg-blue-50' : ''}`} title="Toggle open tickets">
                <Filter className="h-4 w-4 text-[#4a4a4a]" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e5e8ed] bg-white">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Ticket Info</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Customer</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Assigned</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Updated</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ed]">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading support tickets from API...</td></tr>
                ) : filteredTickets.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No support tickets found.</td></tr>
                ) : filteredTickets.map((ticket) => (
                  <tr key={ticket.id} onClick={() => openTicket(ticket)} className="group cursor-pointer transition-colors hover:bg-[#f3f5f9]">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-[#2e3d49] transition-colors group-hover:text-[#0069ff]">
                          {showDiscordDots && ['open', 'pending'].includes(String(ticket.status).toLowerCase()) && <span className="h-2 w-2 rounded-full bg-red-500" title="New Discord ticket alert" />}
                          {ticket.subject}
                          {aiBadge(ticket)}
                          {discordTicketLink && <a href={discordTicketLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700"><ExternalLink className="h-3 w-3" /> Discord</a>}
                        </span>
                        <span className="font-mono text-[11px] text-gray-400">ID: {ticket.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-[13px] font-medium text-[#4a4a4a]">{ticket.owner?.name || ticket.owner?.email || ticket.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] font-bold text-[#4a4a4a]">{ticket.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${statusPill(ticket.status)}`}>{ticket.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span className="text-[12px]">{formatDateTime(ticket.updatedAt || ticket.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isDisabledAccountCase(ticket) && (
                          <button onClick={(event) => { event.stopPropagation(); sendIdentityVerification(ticket, 'ticket'); }} className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">ID verify</button>
                        )}
                        {ticket.status !== 'pending' && (
                          <button onClick={(event) => { event.stopPropagation(); setTicketStatus(ticket.id, 'pending'); }} className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Pending</button>
                        )}
                        {ticket.status !== 'resolved' && (
                          <button onClick={(event) => { event.stopPropagation(); setTicketStatus(ticket.id, 'resolved'); }} className="rounded border border-green-100 bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700">Resolve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Live Chat Queue</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Filter chats..." className="rounded border border-[#e5e8ed] bg-white py-1 pl-9 pr-3 text-[12px]" />
              </div>
              <button onClick={() => setChatStatusFilter((current) => current === 'open' ? '' : 'open')} className={`rounded border border-[#e5e8ed] p-1.5 hover:bg-gray-100 ${chatStatusFilter ? 'bg-blue-50' : ''}`} title="Toggle open chats">
                <Filter className="h-4 w-4 text-[#4a4a4a]" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e5e8ed] bg-white">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Session</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Customer</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Assigned</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Last Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ed]">
                {chatLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading live chat sessions...</td></tr>
                ) : filteredChats.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No live chats found.</td></tr>
                ) : filteredChats.map((session) => (
                  <tr key={session.id} onClick={() => openChat(session)} className="group cursor-pointer transition-colors hover:bg-[#f3f5f9]">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-[#2e3d49] transition-colors group-hover:text-[#0069ff]">
                          {showDiscordDots && ['open', 'assigned'].includes(String(session.status).toLowerCase()) && <span className="h-2 w-2 rounded-full bg-red-500" title="New Discord live chat alert" />}
                          {session.subject || 'Live chat'}
                          {aiBadge(session)}
                          {discordLiveChatLink && <a href={discordLiveChatLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700"><ExternalLink className="h-3 w-3" /> Discord</a>}
                        </span>
                        <span className="font-mono text-[11px] text-gray-400">ID: {session.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-[#4a4a4a]">{session.owner?.name || session.owner?.email || 'Customer'}</td>
                    <td className="px-6 py-4 text-[12px] font-bold text-[#4a4a4a]">{session.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4"><span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${statusPill(session.status)}`}>{session.status}</span></td>
                    <td className="px-6 py-4 text-right text-[12px] text-gray-400">{formatDateTime(session.lastMessageAt || session.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/30">
          <button className="hidden flex-1 md:block" onClick={() => setSelectedTicket(null)} aria-label="Close ticket details" />
          <aside className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="border-b border-[#e5e8ed] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${statusPill(selectedTicket.status)}`}>{selectedTicket.status}</span>
                    <span className="font-mono text-[11px] text-gray-400">{selectedTicket.id}</span>
                    {aiBadge(selectedTicket)}
                  </div>
                  <h2 className="text-xl font-bold text-[#2e3d49]">{selectedTicket.subject}</h2>
                  <p className="mt-1 text-[12px] text-[#4a4a4a]">{selectedTicket.owner?.name || selectedTicket.owner?.email || 'Customer'} - {selectedTicket.category} - {selectedTicket.priority}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Assignee</span>
                  <select value={selectedTicket.assignedToId || ''} onChange={(event) => assignTicket(selectedTicket.id, event.target.value || null)} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold text-[#4a4a4a]">
                    <option value="">Unassigned</option>
                    {staffUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  {isDisabledAccountCase(selectedTicket) && (
                    <button onClick={() => sendIdentityVerification(selectedTicket, 'ticket')} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 disabled:opacity-60">
                      <UserCheck className="h-4 w-4" /> Send ID Verification
                    </button>
                  )}
                  {currentUser?.id && (
                    <button onClick={() => assignTicket(selectedTicket.id, currentUser.id)} className="flex flex-1 items-center justify-center gap-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                      <UserCheck className="h-4 w-4" /> Assign to me
                    </button>
                  )}
                  <button onClick={() => setTicketStatus(selectedTicket.id, 'resolved')} className="flex flex-1 items-center justify-center gap-2 rounded border border-green-100 bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Resolve
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8f9fa] p-6">
              {detailLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation...</div>
              ) : ticketMessages(selectedTicket).map((message: any) => {
                const staff = isStaffMessage(message);
                return (
                  <div key={message.id} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-lg border px-4 py-3 ${message.visibility === 'internal' ? 'border-amber-100 bg-amber-50 text-amber-900' : staff ? 'border-blue-100 bg-blue-50 text-blue-950' : 'border-gray-200 bg-white text-gray-800'}`}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black uppercase tracking-wider">{message.authorName}</span>
                        <span className="text-[10px] text-gray-400">{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.body}</p>
                      {message.visibility === 'internal' && <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-600">Internal note</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submitTicketReply} className="border-t border-[#e5e8ed] bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex rounded border border-[#e5e8ed] p-1">
                  {['public', 'internal'].map((visibility) => (
                    <button key={visibility} type="button" onClick={() => setReplyVisibility(visibility)} className={`rounded px-3 py-1 text-[11px] font-bold uppercase ${replyVisibility === visibility ? 'bg-[#0069ff] text-white' : 'text-gray-500'}`}>
                      {visibility}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-bold text-gray-400">Replies update the customer thread instantly.</span>
              </div>
              <textarea required rows={4} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Write a reply..." className="w-full resize-none rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              <div className="mt-3 flex justify-end">
                <button disabled={saving || !replyBody.trim()} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                  <Send className="h-4 w-4" /> {saving ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {selectedChat && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/30">
          <button className="hidden flex-1 md:block" onClick={() => setSelectedChat(null)} aria-label="Close live chat" />
          <aside className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="border-b border-[#e5e8ed] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${statusPill(selectedChat.status)}`}>{selectedChat.status}</span>
                    <span className="font-mono text-[11px] text-gray-400">{selectedChat.id}</span>
                    {aiBadge(selectedChat)}
                  </div>
                  <h2 className="text-xl font-bold text-[#2e3d49]">{selectedChat.subject || 'Live chat'}</h2>
                  <p className="mt-1 text-[12px] text-[#4a4a4a]">{selectedChat.owner?.name || selectedChat.owner?.email || 'Customer'} - {selectedChat.priority}</p>
                </div>
                <button onClick={() => setSelectedChat(null)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Assignee</span>
                  <select value={selectedChat.assignedToId || ''} onChange={(event) => assignChat(selectedChat.id, event.target.value || null)} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold text-[#4a4a4a]">
                    <option value="">Unassigned</option>
                    {staffUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  {isDisabledAccountCase(selectedChat) && (
                    <button onClick={() => sendIdentityVerification(selectedChat, 'chat')} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 disabled:opacity-60">
                      <UserCheck className="h-4 w-4" /> ID Verify
                    </button>
                  )}
                  {currentUser?.id && (
                    <button onClick={() => assignChat(selectedChat.id, currentUser.id)} className="flex flex-1 items-center justify-center gap-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                      <UserCheck className="h-4 w-4" /> Assign to me
                    </button>
                  )}
                  <button onClick={convertChatToTicket} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 disabled:opacity-60">
                    <LifeBuoy className="h-4 w-4" /> Make Ticket
                  </button>
                  <button onClick={() => setChatStatus(selectedChat.id, 'closed')} className="rounded border border-green-100 bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Close</button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8f9fa] p-6">
              {detailLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading live chat...</div>
              ) : selectedChat.messages?.length ? selectedChat.messages.map((message: any) => {
                const staff = isStaffMessage(message);
                return (
                  <div key={message.id} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-lg border px-4 py-3 ${staff ? 'border-blue-100 bg-blue-50 text-blue-950' : 'border-gray-200 bg-white text-gray-800'}`}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black uppercase tracking-wider">{message.authorName}</span>
                        <span className="text-[10px] text-gray-400">{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.body}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded border border-dashed border-gray-200 bg-white p-6 text-center text-sm font-bold text-gray-400">No messages yet.</div>
              )}
            </div>

            <form onSubmit={submitChatReply} className="border-t border-[#e5e8ed] bg-white p-5">
              <textarea required rows={4} value={chatReplyBody} onChange={(event) => setChatReplyBody(event.target.value)} placeholder="Write a live chat reply..." className="w-full resize-none rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              <div className="mt-3 flex justify-end">
                <button disabled={saving || !chatReplyBody.trim()} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                  <Send className="h-4 w-4" /> {saving ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {isMemoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createMemo} className="w-full max-w-xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <h2 className="text-lg font-bold text-[#2e3d49]">Internal Support Memo</h2>
              <button type="button" onClick={() => setIsMemoOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Subject</span>
                <input required value={memo.subject} onChange={(event) => setMemo((current) => ({ ...current, subject: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Category</span>
                <input value={memo.category} onChange={(event) => setMemo((current) => ({ ...current, category: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Priority</span>
                <select value={memo.priority} onChange={(event) => setMemo((current) => ({ ...current, priority: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {['low', 'medium', 'high'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Message</span>
                <textarea required rows={5} value={memo.message} onChange={(event) => setMemo((current) => ({ ...current, message: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#f3f5f9] px-6 py-4">
              <button type="button" onClick={() => setIsMemoOpen(false)} className="rounded border border-[#e5e8ed] px-4 py-2 text-sm font-bold text-[#4a4a4a] hover:bg-gray-50">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Memo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
