import React from 'react';
import { DatabaseZap, FilePlus2, RotateCw, SlidersHorizontal, Trash2, Wand2 } from 'lucide-react';
import type { EcommerceControlAction } from '../../../../../lib/api/ecommerce';
import type { WorkspaceOperation } from '../../moduleWorkspaceCatalog';
import { getControlRecordTemplate } from '../../recordTemplates';
import { buttonFrame, cardFrame, operationStyle, type ModuleWorkspaceProps } from './shared';

const sharedKeys = new Set(['sync_section', 'create_record', 'clear_manual_records']);

const actionIcon = (key: string) => {
  if (key.includes('audit') || key.includes('review')) return SlidersHorizontal;
  if (key.includes('sync') || key.includes('rebuild')) return RotateCw;
  if (key.includes('backup') || key.includes('restore')) return DatabaseZap;
  return Wand2;
};

export default function PageCommands({
  workspace,
  section,
  busyAction,
  onAction,
  onCreate,
  onDeleteAllRecords
}: Pick<ModuleWorkspaceProps, 'workspace' | 'section' | 'busyAction' | 'onAction' | 'onCreate' | 'onDeleteAllRecords'>) {
  const sectionOps = workspace.operations.filter((operation) => !operation.targetPrefix && !sharedKeys.has(operation.key));
  const template = getControlRecordTemplate(section.key, workspace.primaryNoun, section.label);

  const run = (operation: WorkspaceOperation) => {
    onAction({ key: operation.key, label: operation.label, intent: operation.intent, description: operation.description } as EcommerceControlAction);
  };

  return (
    <div className={`${cardFrame} p-5`}>
      <div className="mb-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{workspace.title}</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            SaaS admin controls for user stores, merchant accounts, billing, policy, and tenant operations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCreate}
            disabled={Boolean(busyAction)}
            className={`${buttonFrame} border-indigo-600 bg-indigo-600 px-3.5 text-white hover:bg-indigo-700`}
          >
            <FilePlus2 className="h-4 w-4" />
            {template.title}
          </button>
          <button
            onClick={() => onAction({ key: 'sync_section', label: 'Refresh Data', intent: 'neutral', description: `Refresh ${section.label} metrics.` })}
            disabled={Boolean(busyAction)}
            className={`${buttonFrame} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          >
            <RotateCw className={`h-4 w-4 ${busyAction === 'sync_section' ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button
            onClick={onDeleteAllRecords}
            disabled={Boolean(busyAction)}
            className={`${buttonFrame} border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}
          >
            <Trash2 className="h-4 w-4" />
            Clear Manual
          </button>
        </div>
      </div>

      <div className="mb-4 border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Add record fields</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {template.fields.slice(0, 8).map((field) => (
            <span key={field.key} className="border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
              {field.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sectionOps.map((operation) => {
          const Icon = actionIcon(operation.key);
          return (
            <button
              key={operation.key}
              onClick={() => run(operation)}
              disabled={Boolean(busyAction)}
              className={`${buttonFrame} min-h-[74px] flex-col items-start px-4 py-3 text-left ${operationStyle(operation.intent)}`}
            >
              <span className="flex items-center gap-2 text-[12px] uppercase tracking-wide">
                <Icon className={`h-4 w-4 ${busyAction === operation.key ? 'animate-spin' : ''}`} />
                {operation.label}
              </span>
              <span className="text-[11px] font-semibold leading-relaxed opacity-75">{operation.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
