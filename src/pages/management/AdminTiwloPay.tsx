import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  adminUpdateTiwloPayProfileStatusWithApi,
  adminUpdateTiwloPayWithdrawalStatusWithApi,
  fetchAdminTiwloPayOverviewWithApi
} from '../../lib/tiwloApi';
import { useCurrency } from '../../lib/useCurrency';

const dateLabel = (value?: string) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (['paid', 'succeeded', 'active', 'completed'].includes(normalized)) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (['pending', 'processing', 'unpaid'].includes(normalized)) return 'border-amber-100 bg-amber-50 text-amber-700';
  if (['expired', 'rejected', 'suspended', 'cancelled', 'inactive'].includes(normalized)) return 'border-red-100 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-600';
};

export default function AdminTiwloPay() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'admin' });
  const [overview, setOverview] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOverview(await fetchAdminTiwloPayOverviewWithApi());
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : 'Unable to load Tiwlo Pay admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const updateProfileStatus = async (id: string, status: string) => {
    setSavingId(id);
    setError('');
    setNotice('');
    try {
      await adminUpdateTiwloPayProfileStatusWithApi(id, status);
      setNotice(`Merchant ${status}`);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update merchant');
    } finally {
      setSavingId('');
    }
  };

  const updateWithdrawalStatus = async (id: string, status: string) => {
    setSavingId(id);
    setError('');
    setNotice('');
    try {
      await adminUpdateTiwloPayWithdrawalStatusWithApi(id, status);
      setNotice(`Withdrawal ${status}`);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update withdrawal');
    } finally {
      setSavingId('');
    }
  };

  const summary = overview?.summary || {};
  const profiles = overview?.profiles || [];
  const links = overview?.paymentLinks || [];
  const transactions = overview?.transactions || [];
  const withdrawals = overview?.withdrawals || [];
  const gateways = overview?.gateways || [];
  const currency = transactions[0]?.currency || links[0]?.currency || 'USD';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Tiwlo Pay Control</h1>
            <p className="text-[13px] text-[#6B7280]">Merchant gateways, invoices, payments, and withdrawals.</p>
          </div>
        </div>
        <button onClick={loadOverview} className="flex items-center justify-center gap-2 rounded border border-[#DDE3EA] bg-white px-4 py-2 text-[13px] font-bold text-[#374151] hover:border-blue-400">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Merchants', value: summary.merchants || 0, icon: Users },
          { label: 'Paid Volume', value: money(summary.paidVolume, currency), icon: Activity },
          { label: 'Platform Fees', value: money(summary.fees, currency), icon: CreditCard },
          { label: 'Pending Withdraw', value: money(summary.pendingWithdrawal, currency), icon: Landmark },
          { label: 'Open Links', value: summary.unpaidInvoices || 0, icon: ShieldCheck }
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded border border-[#E5E7EB] bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-[#111827]">Platform Volume</h2>
            <span className="text-[11px] font-bold uppercase text-[#6B7280]">{transactions.length} tx</span>
          </div>
          <div className="h-[300px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[13px] font-bold text-gray-400">Loading chart</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.chartData || []} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF2F7" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ border: '1px solid #E5E7EB', borderRadius: 6, boxShadow: 'none', fontSize: 12 }} />
                  <Bar dataKey="volume" fill="#2563EB" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="fees" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded border border-[#E5E7EB] bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-[#111827]">Enabled Gateways</h2>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div className="space-y-3">
            {gateways.length === 0 && <p className="py-10 text-center text-[13px] font-bold text-gray-400">No gateways enabled.</p>}
            {gateways.map((gateway: any) => (
              <div key={gateway.id} className="rounded border border-[#EEF2F7] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#111827]">{gateway.name}</p>
                    <p className="text-[11px] uppercase text-[#6B7280]">{gateway.provider} / {gateway.mode}</p>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(gateway.status)}`}>{gateway.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#111827]">Merchants</h2>
          <span className="text-[11px] font-bold uppercase text-[#6B7280]">{profiles.length} loaded</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Merchant', 'Owner', 'ID Review', 'Status', 'API Key', 'Created', 'Control'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {profiles.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No Tiwlo Pay merchants yet.</td></tr>}
              {profiles.map((profile: any) => {
                const verification = profile.settings?.verification || {};
                return (
                  <tr key={profile.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-[#111827]">{profile.companyName || profile.displayName}</p>
                      <p className="text-[12px] text-[#6B7280]">{profile.supportEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-[#111827]">{profile.owner?.name || profile.ownerId}</p>
                      <p className="text-[12px] text-[#6B7280]">{profile.owner?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(verification.status || 'not_submitted')}`}>{verification.status || 'not_submitted'}</span>
                      <p className="mt-2 text-[12px] font-bold text-[#111827]">{verification.legalName || verification.businessName || 'No legal name'}</p>
                      <p className="text-[11px] text-[#6B7280]">{verification.documentType || 'No document'} {verification.country ? `/${verification.country}` : ''}</p>
                    </td>
                    <td className="px-5 py-4"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(profile.status)}`}>{profile.status}</span></td>
                    <td className="px-5 py-4"><code className="text-[12px] font-bold text-[#374151]">{profile.apiKey}</code></td>
                    <td className="px-5 py-4 text-[12px] text-[#6B7280]">{dateLabel(profile.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {['active', 'suspended', 'inactive'].map((status) => (
                          <button key={status} onClick={() => updateProfileStatus(profile.id, status)} disabled={savingId === profile.id || profile.status === status} className="rounded border border-[#DDE3EA] px-2.5 py-1.5 text-[11px] font-bold uppercase text-[#374151] hover:border-blue-400 disabled:opacity-40">
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
            <h2 className="text-sm font-bold uppercase text-[#111827]">Payment Links</h2>
            <span className="text-[11px] font-bold uppercase text-[#6B7280]">{links.length} links</span>
          </div>
          <div className="divide-y divide-[#EEF2F7]">
            {links.length === 0 && <div className="p-8 text-center text-[13px] font-bold text-gray-400">No links found.</div>}
            {links.slice(0, 10).map((link: any) => (
              <div key={link.id} className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="text-[13px] font-bold text-[#111827]">{link.invoiceId}</p>
                  <p className="text-[12px] text-[#6B7280]">{link.customerName || link.customerEmail || link.slug}</p>
                </div>
                <span className={`w-fit rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(link.status)}`}>{link.status}</span>
                <p className="text-[13px] font-bold text-[#111827]">{money(link.amount, link.currency)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
            <h2 className="text-sm font-bold uppercase text-[#111827]">Transactions</h2>
            <span className="text-[11px] font-bold uppercase text-[#6B7280]">{transactions.length} rows</span>
          </div>
          <div className="divide-y divide-[#EEF2F7]">
            {transactions.length === 0 && <div className="p-8 text-center text-[13px] font-bold text-gray-400">No payments found.</div>}
            {transactions.slice(0, 10).map((transaction: any) => (
              <div key={transaction.id} className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="text-[13px] font-bold text-[#111827]">{transaction.reference}</p>
                  <p className="text-[12px] text-[#6B7280]">{transaction.customerName || transaction.customerEmail || transaction.provider}</p>
                </div>
                <span className={`w-fit rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(transaction.status)}`}>{transaction.provider}</span>
                <p className="text-[13px] font-bold text-[#111827]">{money(transaction.amount, transaction.currency)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#111827]">Withdrawals</h2>
          <span className="text-[11px] font-bold uppercase text-[#6B7280]">{withdrawals.length} requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Method', 'Destination', 'Amount', 'Status', 'Requested', 'Control'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {withdrawals.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No withdrawal requests.</td></tr>}
              {withdrawals.map((withdrawal: any) => (
                <tr key={withdrawal.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-5 py-4 text-[13px] font-bold uppercase text-[#111827]">{withdrawal.method}</td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-[#111827]">{withdrawal.destination?.accountName || withdrawal.destination?.bankName || withdrawal.destination?.walletNumber || 'Manual'}</p>
                    <p className="text-[12px] text-[#6B7280]">{withdrawal.destination?.accountNumber || withdrawal.destination?.walletNumber || withdrawal.destination?.note}</p>
                  </td>
                  <td className="px-5 py-4 text-[13px] font-bold text-[#111827]">{money(withdrawal.amount, withdrawal.currency)}</td>
                  <td className="px-5 py-4"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(withdrawal.status)}`}>{withdrawal.status}</span></td>
                  <td className="px-5 py-4 text-[12px] text-[#6B7280]">{dateLabel(withdrawal.requestedAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {['processing', 'paid', 'rejected'].map((status) => (
                        <button key={status} onClick={() => updateWithdrawalStatus(withdrawal.id, status)} disabled={savingId === withdrawal.id || withdrawal.status === status} className="rounded border border-[#DDE3EA] px-2.5 py-1.5 text-[11px] font-bold uppercase text-[#374151] hover:border-blue-400 disabled:opacity-40">
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
    </div>
  );
}
