import React from 'react';
import { AlertCircle, Download, Eye, Package, RefreshCw, Search, X } from 'lucide-react';
import { fetchStoreOrdersForAdmin, updateStoreOrderStatusWithApi } from '../../../lib/tiwloApi';

const orderStatuses = ['pending', 'paid', 'processing', 'in_transit', 'delivered', 'cancelled', 'refunded'];

export default function OrdersPage({ store }: { store: any }) {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState('');
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);

  const loadOrders = React.useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchStoreOrdersForAdmin(store.id));
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const changeStatus = async (order: any, status: string) => {
    setUpdatingId(order.id);
    setError('');
    try {
      await updateStoreOrderStatusWithApi(order.id, status);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update order');
    } finally {
      setUpdatingId('');
    }
  };

  const exportCsv = () => {
    const rows = filteredOrders.map((order) => [
      order.number,
      order.status,
      order.total,
      order.currency,
      order.customerId || '',
      order.createdAt || ''
    ]);
    const csv = [['Number', 'Status', 'Total', 'Currency', 'Customer', 'Created'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store?.slug || 'store'}-orders.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOrders = orders.filter((order) => (
    [order.number, order.status, order.customerId, order.payment?.provider].join(' ').toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Orders are loaded by storeId and status changes write to the API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={loadOrders} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
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
              placeholder="Search orders..."
              className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Orders: {filteredOrders.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Order</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Items</th>
                <th className="px-4 py-3 font-bold">Payment</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading orders from API...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No orders found in the database.</td></tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedOrder(order)} className="font-bold text-blue-600 hover:underline">{order.number}</button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{order.customerId || 'Guest checkout'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{order.currency || store?.currency || 'USD'} {Number(order.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <OrderItemsPreview order={order} onClick={() => setSelectedOrder(order)} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="font-bold">{order.payment?.provider || order.payment?.status || '-'}</div>
                    {order.payment?.billing && (
                      <div className="mt-1 text-[11px] text-gray-400">
                        {order.currency || store?.currency || 'USD'} {Number(order.payment.billing.hourlyRate || 0).toFixed(2)}/hr
                        {order.payment.billing.monthlyCost ? ` / ${Number(order.payment.billing.monthlyCost).toFixed(2)}/mo` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(event) => changeStatus(order, event.target.value)}
                      disabled={updatingId === order.id}
                      className="rounded-sm border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 disabled:opacity-60"
                    >
                      {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedOrder(order)} className="rounded-sm border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600" title="View details">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && <OrderDetailDrawer order={selectedOrder} store={store} onClose={() => setSelectedOrder(null)} onStatusChange={changeStatus} updating={updatingId === selectedOrder.id} />}
    </div>
  );
}

function orderItems(order: any) {
  return Array.isArray(order.items) ? order.items : [];
}

function OrderItemsPreview({ order, onClick }: { order: any; onClick: () => void }) {
  const items = orderItems(order);
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-left">
      <div className="flex -space-x-2">
        {items.slice(0, 3).map((item: any, index: number) => (
          <div key={`${item.productId || item.id || index}`} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-sm border border-white bg-gray-100 ring-1 ring-gray-200">
            {item.image || item.productImage ? <img src={item.image || item.productImage} alt={item.name || 'Item'} className="h-full w-full object-cover" /> : <Package className="h-3.5 w-3.5 text-gray-400" />}
          </div>
        ))}
        {items.length === 0 && <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-gray-200 bg-gray-50"><Package className="h-3.5 w-3.5 text-gray-400" /></div>}
      </div>
      <span className="text-xs font-bold text-gray-500">{items.length} item{items.length === 1 ? '' : 's'}</span>
    </button>
  );
}

function OrderDetailDrawer({ order, store, onClose, onStatusChange, updating }: { order: any; store: any; onClose: () => void; onStatusChange: (order: any, status: string) => void; updating: boolean }) {
  const items = orderItems(order);
  const shipping = order.shipping || {};
  const payment = order.payment || {};
  const currency = order.currency || store?.currency || 'USD';

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/30">
      <button aria-label="Close order details" className="absolute inset-0" onClick={onClose} />
      <aside className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-gray-300 bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order details</p>
            <h2 className="text-xl font-black text-gray-900">{order.number || order.id}</h2>
          </div>
          <button onClick={onClose} className="rounded-sm p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Status" value={order.status || 'pending'} />
            <Metric label="Items" value={String(items.length)} />
            <Metric label="Total" value={`${currency} ${Number(order.total || 0).toFixed(2)}`} />
            <Metric label="Created" value={order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'} />
          </div>

          <section className="rounded-sm border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="text-sm font-black text-gray-900">Products</h3>
              <select value={order.status} onChange={(event) => onStatusChange(order, event.target.value)} disabled={updating} className="rounded-sm border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 outline-none">
                {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <div className="p-8 text-center text-sm font-bold text-gray-400">No line items were stored for this order.</div>
              ) : items.map((item: any, index: number) => (
                <div key={`${item.productId || item.id || index}`} className="flex items-center gap-4 p-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-gray-50">
                    {item.image || item.productImage ? <img src={item.image || item.productImage} alt={item.name || item.productName || 'Product'} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-gray-900">{item.name || item.productName || item.sku || 'Product'}</p>
                    <p className="mt-1 text-xs text-gray-400">Product ID {item.productId || '-'} - SKU {item.sku || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{currency} {(Number(item.price || 0) * Number(item.qty || item.quantity || 1)).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Qty {item.qty || item.quantity || 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoPanel title="Shipping" rows={[
              ['Name', [shipping.firstName, shipping.lastName].filter(Boolean).join(' ') || shipping.name || '-'],
              ['Phone', shipping.phone || '-'],
              ['Address', [shipping.address || shipping.line1, shipping.city, shipping.country, shipping.zip].filter(Boolean).join(', ') || '-']
            ]} />
            <InfoPanel title="Invoice & Payment" rows={[
              ['Method', payment.method || payment.provider || '-'],
              ['Payment status', payment.status || order.status || '-'],
              ['Order total', `${currency} ${Number(order.total || 0).toFixed(2)}`]
            ]} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-gray-900">{value}</p>
    </div>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-sm border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-black text-gray-900">{title}</h3>
      <div className="mt-3 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-0.5 text-sm text-gray-700">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
