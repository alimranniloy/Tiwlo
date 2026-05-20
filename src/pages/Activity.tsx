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
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Resource Activity</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Audit log of all actions performed on your resources.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] rounded-md text-sm font-bold text-[#374151] hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-md text-sm font-bold hover:bg-black transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-md border border-[#E5E7EB] overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div className="p-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search activity logs..."
                className="w-full bg-white border border-[#D1D5DB] rounded-md py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
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
            <div key={event.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center gap-6">
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
        
        <div className="w-full py-4 bg-[#F9FAFB] text-[13px] font-bold text-blue-600 text-center border-t border-[#E5E7EB]">
           {events.length} audit events loaded
        </div>
      </div>
    </div>
  );
}
