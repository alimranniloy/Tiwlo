import React from 'react';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import type { EcommerceControlRecord } from '../../../../../lib/api/ecommerce';
import type { ModuleWorkspaceConfig } from '../../moduleWorkspaceCatalog';
import { cardFrame, focusRing, type WorkspaceFilter } from './shared';

interface WorkspaceToolbarProps {
  workspace: ModuleWorkspaceConfig;
  sectionKey: string;
  records: EcommerceControlRecord[];
  filteredCount: number;
  filter: WorkspaceFilter;
  onFilterChange: (filter: WorkspaceFilter) => void;
}

const update = (filter: WorkspaceFilter, patch: Partial<WorkspaceFilter>) => ({ ...filter, ...patch });

export default function WorkspaceToolbar({ workspace, sectionKey, records, filteredCount, filter, onFilterChange }: WorkspaceToolbarProps) {
  const statuses = React.useMemo(() => Array.from(new Set(records.map((record) => record.status).filter(Boolean))).sort(), [records]);
  const merchantMode = sectionKey === 'ecommerce.merchants';

  return (
    <div className={`${cardFrame} p-4`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">{merchantMode ? 'Merchant Search Settings' : 'Workspace Search Settings'}</h2>
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            {filteredCount} of {records.length} {workspace.primaryNoun.toLowerCase()} records visible
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1fr)_160px_170px_auto] xl:max-w-4xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={filter.query}
              onChange={(event) => onFilterChange(update(filter, { query: event.target.value }))}
              placeholder={`Search ${workspace.primaryNoun.toLowerCase()} records...`}
              className={`h-10 w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition-colors focus:bg-white ${focusRing}`}
            />
          </div>

          <select
            value={filter.status}
            onChange={(event) => onFilterChange(update(filter, { status: event.target.value }))}
            className={`h-10 rounded-sm border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none ${focusRing}`}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={filter.scope}
            onChange={(event) => onFilterChange(update(filter, { scope: event.target.value as WorkspaceFilter['scope'] }))}
            className={`h-10 rounded-sm border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none ${focusRing}`}
          >
            <option value="all">All fields</option>
            <option value="title">{workspace.primaryNoun} name</option>
            <option value="owner">Owner</option>
            <option value="status">Status</option>
            <option value="metadata">Metadata</option>
          </select>

          <label className="flex h-10 items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600">
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Data
            </span>
            <input
              type="checkbox"
              checked={filter.includeMetadata}
              onChange={(event) => onFilterChange(update(filter, { includeMetadata: event.target.checked }))}
              className="h-4 w-4 accent-indigo-600"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
