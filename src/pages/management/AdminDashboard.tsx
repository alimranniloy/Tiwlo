import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BarChart3,
  ChevronRight,
  CreditCard,
  Database,
  FileText,
  Globe,
  Power,
  RefreshCw,
  Server,
  Shield,
  ShoppingBag,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { User } from '../../types';
import {
  fetchAdminModules,
  fetchAdminTiwloPayOverviewWithApi,
  fetchAdminTPanelOverviewWithApi,
  fetchAuditLogs,
  fetchDashboardSummary,
  fetchEcommerceAdminSummary,
  fetchIspDashboardSummary,
  updateAdminModuleStatus,
  upsertAdminModuleWithApi
} from '../../lib/tiwloApi';
import { SERVICE_MODULE_GROUP, SERVICE_MODULE_KEYS, SERVICE_MODULES, serviceEnabled } from '../../lib/serviceModules';

interface AdminDashboardProps {
  user: User;
}

const numberValue = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '0');
const moneyValue = (value?: number) => `$${Number(value || 0).toLocaleString()}`;

const serviceDescriptions: Record<string, string> = {
  [SERVICE_MODULE_KEYS.ecommerce]: 'Storefronts, themes, merchant dashboards, and customer store links.',
  [SERVICE_MODULE_KEYS.isp]: 'ISP billing portals, routers, subscribers, and connectivity dashboards.',
  [SERVICE_MODULE_KEYS.tiwloPay]: 'Payment links, merchant verification, checkout, and payouts.',
  [SERVICE_MODULE_KEYS.tpanel]: 'tPanel license ordering, activation, packages, and server panel tools.'
};

async function ensureServiceControlModules() {
  const existing = await fetchAdminModules(SERVICE_MODULE_GROUP);
  const next = [...existing];
  for (const service of SERVICE_MODULES) {
    if (next.some((module) => module.key === service.key)) continue;
    const created = await upsertAdminModuleWithApi({
      key: service.key,
      group: SERVICE_MODULE_GROUP,
      label: service.label,
      path: service.adminPath,
      status: 'active',
      description: serviceDescriptions[service.key],
      config: { userPaths: service.userPaths, adminPath: service.adminPath, source: 'service-control' },
      metrics: { health: 'ready' }
    });
    next.push(created);
  }
  return next;
}

const relativeDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = React.useState<any>(null);
  const [commerce, setCommerce] = React.useState<any>(null);
  const [isp, setIsp] = React.useState<any>(null);
  const [tiwloPay, setTiwloPay] = React.useState<any>(null);
  const [tpanel, setTpanel] = React.useState<any>(null);
  const [serviceModules, setServiceModules] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [mainSummary, commerceSummary, ispSummary, tiwloPayOverview, tpanelOverview, logs, modules] = await Promise.all([
        fetchDashboardSummary(),
        fetchEcommerceAdminSummary(),
        fetchIspDashboardSummary(),
        fetchAdminTiwloPayOverviewWithApi(),
        fetchAdminTPanelOverviewWithApi(),
        fetchAuditLogs(),
        ensureServiceControlModules()
      ]);
      setSummary(mainSummary);
      setCommerce(commerceSummary);
      setIsp(ispSummary);
      setTiwloPay(tiwloPayOverview?.summary || null);
      setTpanel(tpanelOverview?.summary || null);
      setAuditLogs(logs);
      setServiceModules(modules);
    } catch (err) {
      setSummary(null);
      setCommerce(null);
      setIsp(null);
      setTiwloPay(null);
      setTpanel(null);
      setAuditLogs([]);
      setServiceModules([]);
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadDashboard();
  }, []);

  const stats = [
    { label: 'Total Users', value: numberValue(summary?.users), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Droplets', value: numberValue(summary?.droplets), icon: Server, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Domains', value: numberValue(summary?.domains), icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Revenue', value: moneyValue(summary?.revenue), icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  const aggregateData = summary ? [
    { name: 'Current', revenue: Number(summary.revenue || 0), users: Number(summary.users || 0) }
  ] : [];

  const resourceData = [
    { name: 'Droplets', value: Number(summary?.droplets || 0), color: '#0069ff' },
    { name: 'Domains', value: Number(summary?.domains || 0), color: '#24ad5f' },
    { name: 'Stores', value: Number(summary?.stores || 0), color: '#f59e0b' },
    { name: 'ISP Sites', value: Number(summary?.ispSites || 0), color: '#8b5cf6' }
  ].filter((item) => item.value > 0);

  const operations = auditLogs.slice(0, 6).map((log) => ({
    id: log.id,
    action: String(log.action || '').replace(/_/g, ' '),
    resource: log.resourceId || log.resource || 'system',
    admin: log.actorId || 'system',
    time: relativeDate(log.createdAt),
    color: String(log.action || '').includes('delete') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#0069ff]'
  }));

  const totalResources = resourceData.reduce((sum, item) => sum + item.value, 0);
  const isServiceActive = (key: string) => serviceEnabled(serviceModules, key);
  const toggleService = async (event: React.MouseEvent, key: string) => {
    event.stopPropagation();
    const nextStatus = isServiceActive(key) ? 'disabled' : 'active';
    setServiceModules((current) => current.map((module) => module.key === key ? { ...module, status: nextStatus } : module));
    try {
      const updated = await updateAdminModuleStatus(key, nextStatus);
      setServiceModules((current) => current.map((module) => module.key === key ? updated : module));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update service status');
      loadDashboard();
    }
  };

  const ServiceSwitch = ({ serviceKey }: { serviceKey: string }) => {
    const active = isServiceActive(serviceKey);
    return (
      <button
        type="button"
        onClick={(event) => toggleService(event, serviceKey)}
        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase transition-colors ${
          active ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
        }`}
        aria-pressed={active}
      >
        <Power className="h-3.5 w-3.5" />
        <span>{active ? 'On' : 'Off'}</span>
        <span className={`relative h-4 w-7 rounded-full ${active ? 'bg-green-500' : 'bg-red-400'}`}>
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${active ? 'left-3.5' : 'left-0.5'}`}></span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Management Console</h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1">Signed in as {user.email}. All dashboard numbers come from the GraphQL API.</p>
        </div>
        <button onClick={loadDashboard} className="bg-white border border-[#e5e8ed] text-[#4a4a4a] px-4 py-2 rounded font-bold text-[13px] hover:bg-[#f3f5f9] transition-all flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('/management/ecommerce')}
          className="group bg-white border border-[#e5e8ed] hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col h-full rounded-lg"
        >
          <div className="p-6 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#2e3d49]">SaaS E-Commerce Ecosystem</h3>
                  <span className="text-[11px] font-medium text-indigo-600">Merchant management</span>
                </div>
              </div>
              <ServiceSwitch serviceKey={SERVICE_MODULE_KEYS.ecommerce} />
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-gray-50">
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Merchants</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{numberValue(commerce?.merchants)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Stores</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{numberValue(commerce?.stores)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Revenue</span>
                <span className="text-xl font-bold text-green-600 tabular-nums">{moneyValue(commerce?.revenue)}</span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-gray-50 group-hover:bg-gray-50 transition-colors rounded-b-lg">
            <span className="text-[13px] font-semibold text-indigo-600">Manage Marketplace Clients</span>
            <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        <div
          onClick={() => navigate('/management/isp')}
          className="group bg-white border border-[#e5e8ed] hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col h-full rounded-lg"
        >
          <div className="p-6 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#2e3d49]">SaaS ISP Fiber Backbone</h3>
                  <span className="text-[11px] font-medium text-blue-600">ISP sites and subscribers</span>
                </div>
              </div>
              <ServiceSwitch serviceKey={SERVICE_MODULE_KEYS.isp} />
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-gray-50">
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Sites</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{numberValue(isp?.sites)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Clients</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{numberValue(isp?.clients)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Revenue</span>
                <span className="text-xl font-bold text-blue-600 tabular-nums">{moneyValue(isp?.revenue)}</span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-gray-50 group-hover:bg-gray-50 transition-colors rounded-b-lg">
            <span className="text-[13px] font-semibold text-blue-600">Manage Connectivity Clients</span>
            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        <div
          onClick={() => navigate('/management/tiwlo-pay')}
          className="group bg-white border border-[#e5e8ed] hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col h-full rounded-lg"
        >
          <div className="p-6 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#2e3d49]">Tiwlo Pay</h3>
                  <span className="text-[11px] font-medium text-emerald-600">Checkout and merchant verification</span>
                </div>
              </div>
              <ServiceSwitch serviceKey={SERVICE_MODULE_KEYS.tiwloPay} />
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-gray-50">
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Merchants</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{numberValue(tiwloPay?.merchants)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Paid</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{moneyValue(tiwloPay?.paidVolume)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Pending</span>
                <span className="text-xl font-bold text-emerald-600 tabular-nums">{moneyValue(tiwloPay?.pendingWithdrawal)}</span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-gray-50 group-hover:bg-gray-50 transition-colors rounded-b-lg">
            <span className="text-[13px] font-semibold text-emerald-600">Manage Payments</span>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        <div
          onClick={() => navigate('/management/tpanel')}
          className="group bg-white border border-[#e5e8ed] hover:border-sky-500 hover:shadow-md transition-all cursor-pointer flex flex-col h-full rounded-lg"
        >
          <div className="p-6 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 flex items-center justify-center rounded-lg group-hover:bg-sky-600 group-hover:text-white transition-all duration-300">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#2e3d49]">tPanel Licensing</h3>
                  <span className="text-[11px] font-medium text-sky-600">tPanel server licenses</span>
                </div>
              </div>
              <ServiceSwitch serviceKey={SERVICE_MODULE_KEYS.tpanel} />
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-gray-50">
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Active</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{numberValue(tpanel?.activeLicenses)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Pending</span>
                <span className="text-xl font-bold text-[#2e3d49] tabular-nums">{numberValue(tpanel?.pendingLicenses)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Revenue</span>
                <span className="text-xl font-bold text-sky-600 tabular-nums">{moneyValue(tpanel?.monthlyRevenue)}</span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-gray-50 group-hover:bg-gray-50 transition-colors rounded-b-lg">
            <span className="text-[13px] font-semibold text-sky-600">Manage Panel Licenses</span>
            <ChevronRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-[#e5e8ed] p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#2e3d49]">{stat.value}</div>
            <div className="text-[13px] text-gray-500 font-medium mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-[#e5e8ed] rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Revenue & Users</h2>
              <p className="text-[12px] text-gray-400">Current aggregate from billing and users tables.</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {aggregateData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] font-bold text-gray-400">No dashboard summary available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aggregateData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8ba2ad' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8ba2ad' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#0069ff" strokeWidth={2} fillOpacity={0.1} fill="#0069ff" />
                  <Area type="monotone" dataKey="users" stroke="#24ad5f" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide mb-6">Resource Allocation</h2>
            <div className="h-[200px] w-full relative">
              {resourceData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[13px] font-bold text-gray-400">No resources found.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={resourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {resourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {resourceData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-[#2e3d49]">{totalResources.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Total Items</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {resourceData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[12px] text-gray-500 font-medium">{item.name}</span>
                </div>
                <span className="text-[12px] font-bold text-[#2e3d49]">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f3f5f9] flex items-center justify-between bg-[#f8f9fa]">
            <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Platform Records</h2>
            <Database className="h-4 w-4 text-[#0069ff]" />
          </div>
          <div className="divide-y divide-[#e5e8ed]">
            {[
              { name: 'Open Tickets', value: summary?.openTickets, icon: Shield },
              { name: 'Invoices', value: summary?.invoices, icon: FileText },
              { name: 'Store Orders', value: commerce?.orders, icon: ShoppingBag },
              { name: 'ISP Routers', value: isp?.routers, icon: Server }
            ].map((item) => (
              <div key={item.name} className="px-6 py-4 flex items-center justify-between hover:bg-[#f3f5f9] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 text-[#0069ff]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-[13px] font-bold text-[#2e3d49]">{item.name}</p>
                </div>
                <span className="text-[13px] font-bold text-[#2e3d49]">{numberValue(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-[#e5e8ed] rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#f3f5f9] flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Recent Staff Operations</h2>
            <Activity className="h-4 w-4 text-[#0069ff]" />
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e5e8ed]">
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Actor</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ed]">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading audit logs...</td></tr>
                ) : operations.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No audit logs found in the database.</td></tr>
                ) : operations.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f3f5f9] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-bold text-[#2e3d49]">{log.admin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${log.color}`}>{log.action}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] text-[#4a4a4a] font-medium">{log.resource}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[12px] text-gray-500">{log.time}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-[#f8f9fa] border-t border-[#e5e8ed] text-center">
            <button onClick={() => navigate('/management/logs')} className="text-[#0069ff] text-[13px] font-bold hover:underline">View System Audit Logs</button>
          </div>
        </div>
      </div>
    </div>
  );
}
