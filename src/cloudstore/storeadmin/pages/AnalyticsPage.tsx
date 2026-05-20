import React from 'react';
import { AlertCircle, DollarSign, Package, RefreshCw, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { fetchStoreCustomersForAdmin, fetchStoreOrdersForAdmin, fetchStoreProductsForAdmin } from '../../../lib/tiwloApi';

export default function AnalyticsPage({ store }: { store: any }) {
  const [products, setProducts] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadAnalytics = React.useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextOrders, nextCustomers] = await Promise.all([
        fetchStoreProductsForAdmin(store.id),
        fetchStoreOrdersForAdmin(store.id),
        fetchStoreCustomersForAdmin(store.id)
      ]);
      setProducts(nextProducts);
      setOrders(nextOrders);
      setCustomers(nextCustomers);
    } catch (err) {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setError(err instanceof Error ? err.message : 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  React.useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageOrder = orders.length ? revenue / orders.length : 0;
  const paidOrders = orders.filter((order) => String(order.payment?.status || '').toLowerCase() === 'paid').length;
  const categories = products.reduce<Record<string, { count: number; stock: number }>>((acc, product) => {
    const key = product.category || 'Uncategorized';
    acc[key] = acc[key] || { count: 0, stock: 0 };
    acc[key].count += 1;
    acc[key].stock += Number(product.stock || 0);
    return acc;
  }, {});

  const stats = [
    { label: 'Revenue', value: `${store?.currency || 'USD'} ${revenue.toFixed(2)}`, icon: DollarSign },
    { label: 'Average order', value: `${store?.currency || 'USD'} ${averageOrder.toFixed(2)}`, icon: TrendingUp },
    { label: 'Paid orders', value: String(paidOrders), icon: ShoppingBag },
    { label: 'Customers', value: String(customers.length), icon: Users }
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Live metrics calculated from this store's product, order, and customer records.</p>
        </div>
        <button onClick={loadAnalytics} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Category Performance</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Loading category data...</div>
            ) : Object.keys(categories).length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">No product categories found.</div>
            ) : (Object.entries(categories) as Array<[string, { count: number; stock: number }]>).map(([category, value]) => (
              <div key={category} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{category}</p>
                    <p className="text-xs text-gray-400">{value.count} products</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-700">{value.stock} stock</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Order Status</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Loading order data...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">No orders found.</div>
            ) : Object.entries(orders.reduce<Record<string, number>>((acc, order) => {
              const status = order.status || 'pending';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {})).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-4">
                <span className="text-sm font-bold capitalize text-gray-900">{status.replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
