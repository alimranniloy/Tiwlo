import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CheckCircle2, CircleDot, Database, Layers, Lock, Network, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import type { EcommerceControlAction, EcommerceControlRecord, EcommerceControlSection } from '../../../../lib/api/ecommerce';
import type { EcommerceSectionBlueprint, SectionVisual } from '../sectionBlueprints';
import ControlActionPanel from './ControlActionPanel';
import ControlActivityPanel from './ControlActivityPanel';
import ControlMetricGrid from './ControlMetricGrid';
import ControlRecordComposer from './ControlRecordComposer';
import ControlRecordTable from './ControlRecordTable';

interface SectionExperienceProps {
  section: EcommerceControlSection;
  blueprint: EcommerceSectionBlueprint;
  busyAction?: string;
  saving?: boolean;
  composerOpen: boolean;
  editingRecord?: EcommerceControlRecord | null;
  onAction: (action: EcommerceControlAction) => void;
  onCreate: () => void;
  onCloseComposer: () => void;
  onSaveRecord: (input: { id?: string; title: string; status: string; owner: string; summary: string; data?: Record<string, unknown> }) => void;
  onEditRecord: (record: EcommerceControlRecord) => void;
  onDeleteRecord: (record: EcommerceControlRecord) => void;
  onDeleteAllRecords: () => void;
  onRecordAction: (actionKey: string, record: EcommerceControlRecord) => void;
}

const chartColors = ['#4f46e5', '#0891b2', '#10b981', '#f59e0b', '#e11d48', '#64748b'];

const parseNumber = (value?: string) => {
  const numeric = Number(String(value || '').replace(/[$,%\s,]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const shortLabel = (value: string, max = 16) => value.length > max ? `${value.slice(0, max - 1)}.` : value;

const buildChartData = (section: EcommerceControlSection) => {
  const metricData = section.metrics.map((metric, index) => ({
    name: shortLabel(metric.label, 14),
    value: parseNumber(metric.value) || section.records.length || index + 1,
    detail: metric.detail || metric.value
  }));

  const statusMap = new Map<string, number>();
  for (const record of section.records) {
    statusMap.set(record.status, (statusMap.get(record.status) || 0) + 1);
  }
  const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name: shortLabel(name, 14), value }));

  const ownerMap = new Map<string, number>();
  for (const record of section.records) {
    const owner = record.owner || 'Platform';
    ownerMap.set(owner, (ownerMap.get(owner) || 0) + 1);
  }
  const ownerData = Array.from(ownerMap.entries()).slice(0, 8).map(([name, value]) => ({ name: shortLabel(name, 16), value }));

  const trendMap = new Map<string, number>();
  for (const record of section.records) {
    const date = record.createdAt ? new Date(record.createdAt) : null;
    const key = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Current';
    trendMap.set(key, (trendMap.get(key) || 0) + 1);
  }
  const trendData = Array.from(trendMap.entries()).map(([name, value], index) => ({
    name,
    value,
    active: section.records.filter((record) => record.status === 'active').length || index + 1
  }));

  const entityData = section.records.slice(0, 8).map((record, index) => ({
    name: shortLabel(record.title, 18),
    value: parseNumber(String(record.data?.credits || record.data?.price || record.data?.stock || record.summary || '')) || index + 1,
    status: record.status
  }));

  return {
    metricData: metricData.length ? metricData : [{ name: 'Records', value: section.records.length }],
    statusData: statusData.length ? statusData : [{ name: 'Records', value: section.records.length }],
    ownerData: ownerData.length ? ownerData : [{ name: 'Platform', value: section.records.length }],
    trendData: trendData.length ? trendData : [{ name: 'Current', value: section.records.length, active: section.records.length }],
    entityData: entityData.length ? entityData : [{ name: 'No records', value: 0, status: 'empty' }]
  };
};

