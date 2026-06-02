import React, { useEffect, useState } from 'react';
import { AlertCircle, Activity, Clock, Server, Globe, User, Shield, Terminal, Zap, Search, Filter } from 'lucide-react';
import { fetchAuditLogs } from '../lib/tiwloApi';

export default function ActivityPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditLogs()
      .then((logs) => {
        setEvents(logs.map((log) => ({
          id: log.id,
          type: log.resource?.toLowerCase().includes('domain') ? 'domain' :
            log.resource?.toLowerCase().includes('invoice') ? 'billing' :
            log.resource?.toLowerCase().includes('credential') ? 'api' :
            log.action?.toLowerCase().includes('login') ? 'security' : 'droplet',
          action: String(log.action || '').replace(/_/g, ' '),
          target: log.resourceId || log.resource || 'system',
          user: log.actorId || 'System',
          time: log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now',
          status: 'Success'
        })));
      })
      .catch((err) => {
        setEvents([]);
        setError(err instanceof Error ? err.message : 'Unable to load activity logs');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">Resource Activity</h1>
          <p className="mt-1 text-sm font-medium text-[#52637a]">Audit log of all actions performed on your resources.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-md border border-[#b9cdf8] bg-white px-4 py-2 text-sm font-bold text-[#0069ff] transition-colors hover:border-[#0069ff] hover:bg-[#f7faff]">
            <Filter className="h-4 w-4" /> Filter
          </button>
          <button className="flex items-center gap-2 rounded-md bg-[#031b4e] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#08204f]">
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        {error && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div className="flex items-center justify-between border-b border-[#e4e9f1] bg-[#f7f9fc] p-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search activity logs..."
                className="w-full rounded-md border border-[#cdd6e3] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
              />
           </div>
           <div className="flex items-center gap-4 text-xs font-bold text-[#6B7280]">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Success</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Failed</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-orange-500 rounded-full"></div> warning</span>
           </div>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-[#6B7280]">Loading activity from API...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-[#6B7280]">No activity logs found in the database.</div>
          ) : events.map((event) => (
            <div key={event.id} className="flex items-center gap-6 p-5 transition-colors hover:bg-[#f7faff]">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                event.type === 'droplet' ? 'bg-blue-50 text-blue-600' :
                event.type === 'domain' ? 'bg-indigo-50 text-indigo-600' :
                event.type === 'security' ? 'bg-red-50 text-red-600' :
                event.type === 'billing' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
              }`}>
                {event.type === 'droplet' && <Server className="h-5 w-5" />}
                {event.type === 'domain' && <Globe className="h-5 w-5" />}
                {event.type === 'security' && <Shield className="h-5 w-5" />}
                {event.type === 'billing' && <Zap className="h-5 w-5" />}
                {event.type === 'api' && <Terminal className="h-5 w-5" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#111827] text-sm">{event.action}</p>
                  <span className="text-[11px] text-[#6B7280] font-medium px-2 py-0.5 bg-gray-100 rounded-full">{event.target}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                   <p className="text-[12px] text-[#6B7280] flex items-center gap-1"><User className="h-3 w-3" /> {event.user}</p>
                   <p className="text-[12px] text-[#6B7280] flex items-center gap-1"><Clock className="h-3 w-3" /> {event.time}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  event.status === 'Success' ? 'text-green-600' : 
                  event.status === 'Blocked' ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="w-full border-t border-[#e4e9f1] bg-[#f7f9fc] py-4 text-center text-[13px] font-bold text-blue-600">
           {events.length} audit events loaded
        </div>
      </div>
    </div>
  );
}
