import React from 'react';
import { AlertCircle, Edit3, Package, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import {
  createStoreProductWithApi,
  deleteStoreProductWithApi,
  fetchStoreProductsForAdmin,
  fetchStoresWithApi,
  updateStoreProductWithApi
} from '../../lib/tiwloApi';
import { useActionConfirmation } from '../../components/ActionConfirmation';
import { useCurrency } from '../../lib/useCurrency';

type ProductRow = {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  description?: string;
  updatedAt?: string;
};

export default function AdminStoreProducts() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'admin' });
  const [stores, setStores] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<ProductRow | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const { confirmDelete, confirmEdit } = useActionConfirmation();
  const [form, setForm] = React.useState({
    storeId: '',
    name: '',
    sku: '',
    category: '',
    price: '0',
    stock: '0',
    status: 'active',
    description: ''
  });

  const loadProducts = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const storeItems = await fetchStoresWithApi();
      const productGroups = await Promise.all(storeItems.map(async (store) => {
        const items = await fetchStoreProductsForAdmin(store.id);
        return items.map((product) => ({
          ...product,
          storeId: product.storeId || store.id,
          storeName: store.name
        }));
      }));
      setStores(storeItems);
      setProducts(productGroups.flat());
    } catch (err) {
      setStores([]);
      setProducts([]);
      setError(err instanceof Error ? err.message : 'Unable to load store products');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      storeId: stores[0]?.id || '',
      name: '',
      sku: '',
      category: '',
      price: '0',
      stock: '0',
      status: 'active',
      description: ''
    });
    setIsFormOpen(true);
  };

  const openEdit = async (product: ProductRow) => {
    const confirmed = await confirmEdit({
      title: 'Edit product?',
      message: 'Are you sure you want to edit this product?',
      resourceName: product.name
    });
    if (!confirmed) return;

    setEditing(product);
    setForm({
      storeId: product.storeId,
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      price: String(product.price || 0),
      stock: String(product.stock || 0),
      status: product.status || 'active',
      description: product.description || ''
    });
    setIsFormOpen(true);
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.storeId) {
      setError('Create a store first before adding products.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await updateStoreProductWithApi({
          id: editing.id,
          name: form.name,
          description: form.description,
          category: form.category,
          price: Number(form.price || 0),
          stock: Number(form.stock || 0),
          status: form.status
        });
        setProducts((current) => current.map((product) => (
          product.id === editing.id
            ? { ...product, ...updated, storeId: editing.storeId, storeName: editing.storeName }
            : product
        )));
      } else {
        const created = await createStoreProductWithApi({
          storeId: form.storeId,
          name: form.name,
          sku: form.sku,
          description: form.description,
          category: form.category,
          price: Number(form.price || 0),
          stock: Number(form.stock || 0),
          status: form.status
        });
        const store = stores.find((item) => item.id === form.storeId);
        setProducts((current) => [{ ...created, storeId: form.storeId, storeName: store?.name || form.storeId }, ...current]);
      }
      setIsFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: ProductRow) => {
    const confirmed = await confirmDelete({
      title: 'Delete product?',
      message: 'Are you sure you want to delete this product?',
      resourceName: product.name
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteStoreProductWithApi(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete product');
    }
  };

  const filtered = products.filter((product) => {
    const haystack = `${product.name} ${product.sku} ${product.category} ${product.storeName}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const active = products.filter((product) => product.status === 'active').length;
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Store Products</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">All merchant store products are loaded from the database and scoped by store ID.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadProducts} className="flex items-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-[#f3f5f9]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc]">
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Stores', value: stores.length },
          { label: 'Products', value: products.length },
          { label: 'Active', value: active },
          { label: 'Inventory Value', value: money(inventoryValue) }
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border border-[#e5e8ed] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2e3d49]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-[#e5e8ed] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Product Registry</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." className="w-full rounded border border-[#e5e8ed] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#0069ff] focus:outline-none md:w-72" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e5e8ed] bg-white">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Product</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Store</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Category</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Price</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Stock</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading store products from API...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No store products found in the database.</td></tr>
              ) : filtered.map((product) => (
                <tr key={product.id} className="hover:bg-[#f3f5f9]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-50 text-[#0069ff]">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#2e3d49]">{product.name}</p>
                        <p className="text-[11px] font-mono text-gray-400">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-[#4a4a4a]">{product.storeName}</td>
                  <td className="px-6 py-4 text-[13px] text-[#4a4a4a]">{product.category}</td>
                  <td className="px-6 py-4 text-[13px] font-bold text-[#2e3d49]">{money(product.price)}</td>
                  <td className="px-6 py-4 text-[13px] text-[#4a4a4a]">{product.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${product.status === 'active' ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>{product.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(product)} className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-[#0069ff]" title="Edit"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => deleteProduct(product)} className="rounded p-2 text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveProduct} className="w-full max-w-2xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <h2 className="text-lg font-bold text-[#2e3d49]">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto p-6 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Store</span>
                <select disabled={Boolean(editing)} value={form.storeId} onChange={(event) => setForm((current) => ({ ...current, storeId: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none disabled:bg-gray-50">
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Name</span>
                <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">SKU</span>
                <input required disabled={Boolean(editing)} value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none disabled:bg-gray-50" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Category</span>
                <input required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {['active', 'draft', 'disabled', 'archived'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Price</span>
                <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Stock</span>
                <input type="number" min="0" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Description</span>
                <textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
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
