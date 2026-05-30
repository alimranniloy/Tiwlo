import React from 'react';
import { AlertCircle, CheckCircle2, History, Plus, Shield } from 'lucide-react';
import {
  fetchBillingOverviewWithApi,
  notifyDataRefresh,
  settleUsageBillingWithApi,
  startCreditTopUpWithApi
} from '../lib/tiwloApi';

function money(value: number, currency = 'USD') {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function dateLabel(value?: string) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BillingPage() {
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [overview, setOverview] = React.useState<any | null>(null);
  const [topUpAmount, setTopUpAmount] = React.useState('10');
  const [topUpCurrency, setTopUpCurrency] = React.useState('USD');
  const [topUpProvider, setTopUpProvider] = React.useState('bkash');
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadBilling = React.useCallback(() => {
    setLoading(true);
    setError('');
    settleUsageBillingWithApi()
      .catch(() => fetchBillingOverviewWithApi())
      .then((nextOverview) => {
        setOverview(nextOverview);
        setInvoices(nextOverview?.invoices || []);
        notifyDataRefresh();
      })
      .catch((err) => {
        setOverview(null);
        setInvoices([]);
        setError(err instanceof Error ? err.message : 'Unable to load billing data');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const addCredit = async () => {
    setProcessing(true);
    setError('');
    try {
      const checkout = await startCreditTopUpWithApi(Number(topUpAmount || 0), topUpCurrency, topUpProvider);
      if (checkout.paymentUrl) {
        window.location.href = checkout.paymentUrl;
        return;
      }
      await loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start credit top-up');
    } finally {
      setProcessing(false);
    }
  };

  const outstanding = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const paid = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const usageLines = overview?.usageLines || [];
  const creditBalance = Number(overview?.credits || 0);
  const dueNow = Math.max(outstanding, Number(overview?.dueAmount || 0));
  const creditHealth = Math.min(100, Math.max(0, Math.round((creditBalance / Math.max(creditBalance + dueNow, 1)) * 100)));
  const billingTiles = [
    { label: 'Current balance', value: money(creditBalance), tone: creditBalance <= 0 ? 'text-[#a4262c]' : 'text-[#107c10]' },
    { label: 'Outstanding', value: money(outstanding), tone: outstanding > 0 ? 'text-[#a4262c]' : 'text-[#107c10]' },
    { label: 'Hourly usage', value: money(overview?.hourlySpend || 0), tone: 'text-[#0078d4]' },
    { label: 'Invoices', value: invoices.length, tone: 'text-[#323130]' }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-[#edebe9] pb-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#0078d4]">Account billing</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1f1f1f]">Billing overview</h1>
        <p className="mt-1 text-sm text-[#605e5c]">Manage credits, active usage, and invoices for your Tiwlo services.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-[#edebe9] bg-white p-2">
        {['Overview', 'Add credit', 'Usage', 'Invoices'].map((item, index) => (
          <a
            key={item}
            href={index === 1 ? '#add-credit' : index === 2 ? '#usage' : index === 3 ? '#invoices' : '#overview'}
            className={`border px-3 py-2 text-[12px] font-bold ${
              index === 0 ? 'border-[#0078d4] bg-[#eff6fc] text-[#0078d4]' : 'border-transparent text-[#323130] hover:border-[#c8c6c4] hover:bg-[#f3f2f1]'
            }`}
          >
            {item}
          </a>
        ))}
      </div>

      {error && <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}

      {overview && Number(overview.credits || 0) <= 0 && !loading && (
        <div className="flex flex-col gap-3 rounded border border-red-100 bg-red-50 px-4 py-3 text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-[13px] font-bold leading-5">
              Add credit now. Orders are blocked and servers stay off while the balance is 0.
            </p>
          </div>
          <a href="#add-credit" className="inline-flex shrink-0 items-center justify-center rounded bg-red-600 px-4 py-2 text-[12px] font-black text-white hover:bg-red-700">
            Add Credit
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {billingTiles.map((tile) => (
          <div key={tile.label} className="border border-[#edebe9] bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#605e5c]">{tile.label}</p>
            <p className={`mt-2 text-2xl font-black ${tile.tone}`}>{loading ? '...' : tile.value}</p>
          </div>
        ))}
      </div>

      <section id="overview" className="grid grid-cols-1 gap-4 border border-[#c7e0f4] bg-[#f3f9fd] p-4 lg:grid-cols-[260px_1fr]">
        <div className="flex items-center gap-4 border border-[#deecf9] bg-white p-4">
          <div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(#0078d4 ${creditHealth}%, #e1dfdd ${creditHealth}% 100%)` }}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center">
              <span className="text-lg font-black text-[#1f1f1f]">{creditHealth}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#605e5c]">Credit status</p>
            <p className="mt-1 text-sm font-bold text-[#323130]">{creditBalance <= 0 ? 'Credit required' : 'Account funded'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            ['Accrued usage', money(overview?.accruedUsage || 0)],
            ['Paid invoices', money(paid)],
            ['Invoice count', invoices.length]
          ].map(([label, value]) => (
            <div key={label} className="border border-[#deecf9] bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#605e5c]">{label}</p>
              <p className="mt-2 text-xl font-black text-[#1f1f1f]">{loading ? '...' : value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          <section id="add-credit" className="grid grid-cols-1 gap-6 rounded-sm border border-[#E5E7EB] bg-white p-5 lg:grid-cols-[1fr_1.1fr] md:p-6">
            <div className="border-b border-[#edebe9] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#605e5c]">Balance due</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-[#1f1f1f]">{loading ? '...' : money(outstanding)}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="border border-[#edebe9] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">Available credit</p>
                  <p className="mt-1 text-base font-black text-[#107c10]">{loading ? '...' : money(creditBalance)}</p>
                </div>
                <div className="border border-[#edebe9] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">Paid invoices</p>
                  <p className="mt-1 text-base font-black text-[#323130]">{loading ? '...' : money(paid)}</p>
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-5 text-[#605e5c]">
                Credit is used for cloud, hosting, ecommerce, ISP, and hourly resource billing.
              </p>
            </div>

            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#111827]">Add Credit</h2>
                  <p className="mt-1 text-xs text-[#6B7280]">Choose currency, amount, and checkout provider.</p>
                </div>
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { key: 'USD', title: 'USD Credit', detail: 'Add exact cloud credit balance' },
                  { key: 'BDT', title: 'BDT Payment', detail: 'Pay local amount, convert to credit' }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTopUpCurrency(option.key)}
                    className={`rounded-sm border px-4 py-3 text-left transition-colors ${
                      topUpCurrency === option.key
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-[#111827] hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm font-black">{option.title}</span>
                    <span className="mt-1 block text-[12px] font-medium text-[#6B7280]">{option.detail}</span>
                  </button>
                ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                type="number"
                min="1"
                step="0.01"
                className="rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0078d4]"
                placeholder={topUpCurrency === 'BDT' ? 'Amount in BDT' : 'Amount in USD'}
              />
              <select
                value={topUpProvider}
                onChange={(event) => setTopUpProvider(event.target.value)}
                className="rounded-sm border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#0078d4]"
              >
                <option value="bkash">bKash</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
              <button onClick={addCredit} disabled={processing} className="rounded-sm bg-[#0078d4] px-5 py-2 text-sm font-bold text-white hover:bg-[#106ebe] disabled:opacity-60">
                {processing ? 'Starting...' : 'Top Up'}
              </button>
              </div>
            </div>
          </section>

          <section id="usage" className="overflow-hidden rounded-sm border border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#111827]">
                <History className="h-4 w-4" /> Active Hourly Billing
              </h2>
              <span className="text-xs font-bold text-[#111827]">{money(overview?.accruedUsage || 0)}</span>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {loading && <div className="p-8 text-center text-sm font-bold text-gray-400">Calculating active services...</div>}
              {!loading && usageLines.length === 0 && <div className="p-8 text-center text-sm font-bold text-gray-400">No active hourly usage is due right now.</div>}
              {!loading && usageLines.map((line: any) => (
                <div key={line.resourceId} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">{line.name}</p>
                    <p className="text-[12px] text-[#6B7280]">Monthly cap {money(line.monthlyCost)} / hourly {money(line.hourlyRate)}</p>
                  </div>
                  <span className="text-[12px] font-bold text-[#6B7280]">{Number(line.hours || 0).toFixed(2)} hrs</span>
                  <span className="text-[12px] font-bold text-[#6B7280]">Resource {line.resourceId}</span>
                  <span className="text-right text-[14px] font-bold text-[#111827]">{money(line.amount)}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="invoices" className="overflow-hidden rounded-sm border border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#111827]">
                <History className="h-4 w-4" /> Recent Invoices
              </h2>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {loading && <div className="p-8 text-center text-sm font-bold text-gray-400">Loading invoices...</div>}
              {!loading && invoices.length === 0 && <div className="p-8 text-center text-sm font-bold text-gray-400">No invoices found.</div>}
              {!loading && invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-5 transition-colors hover:bg-gray-50">
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">{invoice.number}</p>
                    <p className="text-[12px] text-[#6B7280]">{dateLabel(invoice.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[14px] font-bold text-[#111827]">{money(invoice.amount, invoice.currency)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${invoice.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-sm border border-[#004578] bg-[#002050] p-8 text-white">
            <Shield className="absolute -bottom-10 -right-10 h-48 w-48 text-white opacity-5" />
            <h3 className="mb-2 text-xl font-bold">Automated Billing</h3>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">Monthly caps and hourly usage are tracked against your credit balance.</p>
            <div className="flex items-center gap-2 text-[13px] font-bold text-blue-400">
              API Connected <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          {(outstanding > 0 || Number(overview?.dueAmount || 0) > 0) && (
            <div className="rounded-sm border border-orange-100 bg-orange-50 p-6">
              <div className="mb-2 flex items-center gap-3 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <h4 className="text-sm font-bold">Payment Pending</h4>
              </div>
              <p className="text-xs leading-relaxed text-orange-700">You have unpaid invoices or usage due totaling {money(Math.max(outstanding, Number(overview?.dueAmount || 0)))}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
