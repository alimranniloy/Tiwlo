import type { EcommerceControlAction, EcommerceControlRecord, EcommerceControlSection } from '../../../../../lib/api/ecommerce';
import type { EcommerceSectionBlueprint, SectionVisual } from '../../sectionBlueprints';
import type { ModuleWorkspaceConfig, WorkspaceOperation, WorkspaceZone } from '../../moduleWorkspaceCatalog';

export interface ModuleWorkspaceProps {
  section: EcommerceControlSection;
  blueprint: EcommerceSectionBlueprint;
  workspace: ModuleWorkspaceConfig;
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

export type WorkspaceFilter = {
  query: string;
  status: string;
  scope: 'all' | 'title' | 'owner' | 'status' | 'metadata';
  includeMetadata: boolean;
};

export type WorkspaceData = ReturnType<typeof buildWorkspaceData>;

export type ZoneRendererProps = ModuleWorkspaceProps & {
  zone: WorkspaceZone;
  data: WorkspaceData;
};

export const chartColors = ['#4f46e5', '#0891b2', '#10b981', '#f59e0b', '#e11d48', '#64748b'];

export const parseNumber = (value?: string) => {
  const numeric = Number(String(value || '').replace(/[$,%\s,]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

export const shortLabel = (value = '', max = 18) => value.length > max ? `${value.slice(0, max - 1)}.` : value;

export const statusStyle = (status = '') => {
  const value = status.toLowerCase();
  if (['active', 'paid', 'read', 'fulfilled', 'delivered', 'synced', 'enabled', 'resolved', 'approved'].includes(value)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['pending', 'queued', 'review', 'open', 'in_transit'].includes(value)) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (['closed', 'suspended', 'banned', 'disabled', 'inactive', 'unread', 'failed', 'overdue', 'blocked', 'rejected'].includes(value)) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

export const operationStyle = (intent: WorkspaceOperation['intent']) => {
  if (intent === 'primary') return 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800';
  if (intent === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
  if (intent === 'danger') return 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100';
  return 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
};

export const focusRing = 'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300';

export const buttonFrame = 'inline-flex min-h-9 items-center justify-center gap-2 border px-3 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export const cardFrame = 'border border-slate-200 bg-white';

export const buildWorkspaceData = (section: EcommerceControlSection) => {
  const metrics = section.metrics.map((metric, index) => ({
    name: shortLabel(metric.label, 14),
    value: parseNumber(metric.value) || index + 1
  }));

  const status = Array.from(section.records.reduce((map, record) => {
    map.set(record.status, (map.get(record.status) || 0) + 1);
    return map;
  }, new Map<string, number>())).map(([name, value]) => ({ name: shortLabel(name, 12), value }));

  const owners = Array.from(section.records.reduce((map, record) => {
    const owner = record.owner || 'Platform';
    map.set(owner, (map.get(owner) || 0) + 1);
    return map;
  }, new Map<string, number>())).slice(0, 8).map(([name, value]) => ({ name: shortLabel(name, 12), value }));

  const entities = section.records.slice(0, 8).map((record, index) => ({
    name: shortLabel(record.title, 14),
    value: parseNumber(String(record.data?.credits || record.data?.price || record.data?.stock || record.summary || '')) || index + 1
  }));

  return {
    metrics: metrics.length ? metrics : [{ name: 'Metric', value: 1 }],
    status: status.length ? status : [{ name: 'Records', value: section.records.length }],
    owners: owners.length ? owners : [{ name: 'Platform', value: section.records.length }],
    entities: entities.length ? entities : [{ name: 'Empty', value: 0 }]
  };
};

const metadataText = (record: EcommerceControlRecord) => {
  try {
    return JSON.stringify(record.data || {});
  } catch {
    return '';
  }
};

export const filterRecords = (records: EcommerceControlRecord[], filter: WorkspaceFilter) => {
  const query = filter.query.trim().toLowerCase();

  return records.filter((record) => {
    if (filter.status && record.status !== filter.status) return false;
    if (!query) return true;

    const fields: Record<WorkspaceFilter['scope'], string> = {
      all: `${record.title} ${record.status} ${record.owner || ''} ${record.summary || ''} ${filter.includeMetadata ? metadataText(record) : ''}`,
      title: record.title,
      owner: record.owner || '',
      status: record.status,
      metadata: metadataText(record)
    };

    return fields[filter.scope].toLowerCase().includes(query);
  });
};

export const sourceForVisual = (visual: SectionVisual, data: WorkspaceData) => {
  if (visual === 'pie') return data.status;
  if (visual === 'bar') return data.owners;
  if (visual === 'composed') return data.entities;
  return data.metrics;
};
