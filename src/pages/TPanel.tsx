import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Wallet,
  Zap
} from 'lucide-react';
import {
  createTPanelLicenseOrderWithApi,
  deleteTPanelLicenseWithApi,
  fetchMyTPanelLicensesWithApi,
  fetchTPanelPackagesWithApi,
  payTPanelLicenseOrderWithApi,
  renewTPanelLicenseOrderWithApi,
  updateTPanelLicenseWithApi
} from '../lib/tiwloApi';
import { useActionConfirmation } from '../components/ActionConfirmation';

const money = (value: number, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`;
const limitLabel = (value: number) => Number(value || 0) <= 0 ? 'Unlimited' : Number(value || 0).toLocaleString();

const dateLabel = (value?: string) => {
  if (!value) return 'Not active';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'paid', 'online'].includes(normalized)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['pending_payment', 'open', 'pending'].includes(normalized)) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (['suspended', 'expired', 'cancelled', 'revoked'].includes(normalized)) return 'border-red-200 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-700';
};

function StatusPill({ status }: { status: string }) {
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(status)}`}>{status}</span>;
}

const canRenewLicense = (license: any) => {
  const status = String(license?.status || '').toLowerCase();
  if (['expired', 'cancelled'].includes(status)) return true;
  if (status !== 'active') return false;
  if (!license.currentPeriodEnd) return false;
  const renewAt = new Date(license.currentPeriodEnd);
  return !Number.isNaN(renewAt.getTime()) && renewAt.getTime() <= Date.now();
};

