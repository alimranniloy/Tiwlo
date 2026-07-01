import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  adminAdjustTiwloPayBalanceWithApi,
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

const timeLabel = (value?: string) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (['paid', 'succeeded', 'active', 'completed'].includes(normalized)) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (['pending', 'processing', 'unpaid'].includes(normalized)) return 'border-amber-100 bg-amber-50 text-amber-700';
  if (['expired', 'rejected', 'suspended', 'cancelled', 'inactive'].includes(normalized)) return 'border-red-100 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-600';
};

const terminalWithdrawalStatuses = new Set(['paid', 'completed', 'rejected', 'cancelled']);

const destinationLines = (destination: any = {}) => ([
  destination.accountName && `Account: ${destination.accountName}`,
  destination.accountNumber && `Number: ${destination.accountNumber}`,
  destination.bankName && `Bank: ${destination.bankName}`,
  destination.branchName && `Branch: ${destination.branchName}`,
  destination.routingNumber && `Routing: ${destination.routingNumber}`,
  destination.walletNumber && `Wallet: ${destination.walletNumber}`,
  destination.note && `Note: ${destination.note}`
].filter(Boolean));

export default function AdminTiwloPay() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'admin' });
  const [overview, setOverview] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [adjustForm, setAdjustForm] = React.useState({
    profileId: '',
    amount: '',
    currency: 'BDT',
    reason: ''
  });

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOverview(await fetchAdminTiwloPayOverviewWithApi());
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : 'Unable to load Tiwlo Pay control data');
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

  const adjustBalance = async (direction: 'credit' | 'debit') => {
    const amount = Math.abs(Number(adjustForm.amount || 0));
    if (!adjustForm.profileId || !Number.isFinite(amount) || amount <= 0) {
      setError('Choose a merchant and enter an adjustment amount');
      return;
    }
    setSavingId('balance-adjustment');
    setError('');
    setNotice('');
    try {
      await adminAdjustTiwloPayBalanceWithApi({
        profileId: adjustForm.profileId,
        amount: direction === 'credit' ? amount : -amount,
        currency: adjustForm.currency,
        reason: adjustForm.reason
      });
      setNotice(`Merchant balance ${direction === 'credit' ? 'increased' : 'decreased'}`);
      setAdjustForm((current) => ({ ...current, amount: '', reason: '' }));
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to adjust balance');
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
  const selectedProfile = profiles.find((profile: any) => profile.id === adjustForm.profileId) || profiles[0];
  const selectedTransactions = selectedProfile ? transactions.filter((transaction: any) => transaction.profileId === selectedProfile.id) : [];
  const selectedWithdrawals = selectedProfile ? withdrawals.filter((withdrawal: any) => withdrawal.profileId === selectedProfile.id) : [];
  const selectedNet = selectedTransactions
    .filter((transaction: any) => transaction.status === 'succeeded' || transaction.provider === 'tiwlo_team_adjustment' || transaction.metadata?.type === 'wallet_adjustment')
    .reduce((total: number, transaction: any) => total + Number(transaction.netAmount || 0), 0);
  const selectedReserved = selectedWithdrawals
    .filter((withdrawal: any) => ['pending', 'processing', 'paid', 'completed'].includes(withdrawal.status))
    .reduce((total: number, withdrawal: any) => total + Number(withdrawal.amount || 0), 0);
  const selectedAvailable = Math.max(0, selectedNet - selectedReserved);

  React.useEffect(() => {
    if (adjustForm.profileId || profiles.length === 0) return;
    setAdjustForm((current) => ({ ...current, profileId: profiles[0].id }));
  }, [adjustForm.profileId, profiles]);

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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
            <div>
              <h2 className="text-sm font-bold uppercase text-[#111827]">Withdrawal Requests</h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">Requests sent from Tiwlo Pay are reserved until Tiwlo Team cancels or marks payment successful.</p>
            </div>
            <span className="text-[11px] font-bold uppercase text-[#6B7280]">{withdrawals.length} requests</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  {['Request', 'Merchant', 'Destination', 'Amount', 'Hold', 'Timeline', 'Details', 'Control'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {withdrawals.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No withdrawal requests.</td></tr>}
                {withdrawals.map((withdrawal: any) => {
                  const closed = terminalWithdrawalStatuses.has(withdrawal.status);
                  const lines = destinationLines(withdrawal.destination);
                  const holdText = ['pending', 'processing'].includes(withdrawal.status)
                    ? 'Reserved from available balance'
                    : ['cancelled', 'rejected'].includes(withdrawal.status)
                      ? 'Returned to wallet'
                      : 'Paid out';
                  return (
                    <tr key={withdrawal.id} className="align-top hover:bg-[#F9FAFB]">
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-bold uppercase text-[#111827]">{withdrawal.method}</p>
                        <span className={`mt-2 inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(withdrawal.status)}`}>{withdrawal.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-bold text-[#111827]">{withdrawal.profile?.companyName || withdrawal.profile?.displayName || withdrawal.profileId}</p>
                        <p className="text-[12px] text-[#6B7280]">{withdrawal.owner?.name || withdrawal.ownerId}</p>
                        <p className="text-[12px] text-[#6B7280]">{withdrawal.owner?.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {(lines.length ? lines : ['No destination details']).map((line) => (
                            <p key={line} className="text-[12px] text-[#4B5563]">{line}</p>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-bold text-[#111827]">{money(withdrawal.amount, withdrawal.currency)}</td>
                      <td className="px-5 py-4">
                        <p className="text-[12px] font-bold text-[#111827]">{holdText}</p>
                        <p className="mt-1 text-[11px] text-[#6B7280]">Request ID: {withdrawal.id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[12px] text-[#4B5563]">Requested {timeLabel(withdrawal.requestedAt)}</p>
                        <p className="text-[12px] text-[#4B5563]">Processed {timeLabel(withdrawal.processedAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[12px] text-[#4B5563]">Source: {withdrawal.metadata?.source || 'manual_withdrawal'}</p>
                        <p className="text-[12px] text-[#4B5563]">Reviewed: {withdrawal.metadata?.reviewedAt ? timeLabel(withdrawal.metadata.reviewedAt) : 'Waiting'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <button onClick={() => updateWithdrawalStatus(withdrawal.id, 'completed')} disabled={savingId === withdrawal.id || closed} className="flex items-center justify-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold uppercase text-emerald-700 hover:border-emerald-400 disabled:opacity-40">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Payment successful
                          </button>
                          <button onClick={() => updateWithdrawalStatus(withdrawal.id, 'processing')} disabled={savingId === withdrawal.id || closed || withdrawal.status === 'processing'} className="rounded border border-[#DDE3EA] px-3 py-2 text-[11px] font-bold uppercase text-[#374151] hover:border-blue-400 disabled:opacity-40">
                            Processing
                          </button>
                          <button onClick={() => updateWithdrawalStatus(withdrawal.id, 'cancelled')} disabled={savingId === withdrawal.id || closed} className="rounded border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-bold uppercase text-red-700 hover:border-red-300 disabled:opacity-40">
                            Cancel request
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded border border-[#E5E7EB] bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase text-[#111827]">Balance Adjustment</h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">Tiwlo Team can increase or decrease merchant earnings.</p>
            </div>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <div className="space-y-3">
            <select value={adjustForm.profileId} onChange={(event) => setAdjustForm((current) => ({ ...current, profileId: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm font-bold outline-none focus:border-blue-500">
              {profiles.length === 0 && <option value="">No merchant</option>}
              {profiles.map((profile: any) => (
                <option key={profile.id} value={profile.id}>{profile.companyName || profile.displayName || profile.owner?.email}</option>
              ))}
            </select>
            <div className="grid grid-cols-[1fr_96px] gap-2">
              <input type="number" min="0.01" step="0.01" value={adjustForm.amount} onChange={(event) => setAdjustForm((current) => ({ ...current, amount: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Amount" />
              <input value={adjustForm.currency} onChange={(event) => setAdjustForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm font-bold uppercase outline-none focus:border-blue-500" />
            </div>
            <textarea value={adjustForm.reason} onChange={(event) => setAdjustForm((current) => ({ ...current, reason: event.target.value }))} className="min-h-[90px] w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Reason shown in Tiwlo Team audit" />
            <div className="rounded border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-bold uppercase text-blue-700">Selected merchant available</p>
              <p className="mt-1 text-lg font-bold text-blue-950">{money(selectedAvailable, adjustForm.currency || currency)}</p>
              <p className="mt-1 text-[12px] text-blue-800">{selectedProfile?.owner?.email || selectedProfile?.supportEmail || 'No merchant selected'}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => adjustBalance('credit')} disabled={savingId === 'balance-adjustment' || !profiles.length} className="flex items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add earning
              </button>
              <button type="button" onClick={() => adjustBalance('debit')} disabled={savingId === 'balance-adjustment' || !profiles.length} className="flex items-center justify-center gap-2 rounded bg-[#111827] px-3 py-2 text-[12px] font-bold text-white hover:bg-black disabled:opacity-50">
                <Minus className="h-4 w-4" /> Minus earning
              </button>
            </div>
          </div>
        </section>
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

    </div>
  );
}
