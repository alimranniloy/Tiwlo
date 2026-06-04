import React from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  History,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  fetchBillingOverviewWithApi,
  notifyDataRefresh,
  settleUsageBillingWithApi,
  startCreditTopUpWithApi,
  startInvoicePaymentWithApi
} from '../lib/tiwloApi';
import { useCurrency } from '../lib/useCurrency';

const card = 'rounded-[8px] border border-[#e8edf7] bg-white';
const textInk = 'text-[#071437]';
const textMuted = 'text-[#65738a]';

function dateLabel(value?: string) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function invoiceHtml(invoice: any, formatMoney: (value: number, currency?: string) => string) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const rows = items.length
    ? items.map((item: any) => `
      <tr>
        <td>${escapeHtml(item.description || item.name || 'Invoice item')}</td>
        <td>${escapeHtml(item.hours || '-')}</td>
        <td>${escapeHtml(item.rate || '-')}</td>
        <td>${escapeHtml(formatMoney(Number(item.amount || 0), invoice.currency))}</td>
      </tr>
    `).join('')
    : `<tr><td>Billing charge</td><td>-</td><td>-</td><td>${escapeHtml(formatMoney(Number(invoice.amount || 0), invoice.currency))}</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.number || 'Invoice')}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;color:#071437;padding:32px}
    h1{margin:0 0 6px;font-size:28px}
    p{margin:0;color:#65738a}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}
    .box{border:1px solid #e8edf7;border-radius:8px;padding:14px}
    .label{font-size:11px;text-transform:uppercase;font-weight:800;color:#65738a}
    .value{margin-top:6px;font-weight:800}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th,td{border-bottom:1px solid #e8edf7;padding:12px;text-align:left;font-size:13px}
    th{font-size:11px;text-transform:uppercase;color:#65738a}
    tfoot td{font-weight:800}
  </style>
</head>
<body>
  <h1>${escapeHtml(invoice.number || 'Invoice')}</h1>
  <p>Tiwlo billing invoice</p>
  <section class="grid">
    <div class="box"><div class="label">Amount</div><div class="value">${escapeHtml(formatMoney(Number(invoice.amount || 0), invoice.currency))}</div></div>
    <div class="box"><div class="label">Status</div><div class="value">${escapeHtml(invoice.status || 'pending')}</div></div>
    <div class="box"><div class="label">Created</div><div class="value">${escapeHtml(dateLabel(invoice.createdAt))}</div></div>
  </section>
  <table>
    <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td>${escapeHtml(formatMoney(Number(invoice.amount || 0), invoice.currency))}</td></tr></tfoot>
  </table>
</body>
</html>`;
}

