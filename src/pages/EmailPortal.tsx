import React from 'react';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  BadgeCheck,
  Camera,
  Inbox,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  X
} from 'lucide-react';
import {
  fetchMailboxOverviewWithApi,
  mailboxLoginWithApi,
  mailboxRegisterWithApi,
  requestMailboxRecoveryOtpWithApi,
  sendMailboxEmailWithApi,
  updateMailboxMessageWithApi,
  updateMailboxProfileWithApi
} from '../lib/tiwloApi';
import AuthCard, { AuthShell, authInputClass } from '../components/AuthCard';

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
  username: string;
  domain: string;
  displayName?: string;
  profileImageUrl?: string;
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

function defaultMailDomain() {
  if (typeof window === 'undefined') return 'tiwlo.com';
  const host = window.location.hostname.toLowerCase().replace(/^((tmail|email|mail)\.)+/, '');
  return host && host.includes('.') ? host : 'tiwlo.com';
}

function emailAddress(value = '') {
  const match = value.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return (match?.[1] || value).trim().toLowerCase();
}

function emailName(value = '') {
  const trimmed = value.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
  return trimmed.includes('@') ? trimmed.split('@')[0] : trimmed || value;
}

function providerInfo(address = '') {
  const clean = emailAddress(address);
  const domain = clean.split('@')[1] || '';
  if (/^(sms:|tel:|\+?\d[\d\s().-]{6,})/i.test(clean || address)) return { label: 'S', name: 'SMS', className: 'bg-[#e8f5e9] text-[#137333] border-[#b7dfb9]' };
  if (domain.includes('gmail')) return { label: 'G', name: 'Gmail', className: 'bg-white text-[#ea4335] border-[#dadce0]' };
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live.com')) return { label: 'O', name: 'Outlook', className: 'bg-[#0078d4] text-white border-[#0078d4]' };
  if (domain.includes('yahoo')) return { label: 'Y', name: 'Yahoo', className: 'bg-[#6001d2] text-white border-[#6001d2]' };
  if (domain.includes('icloud') || domain.includes('me.com')) return { label: 'i', name: 'iCloud', className: 'bg-[#f5f7fb] text-[#111827] border-[#d1d5db]' };
  if (domain.includes('proton')) return { label: 'P', name: 'Proton', className: 'bg-[#6d4aff] text-white border-[#6d4aff]' };
  if (domain.includes('zoho')) return { label: 'Z', name: 'Zoho', className: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]' };
  if (domain.includes('tiwlo')) return { label: 'T', name: 'TMail', className: 'bg-[#0069ff] text-white border-[#0069ff]' };
  return { label: (emailName(address).charAt(0) || 'M').toUpperCase(), name: domain || 'Mail', className: 'bg-[#eef2ff] text-[#334155] border-[#dbe3f0]' };
}

function messagePreview(body = '') {
  return (looksLikeHtml(body) ? body.replace(/<[^>]+>/g, ' ') : body).replace(/\s+/g, ' ').trim();
}

function senderTrust(value = '') {
  const clean = emailAddress(value);
  const domain = clean.split('@')[1] || '';
  const trusted = /(^|\.)((gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|zoho|tiwlo)\.)/i.test(domain) || /^(sms:|tel:|\+?\d[\d\s().-]{6,})/i.test(clean || value);
  return trusted
    ? { label: 'Real', className: 'border-[#b7dfb9] bg-[#e8f5e9] text-[#137333]' }
    : { label: 'Unreal', className: 'border-[#f5c2c7] bg-[#fef2f2] text-[#b42318]' };
}

function sanitizeHtml(value = '') {
  if (typeof window === 'undefined') return value;
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, form, input, button, link, meta').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const unsafeUrl = /^(javascript|data):/i.test(attr.value) && !(name === 'src' && /^data:image\//i.test(attr.value));
      if (name.startsWith('on') || unsafeUrl) node.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

function looksLikeHtml(value = '') {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function avatarForAccount(account: MailboxAccount | null) {
  if (account?.profileImageUrl) {
    return <img src={account.profileImageUrl} alt={account.displayName || account.address} className="h-full w-full object-cover" />;
  }
  const letter = (account?.displayName || account?.username || account?.address || 'T').charAt(0).toUpperCase();
  return <span>{letter}</span>;
}

function SenderAvatar({ value }: { value: string }) {
  const info = providerInfo(value);
  return (
    <div title={info.name} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black ${info.className}`}>
      {info.label}
    </div>
  );
}

function MailBody({ body }: { body: string }) {
  if (looksLikeHtml(body)) {
    return (
      <div
        className="tmail-html-body text-[14px] leading-7 text-[#202124] [&_a]:text-[#1a73e8] [&_img]:max-w-full [&_table]:max-w-full"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
      />
    );
  }
  return <div className="whitespace-pre-wrap text-[14px] leading-7 text-[#202124]">{body}</div>;
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
  const [otpSending, setOtpSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [authMode, setAuthMode] = React.useState<'signin' | 'create'>('signin');
  const [loginForm, setLoginForm] = React.useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = React.useState({ username: '', domain: defaultMailDomain(), password: '', confirmPassword: '', displayName: '', recoveryEmail: '', recoveryOtp: '' });
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composeMode, setComposeMode] = React.useState<'new' | 'reply'>('new');
  const [compose, setCompose] = React.useState({ to: '', subject: '', body: '' });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({ displayName: '', profileImageUrl: '' });

  const loadMailbox = React.useCallback(async (nextToken = token) => {
    if (!nextToken) return;
    setLoading(true);
    setError('');
    try {
      const overview = await fetchMailboxOverviewWithApi(nextToken);
      setAccount(overview.account);
      setMessages(overview.messages || []);
      setProfileForm({
        displayName: overview.account?.displayName || overview.account?.username || '',
        profileImageUrl: overview.account?.profileImageUrl || ''
      });
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

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (registerForm.password !== registerForm.confirmPassword) throw new Error('Passwords do not match.');
      if (!registerForm.recoveryEmail.trim()) throw new Error('Recovery email is required.');
      if (!registerForm.recoveryOtp.trim()) throw new Error('Enter the OTP sent to your recovery email.');
      const result = await mailboxRegisterWithApi({
        username: registerForm.username,
        domain: registerForm.domain,
        password: registerForm.password,
        displayName: registerForm.displayName,
        recoveryEmail: registerForm.recoveryEmail,
        recoveryOtp: registerForm.recoveryOtp
      });
      localStorage.setItem(MAILBOX_TOKEN_KEY, result.token);
      setToken(result.token);
      setAccount(result.account);
      setRegisterForm({ username: '', domain: defaultMailDomain(), password: '', confirmPassword: '', displayName: '', recoveryEmail: '', recoveryOtp: '' });
      setNotice('Your TMail inbox is ready.');
      await loadMailbox(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create TMail account');
    } finally {
      setLoading(false);
    }
  };

  const requestRecoveryOtp = async () => {
    setOtpSending(true);
    setError('');
    setNotice('');
    try {
      if (!registerForm.username.trim()) throw new Error('Choose your TMail name first.');
      if (!registerForm.recoveryEmail.trim()) throw new Error('Recovery email is required.');
      const result = await requestMailboxRecoveryOtpWithApi({
        username: registerForm.username,
        domain: registerForm.domain,
        recoveryEmail: registerForm.recoveryEmail
      });
      setNotice(result.message || 'OTP sent to your recovery email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send recovery OTP');
    } finally {
      setOtpSending(false);
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
    if (!message.read) await updateMessage(message, { read: true });
  };

  const selected = messages.find((message) => message.id === selectedId) || null;

  const openCompose = (mode: 'new' | 'reply', message?: MailboxMessage) => {
    setComposeMode(mode);
    if (mode === 'reply' && message) {
      setCompose({
        to: emailAddress(message.from),
        subject: message.subject.toLowerCase().startsWith('re:') ? message.subject : `Re: ${message.subject}`,
        body: `\n\nOn ${dateLabel(message.date)}, ${message.from} wrote:\n${message.body.replace(/^/gm, '> ')}`
      });
    } else {
      setCompose({ to: '', subject: '', body: '' });
    }
    setComposeOpen(true);
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
      setNotice(composeMode === 'reply' ? 'Reply sent.' : 'Email sent.');
      await loadMailbox(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email');
    } finally {
      setSending(false);
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError('');
    setNotice('');
    try {
      const updated = await updateMailboxProfileWithApi({ token, ...profileForm });
      setAccount(updated);
      setSettingsOpen(false);
      setNotice('Profile updated.');
      await loadMailbox(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile');
    }
  };

  const pickProfileImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileForm((current) => ({ ...current, profileImageUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

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

  if (token && loading && !account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-[#202124]">
        <div className="flex w-full max-w-sm flex-col items-center border border-[#E5E7EB] bg-white p-8 text-center">
          <TmailLogo className="h-12 w-36" />
          <Loader2 className="mt-8 h-6 w-6 animate-spin text-[#1a73e8]" />
          <p className="mt-4 text-sm font-black">Opening your inbox</p>
          <p className="mt-1 text-xs font-semibold text-[#6B7280]">Checking mailbox, profile, and latest messages.</p>
        </div>
      </div>
    );
  }

  if (!token || !account) {
    return (
      <AuthShell>
        <AuthCard
          wide={authMode === 'create'}
          title={authMode === 'signin' ? 'Welcome Back!' : 'Create TMail'}
          socialLabel={authMode === 'signin' ? 'Sign in with' : 'Sign up with'}
          logo={<TmailLogo className="h-14 w-40" />}
        >
          <form onSubmit={authMode === 'signin' ? login : register} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 rounded-full bg-[#EEF2F7] p-1 text-sm font-black">
              <button type="button" onClick={() => setAuthMode('signin')} className={`rounded-full px-4 py-2 ${authMode === 'signin' ? 'bg-white text-[#1778f2]' : 'text-[#64748B]'}`}>Sign in</button>
              <button type="button" onClick={() => setAuthMode('create')} className={`rounded-full px-4 py-2 ${authMode === 'create' ? 'bg-white text-[#1778f2]' : 'text-[#64748B]'}`}>Create inbox</button>
            </div>
            <div className="space-y-3">
              {authMode === 'signin' ? (
                <>
                  <label className="flex flex-col gap-0.5">
                    <span className="mb-1 block">Email</span>
                    <input type="email" required value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} className={authInputClass()} placeholder="Enter your email" />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="mb-1 block">Password</span>
                    <input type="password" required value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} className={authInputClass()} placeholder="Enter your password" />
                  </label>
                </>
              ) : (
                <>
                  <input value={registerForm.displayName} onChange={(event) => setRegisterForm((current) => ({ ...current, displayName: event.target.value }))} className={authInputClass()} placeholder="Full name" />
                  <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-md border border-[#cccccc] focus-within:border-[#1778f2]">
                    <input required value={registerForm.username} onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))} className="min-w-0 px-4 py-3 text-sm outline-none placeholder:opacity-50" placeholder="choose-name" />
                    <span className="border-l border-[#cccccc] bg-[#F8FAFC] px-3 py-3 text-sm font-bold text-[#64748B]">@{registerForm.domain}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-md border border-[#cccccc] focus-within:border-[#1778f2]">
                    <input type="email" required value={registerForm.recoveryEmail} onChange={(event) => setRegisterForm((current) => ({ ...current, recoveryEmail: event.target.value }))} className="min-w-0 px-4 py-3 text-sm outline-none placeholder:opacity-50" placeholder="Recovery email" />
                    <button type="button" onClick={requestRecoveryOtp} disabled={otpSending} className="border-l border-[#cccccc] bg-[#F8FAFC] px-3 py-3 text-xs font-black text-[#1778f2] disabled:opacity-60">
                      {otpSending ? 'Sending' : 'Send OTP'}
                    </button>
                  </div>
                  <input inputMode="numeric" required value={registerForm.recoveryOtp} onChange={(event) => setRegisterForm((current) => ({ ...current, recoveryOtp: event.target.value.replace(/\D/g, '').slice(0, 6) }))} className={authInputClass()} placeholder="6 digit OTP" />
                  <input type="password" required value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} className={authInputClass()} placeholder="Create password" />
                  <input type="password" required value={registerForm.confirmPassword} onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={authInputClass()} placeholder="Confirm password" />
                </>
              )}
            </div>
            {error && <div className="mt-4 flex items-start gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600"><AlertCircle className="mt-0.5 h-4 w-4" /> {error}</div>}
            {notice && <div className="mt-4 flex items-start gap-2 rounded border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700"><ShieldCheck className="mt-0.5 h-4 w-4" /> {notice}</div>}
            <button disabled={loading} className="my-1 flex w-full items-center justify-center gap-2 rounded-md bg-[#212121] px-4 py-3 text-sm text-white hover:bg-[#313131] active:scale-95 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : authMode === 'signin' ? <Mail className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {authMode === 'signin' ? 'Sign In' : 'Create TMail'}
            </button>
          </form>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#202124]">
      <header className="sticky top-0 z-40 flex min-h-14 flex-wrap items-center gap-2 border-b border-[#E5E7EB] bg-white px-3 py-2 md:h-16 md:flex-nowrap md:px-6 md:py-0">
        <TmailLogo className="h-8 w-24 md:h-10 md:w-28" />
        <div className="relative order-last w-full md:order-none md:max-w-xl md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6368]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-[#edf2fa] px-10 text-sm outline-none focus:border-[#c7d2e5] focus:bg-white md:h-10" placeholder="Search mail" />
        </div>
        <button onClick={() => loadMailbox(token)} className="rounded-md p-2 text-[#5f6368] hover:bg-[#F3F5F9]" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
        <button onClick={() => setSettingsOpen(true)} className="rounded-md p-2 text-[#5f6368] hover:bg-[#F3F5F9]" title="Settings"><Settings className="h-4 w-4" /></button>
        <button onClick={logout} className="rounded-md p-2 text-[#5f6368] hover:bg-[#F3F5F9]" title="Sign out"><LogOut className="h-4 w-4" /></button>
        <button onClick={() => setSettingsOpen(true)} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#DDE3EA] bg-[#e8f0fe] text-sm font-black text-[#1967d2]">
          {avatarForAccount(account)}
        </button>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-64 shrink-0 border-r border-[#E5E7EB] bg-white p-4 md:block">
          <button onClick={() => openCompose('new')} className="mb-5 inline-flex h-12 items-center gap-3 rounded-2xl bg-[#c2e7ff] px-5 text-sm font-black text-[#001d35] hover:bg-[#b3def7]">
            <Plus className="h-5 w-5" /> Compose
          </button>
          {[
            ['inbox', Inbox, 'Inbox'],
            ['starred', Star, 'Starred'],
            ['sent', Send, 'Sent'],
            ['trash', Trash2, 'Trash']
          ].map(([key, Icon, label]) => (
            <button key={String(key)} onClick={() => { setFolder(key as any); setSelectedId(''); }} className={`mb-1 flex w-full items-center gap-3 rounded-r-full px-4 py-2 text-sm font-bold ${folder === key ? 'bg-[#d3e3fd] text-[#001d35]' : 'text-[#3c4043] hover:bg-[#F3F5F9]'}`}>
              {React.createElement(Icon as any, { className: 'h-4 w-4' })} {label}
            </button>
          ))}
          <div className="mt-8 rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[10px] font-black uppercase text-[#6B7280]">Signed in</p>
            <p className="mt-1 break-all text-[12px] font-bold">{account.displayName || account.username}</p>
            <p className="mt-0.5 break-all text-[11px] font-semibold text-[#6B7280]">{account.address}</p>
          </div>
        </aside>

        <main className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(320px,430px)_1fr]">
          <section className={`${selected ? 'hidden lg:block' : 'block'} border-r border-[#E5E7EB] bg-white`}>
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <div>
                <p className="text-sm font-black capitalize">{folder}</p>
                <p className="text-[11px] font-bold text-[#6B7280]">{visibleMessages.length} messages</p>
              </div>
              <button onClick={() => openCompose('new')} className="rounded-full bg-[#c2e7ff] p-2 text-[#001d35] md:hidden"><Plus className="h-4 w-4" /></button>
            </div>
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm font-bold text-[#6B7280]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading</div>
            ) : (
              <div className="divide-y divide-[#EEF2F7]">
                {visibleMessages.map((message) => (
                  <button key={message.id} onClick={() => openMessage(message)} className={`grid w-full grid-cols-[auto_1fr] gap-3 px-4 py-3 text-left hover:bg-[#F6F8FC] ${selectedId === message.id ? 'bg-[#eaf1fb]' : ''}`}>
                    <SenderAvatar value={message.folder === 'sent' ? message.to : message.from} />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`truncate text-sm ${message.read ? 'font-semibold text-[#3c4043]' : 'font-black text-[#202124]'}`}>{emailName(message.folder === 'sent' ? message.to : message.from)}</p>
                        <span className="shrink-0 text-[10px] font-bold text-[#5f6368]">{dateLabel(message.date)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <p className={`min-w-0 flex-1 truncate text-[13px] ${message.read ? 'text-[#3c4043]' : 'font-bold text-[#202124]'}`}>{message.subject}</p>
                        <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-black ${senderTrust(message.folder === 'sent' ? message.to : message.from).className}`}>{senderTrust(message.folder === 'sent' ? message.to : message.from).label}</span>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-[#5f6368]">{providerInfo(message.folder === 'sent' ? message.to : message.from).name} · {messagePreview(message.body)}</p>
                    </div>
                  </button>
                ))}
                {visibleMessages.length === 0 && <div className="p-10 text-center text-sm font-bold text-[#9CA3AF]">No mail here.</div>}
              </div>
            )}
          </section>

          <section className={`${selected ? 'block' : 'hidden lg:block'} relative bg-[#F9FAFB]`}>
            {error && <div className="m-4 flex items-start gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600"><AlertCircle className="mt-0.5 h-4 w-4" /> {error}</div>}
            {notice && <div className="m-4 flex items-start gap-2 rounded border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700"><ShieldCheck className="mt-0.5 h-4 w-4" /> {notice}</div>}
            {selected ? (
              <article className="mx-auto max-w-5xl p-4 md:p-8">
                <button onClick={() => setSelectedId('')} className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#DDE3EA] bg-white px-3 py-2 text-xs font-black text-[#3c4043] lg:hidden">
                  <ArrowLeft className="h-4 w-4" /> Inbox
                </button>
                <div className="rounded-sm border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#EEF2F7] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="text-xl font-normal text-[#202124] md:text-2xl">{selected.subject}</h2>
                      <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-black ${senderTrust(selected.from).className}`}>
                        <BadgeCheck className="h-3.5 w-3.5" /> {senderTrust(selected.from).label}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <SenderAvatar value={selected.from} />
                        <div className="min-w-0">
                          <p className="truncate font-black">{emailName(selected.from)}</p>
                          <p className="truncate text-[12px] font-bold text-[#5f6368]">From {emailAddress(selected.from)} to {selected.to}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openCompose('reply', selected)} className="rounded-full p-2 text-[#5f6368] hover:bg-[#F3F5F9]" title="Reply"><Reply className="h-4 w-4" /></button>
                        <button onClick={() => updateMessage(selected, { starred: !selected.starred })} className="rounded-full p-2 text-[#5f6368] hover:bg-[#F3F5F9]" title="Star"><Star className={`h-4 w-4 ${selected.starred ? 'fill-amber-400 text-amber-400' : ''}`} /></button>
                        <button onClick={() => updateMessage(selected, { folder: 'trash' })} className="rounded-full p-2 text-[#5f6368] hover:bg-[#F3F5F9]" title="Trash"><Trash2 className="h-4 w-4" /></button>
                        <button className="rounded-full p-2 text-[#5f6368] hover:bg-[#F3F5F9]" title="Archive"><Archive className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-[360px] p-6">
                    <MailBody body={selected.body} />
                  </div>
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
        <div className="fixed inset-0 z-50 bg-white">
          <form onSubmit={sendMessage} className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between border-b border-[#E5E7EB] px-4 md:px-8">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setComposeOpen(false)} className="rounded-full p-2 text-[#5f6368] hover:bg-[#F3F5F9]"><X className="h-5 w-5" /></button>
                <p className="text-lg font-black">{composeMode === 'reply' ? 'Reply' : 'New Message'}</p>
              </div>
              <button disabled={sending} className="inline-flex items-center gap-2 rounded-full bg-[#0b57d0] px-5 py-2 text-sm font-black text-white hover:bg-[#0842a0] disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
              </button>
            </div>
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 md:p-8">
              <input type="email" required value={compose.to} onChange={(event) => setCompose((current) => ({ ...current, to: event.target.value }))} className="border-b border-[#EEF2F7] px-2 py-4 text-sm outline-none" placeholder="To" />
              <input required value={compose.subject} onChange={(event) => setCompose((current) => ({ ...current, subject: event.target.value }))} className="border-b border-[#EEF2F7] px-2 py-4 text-sm outline-none" placeholder="Subject" />
              <textarea required value={compose.body} onChange={(event) => setCompose((current) => ({ ...current, body: event.target.value }))} className="min-h-[420px] flex-1 resize-none px-2 py-5 text-sm leading-7 outline-none" placeholder="Write your message" />
            </div>
          </form>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4 pt-20">
          <form onSubmit={saveProfile} className="w-full max-w-lg rounded-sm border border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
              <p className="text-sm font-black uppercase text-[#202124]">Profile settings</p>
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-full p-2 text-[#5f6368] hover:bg-[#F3F5F9]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#DDE3EA] bg-[#e8f0fe] text-2xl font-black text-[#1967d2]">
                  {profileForm.profileImageUrl ? <img src={profileForm.profileImageUrl} alt="Profile" className="h-full w-full object-cover" /> : avatarForAccount(account)}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-[#DDE3EA] px-4 py-2 text-sm font-bold text-[#3c4043] hover:bg-[#F8FAFC]">
                  <Camera className="h-4 w-4" /> Upload photo
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => pickProfileImage(event.target.files?.[0])} />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] font-black uppercase text-[#6B7280]">Display name</span>
                <input value={profileForm.displayName} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))} className="w-full rounded-sm border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-black uppercase text-[#6B7280]">Profile image URL</span>
                <input value={profileForm.profileImageUrl.startsWith('data:') ? 'Uploaded image selected' : profileForm.profileImageUrl} onChange={(event) => setProfileForm((current) => ({ ...current, profileImageUrl: event.target.value }))} className="w-full rounded-sm border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" placeholder="https://example.com/avatar.png" />
              </label>
              <p className="text-[12px] font-semibold text-[#6B7280]">TMail will use this photo in this inbox. External apps like Gmail/Outlook may show provider-controlled avatars unless BIMI or their contact profile is configured.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EEF2F7] px-5 py-4">
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-sm border border-[#DDE3EA] px-4 py-2 text-sm font-bold text-[#3c4043]">Cancel</button>
              <button className="rounded-sm bg-[#1a73e8] px-4 py-2 text-sm font-bold text-white">Save profile</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
