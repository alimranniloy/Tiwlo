import React from 'react';
import { Activity, AlertCircle, CreditCard, Database, RefreshCw, Router, Users, Wifi } from 'lucide-react';
import {
  fetchIspClientsWithApi,
  fetchIspInvoicesWithApi,
  fetchIspRoutersWithApi,
  fetchNetworkDevicesWithApi,
  fetchRadiusServersWithApi
} from '../../../../lib/tiwloApi';

export default function IspDashboardOverview({ site }: { site: any }) {
  const [clients, setClients] = React.useState<any[]>([]);
  const [routers, setRouters] = React.useState<any[]>([]);
  const [radius, setRadius] = React.useState<any[]>([]);
  const [devices, setDevices] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadDashboard = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      const [nextClients, nextRouters, nextRadius, nextDevices, nextInvoices] = await Promise.all([
        fetchIspClientsWithApi(undefined, site.id),
        fetchIspRoutersWithApi(site.id),
        fetchRadiusServersWithApi(site.id),
        fetchNetworkDevicesWithApi(site.id),
        fetchIspInvoicesWithApi(undefined, site.id)
      ]);
      setClients(nextClients);
      setRouters(nextRouters);
      setRadius(nextRadius);
      setDevices(nextDevices);
      setInvoices(nextInvoices);
    } catch (err) {
      setClients([]);
      setRouters([]);
      setRadius([]);
      setDevices([]);
      setInvoices([]);
      setError(err instanceof Error ? err.message : 'Unable to load ISP dashboard');
    } finally {
      setLoading(false);
    }
  }, [site?.id]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const revenue = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const onlineRouters = routers.filter((router) => router.status === 'online').length;
  const onlineDevices = devices.filter((device) => device.status === 'online').length;
  const activeClients = clients.filter((client) => client.status === 'active').length;

  const stats = [
    { label: 'Active Subscribers', value: activeClients, icon: Users },
    { label: 'Paid Revenue', value: `$${revenue.toFixed(2)}`, icon: CreditCard },
    { label: 'Online Routers', value: `${onlineRouters}/${routers.length}`, icon: Router },
    { label: 'Network Devices', value: `${onlineDevices}/${devices.length}`, icon: Wifi }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">{site?.name || 'ISP'} Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Site-scoped subscribers, routers, RADIUS, devices, and billing data.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'} / {site?.code || '-'}</p>
        </div>
        <button onClick={loadDashboard} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Network Health</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: 'MikroTik BNG/BRAS', value: `${onlineRouters}/${routers.length}`, icon: Router },
              { label: 'RADIUS Servers', value: `${radius.filter((item) => item.status === 'online').length}/${radius.length}`, icon: Database },
              { label: 'OLT/ONU Devices', value: `${onlineDevices}/${devices.length}`, icon: Activity }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <row.icon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-900">{row.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{loading ? '...' : row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Recent Invoices</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Loading invoices from API...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">No invoices found for this ISP site.</div>
            ) : invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">{invoice.number}</p>
                  <p className="text-xs text-gray-400">{invoice.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">${Number(invoice.amount || 0).toFixed(2)}</p>
                  <p className="text-[10px] font-bold uppercase text-gray-400">{invoice.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
