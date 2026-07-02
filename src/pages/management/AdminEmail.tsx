import React from 'react';
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Mail, Plus, Save, Send, Server, Settings, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import {
  addDnsRecordWithApi,
  deleteMainAdminRecordWithApi,
  deleteDnsRecordWithApi,
  fetchDnsRecordsWithApi,
  fetchDomainsWithApi,
  fetchMainAdminRecordsWithApi,
  fetchPowerDnsConfigWithApi,
  fetchSettingsWithApi,
  repairMailDeliveryDnsWithApi,
  testSystemEmailWithApi,
  updateDnsRecordWithApi,
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
  smtpHost: '127.0.0.1',
  smtpUsername: 'noreply',
  smtpMode: '465',
  password: '',
  fromName: 'Tiwlo',
  replyTo: '',
  bimiLogoUrl: '',
  bimiCertificateUrl: ''
};

const cleanDomain = (value: string) => value.trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'tiwlo.com';
const mailBaseDomain = (value: string) => cleanDomain(value).replace(/^((mail|email|tmail)\.)+/, '') || 'tiwlo.com';
const cleanUsername = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
const hostForDomain = (domain: string) => `mail.${mailBaseDomain(domain)}`;
const portalForDomain = (domain: string) => `tmail.${mailBaseDomain(domain)}`;
const bimiLogoForDomain = (domain: string) => `https://${mailBaseDomain(domain)}/brand/bimi.svg`;
const dmarcForDomain = (domain: string) => `v=DMARC1; p=quarantine; pct=100; rua=mailto:postmaster@${mailBaseDomain(domain)}; ruf=mailto:postmaster@${mailBaseDomain(domain)}; fo=1`;
const bimiTxtForDomain = (domain: string, logoUrl = '', certificateUrl = '') => {
  const cert = certificateUrl.trim();
  const logo = logoUrl.trim() || bimiLogoForDomain(domain);
  if (logo && cert) return `v=BIMI1; l=${logo}; a=${cert}`;
  if (logo) return `v=BIMI1; l=${logo}`;
  return '';
};
const localPart = (value: string) => cleanUsername(String(value || '').split('@')[0] || 'noreply') || 'noreply';
const domainFromEmail = (value: string, fallback = 'tiwlo.com') => mailBaseDomain(String(value || '').includes('@') ? String(value).split('@').pop() || fallback : fallback);
const blueBadgeEnabled = (record: any) => Boolean(record?.data?.blueBadgeEnabled || record?.data?.bimi?.enabled);
const cleanEmail = (value: string) => String(value || '').trim().toLowerCase();
const isEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
const isLegacySupportReplyTo = (replyTo: string, fromEmail: string) => cleanEmail(replyTo).startsWith('support@') && cleanEmail(replyTo) !== cleanEmail(fromEmail);
const nextReplyTo = (currentReplyTo: string, previousFrom: string, nextFrom: string) => {
  const current = cleanEmail(currentReplyTo);
  return !current || current === cleanEmail(previousFrom) || isLegacySupportReplyTo(current, previousFrom) ? nextFrom : current;
};

