import React from 'react';
import { AlertCircle, CheckCircle2, CreditCard, History, Plus, Shield } from 'lucide-react';
import {
  fetchBillingOverviewWithApi,
  fetchAvailablePaymentGatewaysWithApi,
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
  const [gateways, setGateways] = React.useState<any[]>([]);
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
    Promise.all([
      settleUsageBillingWithApi().catch(() => fetchBillingOverviewWithApi()),
      fetchAvailablePaymentGatewaysWithApi()
    ])
      .then(([nextOverview, nextGateways]) => {
        setOverview(nextOverview);
        setInvoices(nextOverview?.invoices || []);
        setGateways(nextGateways);
        notifyDataRefresh();
      })
      .catch((err) => {
        setOverview(null);
        setInvoices([]);
        setGateways([]);
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

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Billing</h1>
        <p className="mt-0.5 text-sm text-[#6B7280]">Payment methods, invoice totals, and gateway status from the billing API.</p>
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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          <section className="rounded-md border border-[#E5E7EB] bg-white p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#6B7280]">Outstanding Balance</p>
                <p className="text-4xl font-bold text-[#111827]">{loading ? '...' : money(outstanding)}</p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#6B7280]">Credit Balance</p>
                <p className="text-xl font-bold text-[#111827]">{loading ? '...' : money(overview?.credits || 0)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Invoices</p>
                <p className="mt-2 text-xl font-bold">{invoices.length}</p>
              </div>
              <div className="rounded border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Paid</p>
                <p className="mt-2 text-xl font-bold text-green-600">{money(paid)}</p>
              </div>
              <div className="rounded border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Hourly Usage</p>
                <p className="mt-2 text-xl font-bold">{money(overview?.hourlySpend || 0)}</p>
              </div>
            </div>
          </section>

          <section id="add-credit" className="rounded-md border border-[#E5E7EB] bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#111827]">Add Credit</h2>
                <p className="mt-1 text-xs text-[#6B7280]">Top up balance with bKash, Stripe, or PayPal. Non-USD amounts convert into USD credit.</p>
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
                    className={`rounded border px-4 py-3 text-left transition-colors ${
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
                className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder={topUpCurrency === 'BDT' ? 'Amount in BDT' : 'Amount in USD'}
              />
              <select
                value={topUpProvider}
                onChange={(event) => setTopUpProvider(event.target.value)}
                className="rounded border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
              >
                <option value="bkash">bKash</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
              <button onClick={addCredit} disabled={processing} className="rounded bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {processing ? 'Starting...' : 'Top Up'}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#111827]">
                <CreditCard className="h-4 w-4" /> Payment Gateways
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">User checkout only</span>
            </div>
            <div className="divide-y divide-[#E5E7EB] p-6">
              {loading && <div className="py-8 text-center text-sm font-bold text-gray-400">Loading gateways from API...</div>}
              {!loading && gateways.length === 0 && <div className="py-8 text-center text-sm font-bold text-gray-400">No payment gateways configured.</div>}
              {!loading && gateways.map((gateway) => (
                <div key={gateway.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-[#111827]">{gateway.name}</p>
                    <p className="text-xs text-[#6B7280]">{gateway.provider} / {gateway.mode}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${gateway.status === 'active' || gateway.status === 'enabled' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {gateway.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
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

          <section className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#111827]">
                <History className="h-4 w-4" /> Recent Invoices
              </h2>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {loading && <div className="p-8 text-center text-sm font-bold text-gray-400">Loading invoices from API...</div>}
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
          <div className="relative overflow-hidden rounded-md bg-[#111827] p-8 text-white">
            <Shield className="absolute -bottom-10 -right-10 h-48 w-48 text-white opacity-5" />
            <h3 className="mb-2 text-xl font-bold">Automated Billing</h3>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">Monthly caps and hourly usage are tracked against your credit balance.</p>
            <div className="flex items-center gap-2 text-[13px] font-bold text-blue-400">
              API Connected <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          {(outstanding > 0 || Number(overview?.dueAmount || 0) > 0) && (
            <div className="rounded-md border border-orange-100 bg-orange-50 p-6">
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
