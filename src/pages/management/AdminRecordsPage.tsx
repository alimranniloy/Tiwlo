import React from 'react';
import { AlertCircle, CheckCircle2, Edit3, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import {
  MainAdminRecord,
  deleteMainAdminRecordWithApi,
  fetchMainAdminRecordsWithApi,
  upsertMainAdminRecordWithApi
} from '../../lib/tiwloApi';
import { useActionConfirmation } from '../../components/ActionConfirmation';

type AdminRecordField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
};

interface AdminRecordsPageProps {
  section: string;
  title: string;
  description: string;
  recordLabel?: string;
  fields?: AdminRecordField[];
  statusOptions?: string[];
}

const defaultFields: AdminRecordField[] = [
  { key: 'reference', label: 'Reference', placeholder: 'Internal reference' },
  { key: 'owner', label: 'Owner', placeholder: 'Team or vendor' },
  { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Operational notes' }
];

const defaultStatuses = ['active', 'pending', 'disabled', 'archived'];

function initialData(fields: AdminRecordField[], record?: MainAdminRecord | null) {
  return Object.fromEntries(fields.map((field) => [field.key, String(record?.data?.[field.key] ?? '')]));
}

function dateLabel(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (['active', 'enabled', 'approved', 'paid', 'live'].includes(value)) return 'border-green-100 bg-green-50 text-green-700';
  if (['pending', 'queued', 'draft', 'review'].includes(value)) return 'border-amber-100 bg-amber-50 text-amber-700';
  if (['disabled', 'failed', 'blocked'].includes(value)) return 'border-red-100 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-600';
}

export default function AdminRecordsPage({
  section,
  title,
  description,
  recordLabel = 'Record',
  fields = defaultFields,
  statusOptions = defaultStatuses
}: AdminRecordsPageProps) {
  const [records, setRecords] = React.useState<MainAdminRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [editing, setEditing] = React.useState<MainAdminRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const { confirmDelete, confirmEdit } = useActionConfirmation();
  const [form, setForm] = React.useState({
    title: '',
    status: statusOptions[0] || 'active',
    data: initialData(fields)
  });

  const loadRecords = React.useCallback(() => {
    setLoading(true);
    setError('');
    fetchMainAdminRecordsWithApi(section)
      .then(setRecords)
      .catch((err) => {
        setRecords([]);
        setError(err instanceof Error ? err.message : `Unable to load ${title}`);
      })
      .finally(() => setLoading(false));
  }, [section, title]);

  React.useEffect(() => {
    setIsFormOpen(false);
    setEditing(null);
    setForm({ title: '', status: statusOptions[0] || 'active', data: initialData(fields) });
    loadRecords();
  }, [fields, loadRecords, statusOptions]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', status: statusOptions[0] || 'active', data: initialData(fields) });
    setIsFormOpen(true);
  };

  const openEdit = async (record: MainAdminRecord) => {
    const confirmed = await confirmEdit({
      title: `Edit ${recordLabel.toLowerCase()}?`,
      message: `Are you sure you want to edit this ${recordLabel.toLowerCase()}?`,
      resourceName: record.title
    });
    if (!confirmed) return;

    setEditing(record);
    setForm({
      title: record.title,
      status: record.status || statusOptions[0] || 'active',
      data: initialData(fields, record)
    });
    setIsFormOpen(true);
  };

  const saveRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await upsertMainAdminRecordWithApi({
        section,
        id: editing?.id,
        title: form.title.trim(),
        status: form.status,
        data: form.data
      });
      setRecords((current) => current.some((record) => record.id === saved.id)
        ? current.map((record) => (record.id === saved.id ? saved : record))
        : [saved, ...current]);
      setSuccess(`${recordLabel} saved.`);
      setIsFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to save ${recordLabel.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record: MainAdminRecord) => {
    const confirmed = await confirmDelete({
      title: `Delete ${recordLabel.toLowerCase()}?`,
      message: `Are you sure you want to delete this ${recordLabel.toLowerCase()}?`,
      resourceName: record.title
    });
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await deleteMainAdminRecordWithApi(section, record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setSuccess(`${recordLabel} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to delete ${recordLabel.toLowerCase()}`);
    }
  };

  const activeCount = records.filter((record) => ['active', 'enabled', 'live'].includes(record.status)).length;
  const pendingCount = records.filter((record) => ['pending', 'queued', 'draft', 'review'].includes(record.status)).length;
  const visibleFields = fields.slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">{title}</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRecords} className="flex items-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-[#f3f5f9]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc]">
            <Plus className="h-4 w-4" /> New {recordLabel}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Records', value: records.length },
          { label: 'Active', value: activeCount },
          { label: 'Pending', value: pendingCount }
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border border-[#e5e8ed] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2e3d49]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-[#e5e8ed] bg-white">
        <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">{recordLabel} Registry</h2>
          <p className="text-[11px] font-medium text-gray-400">Stored in the database through the Tiwlo Team settings API.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e5e8ed] bg-white">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">{recordLabel}</th>
                {visibleFields.map((field) => (
                  <th key={field.key} className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">{field.label}</th>
                ))}
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Updated</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading ? (
                <tr><td colSpan={visibleFields.length + 4} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading records from API...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={visibleFields.length + 4} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No {title.toLowerCase()} records found in the database.</td></tr>
              ) : records.map((record) => (
                <tr key={record.id} className="hover:bg-[#f3f5f9]">
                  <td className="px-6 py-4">
                    <p className="text-[14px] font-bold text-[#2e3d49]">{record.title}</p>
                    <p className="text-[11px] text-gray-400">{record.id}</p>
                  </td>
                  {visibleFields.map((field) => (
                    <td key={field.key} className="px-6 py-4 text-[13px] text-[#4a4a4a]">
                      {String(record.data?.[field.key] || '-')}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(record.status)}`}>{record.status}</span>
                  </td>
                  <td className="px-6 py-4 text-[12px] text-gray-500">{dateLabel(record.updatedAt || record.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(record)} className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-[#0069ff]" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteRecord(record)} className="rounded p-2 text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveRecord} className="w-full max-w-2xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#2e3d49]">{editing ? `Edit ${recordLabel}` : `New ${recordLabel}`}</h2>
                <p className="text-xs font-medium text-gray-500">This writes to the database, not a local fixture.</p>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto p-6 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                >
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              {fields.map((field) => (
                <label key={field.key} className={`space-y-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{field.label}</span>
                  {field.type === 'select' ? (
                    <select
                      value={form.data[field.key] || ''}
                      onChange={(event) => setForm((current) => ({ ...current, data: { ...current.data, [field.key]: event.target.value } }))}
                      className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                    >
                      <option value="">Select</option>
                      {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      rows={4}
                      value={form.data[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={(event) => setForm((current) => ({ ...current, data: { ...current.data, [field.key]: event.target.value } }))}
                      className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={form.data[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={(event) => setForm((current) => ({ ...current, data: { ...current.data, [field.key]: event.target.value } }))}
                      className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#f3f5f9] px-6 py-4">
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded border border-[#e5e8ed] px-4 py-2 text-sm font-bold text-[#4a4a4a] hover:bg-gray-50">
                Cancel
              </button>
              <button disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
