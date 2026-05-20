import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import type { EcommerceControlRecord } from '../../../../../lib/api/ecommerce';
import type { WorkspaceOperation } from '../../moduleWorkspaceCatalog';
import { buttonFrame, operationStyle, type ModuleWorkspaceProps } from './shared';

interface RecordActionsProps extends Pick<ModuleWorkspaceProps, 'busyAction' | 'onEditRecord' | 'onDeleteRecord' | 'onRecordAction'> {
  record: EcommerceControlRecord;
  operations: WorkspaceOperation[];
}

export default function RecordActions({ record, operations, busyAction, onEditRecord, onDeleteRecord, onRecordAction }: RecordActionsProps) {
  const manual = !record.id.includes(':');
  const targetOps = operations.filter((operation) => operation.targetPrefix && record.id.startsWith(operation.targetPrefix)).slice(0, 6);

  return (
    <div className="flex flex-wrap gap-1.5">
      {targetOps.map((operation) => (
        <button
          key={operation.key}
          onClick={() => onRecordAction(operation.key, record)}
          disabled={Boolean(busyAction)}
          className={`${buttonFrame} min-h-8 px-2.5 py-1 text-[10px] uppercase ${operationStyle(operation.intent)}`}
        >
          {operation.label}
        </button>
      ))}
      {manual && (
        <>
          <button
            onClick={() => onEditRecord(record)}
            disabled={Boolean(busyAction)}
            className={`${buttonFrame} min-h-8 border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase text-slate-600 hover:bg-slate-50`}
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </button>
          <button
            onClick={() => onDeleteRecord(record)}
            disabled={Boolean(busyAction)}
            className={`${buttonFrame} min-h-8 border-rose-200 bg-white px-2.5 py-1 text-[10px] uppercase text-rose-600 hover:bg-rose-50`}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </>
      )}
    </div>
  );
}
