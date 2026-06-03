import React from 'react';
import { AlertCircle, CheckCircle2, CreditCard, FileText, RefreshCw, Save, Shield, X } from 'lucide-react';
import { fetchInvoicesWithApi, fetchPaymentGatewaysWithApi, testPaymentGatewayWithApi, upsertPaymentGatewayWithApi } from '../../lib/tiwloApi';
import { useCurrency } from '../../lib/useCurrency';

const gatewayColor = (key: string) => {
  const colors: Record<string, string> = {
    bkash: 'bg-[#d12053]',
    stripe: 'bg-indigo-600',
    sslcommerz: 'bg-blue-800',
    paypal: 'bg-blue-500',
    nagad: 'bg-orange-500',
    'manual-bank': 'bg-gray-900'
  };
  return colors[key] || 'bg-gray-900';
};

const credentialFields: Record<string, Array<{ key: string; label: string; type?: string }>> = {
  stripe: [
    { key: 'secretKey', label: 'Secret Key', type: 'password' },
    { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' }
  ],
  paypal: [
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' }
  ],
  bkash: [
    { key: 'appKey', label: 'App Key' },
    { key: 'appSecret', label: 'App Secret', type: 'password' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', type: 'password' }
  ]
};

export default function AdminPayments() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'admin' });
  const [gateways, setGateways] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testingKey, setTestingKey] = React.useState('');
  const [testResult, setTestResult] = React.useState<any | null>(null);
  const [error, setError] = React.useState('');
  const [editingGateway, setEditingGateway] = React.useState<any | null>(null);
  const [gatewayForm, setGatewayForm] = React.useState({
    name: '',
    provider: '',
    status: 'disabled',
    mode: 'test',
    settings: '{}',
    credentials: {} as Record<string, string>
  });

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const [gatewayItems, invoiceItems] = await Promise.all([
        fetchPaymentGatewaysWithApi(),
        fetchInvoicesWithApi()
      ]);
      setGateways(gatewayItems);
      setInvoices(invoiceItems);
    } catch (err) {
      setGateways([]);
      setInvoices([]);
      setError(err instanceof Error ? err.message : 'Unable to load payment data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadPayments();
  }, []);

  const openGateway = (gateway: any) => {
    setEditingGateway(gateway);
    setGatewayForm({
      name: gateway.name || '',
      provider: gateway.provider || '',
      status: gateway.status || 'disabled',
      mode: gateway.mode || 'test',
      settings: JSON.stringify(gateway.settings || {}, null, 2),
      credentials: {}
    });
  };

  const saveGateway = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingGateway) return;
    setSaving(true);
    setError('');
    try {
      const updated = await upsertPaymentGatewayWithApi({
        key: editingGateway.key,
        name: gatewayForm.name,
        provider: gatewayForm.provider,
        status: gatewayForm.status,
        mode: gatewayForm.mode,
        credentials: Object.fromEntries(Object.entries(gatewayForm.credentials).filter(([, value]) => String(value || '').trim())),
        settings: JSON.parse(gatewayForm.settings || '{}')
      });
      setGateways((current) => current.map((gateway) => gateway.id === updated.id ? updated : gateway));
      setTestResult(null);
      setEditingGateway(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save gateway. Check settings JSON.');
    } finally {
      setSaving(false);
    }
  };

  const testGateway = async (gateway: any) => {
    setTestingKey(gateway.key);
    setError('');
    setTestResult(null);
    try {
      const result = await testPaymentGatewayWithApi(gateway.key);
      setTestResult(result);
      setGateways((current) => current.map((item) => item.key === gateway.key ? { ...item, credentials: result.credentials } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to test gateway');
    } finally {
      setTestingKey('');
    }
  };

  const totalOpen = invoices
    .filter((invoice) => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  const totalPaid = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Payment & Billing Console</h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1">Payment gateways and invoices loaded from the API.</p>
        </div>
        <button onClick={loadPayments} className="bg-white border border-[#e5e8ed] text-[#4a4a4a] px-4 py-2 rounded font-bold text-[13px] hover:bg-[#f3f5f9] transition-all flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {testResult && (
        <div className={`flex items-start gap-3 rounded border px-4 py-3 text-[13px] font-bold ${
          testResult.ok ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-600'
        }`}>
          {testResult.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p>{testResult.provider} {testResult.mode}: {testResult.message}</p>
            {testResult.endpoint && <p className="mt-1 font-mono text-[11px] opacity-70">{testResult.endpoint}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Paid Revenue</p>
          <p className="text-2xl font-bold text-[#24ad5f] mt-2">{money(totalPaid, 'USD')}</p>
        </div>
        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Open Balance</p>
          <p className="text-2xl font-bold text-[#2e3d49] mt-2">{money(totalOpen, 'USD')}</p>
        </div>
        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Gateways</p>
          <p className="text-2xl font-bold text-[#2e3d49] mt-2">{gateways.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full bg-white border border-[#e5e8ed] rounded-lg p-12 text-center text-[13px] font-bold text-gray-400">Loading gateways from API...</div>
        ) : gateways.length === 0 ? (
          <div className="col-span-full bg-white border border-[#e5e8ed] rounded-lg p-12 text-center text-[13px] font-bold text-gray-400">No payment gateways found in the database.</div>
        ) : gateways.map((gw) => (
          <div key={gw.id} className="bg-white border border-[#e5e8ed] rounded-lg p-6 shadow-sm group hover:border-[#0069ff] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${gatewayColor(gw.key)} rounded-lg flex items-center justify-center text-white shadow-lg shadow-black/5`}>
                <CreditCard className="h-6 w-6" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                gw.status === 'enabled' || gw.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
              }`}>
                {gw.status}
              </span>
            </div>
            <p className="text-sm font-bold text-[#2e3d49]">{gw.name}</p>
            <p className="text-[12px] font-bold text-gray-400 mt-1 uppercase">{gw.provider} / {gw.mode}</p>
            {credentialFields[gw.provider] && (
              <div className="mt-3 rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className={`text-[11px] font-bold ${gw.credentials?.complete ? 'text-green-600' : 'text-amber-600'}`}>
                  {gw.credentials?.complete ? 'Credentials saved' : 'Credentials incomplete'}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(gw.credentials?.required || credentialFields[gw.provider].map((field) => field.key)).map((field: string) => (
                    <span key={field} className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                      gw.credentials?.fields?.[field]?.saved ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'
                    }`}>
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => openGateway(gw)} className="py-1.5 text-left text-[11px] font-bold text-[#0069ff] hover:underline">Configure API</button>
              {credentialFields[gw.provider] && (
                <button
                  onClick={() => testGateway(gw)}
                  disabled={testingKey === gw.key}
                  className="rounded border border-[#e5e8ed] px-2 py-1.5 text-[11px] font-bold text-[#4a4a4a] hover:bg-[#f3f5f9] disabled:opacity-60"
                >
                  {testingKey === gw.key ? 'Testing...' : 'Test API'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f3f5f9] bg-[#f8f9fa] flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Recent Invoices</h2>
            <FileText className="h-4 w-4 text-[#0069ff]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e5e8ed] bg-white">
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Number</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Scope</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Amount</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ed]">
                {invoices.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No invoices found in the database.</td></tr>
                ) : invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#f8f9fa]">
                    <td className="px-6 py-4 text-[13px] font-bold text-[#2e3d49]">{invoice.number}</td>
                    <td className="px-6 py-4 text-[13px] text-[#4a4a4a]">{invoice.scope}</td>
                    <td className="px-6 py-4 text-[13px] font-bold text-[#2e3d49]">{money(invoice.amount, invoice.currency || 'USD')}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${invoice.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{invoice.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
            <h3 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide mb-5">Gateway Health</h3>
            <div className="space-y-4">
              {gateways.length === 0 ? (
                <p className="text-[13px] font-bold text-gray-400">No configured gateway rows.</p>
              ) : gateways.map((gateway) => (
                <div key={gateway.id} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#4a4a4a]">{gateway.name}</span>
                  <CheckCircle2 className={`h-4 w-4 ${gateway.status === 'enabled' || gateway.status === 'active' ? 'text-[#24ad5f]' : 'text-gray-300'}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#031b4e] rounded-lg p-6 text-white text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Shield className="h-6 w-6 text-blue-300" />
            </div>
            <h4 className="font-bold text-[15px] mb-2">Payment Data Source</h4>
            <p className="text-[12px] text-blue-100/60 leading-relaxed">Gateway and invoice rows are read from GraphQL. No local payment fixtures are rendered.</p>
          </div>
        </div>
      </div>

      {editingGateway && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveGateway} className="w-full max-w-xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#2e3d49]">Configure Gateway</h2>
                <p className="text-xs font-medium text-gray-500">{editingGateway.key}</p>
              </div>
              <button type="button" onClick={() => setEditingGateway(null)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              {editingGateway.credentials && credentialFields[gatewayForm.provider] && (
                <div className="md:col-span-2 rounded border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-[12px] font-bold text-blue-800">
                    {editingGateway.credentials.complete ? 'Saved credentials are available for this gateway.' : 'Some required credentials are missing.'}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-blue-700">
                    Fields stay blank for security. Enter a value only when you want to add or replace it.
                  </p>
                </div>
              )}
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Name</span>
                <input required value={gatewayForm.name} onChange={(event) => setGatewayForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Provider</span>
                <input required value={gatewayForm.provider} onChange={(event) => setGatewayForm((current) => ({ ...current, provider: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                <select value={gatewayForm.status} onChange={(event) => setGatewayForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {['active', 'enabled', 'disabled', 'inactive'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Mode</span>
                <select value={gatewayForm.mode} onChange={(event) => setGatewayForm((current) => ({ ...current, mode: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {['test', 'live'].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
                {gatewayForm.provider === 'bkash' && (
                  <p className="text-[11px] font-medium text-amber-600">Sandbox bKash keys need test mode. Live bKash keys need live mode.</p>
                )}
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Settings JSON</span>
                <textarea rows={6} value={gatewayForm.settings} onChange={(event) => setGatewayForm((current) => ({ ...current, settings: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 font-mono text-xs focus:border-[#0069ff] focus:outline-none" />
              </label>
              {(credentialFields[gatewayForm.provider] || []).map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{field.label}</span>
                  <input
                    type={field.type || 'text'}
                    value={gatewayForm.credentials[field.key] || ''}
                    onChange={(event) => setGatewayForm((current) => ({
                      ...current,
                      credentials: { ...current.credentials, [field.key]: event.target.value }
                    }))}
                    placeholder={editingGateway.credentials?.fields?.[field.key]?.saved ? `Saved ${editingGateway.credentials.fields[field.key].preview || ''}` : 'Not saved yet'}
                    className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#f3f5f9] px-6 py-4">
              <button type="button" onClick={() => setEditingGateway(null)} className="rounded border border-[#e5e8ed] px-4 py-2 text-sm font-bold text-[#4a4a4a] hover:bg-gray-50">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
