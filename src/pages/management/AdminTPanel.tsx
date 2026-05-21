import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Database,
  FileText,
  Globe,
  KeyRound,
  ListChecks,
  Lock,
  PackagePlus,
  Plus,
  RefreshCw,
  Rocket,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Users,
  Wallet
} from 'lucide-react';
import {
  adminPublishTPanelUpdateWithApi,
  adminUpdateTPanelLicenseStatusWithApi,
  createTPanelManagedAccountWithApi,
  fetchAdminTPanelOverviewWithApi,
  fetchTPanelControlOverviewWithApi,
  queueTPanelRemoteTaskWithApi,
  updateTPanelManagedAccountStatusWithApi,
  upsertTPanelAccountPackageWithApi,
  upsertTPanelDnsZoneWithApi,
  upsertTPanelSecurityRuleWithApi,
  upsertTPanelServiceStateWithApi
} from '../../lib/tiwloApi';

const money = (value: number, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`;

const dateLabel = (value?: string) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'paid', 'online', 'published'].includes(normalized)) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (['pending_payment', 'open', 'draft'].includes(normalized)) return 'border-amber-100 bg-amber-50 text-amber-700';
  if (['suspended', 'expired', 'cancelled', 'revoked'].includes(normalized)) return 'border-red-100 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-700';
};

function StatusPill({ status }: { status: string }) {
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(status)}`}>{status}</span>;
}

const compactJson = (value: unknown, fallback: unknown) => {
  try {
    const textValue = typeof value === 'string' ? value : JSON.stringify(value ?? fallback);
    return textValue ? JSON.parse(textValue) : fallback;
  } catch {
    return fallback;
  }
};

