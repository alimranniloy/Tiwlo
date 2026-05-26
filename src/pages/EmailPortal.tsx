import React from 'react';
import { AlertCircle, Archive, Inbox, Loader2, LogOut, Mail, Plus, RefreshCw, Search, Send, ShieldCheck, Star, Trash2, X } from 'lucide-react';
import {
  fetchMailboxOverviewWithApi,
  mailboxLoginWithApi,
  sendMailboxEmailWithApi,
  updateMailboxMessageWithApi
} from '../lib/tiwloApi';

const MAILBOX_TOKEN_KEY = 'tiwlo_mailbox_token';

function TmailLogo({ variant = 'light', className = '' }: { variant?: 'light' | 'dark'; className?: string }) {
  return (
    <img
      src={variant === 'dark' ? '/brand/tmail-logo-white.png' : '/brand/tmail-logo.png'}
      alt="TMail"
      className={`block object-contain ${className}`}
    />
  );
}

type MailboxAccount = {
  address: string;
  hostName: string;
  imapHost: string;
  smtpHost: string;
  quotaMB: number;
  usageMB: number;
};

type MailboxMessage = {
  id: string;
  folder: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred?: boolean;
};

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EmailPortal() {
  const [token, setToken] = React.useState(() => localStorage.getItem(MAILBOX_TOKEN_KEY) || '');
  const [account, setAccount] = React.useState<MailboxAccount | null>(null);
  const [messages, setMessages] = React.useState<MailboxMessage[]>([]);
  const [folder, setFolder] = React.useState<'inbox' | 'sent' | 'starred' | 'trash'>('inbox');
  const [selectedId, setSelectedId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(Boolean(token));
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [loginForm, setLoginForm] = React.useState({ email: '', password: '' });
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [compose, setCompose] = React.useState({ to: '', subject: '', body: '' });

  const loadMailbox = React.useCallback(async (nextToken = token) => {
    if (!nextToken) return;
    setLoading(true);
    setError('');
    try {
      const overview = await fetchMailboxOverviewWithApi(nextToken);
      setAccount(overview.account);
      setMessages(overview.messages || []);
    } catch (err) {
      localStorage.removeItem(MAILBOX_TOKEN_KEY);
      setToken('');
      setAccount(null);
      setMessages([]);
      setError(err instanceof Error ? err.message : 'Unable to load mailbox');
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (token) loadMailbox(token);
  }, [token, loadMailbox]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await mailboxLoginWithApi(loginForm.email, loginForm.password);
      localStorage.setItem(MAILBOX_TOKEN_KEY, result.token);
      setToken(result.token);
      setAccount(result.account);
      setLoginForm({ email: '', password: '' });
      await loadMailbox(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(MAILBOX_TOKEN_KEY);
    setToken('');
    setAccount(null);
    setMessages([]);
    setSelectedId('');
  };

  const updateMessage = async (message: MailboxMessage, patch: Record<string, unknown>) => {
    if (!token) return;
    const updated = await updateMailboxMessageWithApi({ token, id: message.id, ...patch });
    setMessages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const openMessage = async (message: MailboxMessage) => {
    setSelectedId(message.id);
    if (!message.read) {
      await updateMessage(message, { read: true });
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      await sendMailboxEmailWithApi({ token, ...compose });
      setCompose({ to: '', subject: '', body: '' });
      setComposeOpen(false);
      setFolder('sent');
      setNotice('Email sent.');
      await loadMailbox(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email');
    } finally {
      setSending(false);
    }
  };

  const selected = messages.find((message) => message.id === selectedId) || null;
  const visibleMessages = messages
    .filter((message) => {
      if (folder === 'starred') return message.starred;
      return message.folder === folder;
    })
    .filter((message) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [message.from, message.to, message.subject, message.body].join(' ').toLowerCase().includes(q);
    });

  if (!token || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9] p-6">
        <form onSubmit={login} className="w-full max-w-sm rounded-md border border-gray-100 bg-white p-8 shadow-2xl shadow-gray-100">
          <TmailLogo className="mx-auto mb-8 h-14 w-40" />
          <h1 className="text-center text-xl font-black text-[#111827]">TMail</h1>
          <div className="mt-6 space-y-3">
            <input type="email" required value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-4 py-3 text-sm outline-none focus:border-blue-600" placeholder="email@tiwlo.com" />
            <input type="password" required value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-4 py-3 text-sm outline-none focus:border-blue-600" placeholder="Password" />
          </div>
          {error && <div className="mt-4 flex items-start gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600"><AlertCircle className="mt-0.5 h-4 w-4" /> {error}</div>}
          <button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-[#111827] px-4 py-3 text-sm font-black text-white hover:bg-black disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#111827]">
      <header className="flex h-16 items-center gap-4 border-b border-[#E5E7EB] bg-white px-4 md:px-6">
        <TmailLogo className="h-10 w-28" />
        <div className="relative max-w-3xl flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-full border border-[#E5E7EB] bg-[#F3F5F9] px-11 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white" placeholder="Search mail" />
        </div>
        <button onClick={() => loadMailbox(token)} className="rounded-full p-2 text-[#4B5563] hover:bg-[#F3F5F9]" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
        <button onClick={logout} className="rounded-full p-2 text-[#4B5563] hover:bg-[#F3F5F9]" title="Sign out"><LogOut className="h-4 w-4" /></button>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-64 shrink-0 border-r border-[#E5E7EB] bg-white p-4 md:block">
          <button onClick={() => setComposeOpen(true)} className="mb-5 inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Compose
          </button>
          {[
            ['inbox', Inbox, 'Inbox'],
            ['starred', Star, 'Starred'],
            ['sent', Send, 'Sent'],
            ['trash', Trash2, 'Trash']
          ].map(([key, Icon, label]) => (
            <button key={String(key)} onClick={() => { setFolder(key as any); setSelectedId(''); }} className={`mb-1 flex w-full items-center gap-3 rounded-r-full px-4 py-2 text-sm font-bold ${folder === key ? 'bg-blue-50 text-blue-700' : 'text-[#4B5563] hover:bg-[#F3F5F9]'}`}>
              {React.createElement(Icon as any, { className: 'h-4 w-4' })} {label}
            </button>
          ))}
          <div className="mt-8 rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[10px] font-black uppercase text-[#6B7280]">Signed in</p>
            <p className="mt-1 break-all text-[12px] font-bold">{account.address}</p>
            <p className="mt-3 text-[10px] font-black uppercase text-[#6B7280]">Host</p>
            <p className="mt-1 break-all text-[12px] font-bold">{account.hostName}</p>
          </div>
        </aside>

        <main className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(320px,420px)_1fr]">
          <section className="border-r border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <div>
                <p className="text-sm font-black capitalize">{folder}</p>
                <p className="text-[11px] font-bold text-[#6B7280]">{visibleMessages.length} messages</p>
              </div>
              <button onClick={() => setComposeOpen(true)} className="rounded-full bg-blue-600 p-2 text-white md:hidden"><Plus className="h-4 w-4" /></button>
            </div>
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm font-bold text-[#6B7280]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading</div>
            ) : (
              <div className="divide-y divide-[#EEF2F7]">
                {visibleMessages.map((message) => (
                  <button key={message.id} onClick={() => openMessage(message)} className={`block w-full px-4 py-3 text-left hover:bg-[#F6F8FC] ${selectedId === message.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`truncate text-sm ${message.read ? 'font-semibold text-[#374151]' : 'font-black text-[#111827]'}`}>{message.folder === 'sent' ? message.to : message.from}</p>
                      <span className="shrink-0 text-[10px] font-bold text-[#6B7280]">{dateLabel(message.date)}</span>
                    </div>
                    <p className={`mt-1 truncate text-[13px] ${message.read ? 'text-[#4B5563]' : 'font-bold text-[#111827]'}`}>{message.subject}</p>
                    <p className="mt-1 truncate text-[12px] text-[#6B7280]">{message.body}</p>
                  </button>
                ))}
                {visibleMessages.length === 0 && <div className="p-10 text-center text-sm font-bold text-[#9CA3AF]">No mail here.</div>}
              </div>
            )}
          </section>

          <section className="relative bg-[#F9FAFB]">
            {error && <div className="m-4 flex items-start gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600"><AlertCircle className="mt-0.5 h-4 w-4" /> {error}</div>}
            {notice && <div className="m-4 flex items-start gap-2 rounded border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700"><ShieldCheck className="mt-0.5 h-4 w-4" /> {notice}</div>}
            {selected ? (
              <article className="mx-auto max-w-4xl p-5 md:p-8">
                <div className="rounded-md border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#EEF2F7] p-5">
                    <h2 className="text-2xl font-semibold">{selected.subject}</h2>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-black">{selected.from}</p>
                        <p className="text-[12px] font-bold text-[#6B7280]">To {selected.to}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateMessage(selected, { starred: !selected.starred })} className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F5F9]"><Star className={`h-4 w-4 ${selected.starred ? 'fill-amber-400 text-amber-400' : ''}`} /></button>
                        <button onClick={() => updateMessage(selected, { folder: 'trash' })} className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F5F9]"><Trash2 className="h-4 w-4" /></button>
                        <button className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F5F9]"><Archive className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap p-5 text-sm leading-7 text-[#374151]">{selected.body}</div>
                </div>
              </article>
            ) : (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center text-center text-[#9CA3AF]">
                <Mail className="mb-4 h-16 w-16" />
                <p className="text-sm font-black">Select an email</p>
              </div>
            )}
          </section>
        </main>
      </div>

      {composeOpen && (
        <div className="fixed bottom-0 right-4 z-50 w-[calc(100vw-2rem)] max-w-xl overflow-hidden rounded-t-md border border-[#D1D5DB] bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#111827] px-4 py-3 text-white">
            <p className="text-sm font-black">New Message</p>
            <button onClick={() => setComposeOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={sendMessage}>
            <input type="email" required value={compose.to} onChange={(event) => setCompose((current) => ({ ...current, to: event.target.value }))} className="w-full border-b border-[#EEF2F7] px-4 py-3 text-sm outline-none" placeholder="To" />
            <input required value={compose.subject} onChange={(event) => setCompose((current) => ({ ...current, subject: event.target.value }))} className="w-full border-b border-[#EEF2F7] px-4 py-3 text-sm outline-none" placeholder="Subject" />
            <textarea required value={compose.body} onChange={(event) => setCompose((current) => ({ ...current, body: event.target.value }))} className="h-64 w-full resize-none px-4 py-3 text-sm outline-none" placeholder="Write your message" />
            <div className="flex items-center justify-between border-t border-[#EEF2F7] px-4 py-3">
              <button disabled={sending} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
              </button>
              <button type="button" onClick={() => setComposeOpen(false)} className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F5F9]"><Trash2 className="h-4 w-4" /></button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
