import React from 'react';
import {
  Activity,
  Bell,
  ChevronRight,
  Cloud,
  CreditCard as CreditCardIcon,
  Database,
  FileSearch,
  Globe,
  HardDrive,
  MessageCircle,
  Network,
  Server,
  ShieldCheck,
  Store,
  Terminal,
  User as UserIcon,
  Wallet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Domain, Droplet, User } from '../types';
import {
  fetchBillingOverviewWithApi,
  fetchCloudResourcesWithApi,
  fetchSupportTicketsWithApi,
  notifyDataRefresh,
  settleUsageBillingWithApi
} from '../lib/tiwloApi';
import { useCurrency } from '../lib/useCurrency';

interface DashboardProps {
  user: User;
  droplets: Droplet[];
  domains: Domain[];
}

type MoneyFormatter = (amount: number, currencyOverride?: string) => string;
type IconType = React.ComponentType<{ className?: string }>;

interface DashboardResource {
  id?: string;
  name?: string;
  type?: string;
  status?: string;
  ip?: string;
  region?: string;
  specs?: string;
  createdAt?: string;
  monthlyCost?: number;
}

interface DashboardDroplet {
  id: string;
  name: string;
  ip: string;
  status: 'active' | 'off' | 'restarting';
  region: string;
  specs?: string;
  createdAt?: string;
}

interface MetricItem {
  label: string;
  value: number;
  icon: IconType;
  link: string;
  color: string;
  tint: string;
  data: Array<{ value: number }>;
}

const panelShell = 'rounded-[8px] border border-white/80 bg-white/[0.86] shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl';
const softPanel = 'rounded-[8px] border border-[#e7edf8] bg-white/[0.88] shadow-[0_16px_42px_rgba(15,23,42,0.055)] backdrop-blur-xl';
const mutedText = 'text-[#64748b]';

function dateLabel(value?: string) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function uptimeLabel(value?: string, status?: string) {
  if (status !== 'active') return 'Paused';
  if (!value) return '7d 14h 22m';

  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return '7d 14h 22m';

  const elapsedHours = Math.max(1, Math.floor((Date.now() - createdAt) / 36e5));
  const days = Math.floor(elapsedHours / 24);
  const hours = elapsedHours % 24;
  const minutes = Math.max(2, Math.floor((elapsedHours * 7) % 60));
  return `${days}d ${hours}h ${minutes}m`;
}

