import React from 'react';
import { AlertTriangle, Boxes, CheckCircle2, PlayCircle, Search, Sparkles, Trash2, XCircle } from 'lucide-react';
import type { EcommerceControlSection } from '../../../../../lib/api/ecommerce';
import type { ModuleWorkspaceConfig, WorkspaceZone } from '../../moduleWorkspaceCatalog';
import { getSectionSettings } from '../../sectionSettings';
import ControlMetricGrid from '../ControlMetricGrid';
import ChartZone from './ChartZone';
import RecordActions from './RecordActions';
import { buttonFrame, cardFrame, operationStyle, statusStyle, type ModuleWorkspaceProps, type ZoneRendererProps } from './shared';

function ZoneHeader({ zone }: { zone: WorkspaceZone }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-900">{zone.title}</h3>
      <p className="mt-0.5 text-[12px] text-slate-500">{zone.description}</p>
    </div>
  );
}

function EntityGridZone(props: ModuleWorkspaceProps & { zone: WorkspaceZone }) {
  const { section, workspace, busyAction, onEditRecord, onDeleteRecord, onRecordAction, zone } = props;
  return (
    <div className={`${cardFrame} p-5`}>
      <ZoneHeader zone={zone} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {section.records.slice(0, 10).map((record) => (
          <div key={record.id} className="rounded-sm border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-slate-900">{record.title}</p>
                <p className="mt-1 truncate text-[11px] text-slate-500">{record.summary || record.owner || record.id}</p>
              </div>
              <span className={`rounded-sm border px-2 py-1 text-[10px] font-bold uppercase ${statusStyle(record.status)}`}>{record.status}</span>
            </div>
            <div className="mt-3">
              <RecordActions record={record} operations={workspace.operations} busyAction={busyAction} onEditRecord={onEditRecord} onDeleteRecord={onDeleteRecord} onRecordAction={onRecordAction} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanZone(props: ModuleWorkspaceProps & { zone: WorkspaceZone }) {
  const { section, workspace, busyAction, onEditRecord, onDeleteRecord, onRecordAction, zone } = props;
  const statuses = Array.from(new Set(section.records.map((record) => record.status))).slice(0, 5);
  return (
    <div className={`${cardFrame} p-5`}>
      <ZoneHeader zone={zone} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {statuses.map((status) => {
          const records = section.records.filter((record) => record.status === status).slice(0, 5);
          return (
            <div key={status} className="min-h-[180px] rounded-sm border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-500">{status}</span>
                <span className="text-[11px] font-bold text-slate-400">{records.length}</span>
              </div>
              <div className="space-y-2">
                {records.map((record) => (
                  <div key={record.id} className="rounded-sm border border-slate-100 bg-white p-2">
                    <p className="truncate text-[12px] font-bold text-slate-800">{record.title}</p>
                    <p className="mb-2 truncate text-[10px] text-slate-400">{record.owner || record.summary || record.id}</p>
                    <RecordActions record={record} operations={workspace.operations} busyAction={busyAction} onEditRecord={onEditRecord} onDeleteRecord={onDeleteRecord} onRecordAction={onRecordAction} />
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

function LedgerZone(props: ModuleWorkspaceProps & { zone: WorkspaceZone }) {
  const { section, workspace, busyAction, onEditRecord, onDeleteRecord, onRecordAction, zone } = props;
  return (
    <div className={`${cardFrame} overflow-hidden`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">{zone.title}</h3>
        <p className="mt-0.5 text-[12px] text-slate-500">{zone.description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Summary</th>
              <th className="px-5 py-3 text-right">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {section.records.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-4 text-[13px] font-bold text-slate-900">{record.title}</td>
                <td className="px-5 py-4 text-[12px] text-slate-600">{record.owner || 'Platform'}</td>
                <td className="px-5 py-4"><span className={`rounded-sm border px-2 py-1 text-[10px] font-bold uppercase ${statusStyle(record.status)}`}>{record.status}</span></td>
                <td className="max-w-sm truncate px-5 py-4 text-[12px] text-slate-500">{record.summary || record.id}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <RecordActions record={record} operations={workspace.operations} busyAction={busyAction} onEditRecord={onEditRecord} onDeleteRecord={onDeleteRecord} onRecordAction={onRecordAction} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsZone({ section, zone, workspace }: { section: EcommerceControlSection; zone: WorkspaceZone; workspace: ModuleWorkspaceConfig }) {
  const settings = getSectionSettings(section.key, workspace.primaryNoun);
  return (
    <div className={`${cardFrame} p-5`}>
      <ZoneHeader zone={zone} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {settings.map((item, index) => (
          <label key={item} className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50/50 px-3 py-3">
            <span className="text-[12px] font-semibold text-slate-700">{item}</span>
            <input type="checkbox" defaultChecked={index < 3} className="h-4 w-4 accent-indigo-600" />
          </label>
        ))}
      </div>
    </div>
  );
}

function MatrixZone({ section, zone, workspace }: { section: EcommerceControlSection; zone: WorkspaceZone; workspace: ModuleWorkspaceConfig }) {
  const rows = section.records.slice(0, 8);
  const columns = ['Status', 'Owner', 'Rule', 'Audit'];
  return (
    <div className={`${cardFrame} p-5`}>
      <ZoneHeader zone={zone} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {columns.map((column, columnIndex) => (
          <div key={column} className="rounded-sm border border-slate-200 bg-slate-50/60 p-3">
            <p className="mb-3 text-[10px] font-bold uppercase text-slate-400">{column}</p>
            <div className="space-y-2">
              {rows.slice(0, 5).map((record, index) => (
                <div key={`${column}-${record.id}`} className="rounded-sm border border-slate-100 bg-white px-3 py-2">
                  <p className="truncate text-[12px] font-bold text-slate-800">{columnIndex === 0 ? record.status : columnIndex === 1 ? record.owner || 'Platform' : columnIndex === 2 ? workspace.primaryNoun : index % 2 ? 'logged' : 'ready'}</p>
                  <p className="truncate text-[10px] text-slate-400">{record.title}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationZone({ zone, workspace }: { zone: WorkspaceZone; workspace: ModuleWorkspaceConfig }) {
  return (
    <div className={`${cardFrame} p-5`}>
      <ZoneHeader zone={zone} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {workspace.operations.slice(0, 4).map((operation, index) => (
          <div key={operation.key} className="rounded-sm border border-slate-200 bg-slate-50/50 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 bg-white text-[11px] font-bold text-slate-500">{index + 1}</span>
            <p className="mt-3 text-[12px] font-bold text-slate-900">{operation.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{operation.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineZone({ section, zone }: { section: EcommerceControlSection; zone: WorkspaceZone }) {
  const items = section.activity.length ? section.activity : section.records.slice(0, 8).map((record) => ({
    id: record.id,
    title: record.title,
    status: record.status,
    message: record.summary,
    createdAt: record.createdAt
  }));
  return (
    <div className={`${cardFrame} p-5`}>
      <ZoneHeader zone={zone} />
      <div className="space-y-3">
        {items.slice(0, 8).map((item) => (
          <div key={item.id} className="border-l-2 border-indigo-200 pl-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-bold text-slate-900">{item.title}</p>
              <span className="text-[10px] font-bold uppercase text-slate-400">{item.status}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{item.message || item.createdAt || item.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DangerZone({
  workspace,
  busyAction,
  onAction,
  onDeleteAllRecords
}: Pick<ModuleWorkspaceProps, 'workspace' | 'busyAction' | 'onAction' | 'onDeleteAllRecords'>) {
  const dangerOps = workspace.operations.filter((operation) => operation.intent === 'danger' && !operation.targetPrefix);
  return (
    <div className="rounded-sm border border-rose-200 bg-rose-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-rose-600" />
        <h3 className="text-sm font-bold text-rose-900">Danger Controls</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {dangerOps.map((operation) => (
          <button key={operation.key} onClick={() => onAction({ key: operation.key, label: operation.label, intent: operation.intent, description: operation.description })} disabled={Boolean(busyAction)} className={`${buttonFrame} min-h-[76px] flex-col items-start border-rose-200 bg-white px-4 py-3 text-left text-rose-700`}>
            <XCircle className="h-4 w-4" />
            <span>{operation.label}</span>
            <span className="text-[11px] font-semibold">{operation.description}</span>
          </button>
        ))}
        <button onClick={onDeleteAllRecords} disabled={Boolean(busyAction)} className={`${buttonFrame} min-h-[76px] flex-col items-start border-rose-200 bg-white px-4 py-3 text-left text-rose-700`}>
          <Trash2 className="h-4 w-4" />
          <span>Clear Manual Records</span>
          <span className="text-[11px] font-semibold">Delete manually created records for this page.</span>
        </button>
      </div>
    </div>
  );
}

type CatalogFunction = {
  key: string;
  group: string;
  label: string;
  intent: 'primary' | 'success' | 'danger' | 'neutral' | string;
  description?: string;
  payload?: Record<string, unknown>;
};

function FunctionCatalogZone({
  section,
  zone,
  workspace,
  busyAction,
  onAction
}: Pick<ModuleWorkspaceProps, 'section' | 'workspace' | 'busyAction' | 'onAction'> & { zone: WorkspaceZone }) {
  const [query, setQuery] = React.useState('');
  const [group, setGroup] = React.useState('');
  const catalog = React.useMemo(() => (
    Array.isArray(section.config?.functionCatalog) ? section.config.functionCatalog as CatalogFunction[] : []
  ), [section.config]);
  const groups = React.useMemo(() => Array.from(new Set(catalog.map((item) => item.group))).sort(), [catalog]);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((item) => {
      if (group && item.group !== group) return false;
      if (!q) return true;
      return `${item.label} ${item.description || ''} ${item.group}`.toLowerCase().includes(q);
    });
  }, [catalog, group, query]);

  const groupCards = groups.slice(0, 6).map((name, index) => ({
    label: name,
    value: catalog.filter((item) => item.group === name).length,
    icon: index % 3 === 0 ? Boxes : index % 3 === 1 ? CheckCircle2 : Sparkles,
    detail: `${workspace.primaryNoun} controls, settings, and GraphQL actions`
  }));

  return (
    <div className={`${cardFrame} overflow-hidden`}>
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">{zone.title}</h3>
            </div>
            <p className="mt-1 text-[12px] text-slate-500">{zone.description}</p>
          </div>
          <span className="inline-flex h-9 items-center rounded-sm border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-black uppercase tracking-wide text-indigo-700">
            {catalog.length || section.config?.functionCount || 0} functions
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">
        {groupCards.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => setGroup((current) => current === item.label ? '' : item.label)}
              className={`rounded-sm border p-4 text-left transition-colors ${group === item.label ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50/50 hover:bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 bg-white text-indigo-600">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-lg font-black tabular-nums text-slate-900">{item.value}</span>
              </div>
              <p className="mt-3 text-[12px] font-bold text-slate-900">{item.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.detail}</p>
            </button>
          );
        })}
      </div>

      <div className="p-5">
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${workspace.primaryNoun.toLowerCase()} functions...`}
              className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white"
            />
          </div>
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            className="h-10 rounded-sm border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300"
          >
            <option value="">All function groups</option>
            {groups.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 12).map((item) => (
            <button
              key={`${item.group}-${item.key}`}
              onClick={() => onAction({
                key: String(item.payload?.actionKey || item.key),
                label: item.label,
                intent: item.intent,
                description: item.description,
                payload: item.payload
              })}
              disabled={Boolean(busyAction)}
              className={`${buttonFrame} min-h-[86px] flex-col items-start px-4 py-3 text-left ${operationStyle(item.intent as any)}`}
            >
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide">
                <PlayCircle className={`h-4 w-4 ${busyAction === item.key ? 'animate-spin' : ''}`} />
                {item.label}
              </span>
              <span className="text-[11px] font-semibold leading-relaxed opacity-75">{item.description}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Mode: {workspace.mode} / showing {Math.min(filtered.length, 12)} of {filtered.length} matched functions
      </div>
    </div>
  );
}

export default function ZoneRenderer(props: ZoneRendererProps) {
  const { zone, blueprint, data, section, workspace } = props;
  if (zone.kind === 'metrics') return <ControlMetricGrid metrics={section.metrics} />;
  if (zone.kind === 'chart') return <ChartZone title={zone.title} description={zone.description} visual={blueprint.visual} data={data} />;
  if (zone.kind === 'entityGrid') return <EntityGridZone {...props} />;
  if (zone.kind === 'kanban') return <KanbanZone {...props} />;
  if (zone.kind === 'ledger') return <LedgerZone {...props} />;
  if (zone.kind === 'settings') return <SettingsZone section={section} zone={zone} workspace={workspace} />;
  if (zone.kind === 'matrix') return <MatrixZone section={section} zone={zone} workspace={workspace} />;
  if (zone.kind === 'automation') return <AutomationZone zone={zone} workspace={workspace} />;
  if (zone.kind === 'timeline') return <TimelineZone section={section} zone={zone} />;
  if (zone.kind === 'danger') return <DangerZone workspace={workspace} busyAction={props.busyAction} onAction={props.onAction} onDeleteAllRecords={props.onDeleteAllRecords} />;
  if (zone.kind === 'functionCatalog') return <FunctionCatalogZone section={section} zone={zone} workspace={workspace} busyAction={props.busyAction} onAction={props.onAction} />;
  return null;
}
