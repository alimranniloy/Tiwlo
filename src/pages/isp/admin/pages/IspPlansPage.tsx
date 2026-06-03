import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { fetchIspPackagesWithApi } from '../../../../lib/tiwloApi';
import { useCurrency } from '../../../../lib/useCurrency';

export default function IspPlansPage({ site }: { site: any }) {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'isp-admin' });
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadPlans = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlans(await fetchIspPackagesWithApi());
    } catch (err) {
      setPlans([]);
      setError(err instanceof Error ? err.message : 'Unable to load internet plans');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Internet Plans</h1>
          <p className="mt-1 text-sm text-gray-500">Plan catalog used by subscribers in this ISP site.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'}</p>
        </div>
        <button onClick={loadPlans} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      {error && <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

      <div className="border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Plan</th>
                <th className="px-4 py-3 font-bold">Speed</th>
                <th className="px-4 py-3 font-bold">Price</th>
                <th className="px-4 py-3 font-bold">Cycle</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading plans from API...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No internet plans found.</td></tr>
              ) : plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">{plan.name}</td>
                  <td className="px-4 py-3 text-gray-600">{plan.speed}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{money(plan.price || 0, 'USD')}</td>
                  <td className="px-4 py-3 text-gray-600">{plan.billingCycle || 'month'}</td>
                  <td className="px-4 py-3"><span className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{plan.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
