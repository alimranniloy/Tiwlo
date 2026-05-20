import React from 'react';
import StatCard from '../components/StatCard';
import {
  AlertCircle,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  Users
} from 'lucide-react';
import { fetchStoreCustomersForAdmin, fetchStoreOrdersForAdmin, fetchStoreProductsForAdmin } from '../../../lib/tiwloApi';

export default function DashboardHome({ store }: { store: any }) {
  const [products, setProducts] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadStore = async () => {
    setLoading(true);
    setError('');
    if (!store?.id) return;
    try {
      const [productRows, orderRows, customerRows] = await Promise.all([
        fetchStoreProductsForAdmin(store.id),
        fetchStoreOrdersForAdmin(store.id),
        fetchStoreCustomersForAdmin(store.id)
      ]);
      setProducts(productRows);
      setOrders(orderRows);
      setCustomers(customerRows);
    } catch (err) {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setError(err instanceof Error ? err.message : 'Unable to load store dashboard data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadStore();
  }, [store?.id]);

  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock || 0) <= 5);

  return (
    <div className="space-y-8">
      <section className="bg-white p-8 rounded border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{store?.name || 'Store'} Dashboard</h1>
            <p className="text-sm text-gray-500 font-medium">Products, orders, and customers are loaded from this store API scope.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadStore} className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button className="px-4 py-2 bg-black text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-all">Add Product</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Revenue" value={`$${revenue.toLocaleString()}`} trend="" icon={DollarSign} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Orders" value={String(orders.length)} trend="" icon={Package} color="text-purple-600" bg="bg-purple-50" />
        <StatCard label="Customers" value={String(customers.length)} trend="" icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Products" value={String(products.length)} trend="" icon={ShoppingBag} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Recent Orders</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Loading orders from API...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">No orders found in the database.</div>
            ) : orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">{order.number}</p>
                  <p className="text-xs text-gray-400">{order.status}</p>
                </div>
                <span className="text-sm font-black text-gray-900">${Number(order.total || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-gray-200">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Inventory Pulse</h3>
          <div className="space-y-4">
            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Loading inventory from API...</div>
            ) : lowStock.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">No low-stock products found.</div>
            ) : lowStock.slice(0, 5).map((stock) => (
              <div key={stock.id} className="flex items-center justify-between p-3 border border-gray-50 rounded">
                <span className="text-xs font-bold text-gray-900">{stock.name}</span>
                <span className={`text-[10px] font-black uppercase ${Number(stock.stock || 0) === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                  {Number(stock.stock || 0) === 0 ? 'Out' : `${stock.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