export default function AdminEmail() {
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [accountForm, setAccountForm] = React.useState(emptyAccount);
  const [systemForm, setSystemForm] = React.useState(emptySystemEmail);
  const [editingId, setEditingId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [repairingDns, setRepairingDns] = React.useState(false);
  const [bimiWorkingId, setBimiWorkingId] = React.useState('');
  const [testRecipient, setTestRecipient] = React.useState('');
  const [testResult, setTestResult] = React.useState<any | null>(null);
  const [dnsRepairResult, setDnsRepairResult] = React.useState<any | null>(null);
  const [gmailBounceText, setGmailBounceText] = React.useState('');
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
        const domainSource = String(systemEmail.username || '').includes('@') ? systemEmail.username : systemEmail.fromEmail;
        const domain = domainFromEmail(domainSource, powerDnsConfig?.primaryDomain || 'tiwlo.com');
        const smtpMode = Number(systemEmail.port || 465) === 587 ? '587' : '465';
        const sender = localPart(systemEmail.username || systemEmail.fromEmail || 'noreply');
        const fromEmail = `${sender}@${domain}`;
        const replyTo = isEmailAddress(systemEmail.replyTo) && !isLegacySupportReplyTo(systemEmail.replyTo, fromEmail) ? cleanEmail(systemEmail.replyTo) : fromEmail;
        setSystemForm({
          ...emptySystemEmail,
          domain,
          sender,
          smtpHost: systemEmail.host || systemEmail.publicHost || hostForDomain(domain),
          smtpUsername: systemEmail.username || systemEmail.fromEmail || fromEmail,
          smtpMode,
          password: systemEmail.password || '',
          fromName: systemEmail.fromName || 'Tiwlo',
          replyTo,
          bimiLogoUrl: systemEmail.bimi?.logoUrl || '',
          bimiCertificateUrl: systemEmail.bimi?.certificateUrl || ''
        });
      } else if (powerDnsConfig?.primaryDomain) {
        const domain = cleanDomain(powerDnsConfig.primaryDomain);
        setSystemForm((current) => ({ ...current, domain, replyTo: `${localPart(current.sender)}@${domain}` }));
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
  const normalizedDomain = mailBaseDomain(accountForm.domain);
  const fullAddress = `${normalizedUsername}@${normalizedDomain}`;
  const systemDomain = mailBaseDomain(systemForm.domain);
  const systemSender = localPart(systemForm.sender);
  const systemAddress = `${systemSender}@${systemDomain}`;
  const publicMailHost = hostForDomain(systemDomain);
  const emailPortalHost = portalForDomain(systemDomain);
  const activeBimiLogoUrl = systemForm.bimiLogoUrl.trim();
  const activeBimiCertificateUrl = systemForm.bimiCertificateUrl.trim();
  const activeBimiTxt = bimiTxtForDomain(systemDomain, activeBimiLogoUrl, activeBimiCertificateUrl);
  const selectedSmtpPort = systemForm.smtpMode === '587' ? 587 : 465;
  const selectedSmtpMode = selectedSmtpPort === 587 ? '587 STARTTLS' : '465 SSL';
  const normalizedSystemEmail = React.useCallback(() => {
    const port = systemForm.smtpMode === '587' ? 587 : 465;
    const fromEmail = `${localPart(systemForm.sender)}@${mailBaseDomain(systemForm.domain)}`;
    const replyTo = isEmailAddress(systemForm.replyTo) && !isLegacySupportReplyTo(systemForm.replyTo, fromEmail) ? cleanEmail(systemForm.replyTo) : fromEmail;
    return {
      host: String(systemForm.smtpHost || '').trim() || hostForDomain(mailBaseDomain(systemForm.domain)),
      publicHost: hostForDomain(mailBaseDomain(systemForm.domain)),
      tlsServername: String(systemForm.smtpHost || '').trim() === '127.0.0.1'
        ? hostForDomain(mailBaseDomain(systemForm.domain))
        : String(systemForm.smtpHost || '').trim() || hostForDomain(mailBaseDomain(systemForm.domain)),
      port,
      secureSSL: port === 465,
      requireTLS: port === 587,
      tlsRejectUnauthorized: false,
      username: String(systemForm.smtpUsername || '').trim() || fromEmail,
      password: String(systemForm.password || '').trim(),
      fromEmail,
      fromName: String(systemForm.fromName || 'Tiwlo').trim(),
      replyTo,
      forceIpv4: true,
      disableIpv6: true,
      domain: mailBaseDomain(systemForm.domain),
      bimi: {
        logoUrl: systemForm.bimiLogoUrl.trim(),
        certificateUrl: systemForm.bimiCertificateUrl.trim()
      }
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
      const existingRecord = editingId ? accounts.find((record) => record.id === editingId) : null;
      const hostName = hostForDomain(normalizedDomain);
      const portalHost = portalForDomain(normalizedDomain);
      await upsertMainAdminRecordWithApi({
        section: 'emailAccounts',
        id: editingId || undefined,
        title: fullAddress,
        status: accountForm.status,
        data: {
          ...(existingRecord?.data || {}),
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

  const findManagedDomain = async (domainName: string) => {
    const normalized = mailBaseDomain(domainName);
    const domains = await fetchDomainsWithApi(normalized);
    const domain = domains.find((item: any) => mailBaseDomain(item.name) === normalized);
    if (!domain) throw new Error(`Add ${normalized} in DNS Zones first so Tiwlo can publish BIMI automatically.`);
    return domain;
  };

  const upsertDnsTxt = async (domainId: string, name: string, value: string, metadata: Record<string, unknown>) => {
    const records = await fetchDnsRecordsWithApi(domainId);
    const existing = records.find((record: any) => record.type === 'TXT' && String(record.name || '').toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.value !== value || existing.status === 'disabled') {
        const currentMetadata = typeof existing.metadata === 'object' && existing.metadata ? existing.metadata : {};
        await updateDnsRecordWithApi({ id: existing.id, value, ttl: 300, status: 'active', metadata: { ...currentMetadata, ...metadata } });
      }
      return existing;
    }
    await addDnsRecordWithApi({ domainId, type: 'TXT', name, value, ttl: 300, metadata });
    return null;
  };

  const configureBimiDns = async (record: any, enabled: boolean) => {
    const domainName = mailBaseDomain(record.data?.domain || String(record.title || '').split('@')[1] || systemDomain);
    if (!enabled) {
      const stillEnabled = accounts.some((item) => item.id !== record.id && mailBaseDomain(item.data?.domain || '') === domainName && blueBadgeEnabled(item));
      const domain = await findManagedDomain(domainName).catch(() => null);
      if (!stillEnabled) {
        const records = domain ? await fetchDnsRecordsWithApi(domain.id) : [];
        await Promise.all(records
          .filter((item: any) => item.type === 'TXT' && String(item.name || '').toLowerCase() === 'default._bimi')
          .map((item: any) => deleteDnsRecordWithApi(item.id)));
      }
      return {
        domainName,
        logoUrl: '',
        certificateUrl: '',
        dnsValue: '',
        status: 'off',
        steps: [
          { label: 'Blue badge disabled', status: 'done', detail: stillEnabled ? 'BIMI kept because another mailbox on this domain is enabled.' : 'BIMI DNS record removed for this domain.' }
        ]
      };
    }

    const domain = await findManagedDomain(domainName);
    const logoUrl = systemForm.bimiLogoUrl.trim() || bimiLogoForDomain(domainName);
    const certificateUrl = systemForm.bimiCertificateUrl.trim();
    const bimiValue = bimiTxtForDomain(domainName, logoUrl, certificateUrl);
    await upsertDnsTxt(domain.id, '_dmarc', dmarcForDomain(domainName), { provider: 'powerdns', source: 'bimi_blue_badge', managed: true });
    if (bimiValue) {
      await upsertDnsTxt(domain.id, 'default._bimi', bimiValue, { provider: 'powerdns', source: 'bimi_blue_badge', managed: true });
    }
    return {
      domainName,
      logoUrl,
      certificateUrl,
      dnsValue: bimiValue,
      status: logoUrl && certificateUrl ? 'gmail_blue_ready' : logoUrl ? 'pending_vmc_or_cmc' : 'pending_bimi_svg',
      steps: [
        { label: 'SVG Tiny PS hosted', status: 'done', detail: logoUrl },
        { label: 'DMARC enforced', status: 'done', detail: `_dmarc.${domainName} uses p=quarantine and pct=100.` },
        { label: 'BIMI DNS published', status: 'done', detail: `default._bimi.${domainName}` },
        { label: 'Gmail blue check', status: logoUrl && certificateUrl ? 'done' : 'pending', detail: logoUrl && certificateUrl ? 'BIMI SVG and VMC/CMC PEM URLs are attached.' : 'Optional: add both BIMI SVG and VMC/CMC PEM URLs for Gmail verified checkmark.' }
      ]
    };
  };

  const toggleBlueBadge = async (record: any) => {
    const enabled = !blueBadgeEnabled(record);
    setBimiWorkingId(record.id);
    setError('');
    setNotice('');
    try {
      const bimi = await configureBimiDns(record, enabled);
      await upsertMainAdminRecordWithApi({
        section: 'emailAccounts',
        id: record.id,
        title: record.title,
        status: record.status,
        data: {
          ...(record.data || {}),
          blueBadgeEnabled: enabled,
          bimi: {
            enabled,
            ...bimi,
            updatedAt: new Date().toISOString()
          }
        }
      });
      setNotice(enabled ? `BIMI automation enabled for ${bimi.domainName}.` : `Blue badge disabled for ${record.data?.address || record.title}.`);
      await loadEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update BIMI blue badge automation');
    } finally {
      setBimiWorkingId('');
    }
  };

  const repairMailDns = async (silent = false) => {
    setRepairingDns(true);
    if (!silent) {
      setError('');
      setNotice('');
    }
    try {
      const result = await repairMailDeliveryDnsWithApi({
        domain: systemDomain,
        mailHost: publicMailHost,
        forceIpv4: true,
        disableIpv6: true,
        bounceText: gmailBounceText.trim() || undefined
      });
      setDnsRepairResult(result);
      if (!silent) {
        if (result.ok) {
          setNotice(result.message || 'Mail delivery DNS repaired.');
        } else {
          setError(result.message || 'Mail delivery DNS was repaired, but PTR/rDNS still needs provider action.');
        }
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to repair mail delivery DNS';
      setDnsRepairResult({ ok: false, message, details: null });
      if (!silent) setError(message);
      throw err;
    } finally {
      setRepairingDns(false);
    }
  };

  const saveSystemEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!systemForm.smtpHost.trim()) throw new Error('SMTP host is required.');
      if (!systemForm.smtpUsername.trim()) throw new Error('SMTP username is required.');
      if (!systemForm.password.trim()) throw new Error('SMTP password is required.');
      await upsertSettingWithApi({
        scope: 'platform',
        scopeId: '',
        key: 'systemEmail',
        value: normalizedSystemEmail()
      });
      const enabledBimiAccounts = accounts.filter((record) => blueBadgeEnabled(record));
      for (const record of enabledBimiAccounts) {
        const bimi = await configureBimiDns(record, true);
        await upsertMainAdminRecordWithApi({
          section: 'emailAccounts',
          id: record.id,
          title: record.title,
          status: record.status,
          data: {
            ...(record.data || {}),
            blueBadgeEnabled: true,
            bimi: {
              enabled: true,
              ...bimi,
              updatedAt: new Date().toISOString()
            }
          }
        });
      }
      let mailDnsMessage = '';
      try {
        const repairResult = await repairMailDns(true);
        mailDnsMessage = repairResult?.message || 'Mail delivery DNS repaired and synced.';
      } catch (dnsErr) {
        mailDnsMessage = `System email saved, but mail DNS repair needs attention: ${dnsErr instanceof Error ? dnsErr.message : 'unable to repair DNS automatically'}`;
      }
      setNotice(enabledBimiAccounts.length ? `${mailDnsMessage} BIMI DNS refreshed.` : mailDnsMessage || 'System email configuration saved.');
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
            <p className="text-[13px] text-[#6B7280]">Create mailboxes, test SMTP delivery, and publish the login details for tmail.tiwlo.com.</p>
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
              <p className="mt-1 text-[12px] text-[#6B7280]">The mailbox can sign in at tmail.tiwlo.com after it is saved.</p>
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
              <p className="mt-1 text-[12px] text-[#6B7280]">Configure the exact SMTP server and login used for transactional email delivery.</p>
            </div>
          </div>
          <form onSubmit={saveSystemEmail} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">Mail Domain</span>
              <input value={systemForm.domain} onChange={(event) => {
                const nextDomain = mailBaseDomain(event.target.value);
                const nextFrom = `${systemSender}@${nextDomain}`;
                setSystemForm({ ...systemForm, domain: nextDomain, replyTo: nextReplyTo(systemForm.replyTo, systemAddress, nextFrom) });
              }} placeholder="tiwlo.com" className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">Sender</span>
              <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded border border-[#DDE3EA] bg-white focus-within:border-blue-500">
                <input value={systemForm.sender} onChange={(event) => {
                  const nextSender = localPart(event.target.value);
                  const nextFrom = `${nextSender}@${systemDomain}`;
                  setSystemForm({ ...systemForm, sender: event.target.value, replyTo: nextReplyTo(systemForm.replyTo, systemAddress, nextFrom) });
                }} placeholder="noreply" className="min-w-0 px-3 py-2 text-sm outline-none" />
                <span className="border-l border-[#DDE3EA] bg-[#F9FAFB] px-3 py-2 text-sm font-bold text-[#6B7280]">@{systemDomain}</span>
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">SMTP Host</span>
              <input value={systemForm.smtpHost} onChange={(event) => setSystemForm({ ...systemForm, smtpHost: event.target.value })} placeholder={publicMailHost} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">SMTP Username</span>
              <input value={systemForm.smtpUsername} onChange={(event) => setSystemForm({ ...systemForm, smtpUsername: event.target.value })} placeholder={systemAddress} autoComplete="username" className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">SMTP Password</span>
              <input type="password" value={systemForm.password} onChange={(event) => setSystemForm({ ...systemForm, password: event.target.value })} placeholder="SMTP password" autoComplete="current-password" className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
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
              <input value={systemForm.replyTo} onChange={(event) => setSystemForm({ ...systemForm, replyTo: event.target.value })} placeholder={systemAddress} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">BIMI SVG URL Optional</span>
              <input value={systemForm.bimiLogoUrl} onChange={(event) => setSystemForm({ ...systemForm, bimiLogoUrl: event.target.value })} placeholder={bimiLogoForDomain(systemDomain)} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#6B7280]">VMC/CMC PEM URL Optional</span>
              <input value={systemForm.bimiCertificateUrl} onChange={(event) => setSystemForm({ ...systemForm, bimiCertificateUrl: event.target.value })} placeholder="https://example.com/brand/certificate.pem" className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <div className="rounded border border-blue-100 bg-blue-50 p-3 md:col-span-2">
              <div className="grid grid-cols-1 gap-2 text-[11px] font-bold text-blue-800 sm:grid-cols-4">
                {[
                  ['SVG Tiny PS', activeBimiLogoUrl || 'Optional'],
                  ['DMARC', `p=quarantine; pct=100`],
                  ['BIMI TXT', activeBimiTxt || 'Not published'],
                  ['Gmail check', activeBimiLogoUrl && activeBimiCertificateUrl ? 'Ready after DNS propagation' : 'Optional']
                ].map(([label, value]) => (
                  <div key={label} className="rounded border border-blue-100 bg-white p-2">
                    <p className="text-[9px] font-black uppercase text-blue-500">{label}</p>
                    <p className="mt-1 break-all text-[#111827]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:col-span-2 sm:grid-cols-3">
              {[
                ['Backend SMTP', `${systemForm.smtpHost || '-'} : ${selectedSmtpMode}`],
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
                    <span>ipv4: {testResult.diagnostic?.ipv4Only || testResult.ipv4Only ? 'forced' : 'auto'}</span>
                    <span>tcp: {testResult.diagnostic?.tcpOk ? 'reachable' : testResult.diagnostic?.tcpError || '-'}</span>
                    <span className="sm:col-span-2">dns: {(testResult.diagnostic?.resolvedAddresses || []).join(', ') || '-'}</span>
                    {testResult.diagnostic?.authSource && <span className="sm:col-span-2">source: {testResult.diagnostic.authSource}</span>}
                    {testResult.diagnostic?.rawMessage && <span className="sm:col-span-2 break-words">smtp: {testResult.diagnostic.rawMessage}</span>}
                    {testResult.diagnostic?.fallback && <span className="sm:col-span-2">fallback: {testResult.diagnostic.fallback.host} / {testResult.diagnostic.fallback.code}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded border border-amber-100 bg-amber-50 p-3 md:col-span-2">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-amber-900">
                  <Wrench className="h-4 w-4" />
                  <div>
                    <p className="text-[12px] font-black uppercase">Gmail Delivery DNS Repair</p>
                    <p className="text-[11px] font-semibold text-amber-800">Paste the returned Gmail bounce here; Tiwlo will repair IPv4 MX/SPF/DKIM/DMARC/A records and show PTR action.</p>
                  </div>
                </div>
                <a href="https://support.google.com/mail/answer/81126" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded border border-amber-200 bg-white px-3 py-2 text-[12px] font-bold text-amber-800 hover:border-amber-400">
                  <ExternalLink className="h-4 w-4" /> Gmail Rules
                </a>
              </div>
              <textarea
                value={gmailBounceText}
                onChange={(event) => setGmailBounceText(event.target.value)}
                rows={4}
                placeholder="Paste Gmail 550-5.7.1 IPv6AuthError / PTR bounce text here"
                className="w-full rounded border border-amber-200 bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-amber-500"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => repairMailDns(false)} disabled={repairingDns} className="inline-flex items-center justify-center gap-2 rounded bg-amber-600 px-4 py-2 text-[12px] font-black text-white hover:bg-amber-700 disabled:opacity-60">
                  <Wrench className="h-4 w-4" /> {repairingDns ? 'Repairing...' : 'Repair Mail DNS'}
                </button>
                {dnsRepairResult?.details?.postfixIpv4Workaround && (
                  <button type="button" onClick={() => copyValue(dnsRepairResult.details.postfixIpv4Workaround)} className="inline-flex items-center justify-center gap-2 rounded border border-amber-200 bg-white px-3 py-2 text-[12px] font-bold text-amber-800 hover:border-amber-400">
                    <Copy className="h-4 w-4" /> Copy IPv4 Workaround
                  </button>
                )}
              </div>
              {dnsRepairResult && (
                <div className={`mt-3 rounded border px-3 py-3 text-[12px] ${dnsRepairResult.ok ? 'border-emerald-200 bg-white text-emerald-800' : 'border-red-100 bg-red-50 text-red-700'}`}>
                  <p className="font-black">{dnsRepairResult.message}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      ['Mail host', dnsRepairResult.details?.mailHost || publicMailHost],
                      ['IPv4', (dnsRepairResult.details?.ipv4 || []).join(', ') || '-'],
                      ['IPv6', (dnsRepairResult.details?.ipv6 || []).join(', ') || '-']
                    ].map(([label, value]) => (
                      <button key={label} type="button" onClick={() => copyValue(String(value))} className="rounded border border-current/10 bg-white p-2 text-left">
                        <span className="block text-[9px] font-black uppercase opacity-70">{label}</span>
                        <span className="mt-1 block break-all font-mono text-[11px] font-bold">{value}</span>
                      </button>
                    ))}
                  </div>
                  {Array.isArray(dnsRepairResult.details?.ptrChecks) && dnsRepairResult.details.ptrChecks.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {dnsRepairResult.details.ptrChecks.map((check: any) => (
                        <div key={check.ip} className={`rounded border p-2 ${check.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-red-100 bg-white text-red-700'}`}>
                          <p className="font-black">PTR {check.ip}: {check.ok ? 'aligned' : 'provider action required'}</p>
                          <p className="mt-1 break-words font-semibold opacity-80">{check.requiredAction}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(dnsRepairResult.details?.expectedRecords) && (
                    <p className="mt-3 text-[11px] font-semibold opacity-80">
                      Published {dnsRepairResult.details.expectedRecords.length} mail DNS record(s): MX, SPF, DMARC, DKIM when configured, BIMI, and mail service IPv4 A hostnames.
                    </p>
                  )}
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
          {accounts.map((record) => {
            const enabled = blueBadgeEnabled(record);
            const bimi = record.data?.bimi || {};
            const gmailReady = enabled && Boolean(bimi.logoUrl && bimi.certificateUrl);
            const statusLabel = enabled ? (gmailReady ? 'Gmail blue ready' : 'VMC pending') : 'Off';
            return (
              <div key={record.id} className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-black text-[#111827]">{record.data?.address || record.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${enabled ? (gmailReady ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-amber-100 bg-amber-50 text-amber-700') : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                      Blue badge {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#6B7280]">{record.data?.hostName || hostForDomain(record.data?.domain || 'tiwlo.com')} / IMAP {record.data?.incoming?.port || 993} SSL / SMTP {record.data?.outgoing?.port || 465} SSL / quota {record.data?.quotaMB || record.data?.quota || 0} MB</p>
                  <p className="mt-1 break-all text-[11px] font-bold text-[#9CA3AF]">Login: https://{record.data?.portalHost || portalForDomain(record.data?.domain || 'tiwlo.com')} / Username: {record.data?.address || record.title}</p>
                  {enabled && (
                    <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                      {(Array.isArray(bimi.steps) ? bimi.steps : [
                        { label: 'BIMI DNS', status: 'done', detail: bimi.dnsValue || bimiTxtForDomain(record.data?.domain || systemDomain, bimi.logoUrl, bimi.certificateUrl) },
                        { label: 'Gmail blue check', status: gmailReady ? 'done' : 'pending', detail: gmailReady ? 'BIMI SVG and VMC/CMC PEM are attached.' : 'Optional: add BIMI SVG and VMC/CMC PEM URLs.' }
                      ]).map((step: any) => (
                        <div key={step.label} className={`rounded border p-2 ${step.status === 'pending' ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>
                          <p className="font-black">{step.label}</p>
                          <p className="mt-1 break-all font-semibold opacity-80">{step.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => toggleBlueBadge(record)} disabled={bimiWorkingId === record.id} className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-[12px] font-bold disabled:opacity-60 ${enabled ? 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-[#DDE3EA] text-[#374151] hover:bg-[#F9FAFB]'}`}>
                    <ShieldCheck className="h-4 w-4" /> {bimiWorkingId === record.id ? 'Updating...' : enabled ? 'Turn Off Badge' : 'Turn On Badge'}
                  </button>
                  <button onClick={() => editAccount(record)} className="rounded border border-[#DDE3EA] px-3 py-2 text-[12px] font-bold text-[#374151] hover:bg-[#F9FAFB]">Edit</button>
                  <button onClick={() => deleteAccount(record)} className="inline-flex items-center gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 hover:bg-red-100">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded border border-[#E5E7EB] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-black uppercase text-[#111827]">Connection Details</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 text-[13px] md:grid-cols-5">
          {[
            ['Mail login', `https://${emailPortalHost}`],
            ['Incoming IMAP', `${publicMailHost} : 993 SSL`],
            ['Outgoing SMTP', `${publicMailHost} : 465 SSL or 587 STARTTLS`],
            ['MX Record', `MX 10 ${publicMailHost}`],
            ['BIMI TXT', activeBimiTxt || 'Optional: add BIMI SVG URL to publish default._bimi']
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