export default function AdminTPanel() {
  const location = useLocation();
  const [overview, setOverview] = React.useState<any | null>(null);
  const [control, setControl] = React.useState<any | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [updateForm, setUpdateForm] = React.useState({
    version: '',
    title: '',
    channel: 'stable',
    isForced: true,
    releaseNotes: '',
    packageUrl: '',
    checksum: '',
    rolloutMessage: 'New tPanel update is available. Update now to keep services secure.'
  });
  const [packageForm, setPackageForm] = React.useState({
    name: '',
    code: '',
    diskMB: '10240',
    bandwidthGB: '100',
    domains: '5',
    databases: '5',
    emailAccounts: '25',
    nodeApps: '3',
    ftpAccounts: '5'
  });
  const [accountForm, setAccountForm] = React.useState({
    username: '',
    domain: '',
    contactEmail: '',
    ownerName: '',
    packageId: '',
    password: ''
  });
  const [dnsForm, setDnsForm] = React.useState({
    domain: '',
    records: '[{"type":"A","name":"@","value":"SERVER_IP","ttl":300}]'
  });
  const [serviceForm, setServiceForm] = React.useState({
    name: 'nginx',
    displayName: 'Nginx',
    status: 'active',
    port: '80',
    queueAction: 'restart_service'
  });
  const [securityForm, setSecurityForm] = React.useState({
    kind: 'firewall',
    name: 'Block IP',
    action: 'deny',
    value: ''
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const adminOverview = await fetchAdminTPanelOverviewWithApi();
      const nextLicenseId = selectedLicenseId || adminOverview?.licenses?.[0]?.id || '';
      setOverview(adminOverview);
      setSelectedLicenseId(nextLicenseId);
      setControl(nextLicenseId ? await fetchTPanelControlOverviewWithApi(nextLicenseId) : null);
    } catch (err) {
      setOverview(null);
      setControl(null);
      setError(err instanceof Error ? err.message : 'Unable to load tPanel management');
    } finally {
      setLoading(false);
    }
  }, [selectedLicenseId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const reloadControl = React.useCallback(async () => {
    if (!selectedLicenseId) return;
    setControl(await fetchTPanelControlOverviewWithApi(selectedLicenseId));
  }, [selectedLicenseId]);

  const updateStatus = async (id: string, status: string) => {
    setSaving(id);
    setError('');
    setNotice('');
    try {
      await adminUpdateTPanelLicenseStatusWithApi(id, status, `Admin set license ${status}`);
      setNotice(`License ${status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update license');
    } finally {
      setSaving('');
    }
  };

  const publishUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving('update');
    setError('');
    setNotice('');
    try {
      await adminPublishTPanelUpdateWithApi({
        ...updateForm,
        isForced: Boolean(updateForm.isForced)
      });
      setNotice('tPanel update published to licensed servers.');
      setUpdateForm((current) => ({ ...current, version: '', title: '', releaseNotes: '', packageUrl: '', checksum: '' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish update');
    } finally {
      setSaving('');
    }
  };

  const createPackage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLicenseId) return;
    setSaving('package');
    setError('');
    setNotice('');
    try {
      await upsertTPanelAccountPackageWithApi({
        licenseId: selectedLicenseId,
        name: packageForm.name,
        code: packageForm.code,
        diskMB: Number(packageForm.diskMB || 0),
        bandwidthGB: Number(packageForm.bandwidthGB || 0),
        domains: Number(packageForm.domains || 0),
        databases: Number(packageForm.databases || 0),
        emailAccounts: Number(packageForm.emailAccounts || 0),
        nodeApps: Number(packageForm.nodeApps || 0),
        ftpAccounts: Number(packageForm.ftpAccounts || 0)
      });
      setPackageForm((current) => ({ ...current, name: '', code: '' }));
      setNotice('WHM package saved and sync task queued.');
      await reloadControl();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save package');
    } finally {
      setSaving('');
    }
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLicenseId) return;
    setSaving('account');
    setError('');
    setNotice('');
    try {
      await createTPanelManagedAccountWithApi({
        licenseId: selectedLicenseId,
        packageId: accountForm.packageId || undefined,
        username: accountForm.username,
        domain: accountForm.domain,
        contactEmail: accountForm.contactEmail,
        ownerName: accountForm.ownerName,
        password: accountForm.password || undefined
      });
      setAccountForm((current) => ({ ...current, username: '', domain: '', contactEmail: '', ownerName: '', password: '' }));
      setNotice('Hosting account queued for creation on licensed tPanel server.');
      await reloadControl();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setSaving('');
    }
  };

  const changeAccountStatus = async (id: string, status: string) => {
    setSaving(id);
    setError('');
    setNotice('');
    try {
      await updateTPanelManagedAccountStatusWithApi(id, status, `Admin requested ${status}`);
      setNotice(`Account ${status} task queued.`);
      await reloadControl();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update account');
    } finally {
      setSaving('');
    }
  };

  const saveDnsZone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLicenseId) return;
    setSaving('dns');
    setError('');
    setNotice('');
    try {
      await upsertTPanelDnsZoneWithApi({
        licenseId: selectedLicenseId,
        domain: dnsForm.domain,
        records: compactJson(dnsForm.records, [])
      });
      setDnsForm((current) => ({ ...current, domain: '' }));
      setNotice('DNS zone saved and sync task queued.');
      await reloadControl();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save DNS zone');
    } finally {
      setSaving('');
    }
  };

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLicenseId) return;
    setSaving('service');
    setError('');
    setNotice('');
    try {
      await upsertTPanelServiceStateWithApi({
        licenseId: selectedLicenseId,
        name: serviceForm.name,
        displayName: serviceForm.displayName,
        status: serviceForm.status,
        port: Number(serviceForm.port || 0) || undefined,
        queueAction: serviceForm.queueAction
      });
      setNotice('Service state saved and remote service task queued.');
      await reloadControl();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save service');
    } finally {
      setSaving('');
    }
  };

  const saveSecurityRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLicenseId) return;
    setSaving('security');
    setError('');
    setNotice('');
    try {
      await upsertTPanelSecurityRuleWithApi({
        licenseId: selectedLicenseId,
        kind: securityForm.kind,
        name: securityForm.name,
        action: securityForm.action,
        value: securityForm.value
      });
      setSecurityForm((current) => ({ ...current, value: '' }));
      setNotice('Security rule saved and apply task queued.');
      await reloadControl();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save security rule');
    } finally {
      setSaving('');
    }
  };

  const queueUpdateTask = async () => {
    if (!selectedLicenseId) return;
    setSaving('run_update');
    setError('');
    setNotice('');
    try {
      await queueTPanelRemoteTaskWithApi({ licenseId: selectedLicenseId, action: 'run_update', priority: 5, payload: { requestedAt: new Date().toISOString() } });
      setNotice('Update task queued for selected tPanel server.');
      await reloadControl();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to queue update');
    } finally {
      setSaving('');
    }
  };

  const summary = overview?.summary || {};
  const licenses = overview?.licenses || [];
  const updates = overview?.updates || [];
  const currency = licenses[0]?.currency || 'USD';
  const activePath = location.pathname.split('/').pop() || 'overview';
  const currentSection = activePath === 'tpanel' ? 'overview' : activePath;
  const controlPackages = control?.packages || [];
  const accounts = control?.accounts || [];
  const dnsZones = control?.dnsZones || [];
  const services = control?.services || [];
  const securityRules = control?.securityRules || [];
  const tasks = control?.tasks || [];
  const navItems = [
    { label: 'Overview', path: '/management/tpanel', icon: Server },
    { label: 'Licenses', path: '/management/tpanel/licenses', icon: KeyRound },
    { label: 'Packages', path: '/management/tpanel/packages', icon: PackagePlus },
    { label: 'Accounts', path: '/management/tpanel/accounts', icon: Users },
    { label: 'DNS', path: '/management/tpanel/dns', icon: Globe },
    { label: 'Services', path: '/management/tpanel/services', icon: Settings },
    { label: 'Security', path: '/management/tpanel/security', icon: Lock },
    { label: 'Updates', path: '/management/tpanel/updates', icon: Rocket },
    { label: 'Tasks', path: '/management/tpanel/tasks', icon: ListChecks },
    { label: 'Installer', path: '/management/tpanel/installer', icon: Terminal }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">tPanel Management</h1>
            <p className="mt-1 text-[13px] text-[#6B7280]">Licenses, revenue, allowlisted server IPs, node heartbeats, renewals, and forced update notices.</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center justify-center gap-2 rounded border border-[#DDE3EA] bg-white px-4 py-2 text-[13px] font-bold text-[#374151] hover:border-blue-400">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {(error || notice) && (
        <div className={`flex items-center gap-2 rounded border px-4 py-3 text-[13px] font-bold ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {error || notice}
        </div>
      )}

      <section className="rounded border border-[#DDE3EA] bg-white p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/management/tpanel'}
                  className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded border px-3 py-2 text-[12px] font-bold ${isActive ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#DDE3EA] bg-white text-[#4B5563] hover:border-blue-400'}`}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </NavLink>
              );
            })}
          </div>
          <select
            value={selectedLicenseId}
            onChange={(event) => setSelectedLicenseId(event.target.value)}
            className="rounded border border-[#DDE3EA] px-3 py-2 text-[12px] font-bold text-[#374151] outline-none focus:border-blue-500"
          >
            <option value="">Select active license</option>
            {licenses.map((license: any) => (
              <option key={license.id} value={license.id}>{license.serverIp} - {license.owner?.email || license.label || license.id}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Licenses', value: summary.licenses || 0, icon: Users },
          { label: 'Active', value: summary.activeLicenses || 0, icon: ShieldCheck },
          { label: 'Pending', value: summary.pendingLicenses || 0, icon: CreditCard },
          { label: 'Suspended', value: summary.suspendedLicenses || 0, icon: ShieldAlert },
          { label: 'Monthly', value: money(summary.monthlyRevenue, currency), icon: Wallet },
          { label: 'Due', value: money(summary.dueAmount, currency), icon: AlertCircle }
        ].map((item) => (
          <div key={item.label} className="rounded border border-[#E5E7EB] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#6B7280]">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-[#111827]">{loading ? 'Loading' : item.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentSection === 'packages' && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={createPackage} className="rounded border border-[#E5E7EB] bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <PackagePlus className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold uppercase text-[#111827]">Create WHM Package</h2>
                <p className="text-[12px] text-[#6B7280]">Resource limits used when creating accounts on the licensed tPanel server.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input required value={packageForm.name} onChange={(event) => setPackageForm((current) => ({ ...current, name: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Package name" />
              <input value={packageForm.code} onChange={(event) => setPackageForm((current) => ({ ...current, code: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Code" />
              {[
                ['diskMB', 'Disk MB'],
                ['bandwidthGB', 'Bandwidth GB'],
                ['domains', 'Domains'],
                ['databases', 'Databases'],
                ['emailAccounts', 'Email accounts'],
                ['nodeApps', 'Node apps'],
                ['ftpAccounts', 'FTP accounts']
              ].map(([key, label]) => (
                <input key={key} type="number" value={(packageForm as any)[key]} onChange={(event) => setPackageForm((current) => ({ ...current, [key]: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder={label} />
              ))}
              <button disabled={saving === 'package' || !selectedLicenseId} className="flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60 md:col-span-2">
                <Plus className="h-4 w-4" /> Save package
              </button>
            </div>
          </form>

          <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              <h2 className="text-sm font-bold uppercase text-[#111827]">Account Packages</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead><tr className="border-b border-[#E5E7EB]">{['Name', 'Limits', 'Status', 'Updated'].map((heading) => <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {controlPackages.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No WHM packages yet.</td></tr>}
                  {controlPackages.map((pkg: any) => (
                    <tr key={pkg.id}>
                      <td className="px-5 py-4"><p className="text-[13px] font-bold text-[#111827]">{pkg.name}</p><p className="text-[12px] text-[#6B7280]">{pkg.code}</p></td>
                      <td className="px-5 py-4 text-[12px] text-[#4B5563]">{pkg.diskMB} MB disk / {pkg.bandwidthGB} GB bandwidth / {pkg.domains} domains</td>
                      <td className="px-5 py-4"><StatusPill status={pkg.status} /></td>
                      <td className="px-5 py-4 text-[12px] text-[#6B7280]">{dateLabel(pkg.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {currentSection === 'accounts' && (
        <section className="space-y-6">
          <form onSubmit={createAccount} className="rounded border border-[#E5E7EB] bg-white p-5">
            <div className="mb-4 flex items-center gap-3"><Users className="h-5 w-5 text-blue-600" /><div><h2 className="text-sm font-bold uppercase text-[#111827]">Create Hosting Account</h2><p className="text-[12px] text-[#6B7280]">Queues a create-account task for the licensed server agent.</p></div></div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input required value={accountForm.username} onChange={(event) => setAccountForm((current) => ({ ...current, username: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Username" />
              <input required value={accountForm.domain} onChange={(event) => setAccountForm((current) => ({ ...current, domain: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Domain" />
              <select value={accountForm.packageId} onChange={(event) => setAccountForm((current) => ({ ...current, packageId: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">No package</option>
                {controlPackages.map((pkg: any) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}
              </select>
              <input value={accountForm.ownerName} onChange={(event) => setAccountForm((current) => ({ ...current, ownerName: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Owner name" />
              <input type="email" value={accountForm.contactEmail} onChange={(event) => setAccountForm((current) => ({ ...current, contactEmail: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Contact email" />
              <input type="password" value={accountForm.password} onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Initial password" />
              <button disabled={saving === 'account' || !selectedLicenseId} className="flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60 md:col-span-3"><Plus className="h-4 w-4" /> Queue account creation</button>
            </div>
          </form>
          <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4"><h2 className="text-sm font-bold uppercase text-[#111827]">Managed Accounts</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead><tr className="border-b border-[#E5E7EB]">{['Account', 'Package', 'Limits', 'Status', 'Control'].map((heading) => <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {accounts.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No accounts yet.</td></tr>}
                  {accounts.map((account: any) => (
                    <tr key={account.id}>
                      <td className="px-5 py-4"><p className="text-[13px] font-bold text-[#111827]">{account.username}</p><p className="text-[12px] text-[#6B7280]">{account.domain}</p></td>
                      <td className="px-5 py-4 text-[12px] text-[#4B5563]">{controlPackages.find((pkg: any) => pkg.id === account.packageId)?.name || 'Custom'}</td>
                      <td className="px-5 py-4 text-[12px] text-[#4B5563]">{account.limits?.diskMB || '-'} MB / {account.limits?.domains || '-'} domains</td>
                      <td className="px-5 py-4"><StatusPill status={account.status} /></td>
                      <td className="px-5 py-4"><div className="flex flex-wrap gap-2">{['active', 'suspended', 'terminated'].map((status) => <button key={status} onClick={() => changeAccountStatus(account.id, status)} disabled={saving === account.id || account.status === status} className="rounded border border-[#DDE3EA] px-2.5 py-1.5 text-[11px] font-bold uppercase text-[#374151] hover:border-blue-400 disabled:opacity-40">{status}</button>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {currentSection === 'dns' && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={saveDnsZone} className="rounded border border-[#E5E7EB] bg-white p-5">
            <div className="mb-4 flex items-center gap-3"><Globe className="h-5 w-5 text-blue-600" /><div><h2 className="text-sm font-bold uppercase text-[#111827]">DNS Zone</h2><p className="text-[12px] text-[#6B7280]">Records JSON is synced by the server agent.</p></div></div>
            <div className="space-y-3">
              <input required value={dnsForm.domain} onChange={(event) => setDnsForm((current) => ({ ...current, domain: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="example.com" />
              <textarea value={dnsForm.records} onChange={(event) => setDnsForm((current) => ({ ...current, records: event.target.value }))} className="min-h-40 w-full rounded border border-[#DDE3EA] px-3 py-2 font-mono text-xs outline-none focus:border-blue-500" />
              <button disabled={saving === 'dns' || !selectedLicenseId} className="flex w-full items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60"><Database className="h-4 w-4" /> Save and sync DNS</button>
            </div>
          </form>
          <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4"><h2 className="text-sm font-bold uppercase text-[#111827]">DNS Zones</h2></div>
            <div className="divide-y divide-[#EEF2F7]">{dnsZones.length === 0 && <div className="p-8 text-center text-[13px] font-bold text-gray-400">No DNS zones.</div>}{dnsZones.map((zone: any) => <div key={zone.id} className="px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[13px] font-bold text-[#111827]">{zone.domain}</p><p className="text-[12px] text-[#6B7280]">{Array.isArray(zone.records) ? zone.records.length : 0} records / serial {zone.serial}</p></div><StatusPill status={zone.status} /></div></div>)}</div>
          </section>
        </section>
      )}

      {currentSection === 'services' && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <form onSubmit={saveService} className="rounded border border-[#E5E7EB] bg-white p-5">
            <div className="mb-4 flex items-center gap-3"><Settings className="h-5 w-5 text-blue-600" /><div><h2 className="text-sm font-bold uppercase text-[#111827]">Service Control</h2><p className="text-[12px] text-[#6B7280]">Restart/reload tasks are queued to the server agent.</p></div></div>
            <div className="grid grid-cols-1 gap-3">
              <input value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="nginx" />
              <input value={serviceForm.displayName} onChange={(event) => setServiceForm((current) => ({ ...current, displayName: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Nginx" />
              <input type="number" value={serviceForm.port} onChange={(event) => setServiceForm((current) => ({ ...current, port: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Port" />
              <select value={serviceForm.queueAction} onChange={(event) => setServiceForm((current) => ({ ...current, queueAction: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="restart_service">Restart service</option><option value="reload_service">Reload service</option></select>
              <button disabled={saving === 'service' || !selectedLicenseId} className="rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">Save service task</button>
            </div>
          </form>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {services.length === 0 && <div className="rounded border border-[#E5E7EB] bg-white p-8 text-center text-[13px] font-bold text-gray-400 md:col-span-2 xl:col-span-3">No service state reported yet.</div>}
            {services.map((service: any) => <div key={service.id} className="rounded border border-[#E5E7EB] bg-white p-4"><div className="flex items-center justify-between"><p className="text-[13px] font-bold text-[#111827]">{service.displayName}</p><StatusPill status={service.status} /></div><p className="mt-2 text-[12px] text-[#6B7280]">{service.name} {service.port ? `/ port ${service.port}` : ''}</p><p className="mt-2 text-[11px] text-[#9CA3AF]">Checked {dateLabel(service.lastCheckAt)}</p></div>)}
          </section>
        </section>
      )}

      {currentSection === 'security' && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <form onSubmit={saveSecurityRule} className="rounded border border-[#E5E7EB] bg-white p-5">
            <div className="mb-4 flex items-center gap-3"><Lock className="h-5 w-5 text-blue-600" /><div><h2 className="text-sm font-bold uppercase text-[#111827]">Security Rule</h2><p className="text-[12px] text-[#6B7280]">Firewall, malware, ModSecurity and brute-force rules.</p></div></div>
            <div className="grid grid-cols-1 gap-3">
              <select value={securityForm.kind} onChange={(event) => setSecurityForm((current) => ({ ...current, kind: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="firewall">Firewall</option><option value="modsecurity">ModSecurity</option><option value="fail2ban">Fail2ban</option><option value="malware">Malware scan</option></select>
              <input value={securityForm.name} onChange={(event) => setSecurityForm((current) => ({ ...current, name: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Rule name" />
              <select value={securityForm.action} onChange={(event) => setSecurityForm((current) => ({ ...current, action: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="deny">Deny</option><option value="allow">Allow</option><option value="scan">Scan</option><option value="challenge">Challenge</option></select>
              <input required value={securityForm.value} onChange={(event) => setSecurityForm((current) => ({ ...current, value: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="IP, CIDR, path, rule id" />
              <button disabled={saving === 'security' || !selectedLicenseId} className="rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">Apply rule</button>
            </div>
          </form>
          <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4"><h2 className="text-sm font-bold uppercase text-[#111827]">Security Rules</h2></div>
            <div className="divide-y divide-[#EEF2F7]">{securityRules.length === 0 && <div className="p-8 text-center text-[13px] font-bold text-gray-400">No rules yet.</div>}{securityRules.map((rule: any) => <div key={rule.id} className="px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[13px] font-bold text-[#111827]">{rule.name}</p><p className="text-[12px] text-[#6B7280]">{rule.kind} / {rule.action} / {rule.value}</p></div><StatusPill status={rule.status} /></div></div>)}</div>
          </section>
        </section>
      )}

      {currentSection === 'tasks' && (
        <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4"><h2 className="text-sm font-bold uppercase text-[#111827]">Remote Task Queue</h2><span className="text-[11px] font-bold uppercase text-[#6B7280]">{tasks.length} tasks</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-[#E5E7EB]">{['Action', 'Status', 'Priority', 'Payload', 'Queued', 'Completed'].map((heading) => <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#EEF2F7]">{tasks.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No remote tasks.</td></tr>}{tasks.map((task: any) => <tr key={task.id}><td className="px-5 py-4 text-[13px] font-bold text-[#111827]">{task.action}</td><td className="px-5 py-4"><StatusPill status={task.status} /></td><td className="px-5 py-4 text-[12px] text-[#4B5563]">{task.priority}</td><td className="max-w-[320px] truncate px-5 py-4 font-mono text-[11px] text-[#6B7280]">{JSON.stringify(task.payload || {})}</td><td className="px-5 py-4 text-[12px] text-[#6B7280]">{dateLabel(task.queuedAt)}</td><td className="px-5 py-4 text-[12px] text-[#6B7280]">{dateLabel(task.completedAt)}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {currentSection === 'installer' && (
        <section className="rounded border border-[#111827] bg-[#111827] p-5 text-white">
          <div className="mb-4 flex items-center gap-3"><Terminal className="h-5 w-5 text-emerald-300" /><div><h2 className="text-sm font-bold uppercase">Installer and License Guard</h2><p className="text-[12px] text-blue-100">One license is bound to one server IP and first successful fingerprint. Other IPs/fingerprints are rejected.</p></div></div>
          <div className="space-y-3">
            <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded border border-white/10 bg-white/5 p-3 text-[12px] text-emerald-200">{control?.license?.installCommand || 'Select an active license to view install command'}</code>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded border border-white/10 bg-white/5 p-3"><p className="text-[10px] font-bold uppercase text-blue-100">Allowlisted IP</p><p className="mt-2 text-sm font-bold">{control?.license?.serverIp || '-'}</p></div>
              <div className="rounded border border-white/10 bg-white/5 p-3"><p className="text-[10px] font-bold uppercase text-blue-100">Fingerprint</p><p className="mt-2 truncate text-sm font-bold">{control?.license?.serverFingerprint || 'Binds on first install'}</p></div>
              <div className="rounded border border-white/10 bg-white/5 p-3"><p className="text-[10px] font-bold uppercase text-blue-100">Required packages</p><p className="mt-2 text-sm font-bold">{control?.requiredPackages?.length || 0} packages</p></div>
            </div>
            <button onClick={queueUpdateTask} disabled={saving === 'run_update' || !selectedLicenseId} className="rounded bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60">Queue update now</button>
          </div>
        </section>
      )}

      {['overview', 'licenses', 'updates'].includes(currentSection) && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
            <h2 className="text-sm font-bold uppercase text-[#111827]">License Holders</h2>
            <span className="text-[11px] font-bold uppercase text-[#6B7280]">{licenses.length} loaded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  {['Client', 'Server', 'Package', 'Invoice', 'Heartbeat', 'Status', 'Control'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {licenses.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No tPanel licenses yet.</td></tr>}
                {licenses.map((license: any) => (
                  <tr key={license.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-[#111827]">{license.owner?.name || license.ownerId}</p>
                      <p className="text-[12px] text-[#6B7280]">{license.owner?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-[#111827]">{license.serverIp}</p>
                      <p className="text-[12px] text-[#6B7280]">{license.node?.hostname || license.label || 'No heartbeat yet'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-[#111827]">{license.package?.name}</p>
                      <p className="text-[12px] text-[#6B7280]">{license.package?.maxAccounts || 0} users / {license.package?.maxDomains || 0} domains</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-[#111827]">{license.invoice?.number || 'None'}</p>
                      <p className="text-[12px] text-[#6B7280]">{money(license.invoice?.amount || license.amount, license.currency)} due {dateLabel(license.invoice?.dueDate)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-[#111827]">{dateLabel(license.lastHeartbeatAt || license.node?.lastSeenAt)}</p>
                      <p className="text-[12px] text-[#6B7280]">Renew {dateLabel(license.currentPeriodEnd)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <StatusPill status={license.status} />
                        <StatusPill status={license.billingStatus} />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {['active', 'suspended', 'expired', 'revoked'].map((status) => (
                          <button key={status} onClick={() => updateStatus(license.id, status)} disabled={saving === license.id || license.status === status} className="rounded border border-[#DDE3EA] px-2.5 py-1.5 text-[11px] font-bold uppercase text-[#374151] hover:border-blue-400 disabled:opacity-40">
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <form onSubmit={publishUpdate} className="rounded border border-[#E5E7EB] bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <Rocket className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold uppercase text-[#111827]">Force Update</h2>
                <p className="text-[12px] text-[#6B7280]">Published releases appear in licensed tPanel admins.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <input required value={updateForm.version} onChange={(event) => setUpdateForm((current) => ({ ...current, version: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Version, e.g. 3.3.0" />
              <input required value={updateForm.title} onChange={(event) => setUpdateForm((current) => ({ ...current, title: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Release title" />
              <input value={updateForm.packageUrl} onChange={(event) => setUpdateForm((current) => ({ ...current, packageUrl: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Package URL or Git tag" />
              <input value={updateForm.checksum} onChange={(event) => setUpdateForm((current) => ({ ...current, checksum: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Checksum" />
              <textarea value={updateForm.releaseNotes} onChange={(event) => setUpdateForm((current) => ({ ...current, releaseNotes: event.target.value }))} className="min-h-24 rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Release notes" />
              <label className="flex items-center gap-2 text-[12px] font-bold text-[#374151]">
                <input type="checkbox" checked={updateForm.isForced} onChange={(event) => setUpdateForm((current) => ({ ...current, isForced: event.target.checked }))} />
                Force update notice
              </label>
              <button disabled={saving === 'update'} className="flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Rocket className="h-4 w-4" /> Publish update
              </button>
            </div>
          </form>

          <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              <h2 className="text-sm font-bold uppercase text-[#111827]">Recent Updates</h2>
            </div>
            <div className="divide-y divide-[#EEF2F7]">
              {updates.length === 0 && <div className="p-8 text-center text-[13px] font-bold text-gray-400">No update published.</div>}
              {updates.slice(0, 6).map((update: any) => (
                <div key={update.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-bold text-[#111827]">{update.version} - {update.title}</p>
                      <p className="text-[12px] text-[#6B7280]">{dateLabel(update.publishedAt)}</p>
                    </div>
                    <StatusPill status={update.isForced ? 'forced' : update.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      )}
    </div>
  );
}
