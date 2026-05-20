import React from 'react';
import { AlertCircle, Bell, Check, Plus, RefreshCw, Save, X } from 'lucide-react';
import { createNotificationWithApi, fetchNotificationsWithApi, markNotificationReadWithApi } from '../../lib/tiwloApi';

function dateLabel(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function tone(type: string) {
  if (type === 'error') return 'border-red-100 bg-red-50 text-red-700';
  if (type === 'warning') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (type === 'success') return 'border-green-100 bg-green-50 text-green-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

export default function AdminNotifications() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    title: '',
    message: '',
    scope: 'platform',
    type: 'info',
    ownerId: ''
  });

  const loadNotifications = React.useCallback(() => {
    setLoading(true);
    setError('');
    fetchNotificationsWithApi()
      .then(setItems)
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Unable to load notifications');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const createNotification = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createNotificationWithApi({
        title: form.title,
        message: form.message,
        scope: form.scope,
        type: form.type,
        ownerId: form.ownerId.trim() || undefined
      });
      setItems((current) => [created, ...current]);
      setForm({ title: '', message: '', scope: 'platform', type: 'info', ownerId: '' });
      setIsFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create notification');
    } finally {
      setSaving(false);
    }
  };

  const markRead = async (id: string) => {
    setError('');
    try {
      const updated = await markNotificationReadWithApi(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, ...updated } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update notification');
    }
  };

  const unread = items.filter((item) => item.status !== 'read').length;
  const platform = items.filter((item) => item.scope === 'platform').length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Live Notifications</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Send and review database-backed platform notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadNotifications} className="flex items-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-[#f3f5f9]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc]">
            <Plus className="h-4 w-4" /> New Notification
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total', value: items.length },
          { label: 'Unread', value: unread },
          { label: 'Platform Scope', value: platform }
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border border-[#e5e8ed] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2e3d49]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-[#e5e8ed] bg-white">
        <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Notification Feed</h2>
        </div>
        <div className="divide-y divide-[#e5e8ed]">
          {loading ? (
            <div className="p-12 text-center text-[13px] font-bold text-gray-400">Loading notifications from API...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-[13px] font-bold text-gray-400">No notifications found in the database.</div>
          ) : items.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 p-5 hover:bg-[#f8f9fa] md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border ${tone(item.type)}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-bold text-[#2e3d49]">{item.title}</h3>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${tone(item.type)}`}>{item.type}</span>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">{item.status}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#4a4a4a]">{item.message}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{item.scope}{item.scopeId ? ` / ${item.scopeId}` : ''} / {dateLabel(item.createdAt)}</p>
                </div>
              </div>
              {item.status !== 'read' && (
                <button onClick={() => markRead(item.id)} className="flex items-center justify-center gap-2 rounded border border-[#e5e8ed] bg-white px-3 py-2 text-[12px] font-bold text-[#4a4a4a] hover:bg-gray-50">
                  <Check className="h-4 w-4" /> Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createNotification} className="w-full max-w-xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <h2 className="text-lg font-bold text-[#2e3d49]">New Notification</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Title</span>
                <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Scope</span>
                <input value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Type</span>
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {['info', 'success', 'warning', 'error'].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Owner ID</span>
                <input value={form.ownerId} onChange={(event) => setForm((current) => ({ ...current, ownerId: event.target.value }))} placeholder="Blank sends platform notification" className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Message</span>
                <textarea required rows={5} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#f3f5f9] px-6 py-4">
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded border border-[#e5e8ed] px-4 py-2 text-sm font-bold text-[#4a4a4a] hover:bg-gray-50">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
