import React from 'react';
import { AlertCircle, Download, RefreshCw, Search } from 'lucide-react';
import { fetchIspInvoicesWithApi } from '../../../../lib/tiwloApi';
import { useCurrency } from '../../../../lib/useCurrency';

export default function IspInvoicesPage({ site }: { site: any }) {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'isp-admin' });
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');

  const loadInvoices = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      setInvoices(await fetchIspInvoicesWithApi(undefined, site.id));
    } catch (err) {
      setInvoices([]);
      setError(err instanceof Error ? err.message : 'Unable to load ISP invoices');
    } finally {
      setLoading(false);
    }
  }, [site?.id]);

  React.useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filtered = invoices.filter((invoice) => (
    [invoice.number, invoice.clientName, invoice.status].join(' ').toLowerCase().includes(query.toLowerCase())
  ));

  const exportCsv = () => {
    const rows = filtered.map((invoice) => [invoice.number, invoice.clientName, invoice.amount, invoice.status, invoice.dueDate || '']);
    const csv = [['Number', 'Client', 'Amount', 'Status', 'Due Date'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${site?.code || 'isp'}-invoices.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Invoices & Billing</h1>
          <p className="mt-1 text-sm text-gray-500">Billing rows are filtered by the active ISP site.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><Download className="h-3.5 w-3.5" /> Export</button>
          <button onClick={loadInvoices} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

      <div className="border border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoices..." className="w-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Invoices: {filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Invoice</th>
                <th className="px-4 py-3 font-bold">Client</th>
                <th className="px-4 py-3 font-bold">Amount</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading invoices from API...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No invoices found for this ISP site.</td></tr>
              ) : filtered.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-blue-600">{invoice.number}</td>
                  <td className="px-4 py-3 text-gray-700">{invoice.clientName}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{money(invoice.amount || 0, invoice.currency || 'USD')}</td>
                  <td className="px-4 py-3"><span className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{invoice.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
