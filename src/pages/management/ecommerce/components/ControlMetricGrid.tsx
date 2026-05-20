import React from 'react';
import { Activity, BarChart3, Database, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import type { EcommerceControlMetric } from '../../../../lib/api/ecommerce';

interface ControlMetricGridProps {
  metrics: EcommerceControlMetric[];
}

const toneClasses: Record<string, string> = {
  emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  amber: 'text-amber-600 bg-amber-50 border-amber-100',
  rose: 'text-rose-600 bg-rose-50 border-rose-100',
  slate: 'text-slate-600 bg-slate-50 border-slate-100'
};

const icons = [BarChart3, TrendingUp, Activity, Database, ShieldCheck, Zap];

export default function ControlMetricGrid({ metrics }: ControlMetricGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = icons[index % icons.length];
        const tone = toneClasses[metric.tone || 'slate'] || toneClasses.slate;

        return (
          <div key={`${metric.label}-${index}`} className="rounded-sm border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{metric.label}</p>
                <div className="mt-2 flex items-end gap-2">
                  <h3 className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{metric.value}</h3>
                  {metric.delta && <span className="pb-0.5 text-[10px] font-bold uppercase text-gray-400">{metric.delta}</span>}
                </div>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-sm border ${tone}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            {metric.detail && <p className="mt-3 text-[12px] leading-relaxed text-gray-500">{metric.detail}</p>}
          </div>
        );
      })}
    </div>
  );
}
