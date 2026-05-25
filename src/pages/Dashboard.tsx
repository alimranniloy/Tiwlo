import React from 'react';
import {
  Activity,
  Bell,
  ChevronRight,
  CreditCard,
  Database,
  Globe,
  HardDrive,
  Layers,
  Network,
  Plus,
  Server,
  ShieldAlert,
  ShoppingBag,
  Terminal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Domain, Droplet, User } from '../types';
import {
  fetchBillingOverviewWithApi,
  fetchCloudResourcesWithApi,
  notifyDataRefresh,
  settleUsageBillingWithApi,
  fetchSupportTicketsWithApi
} from '../lib/tiwloApi';

interface DashboardProps {
  user: User;
  droplets: Droplet[];
  domains: Domain[];
}

function money(value: number) {
  return `USD ${Number(value || 0).toFixed(2)}`;
}

function dateLabel(value?: string) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function Dashboard({ user, droplets, domains }: DashboardProps) {
  const [resources, setResources] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [billingOverview, setBillingOverview] = React.useState<any | null>(null);
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      fetchCloudResourcesWithApi(),
      settleUsageBillingWithApi().catch(() => fetchBillingOverviewWithApi()),
      fetchSupportTicketsWithApi()
    ])
      .then(([nextResources, nextBilling, nextTickets]) => {
        setResources(nextResources);
        setBillingOverview(nextBilling);
        setInvoices(nextBilling?.invoices || []);
        setTickets(nextTickets);
        setLogs([]);
        notifyDataRefresh();
      })
      .catch((err) => {
        setResources([]);
        setBillingOverview(null);
        setInvoices([]);
        setTickets([]);
        setLogs([]);
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  const countByType = (type: string) => resources.filter((resource) => resource.type === type).length;
  const liveDroplets = resources
    .filter((resource) => resource.type === 'droplet')
    .map((resource) => ({
      id: resource.id,
      name: resource.name,
      ip: resource.ip || 'Provisioning',
      status: String(resource.status || '').toLowerCase() === 'active' ? 'active' : 'off',
      region: resource.region,
      specs: resource.specs,
      createdAt: resource.createdAt
    }));
  const dashboardDroplets = loading ? droplets : liveDroplets;
  const monthlySpend = Number(billingOverview?.monthlySpend ?? resources.reduce((sum, resource) => sum + Number(resource.monthlyCost || 0), 0));
  const outstanding = Number(billingOverview?.outstanding ?? invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
  const dueAmount = Number(billingOverview?.dueAmount || 0);
  const creditBalance = Number(billingOverview?.credits ?? user.credits ?? 0);
  const creditEmpty = creditBalance <= 0;
  const openTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(String(ticket.status).toLowerCase())).length;

  const quickActions = [
    { label: 'Create Droplet', icon: Server, link: '/droplets/create', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Marketplace', icon: ShoppingBag, link: '/marketplace', color: 'text-pink-500', bg: 'bg-pink-50' },
    { label: 'DNS Settings', icon: Globe, link: '/domains', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'API Access', icon: Terminal, link: '/api', color: 'text-cyan-500', bg: 'bg-cyan-50' }
  ];

  const stats = [
    { label: 'Droplets', value: dashboardDroplets.length, icon: Server, link: '/droplets' },
    { label: 'Domains', value: domains.length, icon: Globe, link: '/domains' },
    { label: 'Databases', value: countByType('database'), icon: Database, link: '/databases' },
    { label: 'Volumes', value: countByType('volume'), icon: HardDrive, link: '/volumes' },
    { label: 'Networks', value: countByType('network'), icon: Network, link: '/networking' },
    { label: 'Open Tickets', value: openTickets, icon: Bell, link: '/support' }
  ];

  return (
    <div className="space-y-6 pb-12 md:space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2e3d49] md:text-2xl">
            Welcome, <span className="text-[#0069ff]">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Your dashboard is populated from live API data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/documentation" className="rounded border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-2 text-center text-[13px] font-bold text-[#4a4a4a] transition-all hover:bg-white">
            Documentation
          </Link>
          <Link to="/droplets/create" className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-blue-200 transition-all hover:bg-[#0056cc]">
            <Plus className="h-4 w-4" /> Create Resource
          </Link>
        </div>
      </div>

      {error && <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}

      {(dueAmount > 0 || creditEmpty) && (
        <div className={`flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:justify-between ${
          creditEmpty ? 'border-red-100 bg-red-50 text-red-900' : 'border-amber-100 bg-amber-50 text-amber-900'
        }`}>
          <div>
            <p className="text-[13px] font-bold">{creditEmpty ? 'Add Credit Now' : 'Payment Due'}</p>
            <p className={`text-[12px] ${creditEmpty ? 'text-red-700' : 'text-amber-700'}`}>
              Credit: {money(creditBalance)}. Due: {money(dueAmount)}. {creditEmpty ? 'All servers and hosted services stay off until credit is added.' : 'Pay due invoices to avoid service suspension.'}
            </p>
          </div>
          <Link to="/billing" className={`rounded px-4 py-2 text-center text-[12px] font-bold text-white ${creditEmpty ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
            {creditEmpty ? 'Add Credit Now' : 'Pay Due'}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} to={action.link} className="group rounded-lg border border-[#e5e8ed] bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${action.bg}`}>
              <action.icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <p className="text-[12px] font-bold text-[#2e3d49]">{action.label}</p>
            <p className="mt-1 text-[10px] text-gray-400">Open</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.link} className="rounded-lg border border-[#e5e8ed] bg-white p-5 transition-all hover:border-blue-300">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded bg-blue-50 p-2">
                <stat.icon className="h-4 w-4 text-blue-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#2e3d49]">{loading ? '...' : stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
              <h3 className="text-[14px] font-bold text-[#2e3d49]">Active Droplets</h3>
              <Link to="/droplets" className="flex items-center gap-1 text-[13px] font-bold text-[#0069ff] hover:underline">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-[#e5e8ed]">
              {dashboardDroplets.length > 0 ? dashboardDroplets.slice(0, 6).map((droplet) => (
                <div key={droplet.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#f3f5f9]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded border border-[#e5e8ed] bg-[#f3f5f9] text-[#8ba2ad]">
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="cursor-pointer text-[14px] font-bold text-[#0069ff] hover:underline">{droplet.name}</div>
                      <div className="flex items-center gap-2 text-[12px] text-[#4a4a4a]">
                        <span className="font-mono">{droplet.ip}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{droplet.region}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${
                    droplet.status === 'active' ? 'border-[#24ad5f]/10 bg-[#e7f6f1] text-[#24ad5f]' : 'border-gray-200 bg-[#f3f5f9] text-gray-500'
                  }`}>
                    {droplet.status === 'active' ? 'Running' : 'Off'}
                  </span>
                </div>
              )) : (
                <div className="px-6 py-12 text-center">
                  <Server className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                  <p className="text-[14px] font-bold text-[#2e3d49]">No active droplets found</p>
                  <p className="mt-1 text-[12px] text-gray-400">Create a virtual machine to see it here.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-[#e5e8ed] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#24ad5f]" />
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#2e3d49]">Billing Snapshot</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded bg-gray-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Monthly Resources</p>
                  <p className="mt-1 text-xl font-bold text-[#2e3d49]">{money(monthlySpend)}</p>
                </div>
                <div className="rounded bg-gray-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Outstanding</p>
                  <p className="mt-1 text-xl font-bold text-[#2e3d49]">{money(outstanding)}</p>
                </div>
              </div>
              <div className="mt-4 rounded bg-blue-50 p-4">
                <p className="text-[10px] font-bold uppercase text-blue-500">Credit Balance</p>
                <p className="mt-1 text-xl font-bold text-[#2e3d49]">{money(creditBalance)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e8ed] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#2e3d49]">Service Health</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded bg-gray-50 p-3">
                  <span className="text-[13px] text-[#4a4a4a]">Firewalls</span>
                  <span className="text-[11px] font-bold uppercase text-gray-500">{countByType('firewall')} records</span>
                </div>
                <div className="flex items-center justify-between rounded bg-gray-50 p-3">
                  <span className="text-[13px] text-[#4a4a4a]">Kubernetes</span>
                  <span className="text-[11px] font-bold uppercase text-gray-500">{countByType('kubernetes')} records</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-[#e5e8ed] bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">
              <Activity className="h-4 w-4 text-[#8ba2ad]" /> Recent Activity
            </h3>
            <div className="space-y-5">
              {loading && <div className="text-sm font-bold text-gray-400">Loading audit logs...</div>}
              {!loading && logs.length === 0 && <div className="text-sm font-bold text-gray-400">No audit logs found.</div>}
              {!loading && logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex gap-4">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50">
                    <Activity className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium leading-tight text-[#2e3d49]">{log.action}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8ba2ad]">
                      <span className="cursor-pointer font-bold text-[#0069ff] hover:underline">{log.resource}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-gray-300"></span>
                      <span>{dateLabel(log.createdAt)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/activity" className="mt-6 block w-full rounded-lg border border-[#e5e8ed] bg-[#f8f9fa] py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-[#4a4a4a] transition-all hover:border-[#0069ff] hover:text-[#0069ff]">
              Full Audit Trail
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white shadow-sm">
            <div className="border-b border-[#e5e8ed] bg-[#f8f9fa] px-6 py-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#2e3d49]">Resources & Help</h3>
            </div>
            <div className="divide-y divide-[#e5e8ed]">
              {[
                { label: 'Documentation', sub: 'Tutorials and API reference', path: '/documentation' },
                { label: 'Support Tickets', sub: `${openTickets} open tickets`, path: '/support' },
                { label: 'Invoices', sub: `${invoices.length} billing records`, path: '/invoices' }
              ].map((item) => (
                <Link key={item.path} to={item.path} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#f3f5f9]">
                  <div>
                    <p className="text-[13px] font-bold text-[#2e3d49]">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </Link>
              ))}
            </div>
          </div>

          <Link to="/kubernetes" className="block rounded-lg bg-[#031b4e] p-6 text-white shadow-lg">
            <h3 className="mb-2 flex items-center gap-2 text-[16px] font-bold uppercase tracking-wide">
              <Layers className="h-4 w-4 text-blue-400" /> Kubernetes
            </h3>
            <p className="mb-6 text-[13px] leading-relaxed text-blue-100">Manage cluster records through the API-backed Kubernetes page.</p>
            <span className="block w-full rounded-lg bg-white py-2.5 text-center text-[13px] font-bold text-[#031b4e]">
              Open Clusters
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
