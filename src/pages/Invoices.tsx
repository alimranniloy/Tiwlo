import React from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Download, Eye, FileText, Filter, Search, X } from 'lucide-react';
import { fetchInvoicesWithApi, markInvoicePaidWithApi, startInvoicePaymentWithApi } from '../lib/tiwloApi';
import { OrderReceipt } from '../components/OrderReceipt';
import { useCurrency } from '../lib/useCurrency';

interface InvoicesProps {
  adminMode?: boolean;
}

function money(invoice: any) {
  return `${invoice.currency || 'USD'} ${Number(invoice.amount || 0).toFixed(2)}`;
}

function moneyValue(value: number, currency = 'USD') {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function dateLabel(value?: string) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status: string) {
  const lower = status.toLowerCase();
  if (lower === 'paid') return 'bg-green-50 text-green-600 border-green-100';
  if (lower === 'overdue' || lower === 'payment_failed') return 'bg-red-50 text-red-600 border-red-100';
  return 'bg-amber-50 text-amber-600 border-amber-100';
}

function escapeHtml(value: unknown) {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(value ?? '').replace(/[&<>"']/g, (character) => map[character] || character);
}

function invoiceLineItems(invoice: any) {
  const lines = invoice?.items?.lineItems;
  return Array.isArray(lines) ? lines : [];
}

function invoiceHtml(invoice: any) {
  const lines = invoiceLineItems(invoice);
  const created = dateLabel(invoice.createdAt);
  const due = dateLabel(invoice.dueDate);
  const status = String(invoice.status || 'open');
  const amount = money(invoice);
  const lineRows = lines.length
    ? lines.map((line: any) => `
      <tr>
        <td>${escapeHtml(line.label || line.name || 'Invoice item')}</td>
        <td>${escapeHtml(line.hours ? `${Number(line.hours).toFixed(2)} hrs` : '-')}</td>
        <td>${escapeHtml(line.hourlyRate ? moneyValue(line.hourlyRate, invoice.currency) : '-')}</td>
        <td align="right">${escapeHtml(moneyValue(line.amount || 0, invoice.currency))}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="4" align="center">No line item details were stored for this invoice.</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(invoice.number || 'Invoice')}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #fbfaff; color: #071437; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
    .page { position: relative; overflow: hidden; min-height: 100vh; padding: 44px 18px 52px; }
    .page:before { content: ""; position: absolute; left: -90px; top: -110px; width: 360px; height: 250px; border-radius: 999px; background: #f0edff; }
    .page:after { content: ""; position: absolute; right: -120px; top: 290px; width: 380px; height: 320px; border-radius: 999px; background: #f5f2ff; }
    .wrap { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; text-align: center; }
    .success { position: relative; display: inline-grid; place-items: center; width: 82px; height: 82px; border-radius: 999px; background: #f1edff; }
    .success span { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 999px; color: #fff; background: linear-gradient(135deg,#6d5dfc,#3e22e8); font-size: 32px; font-weight: 900; }
    .dot { position: absolute; display: block; border-radius: 999px; opacity: .75; }
    .d1 { left: 38%; top: 16px; width: 7px; height: 7px; background: #7dd3fc; }
    .d2 { left: 33%; top: 80px; width: 6px; height: 6px; background: #fb7185; }
    .d3 { right: 35%; top: 72px; width: 6px; height: 6px; background: #67e8f9; }
    .d4 { right: 31%; top: 26px; width: 5px; height: 5px; background: #fbbf24; }
    .plus { position: absolute; color: #f59e0b; font-size: 15px; font-weight: 900; }
    h1 { margin: 24px 0 10px; font-size: 34px; line-height: 1.08; letter-spacing: 0; }
    .lead { margin: 0 auto; max-width: 620px; color: #536079; font-size: 14px; font-weight: 600; line-height: 1.75; }
    .pill { display: inline-flex; align-items: center; gap: 18px; margin-top: 28px; padding: 12px 20px 12px 24px; border: 1px solid #dcd7f2; border-radius: 22px; background: rgba(255,255,255,.88); }
    .pill small { display: block; color: #5f667a; font-size: 11px; font-weight: 800; }
    .pill strong { display: block; color: #4f32f5; font-size: 20px; }
    .copy { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px; background: #f2f0ff; color: #6046f4; font-weight: 900; }
    .card { margin-top: 28px; border: 1px solid #ebeef6; border-radius: 8px; background: #fff; padding: 28px; text-align: left; }
    .head { display: flex; gap: 16px; align-items: flex-start; }
    .icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: #f1edff; color: #5b35f5; font-weight: 900; }
    h2 { margin: 0; font-size: 17px; }
    .sub { margin: 6px 0 0; color: #65738a; font-size: 12px; font-weight: 600; }
    .rows { margin-top: 24px; border-top: 1px solid #edf1f7; }
    .row { display: grid; grid-template-columns: 36px 1fr minmax(160px,auto); gap: 12px; align-items: center; border-bottom: 1px solid #edf1f7; padding: 15px 0; font-size: 13px; font-weight: 800; }
    .mini { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; background: #f8f9fc; color: #5f667a; }
    .value { text-align: right; color: #071437; }
    .badge { display: inline-block; border-radius: 8px; background: #ecfdf5; color: #059669; padding: 6px 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { border-bottom: 1px solid #edf1f7; padding: 12px 8px; font-size: 12px; }
    th { color: #65738a; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
    tfoot td { border-bottom: 0; font-size: 14px; font-weight: 900; }
    .next { display: flex; justify-content: space-between; gap: 20px; margin-top: 24px; border: 1px solid #ded8fb; border-radius: 8px; background: #f4f0ff; padding: 26px; text-align: left; }
    .next p { margin: 8px 0 0; max-width: 560px; color: #536079; font-size: 13px; font-weight: 600; line-height: 1.7; }
    .server { position: relative; width: 134px; min-width: 134px; height: 84px; }
    .tower { position: absolute; right: 34px; top: 0; width: 68px; height: 76px; border-radius: 16px; background: linear-gradient(135deg,#6956f3,#24168f); padding: 14px; }
    .tower i { display: block; height: 8px; margin-bottom: 8px; border-radius: 999px; background: rgba(255,255,255,.3); }
    .cloud { position: absolute; bottom: 0; width: 58px; height: 28px; border-radius: 999px; background: #fff; }
    .cloud.left { left: 0; } .cloud.right { right: 0; }
    .check { position: absolute; right: 0; top: 36px; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 999px; background: #22c55e; color: #fff; font-weight: 900; }
    @media (max-width: 640px) {
      h1 { font-size: 28px; }
      .card, .next { padding: 20px; }
      .row { grid-template-columns: 34px 1fr; }
      .value { grid-column: 2; text-align: left; }
      .next { flex-direction: column; }
      .server { margin: 0 auto; }
    }
  </style>
</head>
<body>
  <main class="page">
    <span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span><span class="dot d4"></span>
    <span class="plus" style="left:31%;top:28px;">+</span><span class="plus" style="right:29%;top:96px;">+</span>
    <div class="wrap">
      <div class="success"><span>✓</span></div>
      <h1>Thanks for Your Order!</h1>
      <p class="lead">Your invoice has been generated successfully.<br>We're keeping the details ready for billing and support review.</p>
      <div class="pill"><div><small>Order ID</small><strong>${escapeHtml(invoice.number || invoice.id)}</strong></div><div class="copy">□</div></div>
      <section class="card">
        <div class="head"><div class="icon">▤</div><div><h2>Order Summary</h2><p class="sub">Here are the details of your invoice.</p></div></div>
        <div class="rows">
          <div class="row"><div class="mini">▦</div><div>Order Date</div><div class="value">${escapeHtml(created)}</div></div>
          <div class="row"><div class="mini">▤</div><div>Server Configuration</div><div class="value">${escapeHtml(invoice.scope || 'Billing')}</div></div>
          <div class="row"><div class="mini">▣</div><div>Order Status</div><div class="value"><span class="badge">${escapeHtml(status)}</span></div></div>
          <div class="row"><div class="mini">◌</div><div>Amount</div><div class="value">${escapeHtml(amount)}</div></div>
          <div class="row"><div class="mini">□</div><div>Note</div><div class="value">Due date: ${escapeHtml(due)}</div></div>
        </div>
        <table>
          <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th align="right">Amount</th></tr></thead>
          <tbody>${lineRows}</tbody>
          <tfoot><tr><td colspan="3">Total</td><td align="right">${escapeHtml(amount)}</td></tr></tfoot>
        </table>
      </section>
      <section class="next">
        <div><h2>What's Next?</h2><p>You can pay, download, or review this invoice from your dashboard. Our team will notify you if action is needed.</p></div>
        <div class="server"><span class="cloud left"></span><span class="cloud right"></span><div class="tower"><i></i><i></i><i></i></div><span class="check">✓</span></div>
      </section>
    </div>
  </main>
</body>
</html>`;
}

function downloadInvoice(invoice: any) {
  const blob = new Blob([invoiceHtml(invoice)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${String(invoice.number || 'invoice').replace(/[^a-z0-9_-]+/gi, '-')}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Invoices({ adminMode = false }: InvoicesProps) {
  const { money: displayMoney } = useCurrency({ scope: 'platform', scopeId: adminMode ? 'admin' : 'console' });
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [processingPayment, setProcessingPayment] = React.useState('');
  const [previewInvoice, setPreviewInvoice] = React.useState<any | null>(null);

  const loadInvoices = React.useCallback(() => {
    setError('');
    setLoading(true);
    fetchInvoicesWithApi()
      .then(setInvoices)
      .catch((err) => {
        setInvoices([]);
        setError(err instanceof Error ? err.message : 'Unable to load invoices');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const markPaid = async (id: string) => {
    if (!adminMode) return;
    setError('');
    setSuccess('');
    try {
      const updated = await markInvoicePaidWithApi(id);
      setInvoices((current) => current.map((invoice) => invoice.id === id ? { ...invoice, ...updated } : invoice));
      setSuccess('Invoice marked as paid.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark invoice paid');
    }
  };

  const payInvoice = async (invoice: any, provider: string) => {
    setError('');
    setSuccess('');
    setProcessingPayment(`${invoice.id}:${provider}`);
    try {
      const checkout = await startInvoicePaymentWithApi(invoice.id, provider);
      if (checkout.paymentUrl) {
        window.location.href = checkout.paymentUrl;
        return;
      }
      if (checkout.invoice) {
        setInvoices((current) => current.map((item) => item.id === invoice.id ? { ...item, ...checkout.invoice } : item));
      }
      if (checkout.status === 'requires_payment') {
        setError(checkout.message || 'Add credit or choose another payment method.');
      } else {
        setSuccess(checkout.message || 'Payment updated.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start invoice payment');
    } finally {
      setProcessingPayment('');
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const haystack = `${invoice.number} ${invoice.status} ${invoice.scope} ${invoice.amount}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const exportCsv = () => {
    const rows = [
      ['Number', 'Amount', 'Currency', 'Status', 'Scope', 'Due date', 'Created'],
      ...filteredInvoices.map((invoice) => [
        invoice.number,
        invoice.amount,
        invoice.currency,
        invoice.status,
        invoice.scope,
        invoice.dueDate || '',
        invoice.createdAt || ''
      ])
    ];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'invoices.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const outstanding = invoices
    .filter((invoice) => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const paid = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return (
    <div className="mx-auto max-w-[1220px] space-y-6 pb-12 md:space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">Billing & Invoices</h1>
          <p className="mt-1 text-[13px] font-medium text-[#52637a]">
            {adminMode ? 'Administrator invoice records and manual actions.' : 'Your invoices, checkout links, and payment history from the billing API.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-md border border-[#b9cdf8] bg-white px-4 py-2 text-[13px] font-bold text-[#0069ff] hover:border-[#0069ff] hover:bg-[#f7faff]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={loadInvoices} className="flex items-center gap-2 rounded-md bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc]">
            <CreditCard className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600 shadow-sm">{error}</div>}
      {success && <div className="rounded-md border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700 shadow-sm">{success}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-md border border-[#d9e1ec] bg-white p-6 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Outstanding</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-[#2e3d49]">{displayMoney(outstanding, 'USD')}</p>
        </div>
        <div className="rounded-md border border-[#d9e1ec] bg-white p-6 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <CheckCircle2 className="h-4 w-4 text-[#24ad5f]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Paid Total</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-[#2e3d49]">{displayMoney(paid, 'USD')}</p>
        </div>
        <div className="rounded-md bg-[#031b4e] p-6 text-white shadow-[0_12px_28px_rgba(3,27,78,0.15)]">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-blue-200/60">Invoice Records</p>
          <p className="text-3xl font-bold tracking-tight">{invoices.length}</p>
          <p className="mt-2 text-xs text-blue-100/70">Total records visible to this account.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#e4e9f1] bg-[#f7f9fc] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Invoice List</h2>
            <p className="text-[11px] font-medium text-gray-400">{adminMode ? 'Admin controls are available only on this management route.' : 'Manual admin controls are hidden on the user dashboard.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices..."
                className="w-full rounded-md border border-[#cdd6e3] bg-white py-1.5 pl-9 pr-3 text-[12px] focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10 md:w-64"
              />
            </div>
            <button className="rounded border border-[#e5e8ed] p-1.5 hover:bg-gray-100"><Filter className="h-4 w-4 text-[#4a4a4a]" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e5e8ed] bg-white">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#4a4a4a]">Reference</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#4a4a4a]">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#4a4a4a]">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#4a4a4a]">Scope</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#4a4a4a]">Dates</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a4a]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading && <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-gray-400">Loading invoices from API...</td></tr>}
              {!loading && filteredInvoices.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No invoices found.</td></tr>}
              {!loading && filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="group transition-colors hover:bg-[#f7faff]">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-[#8ba2ad] transition-all group-hover:bg-[#0069ff] group-hover:text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-mono text-[13px] font-bold uppercase tracking-tighter text-[#2e3d49]">{invoice.number}</span>
                        <p className="text-[11px] font-medium text-gray-400">{invoice.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[15px] font-bold tracking-tight text-[#2e3d49]">{displayMoney(invoice.amount, invoice.currency)}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(invoice.status)}`}>{invoice.status}</span>
                  </td>
                  <td className="px-6 py-5 text-[12px] font-bold uppercase text-[#4a4a4a]">{invoice.scope}</td>
                  <td className="px-6 py-5">
                    <div className="text-[12px] font-bold text-[#4a4a4a]">{dateLabel(invoice.createdAt)}</div>
                    <div className="text-[11px] text-gray-400">Due: {dateLabel(invoice.dueDate)}</div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {invoice.status !== 'paid' && (
                        <>
                          {['credit', 'bkash', 'stripe', 'paypal'].map((provider) => (
                            <button
                              key={provider}
                              onClick={() => payInvoice(invoice, provider)}
                              disabled={processingPayment === `${invoice.id}:${provider}`}
                              className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold capitalize text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                            >
                              {provider}
                            </button>
                          ))}
                          {adminMode && (
                            <button onClick={() => markPaid(invoice.id)} className="rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-700 hover:bg-green-100">
                              Mark Paid
                            </button>
                          )}
                        </>
                      )}
                      <button onClick={() => setPreviewInvoice(invoice)} className="flex items-center gap-1.5 rounded-lg border border-[#e5e8ed] bg-white px-3 py-1.5 text-[11px] font-bold text-[#4a4a4a] transition-all hover:border-[#0069ff] hover:bg-[#0069ff] hover:text-white">
                        <Eye className="h-3 w-3" /> Preview
                      </button>
                      <button onClick={() => downloadInvoice(invoice)} className="flex items-center gap-1.5 rounded-lg border border-[#e5e8ed] bg-white px-3 py-1.5 text-[11px] font-bold text-[#4a4a4a] transition-all hover:border-[#0069ff] hover:bg-[#0069ff] hover:text-white">
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-3 py-5">
          <div className="relative max-h-full w-full max-w-[940px] overflow-y-auto rounded-[10px] border border-[#e8edf7] bg-[#fbfaff]">
            <button onClick={() => setPreviewInvoice(null)} className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-[8px] border border-[#e8edf7] bg-white text-[#65738a] hover:text-[#071437]">
              <X className="h-5 w-5" />
            </button>
            <OrderReceipt
              compact
              title="Thanks for Your Order!"
              subtitle="Your invoice has been generated successfully."
              description="Review the invoice details below and download a copy whenever you need it."
              orderId={previewInvoice.number}
              summaryTitle="Order Summary"
              summarySubtitle="Here are the details of your invoice."
              rows={[
                { label: 'Order Date', value: dateLabel(previewInvoice.createdAt) },
                { label: 'Server Configuration', value: previewInvoice.scope || 'Billing' },
                { label: 'Order Status', value: previewInvoice.status || 'open', badge: true },
                { label: 'Amount', value: displayMoney(previewInvoice.amount, previewInvoice.currency) },
                { label: 'Note', value: previewInvoice.items?.lastPaymentError ? `Last payment failed: ${previewInvoice.items.lastPaymentError}` : `Due date: ${dateLabel(previewInvoice.dueDate)}` }
              ]}
              nextDescription="You can pay, download, or review this invoice from the billing dashboard. Our team will notify you if action is needed."
              primaryLabel="Download Invoice"
              onPrimary={() => downloadInvoice(previewInvoice)}
              supportHref="/support"
            />
          </div>
        </div>
      )}
    </div>
  );
}
