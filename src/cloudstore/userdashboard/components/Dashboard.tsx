import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  CreditCard,
  Heart,
  History,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  User as UserIcon,
  X,
  Zap
} from 'lucide-react';
import {
  updateStoreCustomerProfileWithApi,
  type StoreCustomerDashboard
} from '../../../lib/tiwloApi';
import { useCurrency } from '../../../lib/useCurrency';

type DashboardProps = {
  dashboard: StoreCustomerDashboard;
  params: URLSearchParams;
  onReload: () => void;
  onLogout: () => void;
};

const statusLabels: Record<string, string[]> = {
  pay: ['pending', 'unpaid', 'payment_pending'],
  ship: ['processing', 'paid', 'confirmed'],
  shipped: ['shipped', 'in_transit', 'out_for_delivery'],
  returns: ['returned', 'return_requested', 'refunded', 'refund_pending']
};

type StoreMoneyFormatter = (value: number, sourceCurrency?: string) => string;

const StoreMoneyContext = React.createContext<StoreMoneyFormatter>((value, currency = 'USD') => (
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0))
));

function useStoreMoney() {
  return React.useContext(StoreMoneyContext);
}

function dateLabel(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function withAlpha(hex: string, alpha: string) {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return `${hex}${alpha}`;
  return `#${clean}${alpha}`;
}

function brand(dashboard: StoreCustomerDashboard) {
  return {
    name: dashboard.settings?.logoText || dashboard.store?.name || 'Store Account',
    accent: dashboard.settings?.accentColor || '#FF6600',
    initial: String(dashboard.settings?.logoText || dashboard.store?.name || 'S').charAt(0).toLowerCase()
  };
}

function dashboardPath(params: URLSearchParams, path = '') {
  const query = params.toString();
  return `/store/user${path ? `/${path}` : ''}${query ? `?${query}` : ''}`;
}

function storePath(dashboard: StoreCustomerDashboard, path = '') {
  const theme = dashboard.activeTheme?.key || dashboard.settings?.homepageTemplate || 'aura';
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
  return `/themes/${theme}${suffix}?storeId=${encodeURIComponent(dashboard.store.id)}&theme=${encodeURIComponent(theme)}`;
}

function orderStatus(order: any) {
  return String(order.status || '').toLowerCase();
}

function countOrders(dashboard: StoreCustomerDashboard, bucket: keyof typeof statusLabels) {
  const statuses = statusLabels[bucket];
  return dashboard.orders.filter((order) => statuses.includes(orderStatus(order))).length;
}

function customerRecordMatches(record: any, dashboard: StoreCustomerDashboard) {
  const data = record?.data || record || {};
  const email = String(dashboard.customer.email || '').toLowerCase();
  const customerId = String(dashboard.customer.id || '');
  const recordEmail = String(data.email || data.customerEmail || data.customer?.email || '').toLowerCase();
  const recordCustomerId = String(data.customerId || data.customer?.id || '');
  return !recordEmail && !recordCustomerId ? true : recordEmail === email || recordCustomerId === customerId;
}

function collectRecords(dashboard: StoreCustomerDashboard, keys: string[]) {
  return keys
    .flatMap((key) => dashboard.records?.[key] || [])
    .filter((record) => customerRecordMatches(record, dashboard));
}

function recordTitle(record: any) {
  const data = record?.data || {};
  return record?.title || data.title || data.name || data.productName || data.subject || data.reference || record?.id || 'Record';
}

function recordDetail(record: any) {
  const data = record?.data || {};
  return record?.summary || data.summary || data.message || data.note || data.status || record?.status || '';
}

function firstOrderProduct(order: any) {
  const item = Array.isArray(order.items) ? order.items[0] : null;
  return {
    name: item?.name || item?.productName || order.number || 'Order item',
    image: item?.image || item?.productImage || '',
    count: Array.isArray(order.items) ? order.items.length : 0
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ dashboard, params, onReload, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const location = useLocation();
  const { money: storeMoney } = useCurrency({ scope: 'storefront', scopeId: dashboard.store?.id || dashboard.store?.slug || 'customer' });
  const b = brand(dashboard);
  const customerName = dashboard.customer.name || dashboard.customer.email;
  const unreadMessages = collectRecords(dashboard, ['messages', 'customer-messages', 'support-messages'])
    .filter((record) => String(record.status || record?.data?.status || '').toLowerCase() === 'unread').length;

  return (
    <StoreMoneyContext.Provider value={storeMoney}>
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col md:flex-row" style={{ ['--store-accent' as string]: b.accent, ['--store-accent-soft' as string]: withAlpha(b.accent, '12') }}>
      <header className="md:hidden h-[64px] bg-white border-b border-[#E6E6E6] px-4 flex items-center justify-between sticky top-0 z-50 shadow-none">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-[#666]">
            <Menu size={24} />
          </button>
          <BrandMark dashboard={dashboard} />
        </div>
        <div className="flex items-center gap-3">
          <Link to={dashboardPath(params, 'messages')} className="relative text-[#666]">
            <MessageSquare size={20} />
            {unreadMessages > 0 && <Badge value={String(unreadMessages)} />}
          </Link>
          <Avatar name={customerName} accent={b.accent} />
        </div>
      </header>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black z-[100] md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-[260px] bg-white z-[101] md:hidden flex flex-col p-4 shadow-none">
              <div className="flex items-center justify-between mb-8">
                <BrandMark dashboard={dashboard} large />
                <button onClick={() => setIsSidebarOpen(false)} className="text-[#999]">
                  <X size={24} />
                </button>
              </div>
              <SidebarContent dashboard={dashboard} params={params} onLogout={onLogout} currentPath={location.pathname} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="hidden md:flex w-[240px] bg-white border-r border-[#E6E6E6] flex-col pt-4 sticky top-0 h-screen overflow-y-auto">
        <div className="px-6 mb-8">
          <BrandMark dashboard={dashboard} large />
        </div>
        <SidebarContent dashboard={dashboard} params={params} onLogout={onLogout} currentPath={location.pathname} />
      </aside>

      <main className="flex-1 flex flex-col overflow-x-hidden pb-20 md:pb-0">
        <header className="hidden md:flex h-[64px] bg-white border-b border-[#E6E6E6] px-8 items-center justify-between sticky top-0 z-40">
          <div className="relative w-[450px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999] w-4 h-4" />
            <input type="text" placeholder="Search orders, messages, rewards..." className="w-full pl-10 pr-4 py-2 bg-[#F8F8F8] border border-[#DDD] rounded-sm focus:outline-none text-sm transition-all" />
          </div>

          <div className="flex items-center gap-6">
            <HeaderIconButton to={dashboardPath(params, 'messages')} icon={<MessageSquare size={19} />} badge={unreadMessages ? String(unreadMessages) : undefined} />
            <button onClick={onReload} className="relative p-2 text-[#666] hover:bg-gray-50 rounded-sm transition-colors shadow-none">
              <RefreshCw size={19} />
            </button>
            <div className="h-6 w-[1px] bg-[#EEE] mx-1" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-[#333]">{customerName}</p>
                <p className="text-[10px] text-[#999] uppercase tracking-wide">{dashboard.customer.tier || 'standard'} tier - ID {String(dashboard.customer.id).slice(-6)}</p>
              </div>
              <Avatar name={customerName} accent={b.accent} />
            </div>
          </div>
        </header>

        <Routes>
          <Route index element={<Overview dashboard={dashboard} params={params} onOpenOrder={setSelectedOrder} />} />
          <Route path="orders" element={<OrdersPage dashboard={dashboard} onOpenOrder={setSelectedOrder} />} />
          <Route path="wishlist" element={<RecordGridPage dashboard={dashboard} title="Wishlist" recordKeys={['wishlist', 'wishlists', 'customer-wishlist']} emptyLabel="No wishlist records are saved for this store account." />} />
          <Route path="recent" element={<RecentPage dashboard={dashboard} />} />
          <Route path="address" element={<AddressPage dashboard={dashboard} onReload={onReload} />} />
          <Route path="payment" element={<PaymentPage dashboard={dashboard} onOpenOrder={setSelectedOrder} />} />
          <Route path="messages" element={<MessagesPage dashboard={dashboard} />} />
          <Route path="rewards" element={<RewardsPage dashboard={dashboard} />} />
          <Route path="returns" element={<ReturnsPage dashboard={dashboard} />} />
          <Route path="settings" element={<SettingsPage dashboard={dashboard} onReload={onReload} />} />
        </Routes>

        {selectedOrder && <OrderDetailModal order={selectedOrder} dashboard={dashboard} onClose={() => setSelectedOrder(null)} />}

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6E6E6] h-16 flex items-center justify-around z-50 px-2 shadow-none">
          <MobileNavTab to={dashboardPath(params)} icon={<Home size={22} />} label="Home" active={location.pathname === '/store/user'} />
          <MobileNavTab to={dashboardPath(params, 'orders')} icon={<ShoppingBag size={22} />} label="Orders" active={location.pathname.includes('/orders')} />
          <MobileNavTab to={dashboardPath(params, 'messages')} icon={<MessageSquare size={22} />} label="Messages" active={location.pathname.includes('/messages')} badge={unreadMessages ? String(unreadMessages) : undefined} />
          <MobileNavTab to={dashboardPath(params, 'settings')} icon={<UserIcon size={22} />} label="Profile" active={location.pathname.includes('/settings')} />
        </nav>
      </main>
    </div>
    </StoreMoneyContext.Provider>
  );
};

function BrandMark({ dashboard, large = false }: { dashboard: StoreCustomerDashboard; large?: boolean }) {
  const b = brand(dashboard);
  return (
    <div className="flex items-center gap-2">
      <div className={`${large ? 'w-8 h-8' : 'w-8 h-8'} rounded-sm flex items-center justify-center font-bold text-white`} style={{ backgroundColor: b.accent }}>{b.initial}</div>
      <span className={`font-bold text-[#333] ${large ? 'text-lg' : 'text-base'}`}>{b.name}</span>
    </div>
  );
}

function Avatar({ name, accent }: { name: string; accent: string }) {
  return (
    <div className="w-9 h-9 rounded-full border border-[#DDD] p-0.5">
      <div className="w-full h-full rounded-full flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: accent }}>
        {String(name || 'U').charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white" style={{ backgroundColor: 'var(--store-accent)' }}>{value}</span>;
}

function Overview({ dashboard, params, onOpenOrder }: { dashboard: StoreCustomerDashboard; params: URLSearchParams; onOpenOrder: (order: any) => void }) {
  const money = useStoreMoney();
  const b = brand(dashboard);
  const customerName = dashboard.customer.name || dashboard.customer.email;
  const currency = dashboard.store.currency || 'USD';
  const recentOrders = dashboard.orders.slice(0, 3);
  const recommended = dashboard.products.slice(0, 5);
  const firstOpenOrder = dashboard.orders.find((order) => !['delivered', 'cancelled', 'canceled', 'refunded'].includes(orderStatus(order)));
  const orderProduct = firstOpenOrder ? firstOrderProduct(firstOpenOrder) : null;
  const coupons = collectRecords(dashboard, ['coupons', 'vouchers']).length;
  const walletRecords = collectRecords(dashboard, ['wallet', 'wallet-transactions']);
  const walletBalance = walletRecords.reduce((sum, record) => sum + Number(record?.data?.amount || record?.amount || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="grid grid-cols-12 gap-5 md:gap-6">
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E6E6E6] p-6 rounded-sm min-h-[220px] flex flex-col justify-between shadow-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" style={{ backgroundColor: withAlpha(b.accent, '12') }} />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-white shadow-none ring-1 flex items-center justify-center text-xl font-black text-white" style={{ backgroundColor: b.accent, borderColor: withAlpha(b.accent, '33') }}>
                  {String(customerName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 text-white p-1 rounded-full border-2 border-white" style={{ backgroundColor: b.accent }}>
                  <Star size={10} fill="currentColor" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#333]">Hi, {customerName}!</h3>
                <p className="text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full w-fit mt-1" style={{ color: b.accent, backgroundColor: withAlpha(b.accent, '12') }}>
                  <Zap size={10} fill="currentColor" /> {String(dashboard.customer.tier || 'standard').toUpperCase()} MEMBER
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-[10px] font-bold text-[#666] tracking-wider">
                <span>REWARD POINTS</span>
                <span>{dashboard.customer.points || 0}</span>
              </div>
              <div className="h-1.5 w-full bg-[#F5F5F5] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(dashboard.customer.points || 0) / 20)}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full" style={{ backgroundColor: b.accent }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#F5F5F5] relative z-10">
            <StatItem label="Coupons" value={String(coupons)} active />
            <StatItem label="Points" value={String(dashboard.customer.points || 0)} />
            <StatItem label="Wallet" value={money(walletBalance, currency)} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white border border-[#E6E6E6] rounded-sm divide-x divide-[#F5F5F5] flex overflow-hidden shadow-none">
            <QuickAction to={dashboardPath(params, 'orders')} icon={<Package className="text-blue-500" size={22} />} count={String(countOrders(dashboard, 'pay'))} label="To Pay" />
            <QuickAction to={dashboardPath(params, 'orders')} icon={<Truck className="text-green-500" size={22} />} count={String(countOrders(dashboard, 'shipped'))} label="Shipped" />
            <QuickAction to={dashboardPath(params)} icon={<Tag className="text-orange-400" size={22} />} count={String(coupons)} label="Vouchers" />
            <QuickAction to={dashboardPath(params, 'returns')} icon={<Repeat className="text-purple-500" size={22} />} count={String(countOrders(dashboard, 'returns'))} label="Returns" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full">
            <DashboardWidget title="Delivery Status">
              {firstOpenOrder ? (
                <div className="flex items-center gap-4 bg-[#F9FBFF] p-3 rounded-sm border border-blue-50">
                  <div className="w-10 h-10 bg-white border border-blue-100 rounded-sm flex items-center justify-center text-blue-600 shadow-none">
                    <Truck size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#333]">{orderProduct?.name}</p>
                    <p className="text-[10px] text-[#999] truncate">Order {firstOpenOrder.number} - {orderProduct?.count || 0} items</p>
                  </div>
                  <div className="text-[9px] text-blue-600 font-bold bg-white px-2 py-1 rounded-sm border border-blue-100">{String(firstOpenOrder.status).toUpperCase()}</div>
                </div>
              ) : (
                <EmptySmall label="No open delivery right now." />
              )}
            </DashboardWidget>
            <DashboardWidget title="Account Safety">
              <div className="flex items-center justify-between bg-[#F7FFF9] p-3 rounded-sm border border-green-50">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-[#333]">Security Standing</p>
                  <p className="text-[10px] text-[#999]">Store-scoped customer login</p>
                </div>
                <div className="text-green-600 font-bold text-[10px] flex items-center gap-1 bg-white px-2 py-1 rounded-sm border border-green-100">
                  {String(dashboard.customer.status || 'active').toUpperCase()} <ShieldCheck size={12} />
                </div>
              </div>
            </DashboardWidget>
          </div>
        </div>
      </div>

      <FunctionCenter dashboard={dashboard} params={params} />

      <div className="bg-white border border-[#E6E6E6] rounded-sm overflow-hidden shadow-none">
        <div className="p-4 border-b border-[#EEE] flex justify-between items-center bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} style={{ color: b.accent }} />
            <h4 className="font-bold text-sm text-[#333]">Recent Orders</h4>
          </div>
          <Link to={dashboardPath(params, 'orders')} className="text-xs font-bold hover:underline flex items-center gap-1" style={{ color: b.accent }}>
            View All Orders <ChevronRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-[#EEE]">
          {recentOrders.length === 0 ? (
            <EmptyBlock label="No orders yet." />
          ) : recentOrders.map((order) => <OrderRow key={order.id} order={order} dashboard={dashboard} onOpen={() => onOpenOrder(order)} />)}
        </div>
      </div>

      <ProductRail dashboard={dashboard} products={recommended} title="Recommended For You" />
    </div>
  );
}

function FunctionCenter({ dashboard, params }: { dashboard: StoreCustomerDashboard; params: URLSearchParams }) {
  const coupons = collectRecords(dashboard, ['coupons', 'vouchers']).length;
  const unreadMessages = collectRecords(dashboard, ['messages', 'customer-messages', 'support-messages']).filter((record) => String(record.status || record?.data?.status || '').toLowerCase() === 'unread').length;
  const actions = [
    { label: 'All Orders', icon: ShoppingBag, to: dashboardPath(params, 'orders'), count: dashboard.orders.length },
    { label: 'To Pay', icon: CreditCard, to: dashboardPath(params, 'orders'), count: countOrders(dashboard, 'pay') },
    { label: 'Processing', icon: Package, to: dashboardPath(params, 'orders'), count: countOrders(dashboard, 'ship') },
    { label: 'Shipped', icon: Truck, to: dashboardPath(params, 'orders'), count: countOrders(dashboard, 'shipped') },
    { label: 'Wishlist', icon: Heart, to: dashboardPath(params, 'wishlist'), count: collectRecords(dashboard, ['wishlist', 'wishlists', 'customer-wishlist']).length },
    { label: 'Recent', icon: History, to: dashboardPath(params, 'recent'), count: collectRecords(dashboard, ['recent', 'recent-products', 'recently-viewed']).length },
    { label: 'Address', icon: MapPin, to: dashboardPath(params, 'address') },
    { label: 'Payment', icon: CreditCard, to: dashboardPath(params, 'payment') },
    { label: 'Messages', icon: MessageSquare, to: dashboardPath(params, 'messages'), count: unreadMessages },
    { label: 'Rewards', icon: Star, to: dashboardPath(params, 'rewards'), count: Number(dashboard.customer.points || 0) },
    { label: 'Returns', icon: Repeat, to: dashboardPath(params, 'returns'), count: countOrders(dashboard, 'returns') },
    { label: 'Settings', icon: Settings, to: dashboardPath(params, 'settings') },
    { label: 'Shop Store', icon: ShoppingBag, to: storePath(dashboard) },
    { label: 'Invoices', icon: Package, to: dashboardPath(params, 'payment'), count: dashboard.orders.length },
    { label: 'Coupons', icon: Tag, to: dashboardPath(params), count: coupons },
    { label: 'Wallet', icon: CreditCard, to: dashboardPath(params, 'payment') },
    { label: 'Support', icon: MessageSquare, to: dashboardPath(params, 'messages') },
    { label: 'Track', icon: Truck, to: storePath(dashboard, 'track-order') },
    { label: 'Profile', icon: UserIcon, to: dashboardPath(params, 'settings') },
    { label: 'More', icon: MoreHorizontal, to: storePath(dashboard) }
  ];

  return (
    <section className="border border-[#E6E6E6] bg-white">
      <div className="flex items-center justify-between border-b border-[#EEE] bg-[#FAFAFA] px-4 py-3">
        <h3 className="text-sm font-black text-[#333]">Customer Tools</h3>
        <span className="text-[10px] font-black uppercase tracking-wider text-[#999]">20 Store Functions</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-[#F3F3F3] sm:grid-cols-4 lg:grid-cols-10">
        {actions.map(({ label, icon: Icon, to, count }) => (
          <Link key={label} to={to} className="group flex min-h-24 flex-col items-center justify-center gap-2 bg-white px-2 py-4 text-center hover:bg-[#FAFAFA]">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-[#E6E6E6] bg-[#F8F8F8] text-[#666] group-hover:border-[var(--store-accent)] group-hover:text-[var(--store-accent)]">
              <Icon size={18} />
              {Number(count || 0) > 0 && <span className="absolute -right-2 -top-2 min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none text-white" style={{ backgroundColor: 'var(--store-accent)' }}>{Number(count) > 99 ? '99+' : count}</span>}
            </div>
            <span className="text-[11px] font-bold text-[#555] group-hover:text-[#222]">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function OrderRow({ order, dashboard, onOpen }: { key?: React.Key; order: any; dashboard: StoreCustomerDashboard; onOpen?: () => void }) {
  const money = useStoreMoney();
  const product = firstOrderProduct(order);
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[#F9FCFF] transition-colors group">
      <button type="button" onClick={onOpen} className="w-16 h-16 border border-[#EEE] rounded-sm bg-gray-50 overflow-hidden flex items-center justify-center hover:border-[var(--store-accent)]">
        {product.image ? <img src={product.image} className="w-full h-full object-cover" alt={product.name} /> : <Package className="text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <button type="button" onClick={onOpen} className="block max-w-full text-left text-sm text-[#333] font-bold truncate mb-1 group-hover:text-[var(--store-accent)] transition-colors">{product.name}</button>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#999]">
          <span className="bg-gray-100 px-1.5 py-0.5 rounded-px">#{order.number || order.id}</span>
          <span>Order Date: {dateLabel(order.createdAt)}</span>
        </div>
      </div>
      <div className="sm:text-right flex items-center sm:block justify-between border-t sm:border-0 pt-3 sm:pt-0 border-gray-50">
        <p className="font-bold text-base text-[#333] mb-1">{money(order.total, order.currency || dashboard.store.currency)}</p>
        <span className="text-[10px] px-2 py-1 rounded-sm font-bold border bg-blue-50 border-blue-200 text-blue-600">
          {String(order.status || 'pending').toUpperCase()}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="hidden sm:block rounded-sm border border-[#EEE] px-3 py-2 text-[11px] font-black uppercase text-[#666] hover:border-[var(--store-accent)] hover:text-[var(--store-accent)]">
        Details
      </button>
    </div>
  );
}

function ProductRail({ dashboard, products, title }: { dashboard: StoreCustomerDashboard; products: any[]; title: string }) {
  const money = useStoreMoney();
  const b = brand(dashboard);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star size={18} style={{ color: b.accent }} />
        <h4 className="font-bold text-base text-[#333]">{title}</h4>
      </div>
      {products.length === 0 ? (
        <EmptyBlock label="No products available from this store yet." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <Link key={product.id} to={storePath(dashboard, `product/${product.id}`)}>
              <motion.div whileHover={{ y: -4 }} className="bg-white border border-[#E6E6E6] rounded-sm overflow-hidden group cursor-pointer shadow-none">
                <div className="relative aspect-square bg-gray-50">
                  {product.image ? <img src={product.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={product.name} /> : <Package className="absolute inset-0 m-auto text-gray-300" />}
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#333] font-medium line-clamp-2 h-8 mb-2 leading-tight">{product.name}</p>
                  <div className="flex items-end justify-between">
                    <p className="font-bold text-base" style={{ color: b.accent }}>{money(product.price, dashboard.store.currency)}</p>
                    <p className="text-[10px] text-[#999]">{product.stock || 0} stock</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersPage({ dashboard, onOpenOrder }: { dashboard: StoreCustomerDashboard; onOpenOrder: (order: any) => void }) {
  const [status, setStatus] = useState('all');
  const orders = status === 'all' ? dashboard.orders : dashboard.orders.filter((order) => orderStatus(order) === status);
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#333]">My Orders</h2>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-white border border-[#DDD] px-3 py-1.5 text-sm rounded-sm focus:outline-none">
          <option value="all">All Orders</option>
          {Array.from(new Set(dashboard.orders.map((order) => orderStatus(order)).filter(Boolean))).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="bg-white border border-[#E6E6E6] rounded-sm shadow-none">
        <div className="flex border-b border-[#EEE] overflow-x-auto">
          {['all', 'pending', 'processing', 'shipped', 'delivered'].map((item) => (
            <button key={item} onClick={() => setStatus(item)} className={`px-6 py-3 text-sm font-bold capitalize ${status === item ? 'border-b-2 text-[var(--store-accent)] border-[var(--store-accent)]' : 'text-[#666] hover:text-[var(--store-accent)]'}`}>{item}</button>
          ))}
        </div>
        <div className="divide-y divide-[#EEE]">
          {orders.length === 0 ? <EmptyBlock label="No orders found." /> : orders.map((order) => <OrderRow key={order.id} order={order} dashboard={dashboard} onOpen={() => onOpenOrder(order)} />)}
        </div>
      </div>
    </div>
  );
}

function RecordGridPage({ dashboard, title, recordKeys, emptyLabel }: { dashboard: StoreCustomerDashboard; title: string; recordKeys: string[]; emptyLabel: string }) {
  const money = useStoreMoney();
  const records = collectRecords(dashboard, recordKeys);
  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-bold text-[#333]">{title} ({records.length})</h2>
      {records.length === 0 ? (
        <EmptyBlock label={emptyLabel} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {records.map((record) => (
            <div key={record.id || recordTitle(record)} className="bg-white border border-[#E6E6E6] rounded-sm p-3 group shadow-none">
              <div className="relative aspect-square mb-3 bg-gray-50 flex items-center justify-center">
                {record?.data?.image ? <img src={record.data.image} className="w-full h-full object-cover" alt={recordTitle(record)} /> : <Heart className="text-gray-300" />}
              </div>
              <p className="text-xs text-[#333] font-medium h-8 line-clamp-2 mb-2">{recordTitle(record)}</p>
              {recordDetail(record) && <p className="text-[10px] text-[#999] line-clamp-2">{recordDetail(record)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentPage({ dashboard }: { dashboard: StoreCustomerDashboard }) {
  const money = useStoreMoney();
  const records = collectRecords(dashboard, ['recent', 'recent-products', 'recently-viewed']);
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#333]">Recently Viewed</h2>
        <span className="text-xs text-[#999] flex items-center gap-1"><History size={14} /> {records.length} records</span>
      </div>
      {records.length === 0 ? (
        <EmptyBlock label="No recent product records are available yet." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {records.map((record) => (
            <div key={record.id || recordTitle(record)} className="bg-white border border-[#E6E6E6] rounded-sm overflow-hidden group shadow-none">
              <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
                {record?.data?.image ? <img src={record.data.image} className="w-full h-full object-cover" alt={recordTitle(record)} /> : <Clock className="text-gray-300" />}
              </div>
              <div className="p-2">
                <p className="text-[10px] text-[#333] truncate mb-1">{recordTitle(record)}</p>
                {record?.data?.price && <p className="text-sm font-bold text-[var(--store-accent)]">{money(record.data.price, dashboard.store.currency)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressPage({ dashboard, onReload }: { dashboard: StoreCustomerDashboard; onReload: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    line1: dashboard.customer.address?.line1 || '',
    city: dashboard.customer.address?.city || '',
    country: dashboard.customer.address?.country || '',
    zip: dashboard.customer.address?.zip || '',
    phone: dashboard.customer.phone || ''
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateStoreCustomerProfileWithApi({ phone: form.phone, address: { line1: form.line1, city: form.city, country: form.country, zip: form.zip } }, dashboard.store.id);
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#333]">Shipping Address</h2>
        <button disabled={saving} className="text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center gap-2 shadow-none disabled:opacity-60" style={{ backgroundColor: 'var(--store-accent)' }}>
          <Plus size={18} /> {saving ? 'Saving...' : 'Save Address'}
        </button>
      </div>
      {error && <div className="rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-sm border-2 border-[var(--store-accent)] bg-white p-6 shadow-none lg:col-span-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[var(--store-accent-soft)] text-[var(--store-accent)]">
                <MapPin size={20} />
              </div>
              <div>
                <p className="font-black text-[#333]">{dashboard.customer.name || dashboard.customer.email}</p>
                <p className="text-xs text-[#999]">{form.phone || 'No phone saved'}</p>
              </div>
            </div>
            <span className="rounded-sm bg-[var(--store-accent)] px-2 py-1 text-[10px] font-black uppercase text-white">Default</span>
          </div>
          <p className="text-sm leading-6 text-[#666]">
            {[form.line1, form.city, form.country, form.zip].filter(Boolean).join(', ') || 'No shipping address saved yet.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 bg-white border border-[#E6E6E6] p-6 rounded-sm shadow-none md:grid-cols-2 lg:col-span-7">
          {[
            ['line1', 'Address line'],
            ['city', 'City'],
            ['country', 'Country'],
            ['zip', 'ZIP / Postcode'],
            ['phone', 'Phone']
          ].map(([key, label]) => (
            <label key={key} className={key === 'line1' ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
              <span className="text-xs font-bold text-[#666]">{label}</span>
              <input value={(form as any)[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full border border-[#DDD] px-3 py-2 rounded-sm text-sm focus:outline-none focus:border-[var(--store-accent)]" />
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}

function PaymentPage({ dashboard, onOpenOrder }: { dashboard: StoreCustomerDashboard; onOpenOrder: (order: any) => void }) {
  const money = useStoreMoney();
  const payments = dashboard.orders.map((order) => ({
    id: order.id,
    number: order.number,
    total: order.total,
    currency: order.currency || dashboard.store.currency,
    method: order.payment?.method || order.payment?.provider || 'Not recorded',
    status: order.payment?.status || order.status || 'pending',
    createdAt: order.createdAt,
    product: firstOrderProduct(order)
  }));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-bold text-[#333]">Payment Methods</h2>
      <div className="bg-white border border-[#E6E6E6] rounded-sm shadow-none overflow-hidden">
        {payments.length === 0 ? <EmptyBlock label="No payment records are available yet." /> : (
          <div className="divide-y divide-[#EEE]">
            {payments.map((payment) => (
              <button key={payment.id} type="button" onClick={() => onOpenOrder(dashboard.orders.find((order) => order.id === payment.id))} className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-[#F9FCFF]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#EEE] bg-gray-50 text-[var(--store-accent)]">
                    {payment.product.image ? <img src={payment.product.image} alt={payment.product.name} className="h-full w-full object-cover" /> : <CreditCard size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#333]">{payment.method}</p>
                    <p className="text-xs text-[#999]">Invoice {payment.number} - {dateLabel(payment.createdAt)}</p>
                    <p className="max-w-[260px] truncate text-[11px] font-bold text-[#555]">{payment.product.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#333]">{money(payment.total, payment.currency)}</p>
                  <p className="text-[10px] uppercase text-[#999]">{payment.status}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessagesPage({ dashboard }: { dashboard: StoreCustomerDashboard }) {
  const messages = collectRecords(dashboard, ['messages', 'customer-messages', 'support-messages']);
  return (
    <div className="px-0 md:p-0 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-full md:w-[320px] border-r border-[#EEE] bg-white flex flex-col shadow-none">
          <div className="p-4 border-b border-[#EEE]">
            <h2 className="font-bold text-[#333]">Messages ({messages.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#F5F5F5]">
            {messages.length === 0 ? <EmptySmall label="No messages are available." /> : messages.map((message, index) => (
              <ChatListItem key={message.id || index} name={message.owner || message?.data?.from || dashboard.store.name} message={recordDetail(message) || recordTitle(message)} time={dateLabel(message.updatedAt || message.createdAt)} unread={String(message.status || message?.data?.status || '').toLowerCase() === 'unread'} active={index === 0} />
            ))}
          </div>
        </div>
        <div className="hidden md:flex flex-1 bg-[#F8F8F8] flex-col shadow-none">
          {messages[0] ? (
            <>
              <div className="p-4 bg-white border-b border-[#EEE] flex justify-between items-center shadow-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold" style={{ backgroundColor: 'var(--store-accent)' }}>{dashboard.store.name?.[0] || 'S'}</div>
                  <div>
                    <p className="font-bold text-sm text-[#333]">{recordTitle(messages[0])}</p>
                    <p className="text-[10px] text-green-500">Store message</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
                <div className="bg-white p-3 rounded-sm border border-[#EEE] self-start max-w-[80%] text-sm shadow-none">{recordDetail(messages[0]) || recordTitle(messages[0])}</div>
              </div>
            </>
          ) : <EmptyBlock label="Select a message when store records are available." />}
        </div>
      </div>
    </div>
  );
}

function RewardsPage({ dashboard }: { dashboard: StoreCustomerDashboard }) {
  const rewardRecords = collectRecords(dashboard, ['rewards', 'reward-history', 'points']);
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="bg-linear-to-r from-gray-900 to-[#1a1a1a] p-8 rounded-sm text-white shadow-none relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60 mb-2">Current Points Balance</p>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-black">{dashboard.customer.points || 0}</p>
              <Star className="text-yellow-500 mb-2" fill="currentColor" size={24} />
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex flex-col">
                <span className="opacity-50">TIER STATUS</span>
                <span className="font-bold text-yellow-500">{String(dashboard.customer.tier || 'standard').toUpperCase()} MEMBER</span>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div className="flex flex-col">
                <span className="opacity-50">HISTORY</span>
                <span className="font-bold">{rewardRecords.length} Records</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RecordList records={rewardRecords} emptyLabel="No reward history is available yet." />
    </div>
  );
}

function ReturnsPage({ dashboard }: { dashboard: StoreCustomerDashboard }) {
  const money = useStoreMoney();
  const returnOrders = dashboard.orders.filter((order) => statusLabels.returns.includes(orderStatus(order)));
  const returnRecords = collectRecords(dashboard, ['returns', 'return-requests', 'refunds']);
  const rows = [
    ...returnOrders.map((order) => ({ id: order.id, title: order.number, detail: money(order.total, order.currency || dashboard.store.currency), status: order.status, date: order.updatedAt || order.createdAt })),
    ...returnRecords.map((record) => ({ id: record.id || recordTitle(record), title: recordTitle(record), detail: recordDetail(record), status: record.status || record?.data?.status || 'open', date: record.updatedAt || record.createdAt }))
  ];
  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-bold text-[#333]">Returns & Refunds</h2>
      {rows.length === 0 ? (
        <div className="bg-white border border-[#E6E6E6] rounded-sm p-20 text-center shadow-none">
          <Repeat className="mx-auto text-gray-200 mb-6" size={64} />
          <p className="text-[#999] text-sm">You do not have any active return requests.</p>
        </div>
      ) : <RecordList records={rows} emptyLabel="No returns found." />}
    </div>
  );
}

function SettingsPage({ dashboard, onReload }: { dashboard: StoreCustomerDashboard; onReload: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: dashboard.customer.name || '', phone: dashboard.customer.phone || '' });
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateStoreCustomerProfileWithApi(form, dashboard.store.id);
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="p-4 md:p-8 space-y-6 max-w-xl">
      <h2 className="text-xl font-bold text-[#333]">Account Settings</h2>
      {error && <div className="rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}
      <div className="bg-white border border-[#E6E6E6] rounded-sm divide-y divide-[#F5F5F5] shadow-none p-5 space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#666]">Name</span>
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full border border-[#DDD] px-3 py-2 rounded-sm text-sm focus:outline-none" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#666]">Phone</span>
          <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="w-full border border-[#DDD] px-3 py-2 rounded-sm text-sm focus:outline-none" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#666]">Email</span>
          <input disabled value={dashboard.customer.email} className="w-full border border-[#DDD] bg-gray-50 px-3 py-2 rounded-sm text-sm text-[#777]" />
        </label>
      </div>
      <button disabled={saving} className="w-full py-3 text-white font-bold rounded-sm transition-colors shadow-none disabled:opacity-60" style={{ backgroundColor: 'var(--store-accent)' }}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}

function RecordList({ records, emptyLabel }: { records: any[]; emptyLabel: string }) {
  if (!records.length) return <EmptyBlock label={emptyLabel} />;
  return (
    <div className="bg-white border border-[#E6E6E6] rounded-sm shadow-none divide-y divide-[#EEE]">
      {records.map((record) => (
        <div key={record.id || recordTitle(record)} className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm text-[#333]">{record.title || recordTitle(record)}</p>
            <p className="text-xs text-[#999]">{record.detail || recordDetail(record)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-[#999]">{record.status}</p>
            <p className="text-xs text-[#999]">{dateLabel(record.date || record.updatedAt || record.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderDetailModal({ order, dashboard, onClose }: { order: any; dashboard: StoreCustomerDashboard; onClose: () => void }) {
  const money = useStoreMoney();
  const items = Array.isArray(order.items) ? order.items : [];
  const shipping = order.shipping || {};
  const payment = order.payment || {};
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-sm border border-[#B8B8B8] bg-white ring-1 ring-black/10">
        <div className="flex items-center justify-between border-b border-[#EEE] bg-[#FAFAFA] px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#999]">Order Details & Invoice</p>
            <h2 className="text-lg font-black text-[#333]">{order.number || order.id}</h2>
          </div>
          <button onClick={onClose} className="rounded-sm p-2 text-[#999] hover:bg-white hover:text-[#333]">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <section className="rounded-sm border border-[#EEE]">
              <div className="border-b border-[#EEE] px-4 py-3">
                <h3 className="text-sm font-black text-[#333]">Products</h3>
              </div>
              <div className="divide-y divide-[#EEE]">
                {items.length === 0 ? (
                  <EmptySmall label="No product line items were stored for this order." />
                ) : items.map((item: any, index: number) => (
                  <Link key={`${item.productId || item.id || index}`} to={item.productId ? storePath(dashboard, `product/${item.productId}`) : storePath(dashboard)} className="flex items-center gap-4 p-4 hover:bg-[#F9FCFF]">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border border-[#EEE] bg-gray-50">
                      {item.image || item.productImage ? <img src={item.image || item.productImage} alt={item.name || item.productName || 'Product'} className="h-full w-full object-cover" /> : <Package className="text-gray-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#333]">{item.name || item.productName || item.sku || 'Product'}</p>
                      <p className="mt-1 text-xs text-[#999]">SKU {item.sku || '-'} - Qty {item.qty || item.quantity || 1}</p>
                    </div>
                    <p className="font-black text-[#333]">{money(Number(item.price || 0) * Number(item.qty || item.quantity || 1), order.currency || dashboard.store.currency)}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <InfoCard title="Shipping" rows={[
                ['Name', [shipping.firstName, shipping.lastName].filter(Boolean).join(' ') || shipping.name || dashboard.customer.name || '-'],
                ['Phone', shipping.phone || dashboard.customer.phone || '-'],
                ['Address', [shipping.address || shipping.line1, shipping.city, shipping.country, shipping.zip].filter(Boolean).join(', ') || '-']
              ]} />
              <InfoCard title="Payment" rows={[
                ['Method', payment.method || payment.provider || '-'],
                ['Status', payment.status || order.status || '-'],
                ['Total', money(order.total, order.currency || dashboard.store.currency)]
              ]} />
            </section>
          </div>

          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-sm border border-[#EEE] bg-[#FAFAFA] p-4">
              <h3 className="text-sm font-black text-[#333]">Invoice</h3>
              <div className="mt-4 flex items-center gap-3 rounded-sm border border-[#EEE] bg-white p-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-sm border border-[#EEE] bg-gray-50">
                  {items[0]?.image || items[0]?.productImage ? <img src={items[0].image || items[0].productImage} alt={items[0]?.name || 'Product'} className="h-full w-full object-cover" /> : <Package className="text-gray-300" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[#333]">{items[0]?.name || items[0]?.productName || order.number || 'Order preview'}</p>
                  <p className="text-[10px] font-bold text-[#999]">{items.length} item{items.length === 1 ? '' : 's'} in invoice</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#999]">Order</span><span className="font-bold text-[#333]">{order.number || order.id}</span></div>
                <div className="flex justify-between"><span className="text-[#999]">Date</span><span className="font-bold text-[#333]">{dateLabel(order.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-[#999]">Status</span><span className="font-bold uppercase text-[#333]">{order.status || 'pending'}</span></div>
                <div className="border-t border-[#DDD] pt-2 flex justify-between text-base"><span className="font-black text-[#333]">Total</span><span className="font-black text-[var(--store-accent)]">{money(order.total, order.currency || dashboard.store.currency)}</span></div>
              </div>
              <button type="button" onClick={() => window.print()} className="mt-4 w-full rounded-sm bg-[#333] px-4 py-2 text-xs font-black uppercase text-white hover:bg-black">Print Invoice</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-sm border border-[#EEE] bg-white p-4">
      <h3 className="text-sm font-black text-[#333]">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="text-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#999]">{label}</p>
            <p className="mt-0.5 text-[#333]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const ChatListItem = ({ name, message, time, unread = false, active = false }: { key?: React.Key; name: string; message: string; time: string; unread?: boolean; active?: boolean }) => (
  <div className={`p-4 flex gap-3 cursor-pointer hover:bg-[#FAF9F8] transition-colors ${active ? 'bg-[#FAF9F8] border-l-4 border-[var(--store-accent)]' : ''}`}>
    <div className="w-10 h-10 rounded-sm bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-500">{name[0]}</div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-0.5">
        <p className={`text-sm ${unread ? 'font-bold' : 'text-[#333]'}`}>{name}</p>
        <span className="text-[10px] text-[#999]">{time}</span>
      </div>
      <p className={`text-xs truncate ${unread ? 'text-[#333] font-medium' : 'text-[#999]'}`}>{message}</p>
    </div>
  </div>
);

const SidebarContent = ({ dashboard, params, onLogout, currentPath }: { dashboard: StoreCustomerDashboard; params: URLSearchParams; onLogout: () => void; currentPath: string }) => {
  const wishlistCount = collectRecords(dashboard, ['wishlist', 'wishlists', 'customer-wishlist']).length;
  const messageCount = collectRecords(dashboard, ['messages', 'customer-messages', 'support-messages']).length;
  return (
    <>
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        <SidebarItem to={dashboardPath(params)} icon={<Home size={18} />} label="Overview" active={currentPath === '/store/user'} />
        <SidebarItem to={dashboardPath(params, 'orders')} icon={<ShoppingBag size={18} />} label="My Orders" active={currentPath.includes('/orders')} />
        <SidebarItem to={dashboardPath(params, 'wishlist')} icon={<Heart size={18} />} label="Wishlist" badge={wishlistCount ? String(wishlistCount) : undefined} active={currentPath.includes('/wishlist')} />
        <SidebarItem to={dashboardPath(params, 'recent')} icon={<Clock size={18} />} label="Recently Viewed" active={currentPath.includes('/recent')} />
        <SidebarItem to={dashboardPath(params, 'address')} icon={<MapPin size={18} />} label="Shipping Address" active={currentPath.includes('/address')} />
        <SidebarItem to={dashboardPath(params, 'payment')} icon={<CreditCard size={18} />} label="Payment Method" active={currentPath.includes('/payment')} />
        <div className="my-4 border-t border-[#EEE]" />
        <SidebarItem to={dashboardPath(params, 'messages')} icon={<MessageSquare size={18} />} label="Message Center" badge={messageCount ? String(messageCount) : undefined} active={currentPath.includes('/messages')} />
        <SidebarItem to={dashboardPath(params, 'rewards')} icon={<Star size={18} />} label="My Rewards" active={currentPath.includes('/rewards')} />
        <SidebarItem to={dashboardPath(params, 'returns')} icon={<Repeat size={18} />} label="Returns & Refunds" active={currentPath.includes('/returns')} />
        <div className="my-4 border-t border-[#EEE]" />
        <SidebarItem to={dashboardPath(params, 'settings')} icon={<Settings size={18} />} label="Account Settings" active={currentPath.includes('/settings')} />
      </nav>
      <button onClick={onLogout} className="p-4 mx-2 mt-4 mb-2 flex items-center gap-3 text-[#999] hover:text-red-500 hover:bg-red-50 transition-colors rounded-sm shadow-none">
        <LogOut size={18} />
        <span className="text-sm font-bold">Sign Out</span>
      </button>
    </>
  );
};

const SidebarItem = ({ to, icon, label, active = false, badge }: { to: string; icon: React.ReactNode; label: string; active?: boolean; badge?: string }) => (
  <Link to={to} className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors rounded-sm group relative shadow-none ${active ? 'bg-[var(--store-accent-soft)] text-[var(--store-accent)]' : 'text-[#666] hover:bg-gray-50'}`}>
    <span className={active ? 'text-[var(--store-accent)]' : 'text-[#999] group-hover:text-[#666]'}>{icon}</span>
    <span className={`flex-1 text-left ${active ? 'font-bold' : ''}`}>{label}</span>
    {badge && <span className="text-white text-[9px] px-1.5 rounded-full font-bold" style={{ backgroundColor: 'var(--store-accent)' }}>{badge}</span>}
    {active && <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full" style={{ backgroundColor: 'var(--store-accent)' }} />}
  </Link>
);

const MobileNavTab = ({ to, icon, label, active = false, badge }: { to: string; icon: React.ReactNode; label: string; active?: boolean; badge?: string }) => (
  <Link to={to} className={`flex flex-col items-center justify-center gap-0.5 relative px-3 py-1 shadow-none ${active ? 'text-[var(--store-accent)]' : 'text-[#666]'}`}>
    <div className="relative">
      {icon}
      {badge && <span className="absolute -top-1.5 -right-1.5 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white" style={{ backgroundColor: 'var(--store-accent)' }}>{badge}</span>}
    </div>
    <span className={`text-[10px] font-medium leading-tight ${active ? 'font-bold' : ''}`}>{label}</span>
  </Link>
);

const HeaderIconButton = ({ to, icon, badge }: { to: string; icon: React.ReactNode; badge?: string }) => (
  <Link to={to} className="relative p-2 text-[#666] hover:text-[var(--store-accent)] hover:bg-gray-50 rounded-sm transition-colors shadow-none">
    {icon}
    {badge && <span className="absolute top-1 right-1 w-4 h-4 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white font-bold" style={{ backgroundColor: 'var(--store-accent)' }}>{badge}</span>}
  </Link>
);

const StatItem = ({ label, value, active = false }: { label: string; value: string; active?: boolean }) => (
  <button className="text-center group shadow-none">
    <p className={`text-base font-bold transition-colors ${active ? 'text-[var(--store-accent)]' : 'text-[#333] group-hover:text-[var(--store-accent)]'}`}>{value}</p>
    <p className="text-[10px] text-[#999] uppercase tracking-wider font-medium">{label}</p>
  </button>
);

const QuickAction = ({ to, icon, count, label }: { to: string; icon: React.ReactNode; count: string; label: string }) => (
  <Link to={to} className="flex-1 min-w-0 px-2 py-4 flex flex-col items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors group shadow-none">
    <div className="flex min-h-7 items-center justify-center gap-1.5 transform group-hover:scale-105 transition-transform">
      {icon}
      {count !== '0' && <span className="min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white" style={{ backgroundColor: 'var(--store-accent)' }}>{count}</span>}
    </div>
    <span className="text-[11px] text-[#666] font-medium group-hover:text-[#333]">{label}</span>
  </Link>
);

const DashboardWidget = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-[#E6E6E6] rounded-sm p-4 h-full shadow-none">
    <h5 className="font-bold text-xs text-[#999] uppercase tracking-wider mb-4 border-b border-[#F0F0F0] pb-2">{title}</h5>
    {children}
  </div>
);

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="bg-white p-8 text-center py-16">
      <ShoppingBag className="mx-auto text-gray-200 mb-4" size={56} />
      <p className="text-[#999] text-sm">{label}</p>
    </div>
  );
}

function EmptySmall({ label }: { label: string }) {
  return <div className="p-4 text-center text-xs font-bold text-[#999]">{label}</div>;
}
