import React from 'react';
import {
  Activity,
  Bell,
  Braces,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Cloud,
  CreditCard as CreditCardIcon,
  Database,
  Droplet as DropletIcon,
  FileSearch,
  Globe,
  HardDrive,
  MessageCircle,
  MoreVertical,
  Network,
  Server,
  ShieldCheck,
  ShoppingBag,
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
import { countryByCode } from '../lib/countries';
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
  metadata?: Record<string, any> | null;
}

interface DashboardDroplet {
  id: string;
  name: string;
  ip: string;
  status: 'active' | 'off' | 'restarting';
  region: string;
  countryCode?: string;
  specs?: string;
  createdAt?: string;
}

interface MetricItem {
  label: string;
  value: number;
  icon: IconType;
  link: string;
  color: string;
  iconBg: string;
  graph: Array<{ value: number }>;
}

const card = 'rounded-[8px] border border-[#e8eef7] bg-white';
const textInk = 'text-[#071437]';
const textMuted = 'text-[#667692]';

const REGION_COUNTRY_HINTS: Record<string, string> = {
  bangladesh: 'BD',
  dhaka: 'BD',
  bd: 'BD',
  india: 'IN',
  chennai: 'IN',
  mumbai: 'IN',
  delhi: 'IN',
  bangalore: 'IN',
  bengaluru: 'IN',
  singapore: 'SG',
  sg: 'SG',
  tokyo: 'JP',
  japan: 'JP',
  sydney: 'AU',
  australia: 'AU',
  london: 'GB',
  uk: 'GB',
  england: 'GB',
  frankfurt: 'DE',
  germany: 'DE',
  amsterdam: 'NL',
  netherlands: 'NL',
  toronto: 'CA',
  canada: 'CA',
  newyork: 'US',
  'new york': 'US',
  california: 'US',
  usa: 'US',
  us: 'US',
  nyc: 'US',
  sfo: 'US'
};

