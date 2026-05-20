import React from 'react';
import { AlertCircle, CreditCard, FileText, RefreshCw, Users } from 'lucide-react';
import { fetchIspClientsWithApi, fetchIspInvoicesWithApi } from '../../../../lib/tiwloApi';

export default function IspReportsPage({ site }: { site: any }) {
  const [clients, setClients] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadReports = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      const [clientRows, invoiceRows] = await Promise.all([
        fetchIspClientsWithApi(undefined, site.id),
        fetchIspInvoicesWithApi(undefined, site.id)
      ]);
      setClients(clientRows);
      setInvoices(invoiceRows);
    } catch (err) {
      setClients([]);
      setInvoices([]);
      setError(err instanceof Error ? err.message : 'Unable to load reports');
    } finally {
      setLoading(false);
    }
  }, [site?.id]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  const openAmount = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const paidAmount = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Financial Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Reports are calculated from this ISP site's subscribers and invoices.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'}</p>
        </div>
        <button onClick={loadReports} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      {error && <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Subscribers', value: clients.length, icon: Users },
          { label: 'Invoices', value: invoices.length, icon: FileText },
          { label: 'Paid Amount', value: `$${paidAmount.toFixed(2)}`, icon: CreditCard },
          { label: 'Open Amount', value: `$${openAmount.toFixed(2)}`, icon: AlertCircle }
        ].map((stat) => (
          <div key={stat.label} className="border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Invoice Status Summary</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-gray-400">Loading report data...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-gray-400">No invoices found for this ISP site.</div>
          ) : Object.entries(invoices.reduce<Record<string, number>>((acc, invoice) => {
            const status = invoice.status || 'open';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {})).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between p-4">
              <span className="text-sm font-bold capitalize text-gray-900">{status}</span>
              <span className="text-sm font-bold text-gray-700">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
