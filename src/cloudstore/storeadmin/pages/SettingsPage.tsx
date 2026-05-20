import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Save, Trash2 } from 'lucide-react';
import { deleteStoreWithApi, updateStoreWithApi } from '../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../components/ActionConfirmation';

export default function SettingsPage({ store, onStoreDeleted, onStoreUpdated }: { store: any; onStoreDeleted?: () => void; onStoreUpdated?: (store: any) => void }) {
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState('');
  const { confirmDelete, confirmEdit } = useActionConfirmation();
  const [form, setForm] = React.useState({
    name: store?.name || '',
    category: store?.category || '',
    contactEmail: store?.contactEmail || '',
    phone: store?.phone || '',
    customDomain: store?.customDomain || '',
    address: store?.address || '',
    status: store?.status || 'active'
  });

  React.useEffect(() => {
    setForm({
      name: store?.name || '',
      category: store?.category || '',
      contactEmail: store?.contactEmail || '',
      phone: store?.phone || '',
      customDomain: store?.customDomain || '',
      address: store?.address || '',
      status: store?.status || 'active'
    });
  }, [store?.id]);

  const saveStore = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!store?.id) return;
    const confirmed = await confirmEdit({
      title: 'Edit store settings?',
      message: 'Are you sure you want to update this store profile?',
      resourceName: store.name
    });
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      const updated = await updateStoreWithApi({ id: store.id, ...form });
      onStoreUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update store');
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async () => {
    if (!store?.id) return;
    const confirmed = await confirmDelete({
      title: 'Delete store?',
      message: 'Are you sure you want to delete this store? This removes store records from the database.',
      resourceName: store.name
    });
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    try {
      await deleteStoreWithApi(store.id);
      onStoreDeleted?.();
      navigate('/store');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete store');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">General Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Edit the real store profile and domain values stored in the database.</p>
        <p className="mt-1 font-mono text-[11px] text-gray-400">Store ID: {store?.id || 'none'}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={saveStore} className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">Store Profile</h2>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {[
            ['name', 'Store name'],
            ['category', 'Category'],
            ['contactEmail', 'Contact email'],
            ['phone', 'Phone'],
            ['customDomain', 'Custom domain'],
            ['address', 'Address']
          ].map(([key, label]) => (
            <label key={key} className={key === 'address' ? 'md:col-span-2' : ''}>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
              <input
                value={(form as any)[key]}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
          ))}
          <label>
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="closed">closed</option>
            </select>
          </label>
          <div>
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Generated domain</span>
            <div className="rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-600">{store?.domain || '-'}</div>
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="border border-red-100 bg-red-50 p-5">
        <h3 className="mb-1 text-sm font-bold text-red-900">Danger Zone</h3>
        <p className="mb-4 text-xs font-medium text-red-600">Deleting a store removes store settings, products, orders, customers, themes, plugins, subscriptions, and mapped store domains from the database.</p>
        <button onClick={deleteStore} disabled={deleting} className="inline-flex items-center gap-2 rounded-sm bg-red-600 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-60">
          <Trash2 className="h-3.5 w-3.5" /> {deleting ? 'Deleting...' : 'Delete Store'}
        </button>
      </div>
    </div>
  );
}
