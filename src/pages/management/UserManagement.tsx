import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Download,
  Edit3,
  Eye,
  Fingerprint,
  Mail,
  MapPin,
  Monitor,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  X
} from 'lucide-react';
import {
  deleteStoreCustomerWithApi,
  deleteUserWithApi,
  fetchIspClientsWithApi,
  fetchStoreCustomerGroupsWithApi,
  fetchStoreCustomersForAdmin,
  fetchUsersForAdmin,
  updateStoreCustomerWithApi,
  updateUserWithApi
} from '../../lib/tiwloApi';
import { useActionConfirmation } from '../../components/ActionConfirmation';
import { COUNTRIES, countryByCode } from '../../lib/countries';

const roles = ['super_admin', 'admin', 'manager', 'staff', 'user', 'store_owner', 'store_customer', 'isp_admin'];
const statuses = ['active', 'pending', 'suspended', 'banned', 'blocked', 'disabled'];

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const planFromRole = (role: string) => {
  if (['admin', 'super_admin'].includes(role)) return 'Enterprise';
  if (role === 'store_owner') return 'Commerce';
  if (role === 'isp_admin') return 'ISP';
  if (['manager', 'staff'].includes(role)) return 'Staff';
  return 'Basic';
};

const statusTone = (status?: string) => {
  const value = String(status || 'active').toLowerCase();
  if (value === 'active') return 'bg-[#e7f6f1] text-[#24ad5f] border-[#24ad5f]/20';
  if (value === 'pending') return 'bg-amber-50 text-amber-600 border-amber-200';
  if (value === 'banned' || value === 'blocked') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-red-50 text-red-600 border-red-200';
};