export default function TPanel() {
  const { confirmAction, confirmDelete, confirmEdit } = useActionConfirmation();
  const [packages, setPackages] = React.useState<any[]>([]);
  const [licenses, setLicenses] = React.useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = React.useState('');
  const [serverIp, setServerIp] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [months, setMonths] = React.useState('1');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [editingLicense, setEditingLicense] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState({ label: '', serverIp: '' });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pkgRows, licenseRows] = await Promise.all([
        fetchTPanelPackagesWithApi(),
        fetchMyTPanelLicensesWithApi()
      ]);
      setPackages(pkgRows);
      setLicenses(licenseRows);
      setSelectedPackage((current) => current || pkgRows[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tPanel licenses');
      setPackages([]);
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const createOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedPlan = packages.find((pkg) => pkg.id === selectedPackage);
    const total = Number(selectedPlan?.price || 0) * Number(months || 1);
    const confirmed = await confirmAction({
      intent: 'default',
      title: 'Create license?',
      message: `Are you sure? ${money(total, selectedPlan?.currency || 'USD')} will be charged from your Tiwlo credit balance. Add credit first if the balance is low.`,
      resourceName: selectedPlan?.name || 'tPanel license',
      confirmLabel: 'Create and pay'
    });
    if (!confirmed) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const license = await createTPanelLicenseOrderWithApi({
        packageId: selectedPackage,
        serverIp,
        label,
        months: Number(months || 1)
      });
      const result = await payTPanelLicenseOrderWithApi(license.id, 'credit');
      if (result.checkout?.status !== 'paid') {
        setNotice(result.checkout?.message || 'License order created. Add credit, then pay with credit.');
      } else {
        setNotice('tPanel license created and paid from credit.');
      }
      setServerIp('');
      setLabel('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create tPanel license');
    } finally {
      setSaving(false);
    }
  };

  const payLicense = async (licenseId: string) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await payTPanelLicenseOrderWithApi(licenseId, 'credit');
      setNotice(result.checkout?.message || 'Payment handled');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to pay tPanel invoice');
    } finally {
      setSaving(false);
    }
  };

  const renewLicense = async (licenseId: string) => {
    const confirmed = await confirmAction({
      intent: 'default',
      title: 'Renew license?',
      message: 'This renewal will be paid immediately from your Tiwlo credit balance.',
      confirmLabel: 'Renew from credit'
    });
    if (!confirmed) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await renewTPanelLicenseOrderWithApi({ licenseId, months: 1 });
      setNotice('License renewed from credit.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create renewal invoice');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value: string, labelText: string) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setNotice(`${labelText} copied`);
  };

  const openEditLicense = async (license: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit license?',
      message: 'Are you sure you want to edit this license? Changing the server IP resets the fingerprint binding so the new server can verify.',
      resourceName: license.label || license.serverIp
    });
    if (!confirmed) return;
    setEditingLicense(license);
    setEditForm({ label: license.label || '', serverIp: license.serverIp || '' });
  };

  const saveLicenseEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingLicense) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateTPanelLicenseWithApi({
        id: editingLicense.id,
        label: editForm.label,
        serverIp: editForm.serverIp
      });
      setEditingLicense(null);
      setNotice('License updated.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update license');
    } finally {
      setSaving(false);
    }
  };

  const deleteLicense = async (license: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete license?',
      message: 'This removes the license and its tPanel control records. The old server will stop verifying.',
      resourceName: license.label || license.serverIp,
      confirmLabel: 'Delete license'
    });
    if (!confirmed) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await deleteTPanelLicenseWithApi(license.id);
      setNotice('License deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete license');
    } finally {
      setSaving(false);
    }
  };

  const selected = packages.find((pkg) => pkg.id === selectedPackage);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">tPanel</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#4B5563]">Buy a monthly tPanel Pro license, allowlist one server IP, then install the panel with a signed command from Tiwlo.</p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded border border-[#DDE3EA] bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold uppercase text-[#111827]">Create License</h2>
              <p className="text-[12px] text-[#6B7280]">Choose a package and bind it to the server IP that will run tPanel.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {packages.map((pkg) => (
              <button
                type="button"
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`rounded border p-4 text-left transition-all ${selectedPackage === pkg.id ? 'border-blue-500 bg-blue-50' : 'border-[#E5E7EB] bg-white hover:border-blue-300'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#111827]">{pkg.name}</p>
                    <p className="mt-1 text-[12px] text-[#6B7280]">{pkg.description}</p>
                  </div>
                  <StatusPill status={pkg.status} />
                </div>
                <p className="mt-4 text-xl font-bold text-[#111827]">{money(pkg.price, pkg.currency)}<span className="text-[11px] font-medium text-[#6B7280]">/{pkg.interval}</span></p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold text-[#4B5563]">
                  <span>{limitLabel(pkg.maxAccounts)} accounts</span>
                  <span>{limitLabel(pkg.maxDomains)} domains</span>
                  <span>{limitLabel(pkg.maxDatabases)} DBs</span>
                  <span>{limitLabel(pkg.maxNodeApps)} Node apps</span>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={createOrder} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_110px]">
            <input required value={serverIp} onChange={(event) => setServerIp(event.target.value)} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Server IP allowlist, e.g. 203.0.113.10" />
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Server label" />
            <input type="number" min="1" max="24" value={months} onChange={(event) => setMonths(event.target.value)} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Months" />
            <button disabled={saving || !selectedPackage} className="flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60 md:col-span-3">
              <CreditCard className="h-4 w-4" /> Create license with credit {selected ? `- ${money(Number(selected.price || 0) * Number(months || 1), selected.currency)}` : ''}
            </button>
            <Link to="/billing" className="flex items-center justify-center gap-2 rounded border border-[#DDE3EA] px-4 py-3 text-sm font-bold text-[#374151] hover:border-blue-400 md:col-span-3">
              <Wallet className="h-4 w-4" /> Add credit
            </Link>
          </form>
        </section>

        <section className="rounded border border-[#111827] bg-[#111827] p-5 text-white">
          <div className="mb-4 flex items-center gap-3">
            <Terminal className="h-5 w-5 text-emerald-300" />
            <div>
              <h2 className="text-sm font-bold uppercase">Install Command</h2>
              <p className="text-[12px] text-blue-100">Active licenses show a server-ready command below.</p>
            </div>
          </div>
          <div className="space-y-3">
            {licenses.filter((license) => license.status === 'active').slice(0, 2).map((license) => (
              <div key={license.id} className="rounded border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-bold">{license.label || license.serverIp}</p>
                  <button onClick={() => copy(license.installCommand, 'Install command')} className="rounded border border-white/15 p-2 text-white hover:bg-white/10">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-emerald-200">{license.installCommand}</code>
              </div>
            ))}
            {licenses.filter((license) => license.status === 'active').length === 0 && (
              <div className="rounded border border-white/10 bg-white/5 p-4 text-[13px] text-blue-100">No active tPanel license yet. Create an order and pay the invoice to unlock the installer.</div>
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded border border-[#DDE3EA] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#111827]">My tPanel Licenses</h2>
          <span className="text-[11px] font-bold uppercase text-[#6B7280]">{licenses.length} licenses</span>
        </div>
        <div className="divide-y divide-[#EEF2F7]">
          {licenses.length === 0 && (
            <div className="p-10 text-center text-[13px] font-bold text-gray-400">No tPanel license created yet.</div>
          )}
          {licenses.map((license) => (
            <div key={license.id} className="grid grid-cols-1 gap-4 px-5 py-5 xl:grid-cols-[1fr_auto] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-bold text-[#111827]">{license.label || license.serverIp}</p>
                  <StatusPill status={license.status} />
                  <StatusPill status={license.billingStatus} />
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] text-[#6B7280] md:grid-cols-4">
                  <span><b className="text-[#374151]">Package:</b> {license.package?.name || license.packageCode}</span>
                  <span><b className="text-[#374151]">Server IP:</b> {license.serverIp}</span>
                  <span><b className="text-[#374151]">Renew:</b> {dateLabel(license.currentPeriodEnd)}</span>
                  <span><b className="text-[#374151]">Invoice:</b> {license.invoice?.number || 'None'}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <KeyRound className="h-4 w-4 shrink-0 text-blue-600" />
                  <code className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#111827]">{license.licenseKey}</code>
                  <button onClick={() => copy(license.licenseKey, 'License key')} className="rounded border border-[#DDE3EA] bg-white p-2 text-[#374151] hover:border-blue-400">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {license.status === 'pending_payment' && (
                  <button disabled={saving} onClick={() => payLicense(license.id)} className="flex items-center gap-2 rounded border border-[#DDE3EA] px-3 py-2 text-[12px] font-bold uppercase text-[#374151] hover:border-blue-400 disabled:opacity-50">
                    <Zap className="h-4 w-4" /> Pay credit
                  </button>
                )}
                {canRenewLicense(license) && (
                  <button disabled={saving} onClick={() => renewLicense(license.id)} className="flex items-center gap-2 rounded bg-[#111827] px-3 py-2 text-[12px] font-bold text-white hover:bg-black disabled:opacity-50">
                    <ShieldCheck className="h-4 w-4" /> Renew
                  </button>
                )}
                {!canRenewLicense(license) && license.status === 'active' && (
                  <span className="rounded border border-[#E5E7EB] px-3 py-2 text-[12px] font-bold text-[#6B7280]">Renew opens {dateLabel(license.currentPeriodEnd)}</span>
                )}
                <button disabled={saving} onClick={() => openEditLicense(license)} className="rounded border border-[#DDE3EA] px-3 py-2 text-[12px] font-bold text-[#374151] hover:border-blue-400 disabled:opacity-50">
                  Edit
                </button>
                <button disabled={saving} onClick={() => deleteLicense(license)} className="rounded border border-red-100 px-3 py-2 text-[12px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editingLicense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveLicenseEdit} className="w-full max-w-md rounded border border-[#E5E7EB] bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#111827]">Edit tPanel License</h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">Server IP changes reset the fingerprint binding for the next install.</p>
            </div>
            <div className="space-y-3">
              <input value={editForm.label} onChange={(event) => setEditForm((current) => ({ ...current, label: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Server label" />
              <input required value={editForm.serverIp} onChange={(event) => setEditForm((current) => ({ ...current, serverIp: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Server IP" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingLicense(null)} className="rounded border border-[#DDE3EA] px-4 py-2 text-sm font-bold text-[#374151] hover:bg-gray-50">Cancel</button>
              <button disabled={saving} className="rounded bg-[#0069ff] px-4 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
