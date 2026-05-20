import React from 'react';
import { CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import type { EcommerceControlSection } from '../../../../lib/api/ecommerce';

interface ControlActivityPanelProps {
  section: EcommerceControlSection;
  title?: string;
}

function formatDate(value?: string) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ControlActivityPanel({ section, title = 'Recent Activity' }: ControlActivityPanelProps) {
  const runbook = Array.isArray(section.config?.runbook) ? section.config?.runbook : [];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-sm border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Runbook</h2>
        </div>
        <div className="space-y-2">
          {runbook.length === 0 ? (
            <p className="text-[12px] text-gray-400 font-medium">No runbook entries are registered.</p>
          ) : runbook.map((item: string, index: number) => (
            <div key={`${item}-${index}`} className="flex items-center gap-3 rounded-sm border border-slate-100 bg-slate-50/60 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-[12px] font-medium text-gray-600">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        </div>
        <div className="space-y-3">
          {section.activity.length === 0 ? (
            <p className="text-[12px] text-gray-400 font-medium">No recent commerce activity.</p>
          ) : section.activity.map((item) => (
            <div key={item.id} className="border-l-2 border-indigo-100 pl-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-bold text-gray-800">{item.title}</p>
                <span className="text-[10px] font-bold uppercase text-gray-400">{item.status}</span>
              </div>
              {item.message && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{item.message}</p>}
              <p className="text-[10px] text-gray-400 mt-1">{formatDate(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
