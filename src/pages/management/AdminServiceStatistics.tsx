import React from 'react';
import { Activity, AlertCircle, Database, Globe, RefreshCw, Server, ShoppingBag, Users } from 'lucide-react';
import { fetchDashboardSummary, fetchEcommerceAdminSummary, fetchIspDashboardSummary, fetchPlansWithApi } from '../../lib/tiwloApi';
import { useCurrency } from '../../lib/useCurrency';

function numberValue(value?: number) {
  return Number(value || 0).toLocaleString();
}

export default function AdminServiceStatistics() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'admin' });
  const [summary, setSummary] = React.useState<any>(null);
  const [commerce, setCommerce] = React.useState<any>(null);
  const [isp, setIsp] = React.useState<any>(null);
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadStats = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mainSummary, commerceSummary, ispSummary, planItems] = await Promise.all([
        fetchDashboardSummary(),
        fetchEcommerceAdminSummary(),
        fetchIspDashboardSummary(),
        fetchPlansWithApi()
      ]);
      setSummary(mainSummary);
      setCommerce(commerceSummary);
      setIsp(ispSummary);
      setPlans(planItems);
    } catch (err) {
      setSummary(null);
      setCommerce(null);
      setIsp(null);
      setPlans([]);
      setError(err instanceof Error ? err.message : 'Unable to load service statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const stats = [
    { label: 'Users', value: numberValue(summary?.users), icon: Users },
    { label: 'Cloud Resources', value: numberValue(summary?.droplets), icon: Server },
    { label: 'Domains', value: numberValue(summary?.domains), icon: Globe },
    { label: 'Invoices', value: numberValue(summary?.invoices), icon: Database },
    { label: 'Commerce Stores', value: numberValue(commerce?.stores), icon: ShoppingBag },
    { label: 'Store Orders', value: numberValue(commerce?.orders), icon: Activity },
    { label: 'ISP Sites', value: numberValue(isp?.sites), icon: Globe },
    { label: 'ISP Clients', value: numberValue(isp?.clients), icon: Users }
  ];

  const revenueRows = [
    { label: 'Platform Revenue', value: money(summary?.revenue) },
    { label: 'Commerce Revenue', value: money(commerce?.revenue) },
    { label: 'ISP Revenue', value: money(isp?.revenue) }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Service Statistics</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Operational totals from the dashboard, commerce, ISP, and plan APIs.</p>
        </div>
        <button onClick={loadStats} className="flex items-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-[#f3f5f9]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-[#e5e8ed] bg-white p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded bg-blue-50 text-[#0069ff]">
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2e3d49]">{loading ? '-' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-md border border-[#e5e8ed] bg-white lg:col-span-2">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Product Mix</h2>
          </div>
          <div className="divide-y divide-[#e5e8ed]">
            {[
              { label: 'Cloud Compute', count: summary?.droplets, detail: `${summary?.domains || 0} domains attached` },
              { label: 'E-Commerce', count: commerce?.stores, detail: `${commerce?.products || 0} products / ${commerce?.customers || 0} customers` },
              { label: 'ISP Connectivity', count: isp?.sites, detail: `${isp?.routers || 0} routers / ${isp?.packages || 0} packages` }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-[14px] font-bold text-[#2e3d49]">{row.label}</p>
                  <p className="text-[12px] text-gray-500">{row.detail}</p>
                </div>
                <span className="text-xl font-bold text-[#0069ff]">{numberValue(row.count)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Revenue</h2>
          </div>
          <div className="divide-y divide-[#e5e8ed]">
            {revenueRows.map((row) => (
              <div key={row.label} className="px-6 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{row.label}</p>
                <p className="mt-1 text-xl font-bold text-[#2e3d49]">{loading ? '-' : row.value}</p>
              </div>
            ))}
            <div className="px-6 py-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Active Plans</p>
              <p className="mt-1 text-xl font-bold text-[#2e3d49]">{plans.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