function downloadInvoice(invoice: any, formatMoney: (value: number, currency?: string) => string) {
  if (!invoice) return;
  const blob = new Blob([invoiceHtml(invoice, formatMoney)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${String(invoice.number || 'invoice').replace(/[^a-z0-9_-]+/gi, '-')}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function forecastData(projected: number, actual: number) {
  const target = Math.max(projected, actual, 1);
  return [
    { label: 'May 1', actual: target * 0.42, forecast: null },
    { label: 'May 8', actual: target * 0.62, forecast: null },
    { label: 'May 15', actual: target * 0.82, forecast: null },
    { label: 'May 22', actual: target * 0.9, forecast: null },
    { label: 'May 29', actual: target, forecast: target },
    { label: 'Jun 5', actual: null, forecast: target * 1.08 }
  ];
}

function MetricCard({
  icon: Icon,
  iconClass,
  label,
  sub,
  value,
  valueClass
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  sub: string;
  value: React.ReactNode;
  valueClass: string;
}) {
  return (
    <section className={`${card} flex min-h-[86px] items-center justify-between gap-4 p-5`}>
      <div className="min-w-0">
        <p className={`text-[10px] font-extrabold uppercase tracking-wide ${textMuted}`}>{label}</p>
        <p className={`mt-2 font-display text-[21px] font-extrabold leading-none ${valueClass}`}>{value}</p>
        <p className={`mt-2 text-[12px] font-semibold ${textMuted}`}>{sub}</p>
      </div>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </section>
  );
}

function CreditRing({ value }: { value: number }) {
  return (
    <div
      className="grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full p-[10px]"
      style={{ background: `conic-gradient(#1b63f2 0 ${value}%, #d6dcff ${value}% ${Math.min(value + 8, 100)}%, #eeeaff ${Math.min(value + 8, 100)}% 100%)` }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white">
        <span className={`font-display text-[21px] font-extrabold ${textInk}`}>{value}%</span>
      </div>
    </div>
  );
}

function StatusBlock({ label, value, icon: Icon, iconClass }: { label: string; value: React.ReactNode; icon: React.ElementType; iconClass: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-t border-[#edf1f7] px-5 py-4 sm:border-l sm:border-t-0">
      <div>
        <p className={`text-[10px] font-extrabold uppercase tracking-wide ${textMuted}`}>{label}</p>
        <p className={`mt-2 font-display text-[17px] font-extrabold ${textInk}`}>{value}</p>
        <p className={`mt-1 text-[12px] font-semibold ${textMuted}`}>{label === 'Invoice Count' ? 'Total Invoices' : 'This Month'}</p>
      </div>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] ${iconClass}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
  );
}

function AutomatedBillingCard() {
  return (
    <section className={`${card} relative min-h-[98px] overflow-hidden p-5`}>
      <div className="absolute right-0 top-0 h-full w-[96px] bg-[radial-gradient(#dbe6ff_1px,transparent_1.4px)] opacity-80 [background-size:9px_9px]" />
      <div className="relative flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-blue-50 text-blue-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className={`font-display text-[15px] font-extrabold ${textInk}`}>Automated Billing</h2>
          <p className={`mt-2 max-w-[320px] text-[12px] font-medium leading-5 ${textMuted}`}>
            Monthly caps and hourly usage are tracked against your credit balance.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-blue-600">
            API Connected <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </p>
        </div>
      </div>
    </section>
  );
}

function EmptyHourlyUsage() {
  return (
    <div className="grid min-h-[132px] place-items-center rounded-[8px] border border-[#edf1f7] bg-[#fbfcff] px-4 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] bg-[#f1ecff] text-[#5b21e6]">
          <FileText className="h-5 w-5" />
        </span>
        <p className={`mt-4 font-display text-[14px] font-extrabold ${textInk}`}>No active hourly usage</p>
        <p className={`mt-1 text-[12px] font-medium ${textMuted}`}>You have no active hourly usage at the moment.</p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { currency, money } = useCurrency({ scope: 'platform', scopeId: 'console' });
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [overview, setOverview] = React.useState<any | null>(null);
  const [topUpAmount, setTopUpAmount] = React.useState('10');
  const [topUpCurrency, setTopUpCurrency] = React.useState('USD');
  const [topUpProvider, setTopUpProvider] = React.useState('bkash');
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [payingInvoice, setPayingInvoice] = React.useState('');
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

  React.useEffect(() => {
    if (['USD', 'BDT'].includes(currency)) setTopUpCurrency(currency);
  }, [currency]);

  const paidInvoices = invoices.filter((invoice) => String(invoice.status).toLowerCase() === 'paid');
  const unpaidInvoices = invoices.filter((invoice) => String(invoice.status).toLowerCase() !== 'paid');
  const outstanding = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const paid = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const usageLines = overview?.usageLines || [];
  const creditBalance = Number(overview?.credits || 0);
  const dueNow = Math.max(outstanding, Number(overview?.dueAmount || 0));
  const accruedUsage = Number(overview?.accruedUsage || 0);
  const hourlySpend = Number(overview?.hourlySpend || 0);
  const projectedMonthly = Number(overview?.projectedMonthly || overview?.monthlySpend || hourlySpend * 24 * 30 || 0);
  const creditHealth = Math.min(100, Math.max(0, Math.round((creditBalance / Math.max(creditBalance + dueNow, 1)) * 100)));
  const latestInvoice = invoices[0];
  const nextDue = unpaidInvoices[0]?.dueDate || latestInvoice?.dueDate;
  const forecast = forecastData(projectedMonthly, accruedUsage || hourlySpend);

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

  const payInvoice = async (invoice?: any) => {
    if (!invoice) return;
    setError('');
    setPayingInvoice(invoice.id);
    try {
      const checkout = await startInvoicePaymentWithApi(invoice.id, topUpProvider);
      if (checkout.paymentUrl) {
        window.location.href = checkout.paymentUrl;
        return;
      }
      await loadBilling();
      if (checkout.status === 'requires_payment') {
        setError(checkout.message || 'Add credit or choose another payment method.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start invoice payment');
    } finally {
      setPayingInvoice('');
    }
  };

  return (
    <div className="relative -mx-3 -my-4 min-h-[calc(100vh-4rem)] bg-[#f8fafc] px-3 py-5 sm:-mx-5 sm:px-5 md:-mx-7 md:-my-7 md:px-7 md:py-6">
      <div className="mx-auto max-w-[1220px] space-y-4">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-600">Account Billing</p>
            <h1 className={`mt-2 font-display text-[26px] font-extrabold leading-tight ${textInk}`}>Billing Overview</h1>
            <p className={`mt-2 text-[14px] font-medium ${textMuted}`}>Manage credits, active usage, and invoices for your Tiwlo services.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!latestInvoice}
              onClick={() => downloadInvoice(latestInvoice, money)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#e8edf7] bg-white px-4 text-[13px] font-extrabold text-[#3f4d65] disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-blue-600" /> Download Invoice
            </button>
            <a
              href="#add-credit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#e8edf7] bg-white px-4 text-[13px] font-extrabold text-blue-600"
            >
              <Settings className="h-4 w-4" /> Payment Settings
            </a>
          </div>
        </header>

        <nav className={`${card} flex min-h-[42px] items-center overflow-x-auto px-2`}>
          {[
            ['Overview', '#overview'],
            ['Add Credit', '#add-credit'],
            ['Usage', '#usage'],
            ['Invoices', '#invoices']
          ].map(([label, href], index) => (
            <a
              key={label}
              href={href}
              className={`relative flex h-[42px] min-w-[94px] items-center justify-center px-3 text-[12px] font-extrabold ${
                index === 0 ? 'text-blue-600 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-blue-600' : textInk
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        {error && <div className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-extrabold text-red-600">{error}</div>}

        {overview && creditBalance <= 0 && !loading && (
          <div className="flex flex-col gap-3 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-[13px] font-extrabold leading-5">Add credit now. Orders are blocked and servers stay off while the balance is 0.</p>
            </div>
            <a href="#add-credit" className="inline-flex h-9 shrink-0 items-center justify-center rounded-[7px] bg-red-600 px-4 text-[12px] font-extrabold text-white">
              Add Credit
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Current Balance" value={loading ? '...' : money(creditBalance)} sub="Available Credit" valueClass="text-emerald-600" icon={Wallet} iconClass="bg-emerald-50 text-emerald-600" />
          <MetricCard label="Outstanding" value={loading ? '...' : money(dueNow)} sub="Payment Due" valueClass="text-rose-600" icon={ReceiptText} iconClass="bg-rose-50 text-rose-600" />
          <MetricCard label="Hourly Usage" value={loading ? '...' : money(hourlySpend)} sub="Average Cost" valueClass="text-blue-600" icon={TrendingUp} iconClass="bg-blue-50 text-blue-600" />
          <MetricCard label="Invoices" value={loading ? '...' : invoices.length} sub="Total Invoices" valueClass={textInk} icon={FileText} iconClass="bg-[#f1ecff] text-[#5b21e6]" />
        </div>

        <div id="overview" className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_390px]">
          <section className={`${card} grid grid-cols-1 items-center overflow-hidden lg:grid-cols-[310px_1fr_1fr_1fr]`}>
            <div className="flex items-center gap-5 p-5">
              <CreditRing value={creditHealth} />
              <div className="min-w-0">
                <p className={`text-[10px] font-extrabold uppercase tracking-wide ${textMuted}`}>Credit Status</p>
                <h2 className={`mt-2 font-display text-[17px] font-extrabold ${textInk}`}>{creditBalance <= 0 ? 'Credit Required' : 'Account Funded'}</h2>
                <p className={`mt-1 text-[12px] font-medium ${textMuted}`}>Your account is in good standing.</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Healthy
                  </span>
                  <a href="#invoices" className="text-[11px] font-extrabold text-blue-600">View details</a>
                </div>
              </div>
            </div>
            <StatusBlock label="Accrued Usage" value={loading ? '...' : money(accruedUsage)} icon={Wallet} iconClass="bg-blue-50 text-blue-600" />
            <StatusBlock label="Paid Invoices" value={loading ? '...' : money(paid)} icon={FileText} iconClass="bg-emerald-50 text-emerald-600" />
            <StatusBlock label="Invoice Count" value={loading ? '...' : invoices.length} icon={ReceiptText} iconClass="bg-[#f1ecff] text-[#5b21e6]" />
          </section>

          <AutomatedBillingCard />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_390px]">
          <section id="add-credit" className={`${card} grid grid-cols-1 overflow-hidden lg:grid-cols-[285px_1fr]`}>
            <div className="border-b border-[#edf1f7] p-5 lg:border-b-0 lg:border-r lg:border-[#edf1f7]">
              <p className={`text-[10px] font-extrabold uppercase tracking-wide ${textMuted}`}>Balance Due</p>
              <p className={`mt-2 font-display text-[31px] font-extrabold leading-none ${textInk}`}>{loading ? '...' : money(dueNow)}</p>
              <p className="mt-2 text-[12px] font-extrabold text-amber-600">{nextDue ? `Due on ${dateLabel(nextDue)}` : 'No due date scheduled'}</p>

              <div className="mt-7 grid grid-cols-2 divide-x divide-[#edf1f7]">
                <div>
                  <p className={`text-[10px] font-extrabold uppercase tracking-wide ${textMuted}`}>Available Credit</p>
                  <p className="mt-2 font-display text-[17px] font-extrabold text-emerald-600">{loading ? '...' : money(creditBalance)}</p>
                </div>
                <div className="pl-5">
                  <p className={`text-[10px] font-extrabold uppercase tracking-wide ${textMuted}`}>Paid Invoices</p>
                  <p className={`mt-2 font-display text-[17px] font-extrabold ${textInk}`}>{loading ? '...' : money(paid)}</p>
                </div>
              </div>

              <p className={`mt-6 max-w-[240px] text-[12px] font-medium leading-5 ${textMuted}`}>
                Credit is used for cloud, hosting, ecommerce, ISP, and hourly resource billing.
              </p>
            </div>

            <div className="p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={`font-display text-[14px] font-extrabold uppercase ${textInk}`}>Add Credit</h2>
                  <p className={`mt-1 text-[12px] font-medium ${textMuted}`}>Choose currency, amount, and checkout provider.</p>
                </div>
                <label className="relative w-full sm:w-[108px]">
                  <select
                    value={topUpCurrency}
                    onChange={(event) => setTopUpCurrency(event.target.value)}
                    className="h-9 w-full appearance-none rounded-[7px] border border-[#e8edf7] bg-white pl-8 pr-7 text-[12px] font-extrabold text-[#32415f] outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="BDT">BDT</option>
                  </select>
                  <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65738a]" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  { key: 'USD', title: 'USD Credit', detail: 'Add exact cloud credit balance', icon: Wallet },
                  { key: 'BDT', title: 'BDT Payment', detail: 'Pay local amount, convert to credit', icon: Banknote }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTopUpCurrency(option.key)}
                    className={`flex min-h-[76px] items-center gap-3 rounded-[8px] border px-3.5 py-3 text-left ${
                      topUpCurrency === option.key ? 'border-blue-500 bg-[#f8fbff]' : 'border-[#edf1f7] bg-white'
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${topUpCurrency === option.key ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                      <option.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className={`block font-display text-[14px] font-extrabold ${textInk}`}>{option.title}</span>
                      <span className={`mt-1 block text-[12px] font-medium leading-5 ${textMuted}`}>{option.detail}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_136px_102px]">
                <input
                  value={topUpAmount}
                  onChange={(event) => setTopUpAmount(event.target.value)}
                  type="number"
                  min="1"
                  step="0.01"
                  className="h-9 rounded-[8px] border border-[#e8edf7] bg-white px-4 text-[13px] font-semibold text-[#071437] outline-none focus:border-blue-300"
                  placeholder={topUpCurrency === 'BDT' ? 'Amount in BDT' : 'Amount in USD'}
                />
                <label className="relative">
                  <select
                    value={topUpProvider}
                    onChange={(event) => setTopUpProvider(event.target.value)}
                    className="h-9 w-full appearance-none rounded-[8px] border border-[#e8edf7] bg-white px-4 pr-8 text-[13px] font-extrabold text-[#071437] outline-none focus:border-blue-300"
                  >
                    <option value="bkash">bKash</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65738a]" />
                </label>
                <button onClick={addCredit} disabled={processing} className="h-9 rounded-[8px] bg-blue-600 px-4 text-[12px] font-extrabold text-white hover:bg-blue-700 disabled:opacity-60">
                  {processing ? 'Starting...' : 'Top Up'}
                </button>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-[8px] border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <AlertCircle className="h-[18px] w-[18px] shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <h2 className="font-display text-[13px] font-extrabold text-amber-700">Payment Pending</h2>
                    <p className="mt-0.5 text-[11px] font-medium leading-4 text-amber-800">
                      Unpaid invoices or usage due: <span className="font-extrabold">{money(dueNow)}</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!unpaidInvoices[0] || Boolean(payingInvoice)}
                  onClick={() => payInvoice(unpaidInvoices[0])}
                  className="h-9 shrink-0 whitespace-nowrap rounded-[7px] border border-amber-200 bg-white px-4 text-[12px] font-extrabold text-amber-700 disabled:opacity-50"
                >
                  {payingInvoice ? 'Starting...' : 'Pay Now'}
                </button>
              </div>
            </section>

            <section className={`${card} p-5`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className={`font-display text-[14px] font-extrabold ${textInk}`}>Usage Forecast</h2>
                  <p className={`mt-3 font-display text-[23px] font-extrabold leading-none ${textInk}`}>{loading ? '...' : money(projectedMonthly)}</p>
                  <p className={`mt-2 text-[12px] font-medium ${textMuted}`}>Estimated total by month end</p>
                </div>
                <button type="button" className="h-8 rounded-[7px] border border-[#edf1f7] bg-white px-3 text-[11px] font-extrabold text-[#32415f]">This Month</button>
              </div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecast} margin={{ top: 10, right: 6, bottom: 0, left: -24 }}>
                    <defs>
                      <linearGradient id="usageForecastFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1b63f2" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#1b63f2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#edf1f7" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#65738a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#65738a' }} />
                    <Area dataKey="actual" type="monotone" stroke="#1b63f2" strokeWidth={2.2} fill="url(#usageForecastFill)" dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} isAnimationActive={false} />
                    <Area dataKey="forecast" type="monotone" stroke="#1b63f2" strokeWidth={2} strokeDasharray="4 4" fill="transparent" dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.24fr]">
          <section id="usage" className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[#edf1f7] px-5 py-4">
              <h2 className={`flex items-center gap-2 font-display text-[13px] font-extrabold uppercase ${textInk}`}>
                <History className="h-4 w-4 text-blue-600" /> Active Hourly Billing
              </h2>
              <span className={`text-[12px] font-extrabold ${textInk}`}>{money(accruedUsage)}</span>
            </div>
            <div className="p-5">
              {loading && <div className="py-10 text-center text-[13px] font-extrabold text-slate-400">Calculating active services...</div>}
              {!loading && usageLines.length === 0 && <EmptyHourlyUsage />}
              {!loading && usageLines.length > 0 && (
                <div className="divide-y divide-[#edf1f7] rounded-[8px] border border-[#edf1f7]">
                  {usageLines.map((line: any) => (
                    <div key={line.resourceId} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                      <div>
                        <p className={`text-[14px] font-extrabold ${textInk}`}>{line.name}</p>
                        <p className={`mt-1 text-[12px] font-medium ${textMuted}`}>{Number(line.hours || 0).toFixed(2)} hrs at {money(line.hourlyRate)}</p>
                      </div>
                      <span className={`text-[12px] font-semibold ${textMuted}`}>Monthly cap {money(line.monthlyCost)}</span>
                      <span className={`text-right text-[14px] font-extrabold ${textInk}`}>{money(line.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section id="invoices" className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[#edf1f7] px-5 py-4">
              <h2 className={`flex items-center gap-2 font-display text-[13px] font-extrabold uppercase ${textInk}`}>
                <ReceiptText className="h-4 w-4 text-blue-600" /> Recent Invoices
              </h2>
              <a href="/invoices" className="text-[12px] font-extrabold text-blue-600">View All</a>
            </div>
            <div className="divide-y divide-[#edf1f7]">
              {loading && <div className="p-8 text-center text-[13px] font-extrabold text-slate-400">Loading invoices...</div>}
              {!loading && invoices.length === 0 && <div className="p-8 text-center text-[13px] font-extrabold text-slate-400">No invoices found.</div>}
              {!loading && invoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#f1ecff] text-[#5b21e6]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate font-display text-[14px] font-extrabold ${textInk}`}>{invoice.number}</p>
                      <p className={`mt-1 text-[12px] font-medium ${textMuted}`}>{dateLabel(invoice.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className={`font-display text-[13px] font-extrabold ${textInk}`}>{money(invoice.amount, invoice.currency)}</span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold capitalize ${String(invoice.status).toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {invoice.status}
                    </span>
                    <button type="button" onClick={() => downloadInvoice(invoice, money)} className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#edf1f7] bg-white text-[#65738a]">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
