import React from 'react';
import { Edit3, MoreHorizontal, Pause, Play, Search, Trash2 } from 'lucide-react';
import type { EcommerceControlRecord } from '../../../../lib/api/ecommerce';

interface ControlRecordTableProps {
  title?: string;
  records: EcommerceControlRecord[];
  busyAction?: string;
  onEdit: (record: EcommerceControlRecord) => void;
  onDelete: (record: EcommerceControlRecord) => void;
  onDeleteAll: () => void;
  onRecordAction: (actionKey: string, record: EcommerceControlRecord) => void;
}

const statusClasses = (status: string) => {
  const value = status.toLowerCase();
  if (['active', 'enabled', 'paid', 'delivered', 'fulfilled', 'read', 'synced'].includes(value)) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (['pending', 'queued', 'review', 'open', 'in_transit'].includes(value)) return 'text-amber-700 bg-amber-50 border-amber-100';
  if (['suspended', 'disabled', 'inactive', 'unread', 'failed', 'overdue'].includes(value)) return 'text-rose-700 bg-rose-50 border-rose-100';
  return 'text-gray-600 bg-gray-50 border-gray-200';
};

const dataPreview = (data?: Record<string, unknown>) => {
  if (!data) return [];
  return Object.entries(data)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`);
};

export default function ControlRecordTable({ title = 'Control Records', records, busyAction, onEdit, onDelete, onDeleteAll, onRecordAction }: ControlRecordTableProps) {
  const [search, setSearch] = React.useState('');
  const manualRecords = records.filter((record) => !record.id.includes(':'));

  const filtered = records.filter((record) => {
    const haystack = `${record.title} ${record.status} ${record.owner || ''} ${record.summary || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">{filtered.length} visible records / {manualRecords.length} editable manual records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search records..."
              className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={onDeleteAll}
            disabled={manualRecords.length === 0 || Boolean(busyAction)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-rose-200 px-3 py-2 text-[12px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Manual
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-bold">Record</th>
              <th className="px-5 py-3 font-bold">Owner</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 font-bold">Data</th>
              <th className="px-5 py-3 font-bold text-right">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No records match this filter.</td>
              </tr>
            ) : filtered.map((record) => {
              const manual = !record.id.includes(':');
              const storeRecord = record.id.startsWith('store:');
              const storeActive = record.status.toLowerCase() === 'active';
              const preview = dataPreview(record.data);

              return (
                <tr key={record.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 min-w-[260px]">
                    <p className="text-[13px] font-bold text-gray-900">{record.title}</p>
                    <p className="text-[12px] text-gray-500 mt-1 line-clamp-2">{record.summary || record.id}</p>
                  </td>
                  <td className="px-5 py-4 text-[12px] font-medium text-gray-600">{record.owner || 'Platform'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-sm border px-2 py-1 text-[10px] font-bold uppercase ${statusClasses(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 min-w-[240px]">
                    <div className="flex flex-wrap gap-1.5">
                      {preview.length === 0 ? (
                        <span className="text-[11px] text-gray-400">No scalar metadata</span>
                      ) : preview.map((item) => (
                        <span key={item} className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {storeRecord && (
                        <button
                          onClick={() => onRecordAction(storeActive ? 'pause_store' : 'resume_store', record)}
                          disabled={Boolean(busyAction)}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {storeActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          {storeActive ? 'Suspend' : 'Resume'}
                        </button>
                      )}
                      {manual ? (
                        <>
                          <button
                            onClick={() => onEdit(record)}
                            disabled={Boolean(busyAction)}
                            className="flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(record)}
                            disabled={Boolean(busyAction)}
                            className="flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button className="flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 text-slate-300">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
