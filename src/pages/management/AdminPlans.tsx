import React from 'react';
import { AlertCircle, Edit3, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { deletePlanWithApi, fetchPlansWithApi, upsertPlanWithApi } from '../../lib/tiwloApi';
import { useActionConfirmation } from '../../components/ActionConfirmation';
import { useCurrency } from '../../lib/useCurrency';

const products = ['cloud', 'ecommerce', 'isp', 'domain', 'support'];
const intervals = ['month', 'year', 'one_time'];

function safeJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export default function AdminPlans() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'admin' });
  const [plans, setPlans] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const { confirmDelete, confirmEdit } = useActionConfirmation();
  const [form, setForm] = React.useState({
    code: '',
    product: 'cloud',
    name: '',
    price: '0',
    interval: 'month',
    features: '[]',
    limits: '{}',
    isActive: true
  });

  const loadPlans = React.useCallback(() => {
    setLoading(true);
    setError('');
    fetchPlansWithApi()
      .then(setPlans)
      .catch((err) => {
        setPlans([]);
        setError(err instanceof Error ? err.message : 'Unable to load pricing plans');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: '',
      product: 'cloud',
      name: '',
      price: '0',
      interval: 'month',
      features: '[]',
      limits: '{}',
      isActive: true
    });
    setIsFormOpen(true);
  };

  const openEdit = async (plan: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit plan?',
      message: 'Are you sure you want to edit this plan?',
      resourceName: plan.name
    });
    if (!confirmed) return;

    setEditing(plan);
    setForm({
      code: plan.code || '',
      product: plan.product || 'cloud',
      name: plan.name || '',
      price: String(plan.price || 0),
      interval: plan.interval || 'month',
      features: safeJson(plan.features || []),
      limits: safeJson(plan.limits || {}),
      isActive: Boolean(plan.isActive)
    });
    setIsFormOpen(true);
  };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await upsertPlanWithApi({
        id: editing?.id,
        code: form.code.trim(),
        product: form.product,
        name: form.name.trim(),
        price: Number(form.price || 0),
        interval: form.interval,
        features: JSON.parse(form.features || '[]'),
        limits: JSON.parse(form.limits || '{}'),
        isActive: form.isActive
      });
      setPlans((current) => current.some((plan) => plan.id === saved.id)
        ? current.map((plan) => (plan.id === saved.id ? saved : plan))
        : [saved, ...current]);
      setIsFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save plan. Check the JSON fields.');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (plan: any) => {
    const confirmed = await confirmDelete({
      title: 'Deactivate plan?',
      message: 'Are you sure you want to deactivate this plan? Existing subscriptions will keep their plan reference.',
      resourceName: plan.name,
      confirmLabel: 'Deactivate plan'
    });
    if (!confirmed) return;

    setError('');
    try {
      await deletePlanWithApi(plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to deactivate plan');
    }
  };

  const filtered = plans.filter((plan) => {
    const haystack = `${plan.name} ${plan.code} ${plan.product} ${plan.interval}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const productsCount = new Set(plans.map((plan) => plan.product)).size;
  const monthlyTotal = plans.filter((plan) => plan.interval === 'month').reduce((sum, plan) => sum + Number(plan.price || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Pricing & Plans</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Plan catalog is loaded from the database and managed through GraphQL mutations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPlans} className="flex items-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-[#f3f5f9]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc]">
            <Plus className="h-4 w-4" /> New Plan
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Active Plans', value: plans.length },
          { label: 'Products', value: productsCount },
          { label: 'Monthly Catalog', value: money(monthlyTotal) }
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border border-[#e5e8ed] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2e3d49]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-[#e5e8ed] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Plan Registry</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans..." className="w-full rounded border border-[#e5e8ed] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#0069ff] focus:outline-none md:w-72" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e5e8ed] bg-white">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Plan</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Product</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Price</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Features</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading plans from API...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No plans found in the database.</td></tr>
              ) : filtered.map((plan) => (
                <tr key={plan.id} className="hover:bg-[#f3f5f9]">
                  <td className="px-6 py-4">
                    <p className="text-[14px] font-bold text-[#2e3d49]">{plan.name}</p>
                    <p className="text-[11px] font-mono text-gray-400">{plan.code}</p>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold uppercase text-[#4a4a4a]">{plan.product}</td>
                  <td className="px-6 py-4 text-[13px] font-bold text-[#2e3d49]">{money(plan.price)} / {plan.interval}</td>
                  <td className="px-6 py-4 text-[12px] text-[#4a4a4a]">{Array.isArray(plan.features) ? plan.features.slice(0, 3).join(', ') : 'Configured'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(plan)} className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-[#0069ff]" title="Edit"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => deletePlan(plan)} className="rounded p-2 text-red-500 hover:bg-red-50" title="Deactivate"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={savePlan} className="w-full max-w-2xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <h2 className="text-lg font-bold text-[#2e3d49]">{editing ? 'Edit Plan' : 'New Plan'}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto p-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Code</span>
                <input required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Product</span>
                <select value={form.product} onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {products.map((product) => <option key={product} value={product}>{product}</option>)}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Name</span>
                <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Price</span>
                <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Interval</span>
                <select value={form.interval} onChange={(event) => setForm((current) => ({ ...current, interval: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {intervals.map((interval) => <option key={interval} value={interval}>{interval}</option>)}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Features JSON</span>
                <textarea rows={5} value={form.features} onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 font-mono text-xs focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Limits JSON</span>
                <textarea rows={5} value={form.limits} onChange={(event) => setForm((current) => ({ ...current, limits: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 font-mono text-xs focus:border-[#0069ff] focus:outline-none" />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#f3f5f9] px-6 py-4">
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded border border-[#e5e8ed] px-4 py-2 text-sm font-bold text-[#4a4a4a] hover:bg-gray-50">Cancel</button>
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
