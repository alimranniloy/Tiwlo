import React from 'react';
import { AlertCircle, CheckCircle2, Copy, Mail, Plus, Save, Send, Server, Settings, ShieldCheck, Trash2 } from 'lucide-react';
import {
  deleteMainAdminRecordWithApi,
  fetchMainAdminRecordsWithApi,
  fetchPowerDnsConfigWithApi,
  fetchSettingsWithApi,
  testSystemEmailWithApi,
  upsertMainAdminRecordWithApi,
  upsertSettingWithApi
} from '../../lib/tiwloApi';

const emptyAccount = {
  username: '',
  domain: 'tiwlo.com',
  password: '',
  quota: '1024',
  status: 'active',
  ssl: true
};

const emptySystemEmail = {
  domain: 'tiwlo.com',
  sender: 'noreply',
  smtpMode: '465',
  password: '',
  fromName: 'Tiwlo',
  replyTo: 'support@tiwlo.com'
};

const cleanDomain = (value: string) => value.trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'tiwlo.com';
const cleanUsername = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
const hostForDomain = (domain: string) => `mail.${cleanDomain(domain)}`;
const portalForDomain = (domain: string) => `email.${cleanDomain(domain)}`;
const localPart = (value: string) => cleanUsername(String(value || '').split('@')[0] || 'noreply') || 'noreply';
const domainFromEmail = (value: string, fallback = 'tiwlo.com') => cleanDomain(String(value || '').includes('@') ? String(value).split('@').pop() || fallback : fallback);