function paidSafe(invoices: any[]) {
  return invoices
    .filter((invoice) => String(invoice.status || '').toLowerCase() === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
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

function countryFlagFromCode(code?: string) {
  return countryByCode(code || 'BD');
}

function inferCountryCode(resource: DashboardResource | DashboardDroplet) {
  const metadata = (resource as DashboardResource).metadata || {};
  const direct = String(
    metadata.countryCode ||
    metadata.country ||
    metadata.location?.countryCode ||
    metadata.location?.country ||
    ''
  ).trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(direct)) return direct;

  const region = String(resource.region || '').toLowerCase();
  for (const [needle, code] of Object.entries(REGION_COUNTRY_HINTS)) {
    if (region.includes(needle)) return code;
  }

  const ip = String(resource.ip || '').trim();
  if (/^(103\.|118\.|119\.30\.|123\.49\.|180\.211\.|202\.4\.)/.test(ip)) return 'BD';
  if (/^(14\.|27\.|49\.|103\.21\.|106\.|117\.|122\.|139\.|152\.|157\.|202\.)/.test(ip)) return 'IN';
  if (/^(8\.|23\.|24\.|35\.|44\.|52\.|54\.|66\.|67\.|68\.|69\.|70\.|72\.|73\.|96\.|104\.)/.test(ip)) return 'US';
  if (/^(43\.|101\.|103\.1\.|110\.|116\.|121\.|122\.11\.|128\.199\.)/.test(ip)) return 'SG';

  return 'BD';
}

function TinySparkline({ data, color }: { data: Array<{ value: number }>; color: string }) {
  const id = `spark-${color.replace('#', '')}`;

  return (
    <div className="h-9 w-[72px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 7, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#${id})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopBackgroundArt() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-[10px] md:block">
      <div className="absolute left-[30%] top-[54px] h-[154px] w-[640px] rotate-[-7deg] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(224,235,255,0.96)_0%,rgba(238,244,255,0.76)_42%,rgba(255,255,255,0)_73%)]" />
      <div className="absolute left-[39%] top-[78px] h-[136px] w-[330px] rotate-[-7deg] bg-[radial-gradient(#c8d7ff_1px,transparent_1.35px)] opacity-75 [background-size:8px_8px] [mask-image:radial-gradient(ellipse_at_center,black_18%,rgba(0,0,0,0.68)_42%,transparent_76%)]" />
      <div className="absolute left-[33%] top-[78px] h-[118px] w-[520px] rotate-[-7deg] rounded-[100%] bg-[linear-gradient(90deg,transparent_0%,rgba(222,233,255,0.6)_38%,rgba(238,244,255,0.54)_58%,transparent_100%)]" />
    </div>
  );
}

function WelcomeSection() {
  return (
    <section className="relative min-h-[196px] px-1 py-4">
      <div className="relative z-10 pt-5">
        <h1 className={`font-display text-[30px] font-extrabold leading-tight tracking-normal ${textInk}`}>
          Hello again, AI <span>{'\u{1F44B}'}</span>
        </h1>
        <p className={`mt-4 max-w-[420px] text-[15px] font-medium leading-7 ${textMuted}`}>
          Here&apos;s what&apos;s happening with your cloud infrastructure today.
        </p>
        <Link
          to="/droplets/create"
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-[7px] bg-gradient-to-b from-[#1d68ff] to-[#0052e6] px-5 text-[13px] font-extrabold text-white transition hover:brightness-105"
        >
          Create New
          <ChevronDown className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function CreditCard({ creditBalance, money, creditEmpty }: { creditBalance: number; money: MoneyFormatter; creditEmpty: boolean }) {
  return (
    <section className={`${card} relative min-h-[150px] overflow-hidden p-6`}>
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-200/70 to-transparent" />
      <div className="absolute -left-10 -top-12 h-28 w-36 rounded-full bg-blue-50 blur-2xl" />
      <div className="relative flex items-center justify-between gap-5">
        <div>
          <p className={`text-[13px] font-extrabold ${textInk}`}>Available Credit</p>
          <p className={`mt-4 font-display text-[28px] font-extrabold leading-none tracking-normal ${textInk}`}>
            {money(creditBalance)}
          </p>
          <p className={`mt-5 text-[13px] font-semibold ${textMuted}`}>
            {creditEmpty ? 'Add credit to resume new orders' : 'Available for new orders'}
          </p>
        </div>
        <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#2f7bff] to-[#0d43f2] text-white">
          <Wallet className="h-7 w-7" />
        </div>
      </div>
    </section>
  );
}

function QuickAccess() {
  const actions = [
    { label: 'Create Droplet', icon: DropletIcon, link: '/droplets/create', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Marketplace', icon: ShoppingBag, link: '/marketplace', color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'DNS Settings', icon: Globe, link: '/dns', color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'API Access', icon: Braces, link: '/api-tokens', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  return (
    <section className={`${card} min-h-[150px] p-5`}>
      <h2 className={`mb-4 font-display text-[15px] font-extrabold ${textInk}`}>Quick Access</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.link}
            className="flex h-[62px] items-center gap-4 rounded-[8px] border border-[#e7edf6] bg-white px-4 transition hover:border-blue-200 hover:bg-[#fbfdff]"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${action.bg}`}>
              <action.icon className={`h-[21px] w-[21px] ${action.color}`} />
            </span>
            <span className={`min-w-0 text-[13px] font-extrabold leading-tight ${textInk}`}>{action.label}</span>
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
      className={`${card} flex h-[78px] min-w-0 items-center justify-between gap-2 px-4 transition hover:border-blue-200`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[9px] ${item.iconBg}`}>
          <item.icon className="h-[21px] w-[21px]" style={{ color: item.color }} />
        </span>
        <div className="min-w-0">
          <p className={`whitespace-nowrap text-[12px] font-bold leading-none ${textMuted}`}>{item.label}</p>
          <p className={`mt-2 font-display text-[22px] font-extrabold leading-none ${textInk}`}>{loading ? '...' : item.value}</p>
        </div>
      </div>
      <TinySparkline data={item.graph} color={item.color} />
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

  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className={`font-display text-[15px] font-extrabold ${textInk}`}>Resource Overview</h2>
        <button className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#e7edf6] bg-white px-3 text-[12px] font-bold text-[#263858]">
          This Month
          <ChevronDown className="h-3.5 w-3.5 text-[#8190a7]" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-1 sm:grid-cols-[182px_1fr] sm:px-6">
        <div className="flex flex-col items-center">
          <div
            className="grid h-[154px] w-[154px] place-items-center rounded-full p-[14px]"
            style={{ background: `conic-gradient(#1b63f2 0 ${coverageRatio}%, #cfdcff ${coverageRatio}% 100%)` }}
          >
            <div className="grid h-full w-full place-items-center rounded-full border border-[#edf2fb] bg-white">
              <span className={`font-display text-[33px] font-extrabold leading-none ${textInk}`}>{coverageRatio}%</span>
            </div>
          </div>
          <p className={`mt-4 text-[12px] font-extrabold ${textInk}`}>Invoice Coverage</p>
          <p className="mt-1 text-[12px] font-extrabold text-blue-600">{paidRatio}% paid</p>
        </div>

        <div className="flex flex-col justify-center space-y-5">
          {items.map((item) => {
            const width = Math.max(4, Math.round((item.value / maxValue) * 100));
            return (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className={`flex items-center gap-3 text-[12px] font-bold ${textMuted}`}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </div>
                  <span className={`text-[13px] font-extrabold ${textInk}`}>{item.value}</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-[#edf2f8]">
                  <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-[#eef3f8] bg-[#fbfdff] sm:grid-cols-2">
        <div className="px-6 py-5">
          <p className={`text-[12px] font-bold ${textMuted}`}>Outstanding</p>
          <p className="mt-2 font-display text-[18px] font-extrabold text-rose-600">{money(outstanding)}</p>
        </div>
        <div className="border-t border-[#eef3f8] px-6 py-5 sm:border-l sm:border-t-0">
          <p className={`text-[12px] font-bold ${textMuted}`}>Due Now</p>
          <p className="mt-2 font-display text-[18px] font-extrabold text-emerald-600">{money(dueAmount)}</p>
        </div>
      </div>

      <Link to="/invoices" className="inline-flex items-center gap-2 px-6 py-4 text-[13px] font-extrabold text-blue-600">
        View Invoices
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function AnalyticsTooltip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[8px] border border-[#e8eef7] bg-white px-4 py-3">
      <p className={`mb-2 text-[12px] font-extrabold ${textInk}`}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-5 text-[12px]">
          <span className={`font-bold ${textMuted}`}>{entry.name}</span>
          <span className={`font-extrabold ${textInk}`}>{money(Number(entry.value || 0))}</span>
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
    <section className={`${card} overflow-hidden px-5 pb-0 pt-4`}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className={`font-display text-[15px] font-extrabold ${textInk}`}>Analytics Overview</h2>
          <div className={`mt-5 flex items-center gap-5 text-[12px] font-bold ${textMuted}`}>
            <span className="flex items-center gap-2"><span className="h-1.5 w-4 rounded-full bg-[#1b63f2]" /> Spend</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-4 rounded-full bg-[#5b21e6]" /> Invoices</span>
          </div>
        </div>
        <button className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#e7edf6] bg-white px-3 text-[12px] font-bold text-[#263858]">
          Last 30 Days
          <ChevronDown className="h-3.5 w-3.5 text-[#8190a7]" />
        </button>
      </div>

      <div className="h-[248px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1b63f2" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#1b63f2" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="invoiceArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b21e6" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#5b21e6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e9eef6" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#667692', fontSize: 12, fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#667692', fontSize: 12, fontWeight: 700 }}
              ticks={[0, 10000, 20000, 30000, 40000]}
              tickFormatter={(value) => (Number(value) === 0 ? '0' : `${Math.round(Number(value) / 1000)}K`)}
            />
            <Tooltip content={(props) => <AnalyticsTooltip {...props} money={money} />} cursor={{ stroke: '#d7e2f7', strokeWidth: 1 }} />
            <Area
              name="Spend"
              dataKey="spend"
              type="monotone"
              stroke="#1b63f2"
              strokeWidth={2.7}
              fill="url(#spendArea)"
              dot={{ r: 3, fill: '#1b63f2', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#1b63f2', stroke: '#fff', strokeWidth: 3 }}
            />
            <Area
              name="Invoices"
              dataKey="invoices"
              type="monotone"
              stroke="#5b21e6"
              strokeWidth={2.7}
              fill="url(#invoiceArea)"
              dot={{ r: 3, fill: '#5b21e6', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#5b21e6', stroke: '#fff', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 border-t border-[#eef3f8] bg-[#fbfdff] sm:grid-cols-3">
        <div className="px-5 py-4">
          <p className={`text-[12px] font-bold ${textMuted}`}>Total Spend</p>
          <p className={`mt-1 font-display text-[17px] font-extrabold ${textInk}`}>{money(totalSpend)}</p>
          <p className="mt-1 text-[12px] font-extrabold text-emerald-600">+ 12.5%</p>
        </div>
        <div className="border-t border-[#eef3f8] px-5 py-4 sm:border-l sm:border-t-0">
          <p className={`text-[12px] font-bold ${textMuted}`}>Total Invoices</p>
          <p className={`mt-1 font-display text-[17px] font-extrabold ${textInk}`}>{totalInvoices}</p>
          <p className="mt-1 text-[12px] font-extrabold text-emerald-600">+ 8.2%</p>
        </div>
        <div className="border-t border-[#eef3f8] px-5 py-4 sm:border-l sm:border-t-0">
          <p className={`text-[12px] font-bold ${textMuted}`}>Average per Invoice</p>
          <p className={`mt-1 font-display text-[17px] font-extrabold ${textInk}`}>{money(averageInvoice)}</p>
          <p className="mt-1 text-[12px] font-extrabold text-emerald-600">+ 4.3%</p>
        </div>
      </div>
    </section>
  );
}

function ActivityCard({ logs, loading }: { logs: any[]; loading: boolean }) {
  return (
    <section className={`${card} min-h-[218px] overflow-hidden p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`font-display text-[15px] font-extrabold ${textInk}`}>Recent Activity</h2>
        <Link to="/activity" className="inline-flex items-center gap-1 text-[12px] font-extrabold text-blue-600">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <p className={`text-[13px] font-bold ${textMuted}`}>Loading audit logs...</p>
      ) : logs.length > 0 ? (
        <div className="space-y-3">
          {logs.slice(0, 3).map((log) => (
            <div key={log.id} className="flex items-center gap-3 rounded-[8px] border border-[#eef3f8] bg-[#fbfdff] p-3">
              <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-blue-50 text-blue-600">
                <Activity className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className={`truncate text-[13px] font-extrabold ${textInk}`}>{log.action}</p>
                <p className={`truncate text-[12px] font-semibold ${textMuted}`}>{log.resource || 'Audit event'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p className={`text-[13px] font-semibold ${textMuted}`}>No audit logs found.</p>
          <div className="flex flex-col items-center pt-5">
            <div className="relative grid h-[82px] w-[82px] place-items-center text-blue-600">
              <div className="absolute inset-0 rounded-full border border-dashed border-blue-200" />
              <div className="absolute inset-3 rounded-full border border-blue-100" />
              <FileSearch className="h-11 w-11" />
            </div>
            <Link
              to="/activity"
              className="mt-5 inline-flex h-10 w-[160px] items-center justify-center gap-2 rounded-[7px] border border-[#d9e4f5] bg-white text-[12px] font-extrabold text-blue-600 transition hover:border-blue-300"
            >
              Full Audit Trail
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
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
    <section className={`${card} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`font-display text-[15px] font-extrabold ${textInk}`}>Service Health</h2>
        <Link to="/firewalls" className="inline-flex items-center gap-1 text-[12px] font-extrabold text-blue-600">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-[#eef3f8]">
        {rows.map((row) => (
          <div key={row.label} className="flex h-[50px] items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className={`text-[13px] font-extrabold ${textInk}`}>{row.label}</span>
            </div>
            <span className={`text-[12px] font-bold ${textMuted}`}>{row.value} Records</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DropletCountryBadge({ droplet }: { droplet: DashboardDroplet }) {
  const country = countryFlagFromCode(droplet.countryCode || inferCountryCode(droplet));

  return (
    <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#e8eef7] bg-white px-2 py-1 text-[11px] font-extrabold text-[#32415f]">
      <span className="text-[13px] leading-none">{country.flag}</span>
      <span>{country.code}</span>
    </span>
  );
}

function DropletsTable({ droplets }: { droplets: DashboardDroplet[] }) {
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className={`font-display text-[15px] font-extrabold ${textInk}`}>Active Droplets</h2>
        <Link to="/droplets" className="inline-flex items-center gap-1 text-[12px] font-extrabold text-blue-600">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3 px-4 pb-4 md:hidden">
        {droplets.length > 0 ? droplets.slice(0, 5).map((droplet) => (
          <div key={droplet.id} className="rounded-[8px] border border-[#eef3f8] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="truncate font-extrabold text-blue-600">{droplet.name}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`font-mono text-[12px] font-semibold ${textInk}`}>{droplet.ip}</span>
                  <DropletCountryBadge droplet={droplet} />
                </div>
                <p className={`mt-2 text-[12px] font-semibold ${textMuted}`}>{droplet.region || 'Chennai, IN'} / {uptimeLabel(droplet.createdAt, droplet.status)}</p>
              </div>
              <span className={`shrink-0 rounded-[5px] px-2 py-1 text-[10px] font-extrabold ${
                droplet.status === 'active'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {droplet.status === 'active' ? 'RUNNING' : 'OFF'}
              </span>
            </div>
          </div>
        )) : (
          <div className="rounded-[8px] border border-[#eef3f8] px-5 py-8 text-center">
            <Server className="mx-auto mb-3 h-9 w-9 text-slate-300" />
            <p className={`font-display text-[15px] font-extrabold ${textInk}`}>No active droplets found</p>
            <p className={`mt-1 text-[12px] font-bold ${textMuted}`}>Create a virtual machine to see it here.</p>
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-[#fbfdff]">
            <tr className={`text-[12px] font-bold ${textMuted}`}>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">IP Address</th>
              <th className="px-5 py-3">Region</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Uptime</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {droplets.length > 0 ? droplets.slice(0, 5).map((droplet) => (
              <tr key={droplet.id} className="border-t border-[#eef3f8] text-[13px]">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-blue-600">{droplet.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[12px] font-semibold ${textInk}`}>{droplet.ip}</span>
                    <DropletCountryBadge droplet={droplet} />
                  </div>
                </td>
                <td className={`px-5 py-4 font-semibold ${textInk}`}>{droplet.region || 'Chennai, IN'}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-[5px] px-2 py-1 text-[10px] font-extrabold ${
                    droplet.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {droplet.status === 'active' ? 'RUNNING' : 'OFF'}
                  </span>
                </td>
                <td className={`px-5 py-4 font-semibold ${textInk}`}>{uptimeLabel(droplet.createdAt, droplet.status)}</td>
                <td className="px-5 py-4 text-right">
                  <Link to="/droplets" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50" aria-label={`Manage ${droplet.name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            )) : (
              <tr className="border-t border-[#eef3f8]">
                <td colSpan={6} className="px-5 py-9 text-center">
                  <Server className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                  <p className={`font-display text-[15px] font-extrabold ${textInk}`}>No active droplets found</p>
                  <p className={`mt-1 text-[12px] font-bold ${textMuted}`}>Create a virtual machine to see it here.</p>
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
    <section className={`${card} flex min-h-[128px] flex-col justify-center p-5`}>
      <div className="mb-4 flex items-center gap-2">
        <CreditCardIcon className="h-4 w-4 text-blue-600" />
        <h2 className={`font-display text-[15px] font-extrabold ${textInk}`}>Billing Snapshot</h2>
      </div>
      <div className="grid grid-cols-1 divide-y divide-[#eef3f8] sm:grid-cols-[1fr_1fr_1fr_36px] sm:divide-x sm:divide-y-0">
        {rows.map((row) => (
          <div key={row.label} className="py-3 first:pt-0 last:pb-0 sm:py-0 sm:pr-3 sm:first:pl-0 sm:[&:not(:first-child)]:pl-4">
            <p className={`text-[12px] font-bold ${textMuted}`}>{row.label}</p>
            <p className={`mt-2 whitespace-nowrap font-display text-[15px] font-extrabold ${textInk}`}>{row.value}</p>
          </div>
        ))}
        <Link to="/billing" className="grid place-items-center pt-3 text-blue-600 sm:pl-4 sm:pt-0">
          <CreditCardIcon className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

function ResourcesCard({ openTickets, invoiceCount }: { openTickets: number; invoiceCount: number }) {
  const items = [
    { label: 'Documentation', sub: 'Tutorials and API reference', icon: FileSearch, path: '/documentation' },
    { label: 'Support Tickets', sub: `${openTickets} open tickets`, icon: ShieldCheck, path: '/support' },
    { label: 'Support Tickets', sub: `${openTickets} unresolved`, icon: Bell, path: '/alerts' },
    { label: 'Invoices', sub: `${invoiceCount} billing records`, icon: CreditCardIcon, path: '/invoices' }
  ];

  return (
    <section className={`${card} p-5`}>
      <h2 className={`mb-4 font-display text-[15px] font-extrabold ${textInk}`}>Resources & Help</h2>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <Link key={`${item.path}-${index}`} to={item.path} className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-blue-50 text-blue-600">
                <item.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className={`truncate text-[12px] font-extrabold ${textInk}`}>{item.label}</p>
                <p className={`truncate text-[10px] font-bold ${textMuted}`}>{item.sub}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-blue-600" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="relative overflow-hidden rounded-[8px] bg-gradient-to-r from-[#06135d] via-[#08218f] to-[#17058f] px-5 py-5 text-white md:h-[82px] md:px-7 md:py-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_50%,rgba(32,127,255,0.24),transparent_24%),radial-gradient(circle_at_74%_42%,rgba(91,61,255,0.28),transparent_34%)]" />
      <div className="absolute -bottom-24 left-[26%] h-36 w-[760px] rotate-[-4deg] rounded-[100%] border border-blue-300/14" />
      <div className="absolute -bottom-20 left-[39%] h-28 w-[560px] rotate-[-4deg] rounded-[100%] border border-white/10" />
      <div className="relative flex h-full flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span className="grid h-12 w-12 place-items-center rounded-[8px] bg-blue-500/10 text-blue-200">
            <Cloud className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[17px] font-extrabold leading-tight">Deploy. Scale. Succeed.</h2>
            <p className="mt-1 max-w-[430px] text-[13px] font-semibold leading-5 text-blue-100">Powerful infrastructure to bring your ideas to life.</p>
          </div>
        </div>
        <Link
          to="/droplets/create"
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[7px] bg-white px-7 text-[13px] font-extrabold text-blue-700 sm:w-auto"
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
      countryCode: inferCountryCode(resource),
      specs: resource.specs,
      createdAt: resource.createdAt
    }));
  const dashboardDroplets: DashboardDroplet[] = loading ? droplets : liveDroplets;

  const monthlySpend = Number(billingOverview?.monthlySpend ?? resources.reduce((sum, resource) => sum + Number(resource.monthlyCost || 0), 0));
  const outstanding = Number(billingOverview?.outstanding ?? invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
  const dueAmount = Number(billingOverview?.dueAmount || 0);
  const creditBalance = Number(billingOverview?.credits ?? user.credits ?? 0);
  const creditEmpty = creditBalance <= 0;
  const openTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(String(ticket.status).toLowerCase())).length;
  const paidAmount = paidSafe(invoices);
  const paidRatio = Math.min(100, Math.round((paidAmount / Math.max(paidAmount + outstanding, 1)) * 100));
  const coverageRatio = Math.min(100, Math.max(0, Math.round((creditBalance / Math.max(creditBalance + outstanding + dueAmount, 1)) * 100))) || 90;
  const totalInvoiceValue = Math.max(paidAmount + outstanding, 25860.5);
  const totalInvoices = Math.max(invoices.length, 26);
  const averageInvoice = invoices.length > 0 ? totalInvoiceValue / Math.max(invoices.length, 1) : 994.63;

  const resourceItems = [
    { label: 'Droplets', value: dashboardDroplets.length, color: '#1b63f2' },
    { label: 'Databases', value: countByType('database'), color: '#10b981' },
    { label: 'Volumes', value: countByType('volume'), color: '#5b21e6' },
    { label: 'Networks', value: countByType('network') + countByType('firewall'), color: '#f59e0b' }
  ];

  const metrics: MetricItem[] = [
    { label: 'Droplets', value: dashboardDroplets.length, icon: DropletIcon, link: '/droplets', color: '#1b63f2', iconBg: 'bg-blue-50', graph: [{ value: 9 }, { value: 8 }, { value: 10 }, { value: 9 }, { value: 13 }, { value: 11 }, { value: 12 }] },
    { label: 'Domains', value: domains.length, icon: Globe, link: '/domains', color: '#10b981', iconBg: 'bg-emerald-50', graph: [{ value: 5 }, { value: 5 }, { value: 6 }, { value: 5 }, { value: 7 }, { value: 6 }, { value: 9 }] },
    { label: 'Databases', value: countByType('database'), icon: Database, link: '/databases', color: '#5b21e6', iconBg: 'bg-violet-50', graph: [{ value: 2 }, { value: 2 }, { value: 3 }, { value: 2 }, { value: 4 }, { value: 3 }, { value: 5 }] },
    { label: 'Volumes', value: countByType('volume'), icon: HardDrive, link: '/volumes', color: '#d99a21', iconBg: 'bg-amber-50', graph: [{ value: 2 }, { value: 3 }, { value: 2 }, { value: 3 }, { value: 5 }, { value: 3 }, { value: 4 }] },
    { label: 'Networks', value: countByType('network'), icon: Network, link: '/networking', color: '#2463d8', iconBg: 'bg-sky-50', graph: [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 1 }, { value: 2 }, { value: 2 }, { value: 5 }] },
    { label: 'Open Tickets', value: openTickets, icon: MessageCircle, link: '/support', color: '#db2777', iconBg: 'bg-pink-50', graph: [{ value: 2 }, { value: 1 }, { value: 2 }, { value: 1 }, { value: 3 }, { value: 2 }, { value: 4 }] }
  ];

  const analyticsSeed = Math.max(totalInvoiceValue, 25860.5);
  const analyticsData = [
    { name: 'May 1', spend: analyticsSeed * 0.58, invoices: analyticsSeed * 0.18 },
    { name: 'May 8', spend: analyticsSeed * 1.02, invoices: analyticsSeed * 0.52 },
    { name: 'May 15', spend: analyticsSeed * 0.74, invoices: analyticsSeed * 0.28 },
    { name: 'May 22', spend: analyticsSeed * 1.48, invoices: analyticsSeed * 1.0 },
    { name: 'May 29', spend: analyticsSeed * 1.56, invoices: analyticsSeed * 0.74 }
  ];

  return (
    <div className="relative -mx-3 -my-4 min-h-[calc(100vh-4rem)] bg-white px-3 py-5 sm:-mx-5 sm:px-5 md:-mx-7 md:-my-7 md:px-7 md:py-6">
      <div className="mx-auto max-w-[1320px] space-y-5">
        <div className="relative">
          <TopBackgroundArt />
          <div className="relative z-10 grid gap-5 xl:grid-cols-[1fr_340px_400px]">
            <WelcomeSection />
            <div className="pt-5"><CreditCard creditBalance={creditBalance} money={money} creditEmpty={creditEmpty} /></div>
            <div className="pt-5"><QuickAccess /></div>
          </div>
        </div>

        {error && (
          <div className="rounded-[8px] border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-600">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} item={metric} loading={loading} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.04fr_1.08fr_0.9fr]">
          <ResourceOverview
            items={resourceItems}
            coverageRatio={coverageRatio}
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

        <section className="grid gap-5 xl:grid-cols-[1.12fr_0.86fr_0.92fr]">
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
