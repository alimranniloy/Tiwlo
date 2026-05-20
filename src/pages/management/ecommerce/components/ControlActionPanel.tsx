import React from 'react';
import { Plus, Power, RefreshCw, RotateCcw, ShieldAlert, Zap } from 'lucide-react';
import type { EcommerceControlAction } from '../../../../lib/api/ecommerce';

interface ControlActionPanelProps {
  title?: string;
  actions: EcommerceControlAction[];
  busyAction?: string;
  onAction: (action: EcommerceControlAction) => void;
  onCreate: () => void;
}

const intentClass: Record<string, string> = {
  primary: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
  success: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
  danger: 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50',
  neutral: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
};

const iconForAction = (key: string) => {
  if (key === 'create_record') return Plus;
  if (key.includes('disable') || key.includes('enable')) return Power;
  if (key.includes('purge') || key.includes('rotate')) return RotateCcw;
  if (key.includes('alert') || key.includes('audit')) return ShieldAlert;
  if (key.includes('sync')) return RefreshCw;
  return Zap;
};

export default function ControlActionPanel({ title = 'Operator Controls', actions, busyAction, onAction, onCreate }: ControlActionPanelProps) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Run module-level commands for this control lane.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = iconForAction(action.key);
          const className = intentClass[action.intent] || intentClass.neutral;
          const busy = busyAction === action.key;

          return (
            <button
              key={action.key}
              onClick={() => action.key === 'create_record' ? onCreate() : onAction(action)}
              disabled={Boolean(busyAction)}
              className={`min-h-[76px] rounded-sm border px-4 py-3 text-left transition-colors disabled:opacity-60 ${className}`}
            >
              <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide">
                <Icon className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                {action.label}
              </span>
              {action.description && <span className="block mt-1 text-[11px] leading-relaxed opacity-75">{action.description}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
