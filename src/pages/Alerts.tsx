import React, { useEffect, useState } from 'react';
import { Bell, ShieldAlert, Zap, Server, Activity, Plus, Settings, Check, Clock } from 'lucide-react';
import { fetchNotificationsWithApi, markNotificationReadWithApi } from '../lib/tiwloApi';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotificationsWithApi(undefined, 'unread')
      .then((items) => {
        setAlerts(items.map((item) => ({
          id: item.id,
          title: item.title,
          target: item.scopeId || item.scope || 'platform',
          description: item.message,
          severity: item.type === 'warning' ? 'warning' : item.type === 'error' ? 'critical' : 'info',
          time: item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'
        })));
      })
      .catch((err) => {
        setAlerts([]);
        setError(err instanceof Error ? err.message : 'Unable to load alerts');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = async (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    try {
      await markNotificationReadWithApi(id);
    } catch {}
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Alerts & Uptime</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Stay informed about your infrastructure's health and performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] rounded-md text-sm font-bold text-[#374151] hover:bg-gray-50 transition-colors">
            <Settings className="h-4 w-4" /> Policy Settings
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> Create Uptime Check
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
           <div className="bg-white rounded-md border border-[#E5E7EB] overflow-hidden">
              <div className="p-6 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
                 <h2 className="font-bold text-[#111827] text-sm uppercase tracking-wide flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" /> Active Alerts
                 </h2>
                 <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{alerts.length} Unread</span>
              </div>
              {error && (
                <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-[13px] font-bold text-red-600">{error}</div>
              )}
              <div className="divide-y divide-[#E5E7EB]">
                {loading ? (
                  <div className="p-8 text-center text-sm font-bold text-[#6B7280]">Loading alerts from API...</div>
                ) : alerts.length === 0 ? (
                  <div className="p-8 text-center text-sm font-bold text-[#6B7280]">No unread alerts found in the database.</div>
                ) : alerts.map((alert) => (
                  <div key={alert.id} className="p-6 flex items-start gap-5 hover:bg-red-50/20 transition-colors">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      <Server className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-[#111827]">{alert.title}</h4>
                        <span className="text-[11px] text-[#6B7280] flex items-center gap-1 font-medium"><Clock className="h-3 w-3" /> {alert.time}</span>
                      </div>
                      <p className="text-[13px] text-[#111827] font-medium bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100 mb-2">{alert.target}</p>
                      <p className="text-[13px] text-[#6B7280] leading-relaxed">{alert.description}</p>
                      <div className="mt-4 flex gap-3">
                         <button onClick={() => handleAcknowledge(alert.id)} className="text-[12px] font-bold text-red-600 hover:underline">Acknowledge</button>
                         <button className="text-[12px] font-bold text-[#6B7280] hover:underline">View Metrics</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-[#111827] p-8 rounded-md text-white">
              <h3 className="text-xl font-bold mb-4">Uptime Monitoring</h3>
             <div className="space-y-6">
                 {[
                  { name: 'Unread Alerts', value: alerts.length },
                  { name: 'Warnings', value: alerts.filter((alert) => alert.severity === 'warning').length },
                  { name: 'Critical', value: alerts.filter((alert) => alert.severity === 'critical').length }
                 ].map((svc) => (
                   <div key={svc.name} className="flex items-center justify-between">
                     <div>
                        <p className="text-sm font-bold">{svc.name}</p>
                        <p className="text-[11px] text-gray-400">Database count: {svc.value}</p>
                     </div>
                     <div className="w-8 h-8 rounded-full border-2 border-green-500/20 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-500" />
                     </div>
                   </div>
                 ))}
              </div>
              <button className="w-full mt-10 bg-white/10 hover:bg-white/20 py-3 rounded-md font-bold text-sm transition-all border border-white/10">
                 View All Status
              </button>
           </div>

           <div className="bg-blue-50 p-6 rounded-md border border-blue-100">
              <div className="flex items-center gap-3 text-blue-800 mb-2">
                 <Zap className="h-5 w-5" />
                 <h4 className="font-bold text-sm">Smart Alerts</h4>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed mb-4">
                 Our machine learning model detects anomalous traffic patterns before they affect your services.
              </p>
              <button className="text-[12px] font-bold text-blue-600 hover:underline">Learn more</button>
           </div>
        </div>
      </div>
    </div>
  );
}
