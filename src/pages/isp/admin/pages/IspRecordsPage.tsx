import React from 'react';
import { AlertCircle, Edit3, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import {
  deleteIspAdminRecordWithApi,
  fetchIspAdminRecordsWithApi,
  upsertIspAdminRecordWithApi
} from '../../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../../components/ActionConfirmation';

export type IspRecordField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
};

type IspRecordsPageProps = {
  site: any;
  title: string;
  section: string;
  description: string;
  fields: IspRecordField[];
  primaryField?: string;
  statuses?: string[];
};

const defaultStatuses = ['active', 'draft', 'paused'];

function emptyForm(fields: IspRecordField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
}

export default function IspRecordsPage({
  site,
  title,
  section,
  description,
  fields,
  primaryField,
  statuses = defaultStatuses
}: IspRecordsPageProps) {
  const [records, setRecords] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<any | null | undefined>(undefined);
  const [status, setStatus] = React.useState(statuses[0] || 'active');
  const [form, setForm] = React.useState<Record<string, string>>(() => emptyForm(fields));
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadRecords = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      setRecords(await fetchIspAdminRecordsWithApi(site.id, section));
    } catch (err) {
      setRecords([]);
      setError(err instanceof Error ? err.message : `Unable to load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [section, site?.id, title]);

  React.useEffect(() => {
    setForm(emptyForm(fields));
    setStatus(statuses[0] || 'active');
    setEditing(undefined);
    loadRecords();
  }, [fields, loadRecords, statuses]);

  const openCreate = () => {
    setEditing(null);
    setStatus(statuses[0] || 'active');
    setForm(emptyForm(fields));
  };

  const openEdit = async (record: any) => {
    const confirmed = await confirmEdit({
      title: `Edit ${title.toLowerCase()}?`,
      message: `Are you sure you want to edit this ${title.toLowerCase()} record?`,
      resourceName: record.title
    });
    if (!confirmed) return;

    setEditing(record);
    setStatus(record.status || statuses[0] || 'active');
    setForm(fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = record.data?.[field.key] ?? '';
      return acc;
    }, {}));
  };

  const closeForm = () => {
    setEditing(undefined);
    setForm(emptyForm(fields));
    setStatus(statuses[0] || 'active');
  };

  const saveRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site?.id) return;
    setSaving(true);
    setError('');
    const key = primaryField || fields[0]?.key;
    const recordTitle = String(form[key] || editing?.title || title).trim();
    try {
      await upsertIspAdminRecordWithApi({
        siteId: site.id,
        section,
        id: editing?.id,
        title: recordTitle,
        status,
        data: form
      });
      closeForm();
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to save ${title}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record: any) => {
    if (!site?.id) return;
    const confirmed = await confirmDelete({
      title: `Delete ${title.toLowerCase()}?`,
      message: `Are you sure you want to delete this ${title.toLowerCase()} record?`,
      resourceName: record.title
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteIspAdminRecordWithApi(site.id, section, record.id);
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to delete ${title}`);
    }
  };

  const filtered = records.filter((record) => (
    [record.title, record.status, ...fields.map((field) => record.data?.[field.key])]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase())
  ));

  const formOpen = editing !== undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRecords} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {formOpen && (
        <form onSubmit={saveRecord} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">{editing ? `Edit ${editing.title}` : `Add ${title}`}</h2>
            <button type="button" onClick={closeForm} className="p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{field.label}</span>
                {field.type === 'select' ? (
                  <select value={form[field.key] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))} className="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea value={form[field.key] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))} className="min-h-24 w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                ) : (
                  <input type={field.type || 'text'} value={form[field.key] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                )}
              </label>
            ))}
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                {statuses.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={closeForm} className="border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="w-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Records: {filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Name</th>
                {fields.slice(1, 4).map((field) => <th key={field.key} className="px-4 py-3 font-bold">{field.label}</th>)}
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={fields.slice(1, 4).length + 4} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading from ISP API...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={fields.slice(1, 4).length + 4} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No records found for this ISP site.</td></tr>
              ) : filtered.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">{record.title}</td>
                  {fields.slice(1, 4).map((field) => <td key={field.key} className="px-4 py-3 text-gray-600">{record.data?.[field.key] || '-'}</td>)}
                  <td className="px-4 py-3"><span className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{record.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => openEdit(record)} className="border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteRecord(record)} className="border border-red-100 p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
