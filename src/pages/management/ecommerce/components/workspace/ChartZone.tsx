import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SectionVisual } from '../../sectionBlueprints';
import { cardFrame, chartColors, sourceForVisual, type WorkspaceData } from './shared';

interface ChartZoneProps {
  title: string;
  description: string;
  visual: SectionVisual;
  data: WorkspaceData;
}

export default function ChartZone({ title, description, visual, data }: ChartZoneProps) {
  const source = sourceForVisual(visual, data);

  return (
    <div className={`${cardFrame} min-h-[330px] p-5`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
        </div>
        <span className="rounded-sm border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">{visual}</span>
      </div>
      <div className="h-[245px]">
        <ResponsiveContainer width="100%" height="100%">
          {visual === 'pie' ? (
            <PieChart>
              <Tooltip />
              <Pie data={source} dataKey="value" nameKey="name" innerRadius={56} outerRadius={94}>
                {source.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
            </PieChart>
          ) : visual === 'line' ? (
            <AreaChart data={source}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area dataKey="value" stroke="#0891b2" fill="#0891b2" fillOpacity={0.08} strokeWidth={2} />
            </AreaChart>
          ) : visual === 'composed' ? (
            <ComposedChart data={source}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" />
              <Line dataKey="value" stroke="#10b981" />
            </ComposedChart>
          ) : (
            <BarChart data={source}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {source.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