export default function UserManagement() {
  const [directoryTab, setDirectoryTab] = useState<'platform' | 'ecommerce' | 'isp'>('platform');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [countryFilter, setCountryFilter] = useState('');
  const [storeGroups, setStoreGroups] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [storeCustomers, setStoreCustomers] = useState<any[]>([]);
  const [ispClients, setIspClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [detailsUser, setDetailsUser] = useState<any | null>(null);
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const mappedUsers = useMemo(() => users
    .filter((item) => !countryFilter || String(item.country || '').toUpperCase() === countryFilter)
    .map((item) => ({
      ...item,
      countryInfo: countryByCode(item.country),
      plan: planFromRole(item.role),
      statusLabel: String(item.status || 'active').replace(/^\w/, (char) => char.toUpperCase()),
      joined: formatDate(item.createdAt),
      spend: `$${Number(item.credits || 0).toFixed(2)}`
    })), [countryFilter, users]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const items = await fetchUsersForAdmin(searchTerm || undefined);
      setUsers(items);
    } catch (err) {
      setUsers([]);
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const loadStoreGroups = async () => {
    setClientLoading(true);
    setError('');
    try {
      const rows = await fetchStoreCustomerGroupsWithApi(searchTerm || undefined);
      setStoreGroups(rows);
      if (selectedStore && !rows.some((row) => row.store.id === selectedStore.id)) {
        setSelectedStore(null);
        setStoreCustomers([]);
      }
    } catch (err) {
      setStoreGroups([]);
      setError(err instanceof Error ? err.message : 'Unable to load ecommerce customers');
    } finally {
      setClientLoading(false);
    }
  };

  const loadStoreCustomers = async (store: any) => {
    setSelectedStore(store);
    setClientLoading(true);
    setError('');
    try {
      setStoreCustomers(await fetchStoreCustomersForAdmin(store.id));
    } catch (err) {
      setStoreCustomers([]);
      setError(err instanceof Error ? err.message : 'Unable to load store customers');
    } finally {
      setClientLoading(false);
    }
  };

  const loadIspClients = async () => {
    setClientLoading(true);
    setError('');
    try {
      setIspClients(await fetchIspClientsWithApi(searchTerm || undefined));
    } catch (err) {
      setIspClients([]);
      setError(err instanceof Error ? err.message : 'Unable to load ISP users');
    } finally {
      setClientLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (directoryTab === 'ecommerce') loadStoreGroups();
      if (directoryTab === 'isp') loadIspClients();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [directoryTab, searchTerm]);

  const handleExport = () => {
    const filename = directoryTab === 'ecommerce'
      ? `tiwlo-${selectedStore?.slug || 'ecommerce'}-customers.csv`
      : directoryTab === 'isp'
        ? 'tiwlo-isp-users.csv'
        : 'tiwlo-users.csv';
    const rows: unknown[][] = directoryTab === 'ecommerce'
      ? [
        ['id', 'storeId', 'storeName', 'name', 'email', 'phone', 'status', 'tier', 'points', 'address'],
        ...storeCustomers.map((customer) => [
          customer.id,
          customer.storeId,
          selectedStore?.name || '',
          customer.name,
          customer.email,
          customer.phone,
          customer.status,
          customer.tier,
          customer.points,
          [customer.address?.line1, customer.address?.city, customer.address?.country, customer.address?.zip].filter(Boolean).join(' ')
        ])
      ]
      : directoryTab === 'isp'
        ? [
          ['id', 'name', 'username', 'email', 'phone', 'package', 'balance', 'status'],
          ...ispClients.map((client) => [client.id, client.name, client.username, client.email, client.phone, client.package?.name || client.packageId, client.balance, client.status])
        ]
        : [
          ['id', 'name', 'email', 'country', 'mobileCountryCode', 'phone', 'role', 'status', 'credits', 'createdAt'],
          ...mappedUsers.map((user) => [user.id, user.name, user.email, user.country, user.mobileCountryCode, user.phone, user.role, user.status, user.credits, user.createdAt])
        ];

    const csv = rows
      .map((row) => row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    if (directoryTab === 'ecommerce') {
      loadStoreGroups();
      if (selectedStore) loadStoreCustomers(selectedStore);
      return;
    }
    if (directoryTab === 'isp') {
      loadIspClients();
      return;
    }
    loadUsers();
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateUserWithApi({
        id: editing.id,
        name: editing.name,
        email: editing.email,
        role: editing.role,
        status: editing.status,
        credits: Number(editing.credits || 0),
        country: editing.country,
        mobileCountryCode: editing.mobileCountryCode || countryByCode(editing.country).dialCode,
        phone: editing.phone
      });
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user');
    } finally {
      setSaving(false);
    }
  };

  const openUserEdit = async (user: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit user?',
      message: 'Are you sure you want to edit this user?',
      resourceName: user.email || user.name
    });
    if (!confirmed) return;
    setEditing(user);
  };

  const handleDelete = async (id: string) => {
    const target = users.find((user) => user.id === id);
    const confirmed = await confirmDelete({
      title: 'Delete user?',
      message: 'Are you sure you want to delete this user? This also removes their owned resources.',
      resourceName: target?.email || target?.name || id
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteUserWithApi(id);
      setUsers((current) => current.filter((user) => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete user');
    }
  };

  const openStoreCustomerEdit = async (customer: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit store customer?',
      message: 'Are you sure you want to edit this store customer?',
      resourceName: customer.email || customer.name
    });
    if (!confirmed) return;
    setEditingCustomer(customer);
  };

  const saveStoreCustomer = async () => {
    if (!editingCustomer) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateStoreCustomerWithApi({
        id: editingCustomer.id,
        name: editingCustomer.name,
        email: editingCustomer.email,
        phone: editingCustomer.phone,
        status: editingCustomer.status,
        tier: editingCustomer.tier,
        points: Number(editingCustomer.points || 0),
        address: editingCustomer.address || {}
      });
      setStoreCustomers((current) => current.map((customer) => customer.id === updated.id ? updated : customer));
      setEditingCustomer(null);
      await loadStoreGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update store customer');
    } finally {
      setSaving(false);
    }
  };

  const removeStoreCustomer = async (customer: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete store customer?',
      message: `Are you sure you want to delete this customer from ${selectedStore?.name || 'this store'}?`,
      resourceName: customer.email || customer.name
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteStoreCustomerWithApi(customer.id);
      setStoreCustomers((current) => current.filter((item) => item.id !== customer.id));
      await loadStoreGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete store customer');
    }
  };

  const directoryTabs = [
    { key: 'platform', label: 'Platform Users', detail: 'Main Tiwlo accounts' },
    { key: 'ecommerce', label: 'Ecommerce Users', detail: 'Store-scoped customers' },
    { key: 'isp', label: 'ISP Users', detail: 'Subscriber clients' }
  ] as const;

  const administratorCount = mappedUsers.filter((user) => ['admin', 'super_admin'].includes(String(user.role))).length;
  const unusualUsers = mappedUsers.filter((user) => Number(user.securitySummary?.unusualCount || 0) > 0).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">User Management</h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1">Audit and manage database-backed platform accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="bg-white border border-[#e5e8ed] text-[#4a4a4a] px-4 py-2 rounded font-bold text-[13px] hover:bg-[#f3f5f9] transition-all flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading || clientLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleExport} className="bg-white border border-[#e5e8ed] text-[#4a4a4a] px-4 py-2 rounded font-bold text-[13px] hover:bg-[#f3f5f9] transition-all flex items-center gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {directoryTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDirectoryTab(tab.key)}
            className={`rounded-lg border px-4 py-3 text-left transition-all ${
              directoryTab === tab.key ? 'border-[#0069ff] bg-blue-50 text-[#0069ff]' : 'border-[#e5e8ed] bg-white text-[#4a4a4a] hover:bg-[#f8f9fa]'
            }`}
          >
            <p className="text-[13px] font-black uppercase tracking-wider">{tab.label}</p>
            <p className="mt-1 text-[11px] font-medium opacity-70">{tab.detail}</p>
          </button>
        ))}
      </div>

      {directoryTab === 'ecommerce' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-lg border border-[#e5e8ed] bg-white shadow-sm lg:col-span-4">
            <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search stores..."
                  className="w-full rounded border border-[#e5e8ed] bg-white py-2 pl-10 pr-3 text-[13px] outline-none focus:border-[#0069ff]"
                />
              </div>
            </div>
            <div className="max-h-[620px] overflow-y-auto divide-y divide-[#f3f5f9]">
              {clientLoading && storeGroups.length === 0 ? (
                <div className="p-8 text-center text-[13px] font-bold text-gray-400">Loading stores...</div>
              ) : storeGroups.length === 0 ? (
                <div className="p-8 text-center text-[13px] font-bold text-gray-400">No ecommerce stores found.</div>
              ) : storeGroups.map((group) => (
                <button
                  key={group.store.id}
                  onClick={() => loadStoreCustomers(group.store)}
                  className={`flex w-full items-center justify-between p-4 text-left transition-colors ${selectedStore?.id === group.store.id ? 'bg-blue-50' : 'hover:bg-[#f8f9fa]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-50 text-[#0069ff]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-[#2e3d49]">{group.store.name}</p>
                      <p className="text-[11px] font-medium text-gray-400">{group.store.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#2e3d49]">{group.customerCount}</p>
                    <p className="text-[10px] font-bold uppercase text-gray-400">users</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#e5e8ed] bg-white shadow-sm lg:col-span-8">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] p-4">
              <div>
                <h2 className="text-[15px] font-black text-[#2e3d49]">{selectedStore?.name || 'Select a store'}</h2>
                <p className="text-[12px] text-gray-500">Store-scoped customer accounts. These are not platform users.</p>
              </div>
              <button onClick={() => selectedStore && loadStoreCustomers(selectedStore)} disabled={!selectedStore} className="rounded border border-[#e5e8ed] bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e5e8ed] text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-black">User ID</th>
                    <th className="px-4 py-3 font-black">Customer</th>
                    <th className="px-4 py-3 font-black">Address</th>
                    <th className="px-4 py-3 font-black">Status</th>
                    <th className="px-4 py-3 font-black">Points</th>
                    <th className="px-4 py-3 text-right font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f5f9]">
                  {!selectedStore ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-[13px] font-bold text-gray-400">Choose a store to view customers.</td></tr>
                  ) : clientLoading ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-[13px] font-bold text-gray-400">Loading store customers...</td></tr>
                  ) : storeCustomers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-[13px] font-bold text-gray-400">No customer accounts in this store.</td></tr>
                  ) : storeCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#f8f9fa]">
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-500">{customer.id}</td>
                      <td className="px-4 py-4">
                        <p className="font-black text-[#2e3d49]">{customer.name}</p>
                        <p className="text-xs text-gray-400">{customer.email}</p>
                        <p className="text-xs text-gray-400">{customer.phone || '-'}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">{customer.address?.line1 || customer.address?.city || customer.address?.country || '-'}</td>
                      <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(customer.status)}`}>{customer.status}</span></td>
                      <td className="px-4 py-4 font-black text-[#2e3d49]">{customer.points || 0}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openStoreCustomerEdit(customer)} className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-[#0069ff]"><Edit3 className="h-4 w-4" /></button>
                          <button onClick={() => removeStoreCustomer(customer)} className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {directoryTab === 'isp' && (
        <div className="rounded-lg border border-[#e5e8ed] bg-white shadow-sm">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] p-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search ISP clients..." className="w-full rounded border border-[#e5e8ed] bg-white py-2 pl-10 pr-3 text-[13px] outline-none focus:border-[#0069ff]" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e5e8ed] text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-black">Client</th>
                  <th className="px-5 py-3 font-black">Username</th>
                  <th className="px-5 py-3 font-black">Contact</th>
                  <th className="px-5 py-3 font-black">Package</th>
                  <th className="px-5 py-3 font-black">Balance</th>
                  <th className="px-5 py-3 font-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f5f9]">
                {clientLoading ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-[13px] font-bold text-gray-400">Loading ISP users...</td></tr>
                ) : ispClients.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-[13px] font-bold text-gray-400">No ISP clients found.</td></tr>
                ) : ispClients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#f8f9fa]">
                    <td className="px-5 py-4">
                      <p className="font-black text-[#2e3d49]">{client.name}</p>
                      <p className="font-mono text-[11px] text-gray-400">{client.id}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-600">{client.username}</td>
                    <td className="px-5 py-4 text-gray-500">{client.email || client.phone || '-'}</td>
                    <td className="px-5 py-4 text-gray-500">{client.package?.name || client.packageId || '-'}</td>
                    <td className="px-5 py-4 font-black text-[#2e3d49]">${Number(client.balance || 0).toFixed(2)}</td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(client.status)}`}>{client.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {directoryTab === 'platform' && (
      <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden shadow-sm">
        <div className="grid gap-3 border-b border-[#f3f5f9] bg-white p-4 sm:grid-cols-3">
          {[
            ['Administrators', administratorCount],
            ['Tracked devices', mappedUsers.reduce((sum, user) => sum + Number(user.securitySummary?.deviceCount || 0), 0)],
            ['Unusual activity', unusualUsers]
          ].map(([label, value]) => (
            <div key={label} className="rounded-sm border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
              <p className="mt-1 text-xl font-black text-[#2e3d49]">{value}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-b border-[#f3f5f9] flex flex-col md:flex-row md:items-center gap-4 bg-[#f8f9fa]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#e5e8ed] rounded px-10 py-2 text-[14px] focus:outline-none focus:border-[#0069ff] transition-colors"
            />
          </div>
          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value)}
            className="rounded border border-[#e5e8ed] bg-white px-3 py-2 text-[13px] font-bold text-[#4a4a4a] outline-none focus:border-[#0069ff]"
            aria-label="Filter users by country"
          >
            <option value="">All countries</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
            ))}
          </select>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">{mappedUsers.length} Total Users</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-[#e5e8ed]">
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Plan Type</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Registration</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Device Security</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Credit Balance</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading users from API...</td>
                </tr>
              ) : mappedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No users found in the database.</td>
                </tr>
              ) : mappedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#f3f5f9] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e7f6f1] text-[#24ad5f] border border-[#24ad5f]/10 flex items-center justify-center font-bold text-sm">
                        {String(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#2e3d49]">{u.name}</p>
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                          <span className="text-sm leading-none">{u.countryInfo.flag}</span>
                          <span>{u.countryInfo.name}</span>
                          {u.mobileCountryCode && <span className="font-mono text-gray-400">{u.mobileCountryCode}</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusTone(u.status)}`}>
                      {u.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-medium text-[#4a4a4a] px-2 py-0.5 border border-gray-100 rounded bg-gray-50">
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[13px] text-[#2e3d49] font-medium">{u.joined}</p>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => setDetailsUser(u)} className="rounded-sm border border-[#e5e8ed] bg-white px-3 py-2 text-left transition-colors hover:border-[#0069ff] hover:bg-blue-50">
                      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#2e3d49]">
                        <Monitor className="h-3.5 w-3.5 text-[#0069ff]" />
                        {Number(u.securitySummary?.deviceCount || 0)} devices
                      </p>
                      <p className={`mt-1 text-[10px] font-bold ${Number(u.securitySummary?.unusualCount || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {Number(u.securitySummary?.unusualCount || 0)} unusual events
                      </p>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[13px] font-bold text-[#2e3d49]">{u.spend}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setDetailsUser(u)} className="p-2 hover:bg-slate-50 rounded transition-colors text-gray-400 hover:text-[#2e3d49]" title="View security details">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openUserEdit(u)} className="p-2 hover:bg-blue-50 rounded transition-colors text-gray-400 hover:text-[#0069ff]" title="Edit user">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-red-50 rounded transition-colors text-gray-400 hover:text-red-500" title="Delete user">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[#f3f5f9] flex items-center justify-between bg-[#f8f9fa]">
          <p className="text-[12px] text-gray-500">Showing <span className="font-bold">{mappedUsers.length}</span> database users</p>
        </div>
      </div>
      )}

      {detailsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-sm border border-[#e5e8ed] bg-white">
            <div className="flex items-start justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
              <div>
                <h2 className="text-[16px] font-black text-[#2e3d49]">User Security Details</h2>
                <p className="mt-1 text-[12px] text-gray-500">{detailsUser.name} / {detailsUser.email}</p>
              </div>
              <button onClick={() => setDetailsUser(null)} className="p-2 text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-3">
              {[
                ['First device login', detailsUser.securitySummary?.firstDevice?.deviceName || 'No device yet', formatDateTime(detailsUser.securitySummary?.firstDevice?.firstSeenAt)],
                ['Last device login', detailsUser.securitySummary?.lastDevice?.deviceName || 'No device yet', formatDateTime(detailsUser.securitySummary?.lastDevice?.lastSeenAt)],
                ['Last location', detailsUser.securitySummary?.lastLocation || 'Unknown', `${detailsUser.securitySummary?.deviceCount || 0} tracked devices`]
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-sm border border-[#e5e8ed] bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                  <p className="mt-2 text-sm font-black text-[#2e3d49]">{value}</p>
                  <p className="mt-1 text-[11px] font-medium text-gray-500">{detail}</p>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-sm border border-[#e5e8ed]">
                <div className="flex items-center justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] px-4 py-3">
                  <h3 className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider text-[#2e3d49]">
                    <Fingerprint className="h-4 w-4 text-[#0069ff]" />
                    Device fingerprint history
                  </h3>
                  {Number(detailsUser.securitySummary?.unusualCount || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase text-red-600">
                      <ShieldAlert className="h-3 w-3" />
                      {detailsUser.securitySummary.unusualCount} unusual
                    </span>
                  )}
                </div>
                <div className="divide-y divide-[#f3f5f9]">
                  {(detailsUser.deviceSessions || []).length === 0 ? (
                    <div className="p-8 text-center text-[13px] font-bold text-gray-400">No device login history recorded yet.</div>
                  ) : detailsUser.deviceSessions.map((session: any) => (
                    <div key={session.id} className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border ${session.unusual ? 'border-red-100 bg-red-50 text-red-600' : 'border-blue-100 bg-blue-50 text-[#0069ff]'}`}>
                          <Monitor className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-[#2e3d49]">{session.deviceName || 'Unknown device'}</p>
                          <p className="mt-1 font-mono text-[10px] text-gray-400">fp:{session.fingerprintHint || String(session.fingerprintHash || '').slice(0, 12)}</p>
                          <p className="mt-1 text-[11px] text-gray-500">{session.browser || 'Unknown browser'} / {session.os || 'Unknown OS'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400"><MapPin className="h-3.5 w-3.5" /> Location</p>
                        <p className="mt-1 text-[12px] font-bold text-[#2e3d49]">{[session.city, session.region, session.country].filter(Boolean).join(', ') || 'Unknown'}</p>
                        <p className="mt-1 font-mono text-[10px] text-gray-400">{session.ipAddress || 'No IP'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Activity</p>
                        <p className="mt-1 text-[12px] font-bold text-[#2e3d49]">First: {formatDateTime(session.firstSeenAt)}</p>
                        <p className="mt-1 text-[12px] font-bold text-[#2e3d49]">Last: {formatDateTime(session.lastSeenAt)}</p>
                        <p className="mt-1 text-[10px] text-gray-400">{session.loginCount} logins / {session.lastEvent}</p>
                      </div>
                      <div className="lg:text-right">
                        <span className={`inline-flex rounded-sm border px-2.5 py-1 text-[10px] font-black uppercase ${session.unusual ? 'border-red-100 bg-red-50 text-red-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                          {session.unusual ? 'Unusual' : 'Trusted'}
                        </span>
                        {session.unusual && (
                          <p className="mt-2 max-w-[180px] text-[10px] font-bold uppercase tracking-wide text-red-500 lg:ml-auto">
                            {(session.unusualReasons || []).join(', ').replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-lg border border-[#e5e8ed] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <h2 className="text-[15px] font-bold text-[#2e3d49]">Edit User</h2>
              <button onClick={() => setEditing(null)} className="p-2 text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Name</span>
                <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Email</span>
                <input value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Country</span>
                <select
                  value={editing.country || 'BD'}
                  onChange={(e) => {
                    const country = countryByCode(e.target.value);
                    setEditing({ ...editing, country: country.code, mobileCountryCode: country.dialCode });
                  }}
                  className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]"
                >
                  {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Mobile</span>
                <div className="grid grid-cols-[92px_1fr] overflow-hidden rounded border border-[#e5e8ed] focus-within:border-[#0069ff]">
                  <select
                    value={editing.country || 'BD'}
                    onChange={(e) => {
                      const country = countryByCode(e.target.value);
                      setEditing({ ...editing, country: country.code, mobileCountryCode: country.dialCode });
                    }}
                    className="border-r border-[#e5e8ed] bg-gray-50 px-2 py-2 text-[12px] font-black outline-none"
                  >
                    {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.dialCode}</option>)}
                  </select>
                  <input value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="w-full px-3 py-2 text-[13px] outline-none" />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Role</span>
                <select value={editing.role || 'user'} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]">
                  {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</span>
                <select value={editing.status || 'active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]">
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Credits</span>
                <input type="number" value={editing.credits ?? 0} onChange={(e) => setEditing({ ...editing, credits: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#f3f5f9] px-6 py-4">
              <button onClick={() => setEditing(null)} className="rounded border border-[#e5e8ed] px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#e5e8ed] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-[#2e3d49]">Edit Store Customer</h2>
                <p className="mt-1 text-[11px] font-medium text-gray-400">{selectedStore?.name || editingCustomer.storeId}</p>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="p-2 text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Name</span>
                <input value={editingCustomer.name || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Email</span>
                <input type="email" value={editingCustomer.email || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Phone</span>
                <input value={editingCustomer.phone || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</span>
                <select value={editingCustomer.status || 'active'} onChange={(e) => setEditingCustomer({ ...editingCustomer, status: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]">
                  {statuses.filter((status) => status !== 'banned').map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Tier</span>
                <select value={editingCustomer.tier || 'standard'} onChange={(e) => setEditingCustomer({ ...editingCustomer, tier: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]">
                  {['standard', 'silver', 'gold', 'vip'].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Points</span>
                <input type="number" value={editingCustomer.points ?? 0} onChange={(e) => setEditingCustomer({ ...editingCustomer, points: e.target.value })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Address Line</span>
                <input value={editingCustomer.address?.line1 || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, address: { ...(editingCustomer.address || {}), line1: e.target.value } })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">City</span>
                <input value={editingCustomer.address?.city || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, address: { ...(editingCustomer.address || {}), city: e.target.value } })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Country</span>
                <input value={editingCustomer.address?.country || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, address: { ...(editingCustomer.address || {}), country: e.target.value } })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">ZIP / Postcode</span>
                <input value={editingCustomer.address?.zip || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, address: { ...(editingCustomer.address || {}), zip: e.target.value } })} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <div className="rounded border border-blue-100 bg-blue-50 p-3 text-[12px] font-medium text-blue-700">
                This account is scoped to one store only. Updating it here will not create or modify a platform login.
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#f3f5f9] px-6 py-4">
              <button onClick={() => setEditingCustomer(null)} className="rounded border border-[#e5e8ed] px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-gray-50">Cancel</button>
              <button onClick={saveStoreCustomer} disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
