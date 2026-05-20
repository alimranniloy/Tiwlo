import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Filter,
  Info,
  RefreshCw,
  Search,
  Terminal,
  XCircle
} from 'lucide-react';
import { fetchAuditLogs } from '../../lib/tiwloApi';

const mapLog = (item: any) => {
  const action = String(item.action || 'event');
  const type = action.includes('delete') || action.includes('revoke') ? 'warning' : action.includes('fail') ? 'error' : 'success';
  return {
    id: item.id,
    type,
    service: String(item.resource || 'SYSTEM').toUpperCase(),
    message: `${action.replace(/_/g, ' ')} ${item.resourceId || ''}`.trim(),
    time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : '-'
  };
};

export default function SystemLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const items = await fetchAuditLogs();
      setLogs(items.map(mapLog));
    } catch (err) {
      setLogs([]);
      setError(err instanceof Error ? err.message : 'Unable to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">System Logs</h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1">Database-backed audit events from the platform API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadLogs} className="bg-white border border-[#e5e8ed] text-[#4a4a4a] px-4 py-2 rounded font-bold text-[13px] hover:bg-[#f3f5f9] transition-all flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button className="bg-white border border-[#e5e8ed] text-[#4a4a4a] px-4 py-2 rounded font-bold text-[13px] hover:bg-[#f3f5f9] transition-all flex items-center gap-2">
            <Download className="h-4 w-4" /> Download Logs
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="bg-[#1e293b] rounded-lg border border-slate-700 flex-1 flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded">
              <Terminal className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-mono font-bold text-slate-300">audit.log</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <p className="text-[11px] font-mono text-slate-400">Rows: {logs.length}</p>
          </div>
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-500" />
            <Filter className="h-4 w-4 text-slate-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono scrollbar-thin scrollbar-thumb-slate-700">
          {loading ? (
            <div className="p-6 text-center text-[12px] font-bold text-slate-400">Loading audit logs from API...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-[12px] font-bold text-slate-400">No audit logs found in the database.</div>
          ) : logs.map((log) => (
            <div key={log.id} className="group flex items-start gap-4 p-2 rounded hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 min-w-[70px]">{log.time}</span>
                {getIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] font-bold ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-amber-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-blue-400'
                } mr-2`}>
                  [{log.service}]
                </span>
                <span className="text-[12px] text-slate-300 break-words">{log.message}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-[#0f172a] text-[11px] flex items-center justify-between">
          <span className="text-slate-500">Source: GraphQL auditLogs</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className={`font-bold uppercase tracking-wider ${error ? 'text-red-500' : 'text-green-500'}`}>{error ? 'Disconnected' : 'API Connected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