function ChartPanel({ title, visual, data }: { title: string; visual: SectionVisual; data: ReturnType<typeof buildChartData> }) {
  const primary = visual === 'pie' ? data.statusData : visual === 'line' || visual === 'composed' ? data.trendData : visual === 'bar' ? data.ownerData : data.metricData;

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-5 min-h-[340px]">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Chart generated from API metrics and records.</p>
        </div>
        <span className="border border-gray-200 rounded-sm px-2 py-1 text-[10px] font-bold uppercase text-gray-500">{visual}</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {visual === 'pie' ? (
            <PieChart>
              <Tooltip />
              <Pie data={primary} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
                {primary.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
            </PieChart>
          ) : visual === 'radial' ? (
            <RadialBarChart innerRadius="18%" outerRadius="96%" data={data.metricData} startAngle={90} endAngle={-270}>
              <Tooltip />
              <RadialBar dataKey="value" background>
                {data.metricData.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </RadialBar>
            </RadialBarChart>
          ) : visual === 'line' ? (
            <LineChart data={primary}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
              <Line dataKey="active" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          ) : visual === 'composed' ? (
            <ComposedChart data={primary}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0891b2" radius={[2, 2, 0, 0]} />
              <Line dataKey="active" stroke="#4f46e5" strokeWidth={2} />
            </ComposedChart>
          ) : visual === 'bar' ? (
            <BarChart data={primary}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {primary.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={primary}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.08} strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EntityCards({ records, noun }: { records: EcommerceControlRecord[]; noun: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {records.slice(0, 6).map((record, index) => (
        <div key={record.id} className="border border-gray-200 bg-white rounded-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-gray-900 truncate">{record.title}</p>
              <p className="text-[11px] text-gray-500 mt-1 truncate">{record.summary || record.owner || record.id}</p>
            </div>
            <span className="h-8 w-8 border border-gray-200 bg-gray-50 rounded-sm flex items-center justify-center text-[11px] font-bold text-gray-500">
              {index + 1}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase font-bold text-gray-400">{noun}</span>
            <span className="text-[10px] uppercase font-bold text-gray-500">{record.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusLanes({ records }: { records: EcommerceControlRecord[] }) {
  const lanes = ['active', 'pending', 'review', 'suspended', 'inactive', 'open', 'unread'];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {lanes.map((lane) => {
        const items = records.filter((record) => record.status.toLowerCase() === lane).slice(0, 4);
        if (!items.length) return null;
        return (
          <div key={lane} className="bg-white border border-gray-200 rounded-sm p-4 min-h-[160px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-500">{lane}</h3>
              <span className="text-[11px] font-bold text-gray-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="border border-gray-100 bg-gray-50 rounded-sm p-2">
                  <p className="text-[12px] font-bold text-gray-700 truncate">{item.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">{item.owner || item.summary || item.id}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopologyPanel({ section, blueprint }: { section: EcommerceControlSection; blueprint: EcommerceSectionBlueprint }) {
  const groups = [
    { title: 'Ingress', icon: Network, records: section.records.filter((_, index) => index % 3 === 0) },
    { title: blueprint.noun, icon: Database, records: section.records.filter((_, index) => index % 3 === 1) },
    { title: 'Control', icon: SlidersHorizontal, records: section.records.filter((_, index) => index % 3 === 2) }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-indigo-600" />
        <h2 className="text-sm font-bold text-gray-900">{blueprint.primaryPanel}</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="border border-gray-200 rounded-sm p-4 bg-gray-50/40">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase text-gray-500">
                  <Icon className="h-3.5 w-3.5" />
                  {group.title}
                </span>
                <span className="text-[11px] font-bold text-gray-400">{group.records.length}</span>
              </div>
              <div className="space-y-2">
                {group.records.slice(0, 4).map((record) => (
                  <div key={record.id} className="bg-white border border-gray-100 rounded-sm px-3 py-2">
                    <p className="text-[12px] font-bold text-gray-800 truncate">{record.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{record.status} / {record.owner || 'platform'}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ControlCluster({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export default function SectionExperience({
  section,
  blueprint,
  busyAction,
  saving,
  composerOpen,
  editingRecord,
  onAction,
  onCreate,
  onCloseComposer,
  onSaveRecord,
  onEditRecord,
  onDeleteRecord,
  onDeleteAllRecords,
  onRecordAction
}: SectionExperienceProps) {
  const data = React.useMemo(() => buildChartData(section), [section]);
  const Icon = blueprint.icon;

  const actions = (
    <ControlActionPanel
      actions={section.actions}
      busyAction={busyAction}
      onAction={onAction}
      onCreate={onCreate}
      title={blueprint.commandLabel}
    />
  );
  const composer = (
    <ControlRecordComposer
      open={composerOpen}
      saving={saving}
      sectionKey={section.key}
      sectionLabel={section.label}
      noun={blueprint.noun}
      record={editingRecord}
      onClose={onCloseComposer}
      onSave={onSaveRecord}
    />
  );
  const table = (
    <ControlRecordTable
      title={blueprint.recordTitle}
      records={section.records}
      busyAction={busyAction}
      onEdit={onEditRecord}
      onDelete={onDeleteRecord}
      onDeleteAll={onDeleteAllRecords}
      onRecordAction={onRecordAction}
    />
  );
  const chart = <ChartPanel title={blueprint.primaryPanel} visual={blueprint.visual} data={data} />;
  const activity = <ControlActivityPanel section={section} title={blueprint.secondaryPanel} />;

  if (blueprint.layout === 'traffic') {
    return (
      <ControlCluster>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8">{chart}</div>
          <div className="xl:col-span-4 bg-gray-900 rounded-sm p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-cyan-300" />
              <h2 className="text-sm font-bold">Live Event Rail</h2>
            </div>
            <div className="space-y-3">
              {section.records.slice(0, 8).map((record) => (
                <div key={record.id} className="border border-white/10 bg-white/5 rounded-sm px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-bold truncate">{record.title}</p>
                    <span className="text-[10px] uppercase text-cyan-200">{record.status}</span>
                  </div>
                  <p className="text-[11px] text-gray-300 truncate mt-1">{record.summary || record.owner || record.id}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ControlMetricGrid metrics={section.metrics} />
        {actions}
        {composer}
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'health') {
    return (
      <ControlCluster>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-5">
            <div className="bg-white border border-gray-200 rounded-sm p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-gray-900">{blueprint.primaryPanel}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.records.slice(0, 8).map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-sm p-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <CircleDot className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold uppercase text-gray-400">{record.status}</span>
                    </div>
                    <p className="mt-3 text-[12px] font-bold text-gray-800 truncate">{record.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{record.owner || blueprint.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="xl:col-span-7">{chart}</div>
        </div>
        <ControlMetricGrid metrics={section.metrics} />
        {actions}
        {composer}
        {activity}
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'directory') {
    return (
      <ControlCluster>
        <ControlMetricGrid metrics={section.metrics} />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-5 bg-white border border-gray-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon icon={Icon} />
              <h2 className="text-sm font-bold text-gray-900">{blueprint.primaryPanel}</h2>
            </div>
            <EntityCards records={section.records} noun={blueprint.noun} />
          </div>
          <div className="xl:col-span-7">{chart}</div>
        </div>
        <StatusLanes records={section.records} />
        {actions}
        {composer}
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'billing') {
    return (
      <ControlCluster>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8">{chart}</div>
          <div className="xl:col-span-4">
            <div className="bg-white border border-gray-200 rounded-sm p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-gray-900">{blueprint.secondaryPanel}</h2>
              </div>
              <div className="space-y-3">
                {section.records.slice(0, 7).map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-gray-900 truncate">{record.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">{record.summary || record.owner}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-gray-400">{record.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ControlMetricGrid metrics={section.metrics} />
        {actions}
        {composer}
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'marketing') {
    return (
      <ControlCluster>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 bg-white border border-gray-200 rounded-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">{blueprint.primaryPanel}</h2>
            <div className="space-y-3">
              {section.records.slice(0, 6).map((record, index) => (
                <div key={record.id}>
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                    <span>{record.title}</span>
                    <span>{record.status}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-sm overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${Math.max(14, 100 - index * 12)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="xl:col-span-8">{chart}</div>
        </div>
        {actions}
        {composer}
        <ControlMetricGrid metrics={section.metrics} />
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'infrastructure') {
    return (
      <ControlCluster>
        <TopologyPanel section={section} blueprint={blueprint} />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-7">{chart}</div>
          <div className="xl:col-span-5">{actions}</div>
        </div>
        {composer}
        <ControlMetricGrid metrics={section.metrics} />
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'marketplace') {
    return (
      <ControlCluster>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-7 bg-white border border-gray-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-900">{blueprint.primaryPanel}</h2>
            </div>
            <EntityCards records={section.records} noun={blueprint.noun} />
          </div>
          <div className="xl:col-span-5">{chart}</div>
        </div>
        <ControlMetricGrid metrics={section.metrics} />
        {actions}
        {composer}
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'governance') {
    return (
      <ControlCluster>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 bg-white border border-gray-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold text-gray-900">{blueprint.primaryPanel}</h2>
            </div>
            <div className="space-y-2">
              {section.records.slice(0, 8).map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-sm p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-gray-900 truncate">{record.title}</p>
                    <span className="text-[10px] font-bold uppercase text-gray-400">{record.status}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{record.summary || record.owner || record.id}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="xl:col-span-8">{chart}</div>
        </div>
        {actions}
        {composer}
        <ControlMetricGrid metrics={section.metrics} />
        {activity}
        {table}
      </ControlCluster>
    );
  }

  if (blueprint.layout === 'advanced') {
    return (
      <ControlCluster>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-5 bg-white border border-gray-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-900">{blueprint.primaryPanel}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.metrics.map((metric) => (
                <div key={metric.label} className="border border-gray-200 rounded-sm p-3 bg-gray-50/40">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{metric.label}</p>
                  <p className="mt-2 text-lg font-bold text-gray-900">{metric.value}</p>
                  <p className="text-[11px] text-gray-500 truncate">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="xl:col-span-7">{chart}</div>
        </div>
        {actions}
        {composer}
        {table}
        {activity}
      </ControlCluster>
    );
  }

  return (
    <ControlCluster>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">{chart}</div>
        <div className="xl:col-span-4">
          <div className="bg-white border border-gray-200 rounded-sm p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-900">{blueprint.secondaryPanel}</h2>
            </div>
            <EntityCards records={section.records} noun={blueprint.noun} />
          </div>
        </div>
      </div>
      <ControlMetricGrid metrics={section.metrics} />
      {actions}
      {composer}
      {table}
      {activity}
    </ControlCluster>
  );
}

function UsersIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return <Icon className="h-4 w-4 text-indigo-600" />;
}