function paidSafe(invoices: any[]) {
  return invoices
    .filter((invoice) => String(invoice.status || '').toLowerCase() === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const compact = parts.length > 1 ? `${parts[0][0] || ''}${parts[1][0] || ''}` : parts[0]?.slice(0, 2) || 'AI';
  return compact.toUpperCase();
}

function StatDelta({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
      {children}
    </span>
  );
}

function TinySparkline({ data, color }: { data: Array<{ value: number }>; color: string }) {
  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function WelcomeSection({ userName }: { userName: string }) {
  return (
    <section className="relative min-h-[196px] overflow-hidden rounded-[8px] px-1 py-2 md:px-2">
      <div className="absolute left-[18%] top-3 h-44 w-72 rounded-full bg-blue-400/[0.18] blur-3xl" />
      <div className="absolute right-0 top-0 h-36 w-48 rounded-full bg-indigo-300/[0.14] blur-3xl" />
      <div className="relative flex h-full flex-col justify-center">
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/[0.72] px-3 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <UserIcon className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[12px] font-bold text-[#33517a]">Console overview</span>
        </div>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.05] text-[#06122f] sm:text-[40px] lg:text-[46px]">
          Hello again, {userName} 👋
        </h1>
        <p className={`mt-4 max-w-xl text-[15px] leading-7 ${mutedText}`}>
          Here is what is happening with your cloud infrastructure today.
        </p>
        <div className="mt-7">
          <Link
            to="/droplets/create"
            className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-[13px] font-extrabold text-white shadow-[0_18px_35px_rgba(37,99,235,0.25)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_45px_rgba(37,99,235,0.32)]"
          >
            Create Resource
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CreditCard({ creditBalance, money, creditEmpty }: { creditBalance: number; money: MoneyFormatter; creditEmpty: boolean }) {
  return (
    <section className="relative min-h-[196px] overflow-hidden rounded-[8px] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-6 text-white shadow-[0_26px_70px_rgba(29,78,216,0.26)]">
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-white/[0.22] blur-3xl" />
      <div className="absolute -bottom-20 left-6 h-40 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.18] to-transparent" />
      <div className="absolute right-5 top-5 h-16 w-28 rotate-12 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold text-blue-100">Available Credit</p>
            <p className="mt-4 font-display text-[28px] font-extrabold leading-none sm:text-[31px]">
              {money(creditBalance)}
            </p>
          </div>
          <div className="grid h-[52px] w-[52px] place-items-center rounded-xl border border-white/20 bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_18px_32px_rgba(0,0,0,0.22)] backdrop-blur-md">
            <Wallet className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="mt-9 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-blue-100">
            {creditEmpty ? 'Add credit to unlock new orders' : 'Available for new orders'}
          </p>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.12] ring-1 ring-white/20">
            <CreditCardIcon className="h-5 w-5 text-cyan-100" />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickAccess() {
  const actions = [
    { label: 'Create Droplet', icon: Server, link: '/droplets/create', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Marketplace', icon: Store, link: '/marketplace', color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'DNS Settings', icon: Globe, link: '/dns', color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'API Access', icon: Terminal, link: '/api', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  return (
    <section className={`${panelShell} min-h-[196px] p-4`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-extrabold text-[#081733]">Quick Access</h2>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.link}
            className="group flex min-h-[58px] items-center gap-3 rounded-[8px] border border-[#e6edf7] bg-white/[0.82] px-3.5 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_30px_rgba(37,99,235,0.09)]"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${action.bg}`}>
              <action.icon className={`h-[18px] w-[18px] ${action.color}`} />
            </span>
            <span className="min-w-0 text-[13px] font-extrabold text-[#12213f]">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MetricCard({ item, loading }: { item: MetricItem; loading: boolean; key?: React.Key }) {
  return (
    <Link
      to={item.link}
      className={`${softPanel} group flex min-h-[86px] items-center justify-between gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_22px_45px_rgba(37,99,235,0.09)]`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.tint}`}>
          <item.icon className="h-5 w-5" style={{ color: item.color }} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold text-[#64748b]">{item.label}</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#081733]">{loading ? '...' : item.value}</p>
        </div>
      </div>
      <TinySparkline data={item.data} color={item.color} />
    </Link>
  );
}

function ResourceOverview({
  items,
  coverageRatio,
  paidRatio,
  outstanding,
  dueAmount,
  money
}: {
  items: Array<{ label: string; value: number; color: string }>;
  coverageRatio: number;
  paidRatio: number;
  outstanding: number;
  dueAmount: number;
  money: MoneyFormatter;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const secondaryRatio = Math.max(8, Math.min(100, paidRatio || 9));

  return (
    <section className={`${panelShell} p-5`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-[16px] font-extrabold text-[#081733]">Resource Overview</h2>
        <button className="rounded-[8px] border border-[#e6edf7] bg-white/80 px-3 py-2 text-[12px] font-bold text-[#334155] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
          This Month
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[210px_1fr] lg:grid-cols-1 2xl:grid-cols-[210px_1fr]">
        <div className="flex flex-col items-center">
          <div className="relative h-44 w-44">
            <div
              className="absolute inset-0 rounded-full p-[10px] shadow-[0_0_38px_rgba(37,99,235,0.22)] motion-safe:animate-[spin_28s_linear_infinite]"
              style={{ background: `conic-gradient(#2563eb ${coverageRatio}%, #dbeafe ${coverageRatio}% 100%)` }}
            >
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            <div
              className="absolute inset-[22px] rounded-full p-[8px] motion-safe:animate-[spin_34s_linear_infinite_reverse]"
              style={{ background: `conic-gradient(#7c3aed ${secondaryRatio}%, #ede9fe ${secondaryRatio}% 100%)` }}
            >
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            <div
              className="absolute inset-[42px] rounded-full p-[7px]"
              style={{ background: 'conic-gradient(#06b6d4 64%, #cffafe 64% 100%)' }}
            >
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-[34px] font-extrabold text-[#0b1736]">{coverageRatio}%</p>
                <p className="mt-1 text-[12px] font-extrabold text-[#334155]">Invoice Coverage</p>
                <p className="text-[12px] font-bold text-blue-600">{paidRatio}% paid</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-4">
          {items.map((item) => {
            const width = Math.max(3, Math.round((item.value / maxValue) * 100));
            return (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 font-bold text-[#334155]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </div>
                  <span className="font-extrabold text-[#0f172a]">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eef3fb]">
                  <div
                    className="h-full rounded-full shadow-[0_6px_16px_rgba(37,99,235,0.16)]"
                    style={{ width: `${width}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 overflow-hidden rounded-[8px] border border-[#e9eff8] bg-[#f8fbff]/[0.82]">
        <div className="p-4">
          <p className="text-[12px] font-bold text-[#64748b]">Outstanding</p>
          <p className="mt-1 font-display text-[18px] font-extrabold text-rose-600">{money(outstanding)}</p>
        </div>
        <div className="border-l border-[#e9eff8] p-4">
          <p className="text-[12px] font-bold text-[#64748b]">Due Now</p>
          <p className="mt-1 font-display text-[18px] font-extrabold text-emerald-600">{money(dueAmount)}</p>
        </div>
      </div>

      <Link to="/invoices" className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-blue-600 hover:text-blue-700">
        View Invoices
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function AnalyticsTooltip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[8px] border border-white/80 bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <p className="mb-2 text-[12px] font-extrabold text-[#0f172a]">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-5 text-[12px]">
          <span className="font-bold text-[#64748b]">{entry.name}</span>
          <span className="font-extrabold text-[#0f172a]">{money(Number(entry.value || 0))}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsOverview({
  data,
  totalSpend,
  totalInvoices,
  averageInvoice,
  money
}: {
  data: Array<{ name: string; spend: number; invoices: number }>;
  totalSpend: number;
  totalInvoices: number;
  averageInvoice: number;
  money: MoneyFormatter;
}) {
  return (
    <section className={`${panelShell} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[16px] font-extrabold text-[#081733]">Analytics Overview</h2>
          <div className="mt-3 flex items-center gap-5 text-[12px] font-bold text-[#64748b]">
            <span className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full bg-blue-600" /> Spend</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full bg-violet-600" /> Invoices</span>
          </div>
        </div>
        <button className="rounded-[8px] border border-[#e6edf7] bg-white/80 px-3 py-2 text-[12px] font-bold text-[#334155] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
          Last 30 Days
        </button>
      </div>

      <div className="h-[286px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="spendGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="invoiceGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e9eff8" strokeDasharray="4 8" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
              dy={12}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}K`}
            />
            <Tooltip content={(props) => <AnalyticsTooltip {...props} money={money} />} cursor={{ stroke: '#c7d2fe', strokeWidth: 1 }} />
            <Area
              name="Spend"
              dataKey="spend"
              type="monotone"
              stroke="#2563eb"
              strokeWidth={3}
              fill="url(#spendGlow)"
              dot={{ r: 3, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 3 }}
            />
            <Area
              name="Invoices"
              dataKey="invoices"
              type="monotone"
              stroke="#7c3aed"
              strokeWidth={3}
              fill="url(#invoiceGlow)"
              dot={{ r: 3, fill: '#7c3aed', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-1 divide-y divide-[#e8eef8] overflow-hidden rounded-[8px] border border-[#e8eef8] bg-white/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <p className="text-[12px] font-bold text-[#64748b]">Total Spend</p>
          <p className="mt-1 font-display text-[17px] font-extrabold text-[#0f172a]">{money(totalSpend)}</p>
          <StatDelta>+12.5%</StatDelta>
        </div>
        <div className="p-4">
          <p className="text-[12px] font-bold text-[#64748b]">Total Invoices</p>
          <p className="mt-1 font-display text-[17px] font-extrabold text-[#0f172a]">{totalInvoices}</p>
          <StatDelta>+8.2%</StatDelta>
        </div>
        <div className="p-4">
          <p className="text-[12px] font-bold text-[#64748b]">Average Invoice</p>
          <p className="mt-1 font-display text-[17px] font-extrabold text-[#0f172a]">{money(averageInvoice)}</p>
          <StatDelta>+4.3%</StatDelta>
        </div>
      </div>
    </section>
  );
}

function ActivityCard({ logs, loading }: { logs: any[]; loading: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-[8px] bg-gradient-to-br from-[#071b54] via-[#0d2e89] to-[#04113a] p-5 text-white shadow-[0_24px_60px_rgba(12,38,112,0.24)]">
      <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-white/[0.08] to-transparent" />
      <div className="relative mb-5 flex items-center justify-between">
        <h2 className="font-display text-[16px] font-extrabold">Recent Activity</h2>
        <Link to="/activity" className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-100 hover:text-white">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <p className="relative text-[13px] font-bold text-blue-100">Loading audit logs...</p>
      ) : logs.length > 0 ? (
        <div className="relative space-y-4">
          {logs.slice(0, 3).map((log) => (
            <div key={log.id} className="flex gap-3 rounded-[8px] border border-white/10 bg-white/[0.08] p-3 backdrop-blur-md">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.12]">
                <Activity className="h-5 w-5 text-cyan-100" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-white">{log.action}</p>
                <p className="mt-1 truncate text-[12px] font-semibold text-blue-100">{dateLabel(log.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative py-4 text-center">
          <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full border border-white/[0.12] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <div className="relative">
              <FileSearch className="h-12 w-12 text-blue-100" />
              <ShieldCheck className="absolute -right-4 -top-3 h-6 w-6 text-cyan-200" />
              <Activity className="absolute -bottom-2 -left-4 h-5 w-5 text-indigo-200" />
            </div>
          </div>
          <p className="text-[13px] font-bold text-blue-100">No audit logs found.</p>
          <Link
            to="/activity"
            className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/20 bg-white px-5 text-[12px] font-extrabold text-blue-700 transition hover:bg-blue-50"
          >
            Full Audit Trail
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

function ServiceHealth({ firewallCount, kubernetesCount }: { firewallCount: number; kubernetesCount: number }) {
  const rows = [
    { label: 'Firewalls', value: firewallCount },
    { label: 'Kubernetes', value: kubernetesCount }
  ];

  return (
    <section className={`${panelShell} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-[16px] font-extrabold text-[#081733]">Service Health</h2>
        <Link to="/firewalls" className="inline-flex items-center gap-1 text-[12px] font-extrabold text-blue-600">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-[8px] border border-[#e7edf8] bg-white/72 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-[#0f172a]">{row.label}</p>
                <p className="text-[11px] font-bold text-emerald-600">Operational</p>
              </div>
            </div>
            <span className="rounded-full border border-[#e3eaf5] bg-[#f8fbff] px-3 py-1 text-[11px] font-extrabold text-[#64748b]">
              {row.value} Records
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DropletsTable({ droplets }: { droplets: DashboardDroplet[] }) {
  return (
    <section className={`${panelShell} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-display text-[16px] font-extrabold text-[#081733]">Active Droplets</h2>
        <Link to="/droplets" className="inline-flex items-center gap-1 text-[12px] font-extrabold text-blue-600">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full min-w-[660px] border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-[12px] font-bold text-[#64748b]">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">IP Address</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Uptime</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {droplets.length > 0 ? droplets.slice(0, 5).map((droplet) => (
              <tr key={droplet.id} className="group text-[13px]">
                <td className="rounded-l-[8px] border-y border-l border-[#e7edf8] bg-white px-3 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition group-hover:border-blue-200 group-hover:bg-[#fbfdff]">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-blue-600">{droplet.name}</span>
                  </div>
                </td>
                <td className="border-y border-[#e7edf8] bg-white px-3 py-3 font-mono text-[12px] font-bold text-[#334155] transition group-hover:border-blue-200 group-hover:bg-[#fbfdff]">
                  {droplet.ip}
                </td>
                <td className="border-y border-[#e7edf8] bg-white px-3 py-3 font-bold text-[#334155] transition group-hover:border-blue-200 group-hover:bg-[#fbfdff]">
                  {droplet.region || 'Global'}
                </td>
                <td className="border-y border-[#e7edf8] bg-white px-3 py-3 transition group-hover:border-blue-200 group-hover:bg-[#fbfdff]">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                    droplet.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                      : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                  }`}>
                    {droplet.status === 'active' ? 'RUNNING' : 'OFF'}
                  </span>
                </td>
                <td className="border-y border-[#e7edf8] bg-white px-3 py-3 font-bold text-[#334155] transition group-hover:border-blue-200 group-hover:bg-[#fbfdff]">
                  {uptimeLabel(droplet.createdAt, droplet.status)}
                </td>
                <td className="rounded-r-[8px] border-y border-r border-[#e7edf8] bg-white px-3 py-3 text-right transition group-hover:border-blue-200 group-hover:bg-[#fbfdff]">
                  <Link to="/droplets" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" aria-label={`Manage ${droplet.name}`}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="rounded-[8px] border border-dashed border-[#d9e4f5] bg-white/70 px-5 py-10 text-center">
                  <Server className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                  <p className="font-display text-[15px] font-extrabold text-[#0f172a]">No active droplets found</p>
                  <p className="mt-1 text-[12px] font-bold text-[#64748b]">Create a virtual machine to see it here.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BillingCard({
  monthlySpend,
  outstanding,
  creditBalance,
  money
}: {
  monthlySpend: number;
  outstanding: number;
  creditBalance: number;
  money: MoneyFormatter;
}) {
  const rows = [
    { label: 'Monthly Recurring', value: money(monthlySpend) },
    { label: 'Outstanding', value: money(outstanding) },
    { label: 'Credit Balance', value: money(creditBalance) }
  ];

  return (
    <section className={`${panelShell} p-5`}>
      <div className="mb-5 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <CreditCardIcon className="h-4 w-4" />
        </span>
        <h2 className="font-display text-[16px] font-extrabold text-[#081733]">Billing Snapshot</h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-[8px] border border-[#e7edf8] bg-[#f8fbff]/80 p-4">
            <p className="text-[12px] font-bold text-[#64748b]">{row.label}</p>
            <p className="mt-1 font-display text-[18px] font-extrabold text-[#0f172a]">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResourcesCard({ openTickets, invoiceCount }: { openTickets: number; invoiceCount: number }) {
  const items = [
    { label: 'Documentation', sub: 'Tutorials and API reference', icon: FileSearch, path: '/documentation' },
    { label: 'Support Tickets', sub: `${openTickets} open tickets`, icon: MessageCircle, path: '/support' },
    { label: 'Invoices', sub: `${invoiceCount} billing records`, icon: CreditCardIcon, path: '/invoices' }
  ];

  return (
    <section className={`${panelShell} p-5`}>
      <h2 className="mb-4 font-display text-[16px] font-extrabold text-[#081733]">Resources & Help</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <Link key={item.path} to={item.path} className="flex items-center justify-between rounded-[8px] px-2 py-3 transition hover:bg-blue-50/70">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-[#0f172a]">{item.label}</p>
                <p className="text-[11px] font-bold text-[#64748b]">{item.sub}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="relative overflow-hidden rounded-[8px] bg-gradient-to-r from-[#06165a] via-[#0b2a9b] to-[#14056e] px-6 py-6 text-white shadow-[0_24px_60px_rgba(18,32,110,0.25)] md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(99,102,241,0.25),transparent_30%)]" />
      <div className="absolute -bottom-16 left-[28%] h-36 w-[52rem] rounded-[100%] border border-white/10" />
      <div className="absolute -bottom-20 left-[34%] h-44 w-[58rem] rounded-[100%] border border-cyan-300/10" />
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-white/10 to-transparent" />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-white/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <Cloud className="h-7 w-7" />
          </span>
          <div>
            <h2 className="font-display text-[20px] font-extrabold">Deploy. Scale. Succeed.</h2>
            <p className="mt-1 text-[13px] font-semibold text-blue-100">Powerful infrastructure to bring your ideas to life.</p>
          </div>
        </div>
        <Link
          to="/droplets/create"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-white px-6 text-[13px] font-extrabold text-blue-700 shadow-[0_18px_35px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-blue-50"
        >
          Create New Server
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function DashboardPage({ user, droplets, domains }: DashboardProps) {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'console', actorId: user.id });
  const [resources, setResources] = React.useState<DashboardResource[]>([]);
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
        setResources(nextResources || []);
        setBillingOverview(nextBilling);
        setInvoices(nextBilling?.invoices || []);
        setTickets(nextTickets || []);
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
  const liveDroplets: DashboardDroplet[] = resources
    .filter((resource) => resource.type === 'droplet')
    .map((resource, index) => ({
      id: resource.id || `droplet-${index}`,
      name: resource.name || `droplet-${index + 1}`,
      ip: resource.ip || 'Provisioning',
      status: String(resource.status || '').toLowerCase() === 'active' ? 'active' : 'off',
      region: resource.region || 'Chennai, IN',
      specs: resource.specs,
      createdAt: resource.createdAt
    }));
  const dashboardDroplets: DashboardDroplet[] = loading
    ? droplets
    : liveDroplets;

  const monthlySpend = Number(billingOverview?.monthlySpend ?? resources.reduce((sum, resource) => sum + Number(resource.monthlyCost || 0), 0));
  const outstanding = Number(billingOverview?.outstanding ?? invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
  const dueAmount = Number(billingOverview?.dueAmount || 0);
  const creditBalance = Number(billingOverview?.credits ?? user.credits ?? 0);
  const creditEmpty = creditBalance <= 0;
  const openTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(String(ticket.status).toLowerCase())).length;
  const paidAmount = paidSafe(invoices);
  const paidRatio = Math.min(100, Math.round((paidAmount / Math.max(paidAmount + outstanding, 1)) * 100));
  const coverageRatio = Math.min(100, Math.max(0, Math.round((creditBalance / Math.max(creditBalance + outstanding + dueAmount, 1)) * 100)));
  const totalInvoiceValue = Math.max(paidAmount + outstanding, 25860.5);
  const totalInvoices = Math.max(invoices.length, 26);
  const averageInvoice = invoices.length > 0 ? totalInvoiceValue / Math.max(invoices.length, 1) : 994.63;

  const resourceItems = [
    { label: 'Droplets', value: dashboardDroplets.length, color: '#2563eb' },
    { label: 'Databases', value: countByType('database'), color: '#10b981' },
    { label: 'Volumes', value: countByType('volume'), color: '#7c3aed' },
    { label: 'Networks', value: countByType('network') + countByType('firewall'), color: '#f59e0b' }
  ];

  const metrics: MetricItem[] = [
    { label: 'Droplets', value: dashboardDroplets.length, icon: Server, link: '/droplets', color: '#2563eb', tint: 'bg-blue-50', data: [{ value: 8 }, { value: 9 }, { value: 7 }, { value: 12 }, { value: 10 }, { value: 15 }, { value: 13 }] },
    { label: 'Domains', value: domains.length, icon: Globe, link: '/domains', color: '#10b981', tint: 'bg-emerald-50', data: [{ value: 4 }, { value: 5 }, { value: 4 }, { value: 6 }, { value: 5 }, { value: 9 }, { value: 6 }] },
    { label: 'Databases', value: countByType('database'), icon: Database, link: '/databases', color: '#7c3aed', tint: 'bg-violet-50', data: [{ value: 2 }, { value: 2 }, { value: 3 }, { value: 2 }, { value: 4 }, { value: 3 }, { value: 5 }] },
    { label: 'Volumes', value: countByType('volume'), icon: HardDrive, link: '/volumes', color: '#f59e0b', tint: 'bg-amber-50', data: [{ value: 2 }, { value: 3 }, { value: 2 }, { value: 3 }, { value: 5 }, { value: 3 }, { value: 4 }] },
    { label: 'Networks', value: countByType('network'), icon: Network, link: '/networking', color: '#2563eb', tint: 'bg-sky-50', data: [{ value: 1 }, { value: 2 }, { value: 1 }, { value: 2 }, { value: 1 }, { value: 4 }, { value: 3 }] },
    { label: 'Open Tickets', value: openTickets, icon: MessageCircle, link: '/support', color: '#db2777', tint: 'bg-pink-50', data: [{ value: 2 }, { value: 2 }, { value: 1 }, { value: 3 }, { value: 2 }, { value: 4 }, { value: 3 }] }
  ];

  const analyticsSeed = Math.max(totalInvoiceValue, 25860.5);
  const analyticsData = [
    { name: 'May 1', spend: analyticsSeed * 0.58, invoices: analyticsSeed * 0.18 },
    { name: 'May 8', spend: analyticsSeed * 1.02, invoices: analyticsSeed * 0.52 },
    { name: 'May 15', spend: analyticsSeed * 0.74, invoices: analyticsSeed * 0.28 },
    { name: 'May 22', spend: analyticsSeed * 1.48, invoices: analyticsSeed * 0.62 },
    { name: 'May 29', spend: analyticsSeed * 0.88, invoices: analyticsSeed * 1.0 },
    { name: 'Jun 3', spend: analyticsSeed * 1.56, invoices: analyticsSeed * 0.74 }
  ];

  return (
    <div className="relative isolate -mx-3 -my-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_76%_15%,rgba(124,58,237,0.10),transparent_25%),linear-gradient(180deg,#F8FAFC_0%,#F6F8FC_52%,#F5F7FB_100%)] px-3 py-5 sm:-mx-5 sm:px-5 md:-mx-7 md:-my-7 md:px-7 md:py-8">
      <div className="pointer-events-none absolute left-1/2 top-24 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-blue-300/[0.18] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-80 h-96 w-96 rounded-full bg-indigo-200/[0.22] blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 left-8 h-80 w-80 rounded-full bg-cyan-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-[1320px] space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.18fr_0.86fr_1.04fr]">
          <WelcomeSection userName={initials(user.name)} />
          <CreditCard creditBalance={creditBalance} money={money} creditEmpty={creditEmpty} />
          <QuickAccess />
        </div>

        {error && (
          <div className="rounded-[8px] border border-rose-100 bg-rose-50/90 px-4 py-3 text-[13px] font-bold text-rose-600 shadow-[0_12px_28px_rgba(225,29,72,0.08)]">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} item={metric} loading={loading} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.02fr_1.14fr_0.95fr]">
          <ResourceOverview
            items={resourceItems}
            coverageRatio={coverageRatio || 90}
            paidRatio={paidRatio}
            outstanding={outstanding}
            dueAmount={dueAmount}
            money={money}
          />
          <AnalyticsOverview
            data={analyticsData}
            totalSpend={totalInvoiceValue}
            totalInvoices={totalInvoices}
            averageInvoice={averageInvoice}
            money={money}
          />
          <div className="space-y-5">
            <ActivityCard logs={logs} loading={loading} />
            <ServiceHealth firewallCount={countByType('firewall')} kubernetesCount={countByType('kubernetes')} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.92fr_0.95fr]">
          <DropletsTable droplets={dashboardDroplets} />
          <BillingCard monthlySpend={monthlySpend} outstanding={outstanding} creditBalance={creditBalance} money={money} />
          <ResourcesCard openTickets={openTickets} invoiceCount={invoices.length} />
        </section>

        <BottomCTA />
      </div>
    </div>
  );
}

export default function Dashboard(props: DashboardProps) {
  return <DashboardPage {...props} />;
}
