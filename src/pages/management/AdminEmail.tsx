import React from 'react';
import { AlertCircle, Mail, Plus, Save, Server, Settings, ShieldCheck, Trash2 } from 'lucide-react';
import {
  deleteMainAdminRecordWithApi,
  fetchMainAdminRecordsWithApi,
  fetchSettingsWithApi,
  upsertMainAdminRecordWithApi,
  upsertSettingWithApi
} from '../../lib/tiwloApi';

const emptyAccount = {
  username: '',
  domain: 'tiwlo.app',
  password: '',
  quota: '1024',
  status: 'active',
  ssl: true
};

const emptySystemEmail = {
  host: 'mail.tiwlo.app',
  port: '465',
  username: 'noreply@tiwlo.app',
  password: '',
  fromEmail: 'noreply@tiwlo.app',
  fromName: 'Tiwlo',
  replyTo: 'support@tiwlo.app',
  secureSSL: true
};

export default function AdminEmail() {
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [accountForm, setAccountForm] = React.useState(emptyAccount);
  const [systemForm, setSystemForm] = React.useState(emptySystemEmail);
  const [editingId, setEditingId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
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
      setAccounts(nextAccounts);
      const systemEmail = settings.find((setting) => setting.key === 'systemEmail')?.value;
      if (systemEmail) setSystemForm({ ...emptySystemEmail, ...systemEmail, port: String(systemEmail.port || 465) });
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

  const fullAddress = `${accountForm.username.trim()}@${accountForm.domain.trim()}`;

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!accountForm.username.trim() || !accountForm.domain.trim()) throw new Error('Username and domain are required.');
      await upsertMainAdminRecordWithApi({
        section: 'emailAccounts',
        id: editingId || undefined,
        title: fullAddress,
        status: accountForm.status,
        data: {
          ...accountForm,
          address: fullAddress,
          quotaMB: Number(accountForm.quota || 0),
          incoming: { protocol: 'IMAP', port: accountForm.ssl ? 993 : 143, ssl: accountForm.ssl },
          outgoing: { protocol: 'SMTP', port: accountForm.ssl ? 465 : 587, ssl: accountForm.ssl }
        }
      });
      setAccountForm(emptyAccount);
      setEditingId('');
      setNotice('Email account saved.');
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
      domain: record.data?.domain || String(record.title || '').split('@')[1] || 'tiwlo.app',
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
        value: { ...systemForm, port: Number(systemForm.port || 465) }
      });
      setNotice('System email configuration saved.');
      await loadEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save system email');
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-bold text-[#111827]">Email</h1>
            <p className="text-[13px] text-[#6B7280]">Mailbox accounts, no-reply sender, SMTP, SSL, and webmail instructions.</p>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {notice && <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> {notice}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded border border-[#E5E7EB] bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase text-[#111827]">Create Email Account</h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">Create, edit, or delete mailbox records for your domain.</p>
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
              <Save className="h-4 w-4" /> {editingId ? 'Update Email Account' : 'Create Email Account'}
            </button>
          </form>
        </section>

        <section className="rounded border border-[#E5E7EB] bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-black uppercase text-[#111827]">Configure System Email</h2>
          </div>
          <form onSubmit={saveSystemEmail} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={systemForm.host} onChange={(event) => setSystemForm({ ...systemForm, host: event.target.value })} placeholder="SMTP host" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input value={systemForm.port} onChange={(event) => setSystemForm({ ...systemForm, port: event.target.value })} placeholder="Port" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input value={systemForm.username} onChange={(event) => setSystemForm({ ...systemForm, username: event.target.value })} placeholder="SMTP username" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input type="password" value={systemForm.password} onChange={(event) => setSystemForm({ ...systemForm, password: event.target.value })} placeholder="SMTP password" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input value={systemForm.fromEmail} onChange={(event) => setSystemForm({ ...systemForm, fromEmail: event.target.value })} placeholder="From email" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input value={systemForm.fromName} onChange={(event) => setSystemForm({ ...systemForm, fromName: event.target.value })} placeholder="From name" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input value={systemForm.replyTo} onChange={(event) => setSystemForm({ ...systemForm, replyTo: event.target.value })} placeholder="Reply-to email" className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-2" />
            <label className="flex items-center gap-2 rounded border border-[#DDE3EA] px-3 py-2 text-sm font-bold text-[#374151] md:col-span-2">
              <input type="checkbox" checked={systemForm.secureSSL} onChange={(event) => setSystemForm({ ...systemForm, secureSSL: event.target.checked })} />
              Use SSL/TLS
            </label>
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
                <p className="mt-1 text-[12px] text-[#6B7280]">IMAP {record.data?.incoming?.port || 993} SSL / SMTP {record.data?.outgoing?.port || 465} SSL / quota {record.data?.quotaMB || record.data?.quota || 0} MB</p>
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
          <h2 className="text-sm font-black uppercase text-[#111827]">How To Connect Email</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 text-[13px] md:grid-cols-4">
          {[
            ['Webmail', 'https://your-domain.com/webmail'],
            ['Incoming IMAP', 'mail.your-domain.com : 993 SSL'],
            ['Outgoing SMTP', 'mail.your-domain.com : 465 SSL'],
            ['MX Record', 'MX 10 mail.your-domain.com']
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
