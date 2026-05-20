import React from 'react';
import { ChevronDown, Save, X } from 'lucide-react';
import type { EcommerceControlRecord } from '../../../../lib/api/ecommerce';
import { getControlRecordTemplate, type ControlRecordField } from '../recordTemplates';

interface ControlRecordComposerProps {
  open: boolean;
  saving?: boolean;
  sectionKey: string;
  sectionLabel: string;
  noun: string;
  record?: EcommerceControlRecord | null;
  onClose: () => void;
  onSave: (input: { id?: string; title: string; status: string; owner: string; summary: string; data?: Record<string, unknown> }) => void;
}

const inputClass = 'w-full border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100';

const readRecordValue = (record: EcommerceControlRecord | null | undefined, key: string, fallback = '') => {
  if (!record) return fallback;
  if (key === 'owner') return record.owner || fallback;
  if (key === 'summary') return record.summary || fallback;
  const value = record.data?.[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function FieldInput({ field, value, onChange }: { field: ControlRecordField; value: string; onChange: (value: string) => void }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className={`${inputClass} min-h-[86px] resize-none`}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} h-10`}>
        <option value="">Select...</option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      className={`${inputClass} h-10`}
    />
  );
}

export default function ControlRecordComposer({ open, saving, sectionKey, sectionLabel, noun, record, onClose, onSave }: ControlRecordComposerProps) {
  const template = React.useMemo(() => getControlRecordTemplate(sectionKey, noun, sectionLabel), [sectionKey, noun, sectionLabel]);
  const [status, setStatus] = React.useState(template.statusOptions[0] || 'active');
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [metadata, setMetadata] = React.useState('');
  const [jsonError, setJsonError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    const nextValues = template.fields.reduce<Record<string, string>>((acc, field) => {
      const fallback = field.key === template.titleField ? record?.title || '' : '';
      acc[field.key] = readRecordValue(record, field.key, fallback);
      return acc;
    }, {});

    if (template.ownerField && !nextValues[template.ownerField]) {
      nextValues[template.ownerField] = record?.owner || '';
    }

    setValues(nextValues);
    setStatus(record?.status || template.statusOptions[0] || 'active');
    setMetadata(record?.data ? JSON.stringify(record.data, null, 2) : '');
    setAdvancedOpen(false);
    setJsonError('');
  }, [open, record, template]);

  if (!open) return null;

  const updateField = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanValues = Object.fromEntries(Object.entries(values).filter(([, value]) => String(value).trim() !== ''));
    let extraData: Record<string, unknown> = record?.data || {};

    if (advancedOpen && metadata.trim()) {
      try {
        extraData = JSON.parse(metadata) as Record<string, unknown>;
        setJsonError('');
      } catch {
        setJsonError('Advanced metadata must be valid JSON.');
        return;
      }
    }

    const title = values[template.titleField]?.trim() || record?.title || `${template.noun} record`;
    const owner = values[template.ownerField]?.trim() || values.owner?.trim() || record?.owner || 'Platform';
    const summary = template.summaryFields
      .map((key) => values[key]?.trim())
      .filter(Boolean)
      .join(' / ') || values.summary?.trim() || record?.summary || '';

    onSave({
      id: record?.id,
      title,
      status,
      owner,
      summary,
      data: {
        ...extraData,
        ...cleanValues,
        recordTemplate: sectionKey,
        source: 'saas-admin-console'
      }
    });
  };

  return (
    <div className="border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{record ? `Edit ${template.noun}` : template.title}</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">{template.description}</p>
        </div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <label className="lg:col-span-3">
            <span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClass} h-10`}>
              {template.statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          {template.fields.map((field) => (
            <label key={field.key} className={field.span === 'full' || field.type === 'textarea' ? 'lg:col-span-12' : field.span === 'half' ? 'lg:col-span-6' : 'lg:col-span-3'}>
              <span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">{field.label}</span>
              <FieldInput field={field} value={values[field.key] || ''} onChange={(value) => updateField(field.key, value)} />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="inline-flex min-h-8 items-center gap-2 border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          Advanced metadata
        </button>

        {advancedOpen && (
          <div>
            <textarea
              value={metadata}
              onChange={(event) => setMetadata(event.target.value)}
              placeholder='{"internal":"optional"}'
              className={`${inputClass} min-h-[92px] font-mono`}
            />
            {jsonError && <p className="mt-2 text-[12px] font-bold text-rose-600">{jsonError}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="min-h-10 border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !values[template.titleField]?.trim()}
            className="inline-flex min-h-10 items-center justify-center gap-2 bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            {record ? 'Update Record' : `Save ${template.noun}`}
          </button>
        </div>
      </form>
    </div>
  );
}
