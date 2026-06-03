import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Plus,
  Power,
  Search,
  Trash2,
  X
} from 'lucide-react';
import {
  CloudResourceRecord,
  createCloudResourceWithApi,
  deleteCloudResourceWithApi,
  fetchCloudResourcesWithApi,
  updateCloudResourceStatusWithApi
} from '../lib/tiwloApi';
import { useActionConfirmation } from './ActionConfirmation';
import { useCurrency } from '../lib/useCurrency';

type ResourceDefaults = Partial<Pick<CloudResourceRecord, 'region' | 'specs' | 'plan' | 'cpu' | 'ram' | 'disk' | 'monthlyCost'>> & {
  metadata?: Record<string, unknown>;
};

interface ResourceManagerPageProps {
  type: string;
  title: string;
  description: string;
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass?: string;
  defaults?: ResourceDefaults;
}

const regions = ['New York 3', 'Frankfurt 1', 'Singapore 1', 'London 1', 'Global'];

function dateLabel(value?: string) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function metadataText(metadata?: Record<string, unknown> | null) {
  if (!metadata || typeof metadata !== 'object') return 'No metadata';
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return 'No metadata';
  return entries.slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(' / ');
}

export default function ResourceManagerPage({
  type,
  title,
  description,
  createLabel,
  emptyTitle,
  emptyDescription,
  icon: Icon,
  accentClass = 'bg-blue-600',
  defaults
}: ResourceManagerPageProps) {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'console' });
  const [resources, setResources] = React.useState<CloudResourceRecord[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const { confirmDelete } = useActionConfirmation();
  const [form, setForm] = React.useState({
    name: '',
    region: defaults?.region || 'New York 3',
    specs: defaults?.specs || '',
    plan: defaults?.plan || '',
    cpu: defaults?.cpu || '',
    ram: defaults?.ram || '',
    disk: defaults?.disk || '',
    monthlyCost: String(defaults?.monthlyCost ?? 0),
    metadata: JSON.stringify(defaults?.metadata || {}, null, 2)
  });

  const loadResources = React.useCallback(() => {
    setError('');
    setLoading(true);
    fetchCloudResourcesWithApi(type, search || undefined)
      .then(setResources)
      .catch((err) => {
        setResources([]);
        setError(err instanceof Error ? err.message : `Unable to load ${title.toLowerCase()}`);
      })
      .finally(() => setLoading(false));
  }, [search, title, type]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadResources, 200);
    return () => window.clearTimeout(timer);
  }, [loadResources]);

  const createResource = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let parsedMetadata: Record<string, unknown> = {};
      if (form.metadata.trim()) {
        parsedMetadata = JSON.parse(form.metadata);
      }

      const created = await createCloudResourceWithApi({
        type,
        name: form.name.trim(),
        region: form.region,
        specs: form.specs.trim(),
        plan: form.plan.trim() || undefined,
        cpu: form.cpu.trim() || undefined,
        ram: form.ram.trim() || undefined,
        disk: form.disk.trim() || undefined,
        monthlyCost: Number(form.monthlyCost || 0),
        metadata: parsedMetadata
      });

      setResources((current) => [created, ...current]);
      setSuccess(`${created.name} created.`);
      setIsCreateOpen(false);
      setForm((current) => ({ ...current, name: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create resource');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (resource: CloudResourceRecord) => {
    setError('');
    setSuccess('');
    const nextStatus = resource.status === 'active' ? 'off' : 'active';
    try {
      const updated = await updateCloudResourceStatusWithApi(resource.id, nextStatus);
      setResources((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(`${resource.name} status updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status');
    }
  };

  const deleteResource = async (resource: CloudResourceRecord) => {
    const confirmed = await confirmDelete({
      title: `Delete ${title.toLowerCase()}?`,
      message: 'Are you sure you want to delete this resource?',
      resourceName: resource.name
    });
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await deleteCloudResourceWithApi(resource.id);
      setResources((current) => current.filter((item) => item.id !== resource.id));
      setSuccess(`${resource.name} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete resource');
    }
  };

  const activeCount = resources.filter((resource) => resource.status === 'active').length;
  const monthlyTotal = resources.reduce((sum, resource) => sum + Number(resource.monthlyCost || 0), 0);
  const regionCount = new Set(resources.map((resource) => resource.region).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-[1220px] space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm font-medium text-[#52637a]">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resources..."
              className="w-full rounded-md border border-[#cdd6e3] bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10 sm:w-64"
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-[#11843b] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0b6b30]"
          >
            <Plus className="h-4 w-4" /> {createLabel}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600 shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Records', value: resources.length },
          { label: 'Active', value: activeCount },
          { label: 'Regions', value: regionCount },
          { label: 'Monthly Cost', value: money(monthlyTotal, 'USD') }
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border border-[#d9e1ec] bg-white p-5 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">{stat.label}</p>
            <p className="text-2xl font-bold text-[#111827]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        {loading ? (
          <div className="p-16 text-center text-sm font-bold text-gray-400">Loading {title.toLowerCase()} from API...</div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <Icon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{emptyTitle}</h3>
            <p className="mt-1 max-w-md text-sm text-[#6B7280]">{emptyDescription}</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-6 rounded-md bg-[#0069ff] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0056cc]"
            >
              {createLabel}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e4e9f1] bg-[#f7f9fc]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Resource</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Region</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Spec</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Cost</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Updated</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {resources.map((resource) => (
                  <tr key={resource.id} className="transition-colors hover:bg-[#f7faff]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${accentClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#111827]">{resource.name}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${resource.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <span className="text-[11px] font-bold uppercase text-gray-400">{resource.status}</span>
                            {resource.ip && <span className="text-[11px] font-mono text-gray-400">{resource.ip}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#374151]">{resource.region}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#374151]">{resource.specs}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{metadataText(resource.metadata)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#111827]">{money(resource.monthlyCost, 'USD')}</td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">{dateLabel(resource.updatedAt || resource.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleStatus(resource)}
                          className="rounded p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111827]"
                          title={resource.status === 'active' ? 'Disable' : 'Enable'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button className="rounded p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111827]">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteResource(resource)}
                          className="rounded p-2 text-red-500 transition-colors hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#031b4e]/45 p-4">
          <form onSubmit={createResource} className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-[0_24px_80px_rgba(3,27,78,0.22)]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">{createLabel}</h2>
                <p className="text-xs font-medium text-gray-500">This creates a real database record through the API.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto p-6 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-md border border-[#cdd6e3] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Region</span>
                <select
                  value={form.region}
                  onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                  className="w-full rounded-md border border-[#cdd6e3] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                >
                  {regions.map((region) => <option key={region}>{region}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Monthly Cost</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyCost}
                  onChange={(event) => setForm((current) => ({ ...current, monthlyCost: event.target.value }))}
                  className="w-full rounded-md border border-[#cdd6e3] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Specs</span>
                <input
                  required
                  value={form.specs}
                  onChange={(event) => setForm((current) => ({ ...current, specs: event.target.value }))}
                  className="w-full rounded-md border border-[#cdd6e3] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                />
              </label>
              {(['plan', 'cpu', 'ram', 'disk'] as const).map((field) => (
                <label key={field} className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{field}</span>
                  <input
                    value={form[field]}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    className="w-full rounded-md border border-[#cdd6e3] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                  />
                </label>
              ))}
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Metadata JSON</span>
                <textarea
                  rows={5}
                  value={form.metadata}
                  onChange={(event) => setForm((current) => ({ ...current, metadata: event.target.value }))}
                  className="w-full rounded-md border border-[#cdd6e3] px-3 py-2 font-mono text-xs focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button disabled={saving} className="flex items-center gap-2 rounded-md bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                {saving ? <Activity className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
