import React from 'react';
import { AlertCircle, RefreshCw, Save, Search } from 'lucide-react';
import { fetchStoreProductsForAdmin, updateStoreProductWithApi } from '../../../lib/tiwloApi';

export default function InventoryPage({ store }: { store: any }) {
  const [products, setProducts] = React.useState<any[]>([]);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState('');
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');

  const loadProducts = React.useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError('');
    try {
      const rows = await fetchStoreProductsForAdmin(store.id);
      setProducts(rows);
      setDrafts(rows.reduce<Record<string, string>>((acc, product) => {
        acc[product.id] = String(product.stock ?? 0);
        return acc;
      }, {}));
    } catch (err) {
      setProducts([]);
      setError(err instanceof Error ? err.message : 'Unable to load inventory');
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const saveStock = async (product: any) => {
    setSavingId(product.id);
    setError('');
    try {
      await updateStoreProductWithApi({ id: product.id, stock: Number(drafts[product.id] || 0) });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update stock');
    } finally {
      setSavingId('');
    }
  };

  const filtered = products.filter((product) => (
    [product.name, product.sku, product.category, product.status].join(' ').toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">Stock levels are edited directly against store products in the database.</p>
        </div>
        <button onClick={loadProducts} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search inventory..."
              className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Products: {filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">SKU</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Stock</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading inventory from API...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No products found in the database.</td></tr>
              ) : filtered.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      value={drafts[product.id] ?? ''}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [product.id]: event.target.value }))}
                      className="w-24 rounded-sm border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{product.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => saveStock(product)}
                      disabled={savingId === product.id}
                      className="inline-flex items-center gap-1 rounded-sm bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" /> {savingId === product.id ? 'Saving' : 'Save'}
                    </button>
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
