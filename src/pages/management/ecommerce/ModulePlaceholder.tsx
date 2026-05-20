import React from 'react';
import { useLocation } from 'react-router-dom';
import { Package, Database, Activity, RefreshCw, Power } from 'lucide-react';
import { fetchAdminModules, updateAdminModuleStatus } from '../../../lib/tiwloApi';

export default function ModulePlaceholder() {
  const location = useLocation();
  const pathName = location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Module';
  const [module, setModule] = React.useState<any>(null);
  const [records, setRecords] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadModule = React.useCallback(() => {
    setLoading(true);
    setError('');
    fetchAdminModules()
      .then((items) => {
        const activeModule = items.find((item) => item.path === location.pathname) ||
          items.find((item) => location.pathname.endsWith(item.path || ''));
        setModule(activeModule || null);
        if (activeModule) {
          setRecords([
            { label: 'Status', value: activeModule.status },
            { label: 'Health', value: activeModule.metrics?.health || 'not reported' },
            { label: 'Records', value: activeModule.metrics?.records ?? 0 },
            { label: 'Mode', value: activeModule.config?.productionReady ? 'production' : 'not configured' }
          ]);
        } else {
          setRecords([]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load module registry'))
      .finally(() => setLoading(false));
  }, [location.pathname]);

  React.useEffect(() => {
    loadModule();
  }, [loadModule]);

  const toggleModule = async () => {
    if (!module) return;
    const status = module.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await updateAdminModuleStatus(module.key, status);
      setModule(updated);
      setRecords((current) => current.map((record) => record.label === 'Status' ? { ...record, value: updated.status } : record));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update module status');
    }
  };

  const exportModule = () => {
    const blob = new Blob([JSON.stringify(module || { path: location.pathname, records }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pathName.replace(/\s+/g, '-') || 'module'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize tracking-tight">{pathName}</h1>
          <p className="text-gray-500 text-sm">{module?.description || `System data and management for ${pathName} module.`}</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={exportModule} className="px-4 py-2 bg-white border border-gray-200 rounded-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              Export Data
           </button>
           <button onClick={toggleModule} disabled={!module} className="px-4 py-2 bg-indigo-600 rounded-sm text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              <Power className="w-4 h-4 mr-2 inline" /> {module?.status === 'active' ? 'Disable' : 'Enable'}
           </button>
        </div>
      </div>

      {error && <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {records.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {records.map((record) => (
            <div key={record.label} className="bg-white border border-gray-200 rounded-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{record.label}</span>
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-lg font-bold text-gray-900 capitalize">{String(record.value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center text-center">
         <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
            {module ? <Database className="w-8 h-8" /> : <Package className="w-8 h-8" />}
         </div>
         <h2 className="text-lg font-bold text-gray-800">{loading ? 'Loading Module' : module ? `${module.label} Connected` : 'No Module Registered'}</h2>
         <p className="text-gray-400 text-sm mt-1 max-w-xs">
           {module ? 'This module is registered in the production module registry and can be enabled or disabled here.' : `No admin module record is registered for ${location.pathname}.`}
         </p>
         <button onClick={loadModule} className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-sm text-sm font-bold uppercase tracking-wider">
            <RefreshCw className="mr-2 inline h-4 w-4" /> Refresh Module
         </button>
      </div>
    </div>
  );
}
