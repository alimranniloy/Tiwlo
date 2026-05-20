import React from 'react';
import { AlertCircle, Edit3, ImagePlus, Plus, RefreshCw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import {
  deleteStoreAdminRecordWithApi,
  fetchStoreAdminRecordsWithApi,
  upsertStoreAdminRecordWithApi
} from '../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../components/ActionConfirmation';

export type StoreRecordField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'file';
  options?: string[];
  placeholder?: string;
};

type StoreRecordsPageProps = {
  store: any;
  title: string;
  section: string;
  description: string;
  fields: StoreRecordField[];
  primaryField?: string;
  statuses?: string[];
};

const defaultStatuses = ['active', 'draft', 'paused'];

function emptyForm(fields: StoreRecordField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
}

const readSafeImage = (file: File) => new Promise<string>((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Only image files are allowed.'));
    return;
  }
  if (file.size > 1024 * 1024 * 2) {
    reject(new Error('Image must be 2MB or smaller.'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Unable to read image file.'));
  reader.readAsDataURL(file);
});

export default function StoreRecordsPage({
  store,
  title,
  section,
  description,
  fields,
  primaryField,
  statuses = defaultStatuses
}: StoreRecordsPageProps) {
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
    if (!store?.id) return;
    setLoading(true);
    setError('');
    try {
      setRecords(await fetchStoreAdminRecordsWithApi(store.id, section));
    } catch (err) {
      setRecords([]);
      setError(err instanceof Error ? err.message : `Unable to load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [section, store?.id, title]);

  React.useEffect(() => {
    setForm(emptyForm(fields));
    setStatus(statuses[0] || 'active');
    setEditing(null);
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
    if (!store?.id) return;
    setSaving(true);
    setError('');
    const key = primaryField || fields[0]?.key;
    const recordTitle = String(form[key] || editing?.title || title).trim();
    try {
      await upsertStoreAdminRecordWithApi({
        storeId: store.id,
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

  const handleFile = async (field: StoreRecordField, file?: File) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await readSafeImage(file);
      setForm((prev) => ({
        ...prev,
        [field.key]: dataUrl,
        fileName: prev.fileName || file.name,
        type: prev.type || file.type
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load file');
    }
  };

  const deleteRecord = async (record: any) => {
    if (!store?.id) return;
    const confirmed = await confirmDelete({
      title: `Delete ${title.toLowerCase()}?`,
      message: `Are you sure you want to delete this ${title.toLowerCase()} record?`,
      resourceName: record.title
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteStoreAdminRecordWithApi(store.id, section, record.id);
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
          <p className="mt-1 font-mono text-[11px] text-gray-400">Store ID: {store?.id || 'none'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRecords} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-sm bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {formOpen && (
        <form onSubmit={saveRecord} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">{editing ? `Edit ${editing.title}` : `Add ${title}`}</h2>
            <button type="button" onClick={closeForm} className="rounded-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{field.label}</span>
                {field.type === 'select' ? (
                  <select
                    value={form[field.key] || ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={form[field.key] || ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="min-h-24 w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                ) : field.type === 'file' ? (
                  <div className="overflow-hidden rounded-sm border border-gray-200 bg-gray-50">
                    <div className="flex min-h-44 items-center justify-center bg-white">
                      {form[field.key] ? <img src={form[field.key]} alt={field.label} className="max-h-56 w-full object-contain" /> : <ImagePlus className="h-12 w-12 text-gray-300" />}
                    </div>
                    <div className="space-y-2 border-t border-gray-200 p-3">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                        <Upload className="h-3.5 w-3.5" />
                        Upload image
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(field, event.target.files?.[0])} />
                      </label>
                      <input
                        value={form[field.key]?.startsWith('data:') ? '' : form[field.key] || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                        placeholder={field.placeholder || 'Paste secure image URL'}
                        className="w-full rounded-sm border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                      />
                      <p className="text-[10px] font-medium leading-4 text-gray-400">Images only, max 2MB. Executable files and scripts are not accepted.</p>
                    </div>
                  </div>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={form[field.key] || ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                )}
              </label>
            ))}
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {statuses.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={closeForm} className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Records: {filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Name</th>
                {fields.some((field) => field.type === 'file') && <th className="px-4 py-3 font-bold">Preview</th>}
                {fields.slice(1, 4).map((field) => <th key={field.key} className="px-4 py-3 font-bold">{field.label}</th>)}
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={fields.slice(1, 4).length + 4 + (fields.some((field) => field.type === 'file') ? 1 : 0)} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading from store API...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={fields.slice(1, 4).length + 4 + (fields.some((field) => field.type === 'file') ? 1 : 0)} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No database records found for this section.</td></tr>
              ) : filtered.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">{record.title}</td>
                  {fields.some((field) => field.type === 'file') && (
                    <td className="px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-gray-50">
                        {record.data?.url ? <img src={record.data.url} alt={record.title} className="h-full w-full object-cover" /> : <ImagePlus className="h-4 w-4 text-gray-300" />}
                      </div>
                    </td>
                  )}
                  {fields.slice(1, 4).map((field) => (
                    <td key={field.key} className="px-4 py-3 text-gray-600">{record.data?.[field.key] || '-'}</td>
                  ))}
                  <td className="px-4 py-3">
                    <span className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{record.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => openEdit(record)} className="rounded-sm border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteRecord(record)} className="rounded-sm border border-red-100 p-1.5 text-red-500 hover:bg-red-50" title="Delete">
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
