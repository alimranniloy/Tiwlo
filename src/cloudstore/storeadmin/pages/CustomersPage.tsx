import React from 'react';
import { AlertCircle, Download, Plus, Search, X } from 'lucide-react';
import { createStoreCustomerWithApi, fetchStoreCustomersForAdmin, fetchStoreOrdersForAdmin } from '../../../lib/tiwloApi';

const customerDefaults = {
  name: '',
  email: '',
  phone: '',
  tier: 'standard',
  city: '',
  country: ''
};

export default function CustomersPage({ store }: { store: any }) {
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState(customerDefaults);

  const loadCustomers = React.useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError('');
    try {
      const [customerRows, orderRows] = await Promise.all([
        fetchStoreCustomersForAdmin(store.id),
        fetchStoreOrdersForAdmin(store.id)
      ]);
      setCustomers(customerRows);
      setOrders(orderRows);
    } catch (err) {
      setCustomers([]);
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  React.useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const saveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!store?.id) return;
    setSaving(true);
    setError('');
    try {
      await createStoreCustomerWithApi({
        storeId: store.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        tier: form.tier,
        address: { city: form.city.trim(), country: form.country.trim() }
      });
      setForm(customerDefaults);
      setFormOpen(false);
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create customer');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = filteredCustomers.map((customer) => [
      customer.name,
      customer.email,
      customer.phone || '',
      customer.tier,
      customer.points || 0
    ]);
    const csv = [['Name', 'Email', 'Phone', 'Tier', 'Points'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store?.slug || 'store'}-customers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const customerTotals = orders.reduce<Record<string, { count: number; spent: number }>>((acc, order) => {
    if (!order.customerId) return acc;
    acc[order.customerId] = acc[order.customerId] || { count: 0, spent: 0 };
    acc[order.customerId].count += 1;
    acc[order.customerId].spent += Number(order.total || 0);
    return acc;
  }, {});

  const filteredCustomers = customers.filter((customer) => (
    [customer.name, customer.email, customer.phone, customer.tier].join(' ').toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">Customer records are scoped to this store database.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded-sm bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
            <Plus className="h-3.5 w-3.5" /> Add Customer
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
        <form onSubmit={saveCustomer} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Add Customer</h2>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {[
              ['name', 'Name'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['city', 'City'],
              ['country', 'Country']
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                <input
                  type={key === 'email' ? 'email' : 'text'}
                  value={(form as any)[key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  required={['name', 'email'].includes(key)}
                />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Tier</span>
              <select
                value={form.tier}
                onChange={(event) => setForm((prev) => ({ ...prev, tier: event.target.value }))}
                className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="standard">standard</option>
                <option value="vip">vip</option>
                <option value="wholesale">wholesale</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-sm bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Customer'}
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
              placeholder="Search customers..."
              className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Customers: {filteredCustomers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Phone</th>
                <th className="px-4 py-3 font-bold">Location</th>
                <th className="px-4 py-3 font-bold">Orders</th>
                <th className="px-4 py-3 font-bold">Amount spent</th>
                <th className="px-4 py-3 font-bold">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading customers from API...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No customers found in the database.</td></tr>
              ) : filteredCustomers.map((customer) => {
                const totals = customerTotals[customer.id] || { count: 0, spent: 0 };
                return (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-400">{customer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{customer.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.address?.city || customer.address?.country ? `${customer.address?.city || ''} ${customer.address?.country || ''}`.trim() : '-'}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{totals.count}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{store?.currency || 'USD'} {totals.spent.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{customer.tier}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
