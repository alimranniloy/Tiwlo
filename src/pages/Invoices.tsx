import React from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Download, Eye, FileText, Filter, Search, X } from 'lucide-react';
import { fetchInvoicesWithApi, markInvoicePaidWithApi, startInvoicePaymentWithApi } from '../lib/tiwloApi';

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
  const rows = lines.length
    ? lines.map((line: any) => `
        <tr>
          <td>${escapeHtml(line.label || line.name || 'Invoice item')}</td>
          <td>${escapeHtml(line.hours ? `${Number(line.hours).toFixed(2)} hrs` : '')}</td>
          <td>${escapeHtml(line.hourlyRate ? moneyValue(line.hourlyRate, invoice.currency) : '')}</td>
          <td>${escapeHtml(moneyValue(line.amount || 0, invoice.currency))}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4">No line item details were stored for this invoice.</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.number || 'Invoice')}</title>
  <style>
    body { color: #111827; font-family: Arial, sans-serif; margin: 40px; }
    header { border-bottom: 1px solid #e5e7eb; margin-bottom: 28px; padding-bottom: 18px; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    .muted { color: #6b7280; font-size: 13px; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 24px 0; }
    .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .label { color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .value { font-size: 15px; font-weight: 700; margin-top: 5px; }
    table { border-collapse: collapse; margin-top: 24px; width: 100%; }
    th, td { border-bottom: 1px solid #e5e7eb; font-size: 13px; padding: 12px; text-align: left; }
    th { background: #f9fafb; color: #4b5563; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
    tfoot td { border-bottom: 0; font-size: 16px; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>Tiwlo Invoice</h1>
    <div class="muted">${escapeHtml(invoice.number)} / ${escapeHtml(invoice.status)}</div>
  </header>
  <section class="grid">
    <div class="box"><div class="label">Amount</div><div class="value">${escapeHtml(money(invoice))}</div></div>
    <div class="box"><div class="label">Scope</div><div class="value">${escapeHtml(invoice.scope || 'billing')}</div></div>
    <div class="box"><div class="label">Created</div><div class="value">${escapeHtml(dateLabel(invoice.createdAt))}</div></div>
    <div class="box"><div class="label">Due</div><div class="value">${escapeHtml(dateLabel(invoice.dueDate))}</div></div>
  </section>
  <table>
    <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td>${escapeHtml(money(invoice))}</td></tr></tfoot>
  </table>
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
          <p className="text-3xl font-bold tracking-tight text-[#2e3d49]">USD {outstanding.toFixed(2)}</p>
        </div>
        <div className="rounded-md border border-[#d9e1ec] bg-white p-6 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <CheckCircle2 className="h-4 w-4 text-[#24ad5f]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Paid Total</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-[#2e3d49]">USD {paid.toFixed(2)}</p>
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
                    <p className="text-[15px] font-bold tracking-tight text-[#2e3d49]">{money(invoice)}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
          <div className="max-h-full w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e8ed] bg-[#f8f9fa] px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#2e3d49]">{previewInvoice.number}</h2>
                <p className="text-xs font-medium text-gray-500">{previewInvoice.scope} / {previewInvoice.status}</p>
              </div>
              <button onClick={() => setPreviewInvoice(null)} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-[#2e3d49]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded border border-[#e5e8ed] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</p>
                  <p className="mt-2 text-sm font-bold text-[#2e3d49]">{money(previewInvoice)}</p>
                </div>
                <div className="rounded border border-[#e5e8ed] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Created</p>
                  <p className="mt-2 text-sm font-bold text-[#2e3d49]">{dateLabel(previewInvoice.createdAt)}</p>
                </div>
                <div className="rounded border border-[#e5e8ed] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Due</p>
                  <p className="mt-2 text-sm font-bold text-[#2e3d49]">{dateLabel(previewInvoice.dueDate)}</p>
                </div>
                <div className="rounded border border-[#e5e8ed] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Paid</p>
                  <p className="mt-2 text-sm font-bold text-[#2e3d49]">{dateLabel(previewInvoice.paidAt)}</p>
                </div>
              </div>

              {previewInvoice.items?.lastPaymentError && (
                <div className="mt-5 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
                  Last payment failed: {previewInvoice.items.lastPaymentError}
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded border border-[#e5e8ed]">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#f8f9fa]">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Description</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Hours</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Rate</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e8ed]">
                    {invoiceLineItems(previewInvoice).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-sm font-bold text-gray-400">No line item details were stored for this invoice.</td></tr>
                    )}
                    {invoiceLineItems(previewInvoice).map((line: any, index: number) => (
                      <tr key={`${line.label || line.name || 'line'}-${index}`}>
                        <td className="px-4 py-3 text-sm font-bold text-[#2e3d49]">{line.label || line.name || 'Invoice item'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{line.hours ? `${Number(line.hours).toFixed(2)} hrs` : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{line.hourlyRate ? moneyValue(line.hourlyRate, previewInvoice.currency) : '-'}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-[#2e3d49]">{moneyValue(line.amount || 0, previewInvoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f8f9fa]">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-[#2e3d49]">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-[#2e3d49]">{money(previewInvoice)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e5e8ed] bg-[#f8f9fa] px-6 py-4">
              <button onClick={() => downloadInvoice(previewInvoice)} className="flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc]">
                <Download className="h-4 w-4" /> Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