export default function AdminEmail() {
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [accountForm, setAccountForm] = React.useState(emptyAccount);
  const [systemForm, setSystemForm] = React.useState(emptySystemEmail);
  const [editingId, setEditingId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testRecipient, setTestRecipient] = React.useState('');
  const [testResult, setTestResult] = React.useState<any | null>(null);
  const [lastProvisioned, setLastProvisioned] = React.useState<any | null>(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const loadEmail = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextAccounts, settings] = await Promise.all([
        fetchMainAdminRecordsWithApi('emailAccounts'),
        fetchSettingsWithApi('platform')
      ]);
      const powerDnsConfig = await fetchPowerDnsConfigWithApi().catch(() => null);
      setAccounts(nextAccounts);
      const systemEmail = settings.find((setting) => setting.key === 'systemEmail')?.value;
      if (systemEmail) {
        const domain = domainFromEmail(systemEmail.username || systemEmail.fromEmail, powerDnsConfig?.primaryDomain || 'tiwlo.com');
        const smtpMode = Number(systemEmail.port || 465) === 587 ? '587' : '465';
        setSystemForm({
          ...emptySystemEmail,
          domain,
          sender: localPart(systemEmail.username || systemEmail.fromEmail || 'noreply'),
          smtpMode,
          password: systemEmail.password || '',
          fromName: systemEmail.fromName || 'Tiwlo',
          replyTo: systemEmail.replyTo || `support@${domain}`
        });
      } else if (powerDnsConfig?.primaryDomain) {
        const domain = cleanDomain(powerDnsConfig.primaryDomain);
        setSystemForm((current) => ({ ...current, domain, replyTo: `support@${domain}` }));
      }
    } catch (err) {
      setAccounts([]);
      setError(err instanceof Error ? err.message : 'Unable to load email settings');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadEmail();
  }, [loadEmail]);

  const normalizedUsername = cleanUsername(accountForm.username);
  const normalizedDomain = cleanDomain(accountForm.domain);
  const fullAddress = `${normalizedUsername}@${normalizedDomain}`;
  const systemDomain = cleanDomain(systemForm.domain);
  const systemSender = localPart(systemForm.sender);
  const systemAddress = `${systemSender}@${systemDomain}`;
  const publicMailHost = hostForDomain(systemDomain);
  const emailPortalHost = portalForDomain(systemDomain);
  const selectedSmtpPort = systemForm.smtpMode === '587' ? 587 : 465;
  const selectedSmtpMode = selectedSmtpPort === 587 ? '587 STARTTLS' : '465 SSL';
  const normalizedSystemEmail = React.useCallback(() => {
    const port = systemForm.smtpMode === '587' ? 587 : 465;
    return {
      host: '127.0.0.1',
      publicHost: hostForDomain(cleanDomain(systemForm.domain)),
      tlsServername: hostForDomain(cleanDomain(systemForm.domain)),
      port,
      secureSSL: port === 465,
      requireTLS: port === 587,
      tlsRejectUnauthorized: false,
      username: `${localPart(systemForm.sender)}@${cleanDomain(systemForm.domain)}`,
      password: String(systemForm.password || '').trim(),
      fromEmail: `${localPart(systemForm.sender)}@${cleanDomain(systemForm.domain)}`,
      fromName: String(systemForm.fromName || 'Tiwlo').trim(),
      replyTo: String(systemForm.replyTo || '').trim(),
      domain: cleanDomain(systemForm.domain)
    };
  }, [systemForm]);

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!normalizedUsername || !normalizedDomain) throw new Error('Username and domain are required.');
      if (!accountForm.password.trim()) throw new Error('Mailbox password is required so the user can sign in at the mail portal.');
      const hostName = hostForDomain(normalizedDomain);
      const portalHost = portalForDomain(normalizedDomain);
      await upsertMainAdminRecordWithApi({
        section: 'emailAccounts',
        id: editingId || undefined,
        title: fullAddress,
        status: accountForm.status,
        data: {
          ...accountForm,
          username: normalizedUsername,
          domain: normalizedDomain,
          address: fullAddress,
          hostName,
          portalHost,
          quotaMB: Number(accountForm.quota || 0),
          incoming: { host: hostName, protocol: 'IMAP', port: accountForm.ssl ? 993 : 143, ssl: accountForm.ssl },
          outgoing: { host: hostName, protocol: 'SMTP', port: accountForm.ssl ? 465 : 587, ssl: accountForm.ssl }
        }
      });
      setLastProvisioned({
        address: fullAddress,
        username: fullAddress,
        password: accountForm.password,
        hostName,
        portalHost,
        incoming: `IMAP ${hostName}:993 SSL`,
        outgoing: `SMTP ${hostName}:465 SSL / 587 STARTTLS`
      });
      setAccountForm(emptyAccount);
      setEditingId('');
      setNotice(`${fullAddress} mailbox is ready.`);
      await loadEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save email account');
    } finally {
      setSaving(false);
    }
  };

  const editAccount = (record: any) => {
    setEditingId(record.id);
    setAccountForm({
      username: record.data?.username || String(record.title || '').split('@')[0] || '',
      domain: record.data?.domain || String(record.title || '').split('@')[1] || 'tiwlo.com',
      password: record.data?.password || '',
      quota: String(record.data?.quotaMB || record.data?.quota || 1024),
      status: record.status || 'active',
      ssl: record.data?.ssl !== false
    });
  };

  const deleteAccount = async (record: any) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await deleteMainAdminRecordWithApi('emailAccounts', record.id);
      setNotice('Email account deleted.');
      await loadEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete email account');
    } finally {
      setSaving(false);
    }
  };

  const saveSystemEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await upsertSettingWithApi({
        scope: 'platform',
        scopeId: '',
        key: 'systemEmail',
        value: normalizedSystemEmail()
      });
      setNotice('System email configuration saved.');
      await loadEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save system email');
    } finally {
      setSaving(false);
    }
  };

  const testSystemEmail = async () => {
    setTesting(true);
    setError('');
    setNotice('');
    setTestResult(null);
    try {
      if (!testRecipient.trim()) throw new Error('Enter the email address where the test email should be sent.');
      const result = await testSystemEmailWithApi({
        to: testRecipient.trim(),
        config: normalizedSystemEmail()
      });
      setTestResult(result);
      if (result.ok) {
        setNotice(result.message || 'Test email sent successfully.');
      } else {
        setError(result.message || 'Test email failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send test email');
    } finally {
      setTesting(false);
    }
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied.');
    } catch {
      setNotice(value);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Tiwlo.com Email</h1>
            <p className="text-[13px] text-[#6B7280]">Create mailboxes, test SMTP delivery, and publish the login details for email.tiwlo.com.</p>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {notice && <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> {notice}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded border border-[#E5E7EB] bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase text-[#111827]">Create Mailbox</h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">The mailbox can sign in at email.tiwlo.com after it is saved.</p>
            </div>
            <Plus className="h-4 w-4 text-blue-600" />
          </div>
          <form onSubmit={saveAccount} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={accountForm.username} onChange={(event) => setAccountForm({ ...accountForm, username: event.target.value })} placeholder="username" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input value={accountForm.domain} onChange={(event) => setAccountForm({ ...accountForm, domain: event.target.value })} placeholder="domain.com" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input type="password" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} placeholder="Mailbox password" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input type="number" value={accountForm.quota} onChange={(event) => setAccountForm({ ...accountForm, quota: event.target.value })} placeholder="Quota MB" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <select value={accountForm.status} onChange={(event) => setAccountForm({ ...accountForm, status: event.target.value })} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm font-bold outline-none focus:border-blue-500">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
            </select>
            <label className="flex items-center gap-2 rounded border border-[#DDE3EA] px-3 py-2 text-sm font-bold text-[#374151]">
              <input type="checkbox" checked={accountForm.ssl} onChange={(event) => setAccountForm({ ...accountForm, ssl: event.target.checked })} />
              SSL enabled
            </label>
            <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 md:col-span-2">
              <Save className="h-4 w-4" /> {editingId ? 'Update Mailbox' : 'Create Mailbox'}
            </button>
          </form>
          {lastProvisioned && (
            <div className="mt-5 rounded border border-emerald-100 bg-emerald-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-black">Mailbox credentials</p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-[12px] md:grid-cols-2">
                {[
                  ['Login URL', `https://${lastProvisioned.portalHost}`],
                  ['Host name', lastProvisioned.hostName],
                  ['Username', lastProvisioned.username],
                  ['Password', lastProvisioned.password],
                  ['Incoming', lastProvisioned.incoming],
                  ['Outgoing', lastProvisioned.outgoing]
                ].map(([label, value]) => (
                  <button key={label} type="button" onClick={() => copyValue(value)} className="rounded border border-emerald-200 bg-white p-3 text-left hover:border-emerald-400">
                    <span className="block text-[10px] font-black uppercase text-emerald-700">{label}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 break-all font-bold text-[#111827]">
                      {value}
                      <Copy className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded border border-[#E5E7EB] bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-600" />
            <div>
              <h2 className="text-sm font-black uppercase text-[#111827]">Configure Sender</h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">Tiwlo uses the local mail listener for backend delivery and keeps public mail details ready for users.</p>
            </div>
          </div>
          <form onSubmit={saveSystemEmail} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">Mail Domain</span>
              <input value={systemForm.domain} onChange={(event) => setSystemForm({ ...systemForm, domain: cleanDomain(event.target.value), replyTo: `support@${cleanDomain(event.target.value)}` })} placeholder="tiwlo.com" className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">Sender</span>
              <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded border border-[#DDE3EA] bg-white focus-within:border-blue-500">
                <input value={systemForm.sender} onChange={(event) => setSystemForm({ ...systemForm, sender: event.target.value })} placeholder="noreply" className="min-w-0 px-3 py-2 text-sm outline-none" />
                <span className="border-l border-[#DDE3EA] bg-[#F9FAFB] px-3 py-2 text-sm font-bold text-[#6B7280]">@{systemDomain}</span>
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">SMTP Password</span>
              <input type="password" value={systemForm.password} onChange={(event) => setSystemForm({ ...systemForm, password: event.target.value })} placeholder="Mailbox password" className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">SSL/TLS Port</span>
              <select value={systemForm.smtpMode} onChange={(event) => setSystemForm({ ...systemForm, smtpMode: event.target.value })} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm font-bold outline-none focus:border-blue-500">
                <option value="465">465 SSL</option>
                <option value="587">587 STARTTLS</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">From Name</span>
              <input value={systemForm.fromName} onChange={(event) => setSystemForm({ ...systemForm, fromName: event.target.value })} placeholder="Tiwlo" className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">Reply To</span>
              <input value={systemForm.replyTo} onChange={(event) => setSystemForm({ ...systemForm, replyTo: event.target.value })} placeholder={`support@${systemDomain}`} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <div className="grid grid-cols-1 gap-3 md:col-span-2 sm:grid-cols-3">
              {[
                ['Backend SMTP', `127.0.0.1 : ${selectedSmtpMode}`],
                ['Public Host', `${publicMailHost} : ${selectedSmtpMode}`],
                ['From Email', systemAddress]
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
                  <p className="mt-1 break-all font-mono text-[12px] font-bold text-[#111827]">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Send test to</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <input type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="you@example.com" className="rounded border border-[#DDE3EA] bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <button type="button" onClick={testSystemEmail} disabled={testing} className="inline-flex items-center justify-center gap-2 rounded border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:border-blue-500 disabled:opacity-60">
                  <Send className="h-4 w-4" /> {testing ? 'Testing...' : 'Test Email'}
                </button>
              </div>
              <p className="text-[11px] font-semibold text-[#6B7280]">Server firewall should allow 25/tcp, 465/tcp, 587/tcp, 993/tcp, and 995/tcp for full mail service.</p>
              {testResult && (
                <div className={`rounded border px-3 py-2 text-[12px] ${testResult.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
                  <p className="font-bold">{testResult.message}</p>
                  <div className="mt-2 grid grid-cols-1 gap-1 font-mono text-[11px] text-current/80 sm:grid-cols-2">
                    <span>stage: {testResult.stage || '-'}</span>
                    <span>code: {testResult.code || '-'}</span>
                    <span>host: {testResult.diagnostic?.host || testResult.host || '127.0.0.1'}:{testResult.diagnostic?.port || testResult.port || 465}</span>
                    <span>mode: {testResult.smtpMode || (testResult.diagnostic?.requireTLS ? '587 STARTTLS' : testResult.diagnostic?.secure ? '465 SSL' : '-')}</span>
                    <span>tcp: {testResult.diagnostic?.tcpOk ? 'reachable' : testResult.diagnostic?.tcpError || '-'}</span>
                    <span className="sm:col-span-2">dns: {(testResult.diagnostic?.resolvedAddresses || []).join(', ') || '-'}</span>
                    {testResult.diagnostic?.authSource && <span className="sm:col-span-2">source: {testResult.diagnostic.authSource}</span>}
                    {testResult.diagnostic?.fallback && <span className="sm:col-span-2">fallback: {testResult.diagnostic.fallback.host} / {testResult.diagnostic.fallback.code}</span>}
                  </div>
                </div>
              )}
            </div>
            <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded bg-[#111827] px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60 md:col-span-2">
              <Save className="h-4 w-4" /> Save System Email
            </button>
          </form>
        </section>
      </div>

      <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
          <h2 className="text-sm font-black uppercase text-[#111827]">Email Accounts</h2>
          <span className="text-[11px] font-bold uppercase text-[#6B7280]">{loading ? 'Loading' : `${accounts.length} accounts`}</span>
        </div>
        <div className="divide-y divide-[#EEF2F7]">
          {!loading && accounts.length === 0 && <div className="p-8 text-center text-[13px] font-bold text-gray-400">No email accounts created yet.</div>}
          {accounts.map((record) => (
            <div key={record.id} className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-[14px] font-black text-[#111827]">{record.data?.address || record.title}</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">{record.data?.hostName || hostForDomain(record.data?.domain || 'tiwlo.com')} / IMAP {record.data?.incoming?.port || 993} SSL / SMTP {record.data?.outgoing?.port || 465} SSL / quota {record.data?.quotaMB || record.data?.quota || 0} MB</p>
                <p className="mt-1 break-all text-[11px] font-bold text-[#9CA3AF]">Login: https://{record.data?.portalHost || portalForDomain(record.data?.domain || 'tiwlo.com')} / Username: {record.data?.address || record.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => editAccount(record)} className="rounded border border-[#DDE3EA] px-3 py-2 text-[12px] font-bold text-[#374151] hover:bg-[#F9FAFB]">Edit</button>
                <button onClick={() => deleteAccount(record)} className="inline-flex items-center gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 hover:bg-red-100">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-[#E5E7EB] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-black uppercase text-[#111827]">Connection Details</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 text-[13px] md:grid-cols-4">
          {[
            ['Mail login', `https://${emailPortalHost}`],
            ['Incoming IMAP', `${publicMailHost} : 993 SSL`],
            ['Outgoing SMTP', `${publicMailHost} : 465 SSL or 587 STARTTLS`],
            ['MX Record', `MX 10 ${publicMailHost}`]
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
              <p className="mt-2 break-words font-bold text-[#111827]">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
