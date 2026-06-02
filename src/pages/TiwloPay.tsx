import React from 'react';
import { Link as RouterLink, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  FileDown,
  FileText,
  Filter,
  KeyRound,
  Landmark,
  Link2,
  ListChecks,
  LockKeyhole,
  Mail,
  Plus,
  Receipt,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  UserCheck,
  Wallet,
  Zap
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  createTiwloPayLinkWithApi,
  fetchTiwloPayOverviewWithApi,
  requestTiwloPayWithdrawalWithApi,
  rotateTiwloPayKeysWithApi,
  upsertTiwloPayProfileWithApi
} from '../lib/tiwloApi';

const money = (value: number, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`;

const dateLabel = (value?: string) => {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const timeLabel = (value?: string) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'approved', 'paid', 'succeeded', 'completed'].includes(normalized)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['submitted', 'pending', 'processing', 'unpaid', 'needs_review'].includes(normalized)) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (['expired', 'inactive', 'rejected', 'suspended', 'cancelled'].includes(normalized)) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-gray-200 bg-gray-50 text-gray-600';
};

const providerClass = (provider = '') => {
  const normalized = provider.toLowerCase();
  if (normalized.includes('stripe')) return 'border-sky-200 bg-sky-50 text-sky-700';
  if (normalized.includes('paypal')) return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  if (normalized.includes('bkash')) return 'border-pink-200 bg-pink-50 text-pink-700';
  return 'border-gray-200 bg-gray-50 text-gray-700';
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const autoInvoiceId = () => `TWP-${Date.now().toString(36).toUpperCase()}`;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold uppercase text-[#6B7280]">{children}</span>;
}

function StatusPill({ status }: { status: string }) {
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(status)}`}>{status}</span>;
}

function SectionTitle({ title, detail, icon: Icon, action }: {
  title: string;
  detail?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase text-[#111827]">{title}</h2>
          {detail && <p className="mt-1 text-[12px] text-[#6B7280]">{detail}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-[#d9e1ec] bg-white p-4 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-[#6B7280]">{label}</p>
          <p className="mt-2 truncate text-xl font-bold text-[#111827]">{value}</p>
          <p className="mt-1 text-[12px] font-medium text-[#6B7280]">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center p-8 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded border border-[#DDE3EA] bg-[#F9FAFB] text-[#6B7280]">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-bold text-[#111827]">{title}</p>
        <p className="mt-1 max-w-md text-[13px] text-[#6B7280]">{detail}</p>
      </div>
    </div>
  );
}

function VerificationNotice({ isLive, status, verificationStatus }: { isLive: boolean; status: string; verificationStatus: string }) {
  if (isLive) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Tiwlo Pay is inactive until ID verification is approved.</p>
            <p className="mt-1 text-[13px] font-medium">Merchant status: {status}. Verification: {verificationStatus}. Payment link, API key, and payout actions are locked.</p>
          </div>
        </div>
        <NavLink to="/tiwlo-pay/verify" className="flex shrink-0 items-center justify-center gap-2 rounded border border-amber-300 bg-white px-3 py-2 text-[12px] font-bold text-amber-900 hover:border-amber-500">
          <UserCheck className="h-4 w-4" /> Verify ID
        </NavLink>
      </div>
    </div>
  );
}

export default function TiwloPay() {
  const navigate = useNavigate();
  const [overview, setOverview] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [lastSecret, setLastSecret] = React.useState('');
  const [linkSearch, setLinkSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [selectedProviders, setSelectedProviders] = React.useState<string[]>([]);
  const [profileForm, setProfileForm] = React.useState({
    displayName: '',
    companyName: '',
    supportEmail: '',
    statementDescriptor: '',
    paymentLinkExpiryDays: '14',
    feePercent: '2.9',
    feeFixed: '0.30'
  });
  const [linkForm, setLinkForm] = React.useState({
    invoiceId: '',
    title: '',
    description: '',
    amount: '',
    currency: 'USD',
    customerName: '',
    customerEmail: '',
    expiresInDays: '14',
    successUrl: '',
    cancelUrl: '',
    collectPhone: false,
    collectAddress: false,
    taxBehavior: 'exclusive',
    reference: '',
    internalNote: '',
    customFieldLabel: '',
    customFieldValue: ''
  });
  const [withdrawalForm, setWithdrawalForm] = React.useState({
    amount: '',
    currency: 'USD',
    method: 'bank',
    accountName: '',
    accountNumber: '',
    bankName: '',
    branchName: '',
    routingNumber: '',
    walletNumber: '',
    note: ''
  });
  const [verificationForm, setVerificationForm] = React.useState({
    legalName: '',
    businessName: '',
    businessType: 'company',
    documentType: 'national_id',
    documentNumber: '',
    country: '',
    address: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    taxId: '',
    note: ''
  });

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTiwloPayOverviewWithApi();
      const verification = data.profile?.settings?.verification || {};
      setOverview(data);
      setProfileForm({
        displayName: data.profile?.displayName || '',
        companyName: data.profile?.companyName || '',
        supportEmail: data.profile?.supportEmail || '',
        statementDescriptor: data.profile?.statementDescriptor || '',
        paymentLinkExpiryDays: String(data.profile?.settings?.paymentLinkExpiryDays ?? 14),
        feePercent: String(data.profile?.settings?.feePercent ?? 2.9),
        feeFixed: String(data.profile?.settings?.feeFixed ?? 0.3)
      });
      setVerificationForm((current) => ({
        ...current,
        legalName: verification.legalName || data.profile?.companyName || '',
        businessName: verification.businessName || data.profile?.companyName || '',
        businessType: verification.businessType || current.businessType,
        documentType: verification.documentType || current.documentType,
        documentNumber: verification.documentNumber || '',
        country: verification.country || '',
        address: verification.address || '',
        website: verification.website || '',
        contactEmail: verification.contactEmail || data.profile?.supportEmail || '',
        contactPhone: verification.contactPhone || '',
        taxId: verification.taxId || '',
        note: verification.note || ''
      }));
      setLinkForm((current) => ({
        ...current,
        expiresInDays: String(data.profile?.settings?.paymentLinkExpiryDays ?? current.expiresInDays)
      }));
      setSelectedProviders((current) => (
        current.length ? current : (data.gateways || []).map((gateway: any) => gateway.provider)
      ));
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : 'Unable to load Tiwlo Pay');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const profile = overview?.profile || {};
  const verification = profile.settings?.verification || {};
  const verificationStatus = verification.status || 'not_submitted';
  const isLive = profile.status === 'active' && verificationStatus === 'approved';
  const summary = overview?.summary || {};
  const links = overview?.paymentLinks || [];
  const transactions = overview?.transactions || [];
  const withdrawals = overview?.withdrawals || [];
  const gateways = overview?.gateways || [];
  const latestLink = links[0];
  const currency = links[0]?.currency || transactions[0]?.currency || 'USD';
  const totalLinks = Number(summary.totalLinks || links.length || 0);
  const paidLinks = Number(summary.paidInvoices || 0);
  const conversionRate = totalLinks ? Math.round((paidLinks / totalLinks) * 100) : 0;
  const averageTicket = transactions.length ? Number(summary.paidVolume || 0) / transactions.length : 0;
  const nextInvoiceId = linkForm.invoiceId || autoInvoiceId();
  const origin = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
  const commandSnippet = `curl -X POST ${origin}/pay/${latestLink?.slug || 'invoice-slug'}`;
  const linkSearchValue = linkSearch.trim().toLowerCase();
  const filteredLinks = links.filter((link: any) => {
    const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
    const haystack = [link.invoiceId, link.title, link.customerName, link.customerEmail, link.slug].join(' ').toLowerCase();
    return matchesStatus && (!linkSearchValue || haystack.includes(linkSearchValue));
  });

  const copyText = async (value: string, label: string) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setNotice(`${label} copied`);
  };

  const exportLinks = () => {
    const rows = [
      ['Invoice', 'Title', 'Customer', 'Email', 'Amount', 'Currency', 'Status', 'Expires', 'Public URL'],
      ...filteredLinks.map((link: any) => [
        link.invoiceId,
        link.title,
        link.customerName,
        link.customerEmail,
        link.amount,
        link.currency,
        link.status,
        link.expiresAt,
        link.publicUrl
      ])
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tiwlo-pay-invoices.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Invoice CSV export ready');
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await upsertTiwloPayProfileWithApi({
        displayName: profileForm.displayName,
        companyName: profileForm.companyName,
        supportEmail: profileForm.supportEmail,
        statementDescriptor: profileForm.statementDescriptor,
        settings: {
          paymentLinkExpiryDays: Number(profileForm.paymentLinkExpiryDays || 14),
          feePercent: Number(profileForm.feePercent || 0),
          feeFixed: Number(profileForm.feeFixed || 0)
        }
      });
      setNotice('Tiwlo Pay settings saved');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save Tiwlo Pay settings');
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    navigate('/id-verification?flow=tiwlo_pay');
  };

  const createLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const link = await createTiwloPayLinkWithApi({
        invoiceId: linkForm.invoiceId || undefined,
        title: linkForm.title,
        description: linkForm.description,
        amount: Number(linkForm.amount || 0),
        currency: linkForm.currency,
        customerName: linkForm.customerName,
        customerEmail: linkForm.customerEmail,
        expiresInDays: Number(linkForm.expiresInDays || 0),
        allowedProviders: selectedProviders,
        metadata: {
          successUrl: linkForm.successUrl,
          cancelUrl: linkForm.cancelUrl,
          collectPhone: linkForm.collectPhone,
          collectAddress: linkForm.collectAddress,
          taxBehavior: linkForm.taxBehavior,
          reference: linkForm.reference,
          internalNote: linkForm.internalNote,
          customField: linkForm.customFieldLabel ? { label: linkForm.customFieldLabel, value: linkForm.customFieldValue } : null
        }
      });
      setNotice(`Payment link ready: ${link.invoiceId}`);
      setLinkForm((current) => ({
        ...current,
        invoiceId: '',
        title: '',
        description: '',
        amount: '',
        customerName: '',
        customerEmail: '',
        successUrl: '',
        cancelUrl: '',
        reference: '',
        internalNote: '',
        customFieldLabel: '',
        customFieldValue: ''
      }));
      await copyText(link.publicUrl, 'Payment link');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create payment link');
    } finally {
      setSaving(false);
    }
  };

  const requestWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await requestTiwloPayWithdrawalWithApi({
        ...withdrawalForm,
        amount: Number(withdrawalForm.amount || 0)
      });
      setNotice('Payout request submitted');
      setWithdrawalForm((current) => ({ ...current, amount: '', note: '' }));
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request payout');
    } finally {
      setSaving(false);
    }
  };

  const rotateKeys = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await rotateTiwloPayKeysWithApi();
      setLastSecret(result.secretKey);
      setNotice('API keys regenerated');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to rotate API keys');
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = (provider: string) => {
    setSelectedProviders((current) => (
      current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider]
    ));
  };

  const navItems = [
    { label: 'Overview', path: '/tiwlo-pay/overview', icon: Activity },
    { label: 'Payment Links', path: '/tiwlo-pay/links', icon: Link2 },
    { label: 'Invoices', path: '/tiwlo-pay/invoices', icon: Receipt },
    { label: 'Payouts', path: '/tiwlo-pay/payouts', icon: Landmark },
    { label: 'Settings/API', path: '/tiwlo-pay/settings', icon: Settings },
    { label: 'Verify ID', path: '/tiwlo-pay/verify', icon: UserCheck }
  ];

  const OverviewPage = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available" value={money(summary.availableForWithdrawal, currency)} detail="Ready for payout" icon={Wallet} tone="border-blue-200 bg-blue-50 text-blue-700" />
        <StatCard label="Paid volume" value={money(summary.paidVolume, currency)} detail={`${transactions.length} successful payments`} icon={Banknote} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
        <StatCard label="Conversion" value={`${conversionRate}%`} detail={`${paidLinks}/${totalLinks || 0} links paid`} icon={BadgeCheck} tone="border-amber-200 bg-amber-50 text-amber-700" />
        <StatCard label="Avg ticket" value={money(averageTicket, currency)} detail={`${money(summary.fees, currency)} platform fees`} icon={Activity} tone="border-rose-200 bg-rose-50 text-rose-700" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded border border-[#DDE3EA] bg-white p-5">
          <SectionTitle title="Payment volume" detail="Paid volume and platform fees over time." icon={Activity} />
          <div className="h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[13px] font-bold text-gray-400">Loading chart</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview?.chartData || []} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF2F7" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }} />
                  <Area type="monotone" dataKey="volume" stroke="#2563EB" fill="#DBEAFE" strokeWidth={2} />
                  <Area type="monotone" dataKey="fees" stroke="#059669" fill="#D1FAE5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded border border-[#DDE3EA] bg-white p-5">
          <SectionTitle title="Readiness" detail="What is enabled for this merchant." icon={ShieldCheck} />
          <div className="space-y-3">
            {[
              { label: 'Merchant account', value: profile.status || 'inactive', icon: Building2 },
              { label: 'ID verification', value: verificationStatus, icon: UserCheck },
              { label: 'Payment methods', value: `${gateways.length} enabled`, icon: CreditCard },
              { label: 'Default expiry', value: `${profileForm.paymentLinkExpiryDays || 14} days`, icon: Clock3 },
              { label: 'API capability', value: isLive ? 'enabled' : 'locked', icon: KeyRound }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded border border-[#E5E7EB] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#DDE3EA] bg-[#F9FAFB] text-[#4B5563]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#111827]">{item.label}</p>
                      <p className="truncate text-[12px] text-[#6B7280]">{item.value}</p>
                    </div>
                  </div>
                  <StatusPill status={String(item.value).split(' ')[0]} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded border border-[#DDE3EA] bg-white">
          <div className="border-b border-[#E5E7EB] p-5">
            <SectionTitle title="Recent payments" detail="Latest successful or attempted customer payments." icon={ListChecks} />
          </div>
          <div className="divide-y divide-[#EEF2F7]">
            {transactions.length === 0 && <EmptyState icon={CreditCard} title="No payments yet" detail="Payments will appear here after customers pay an active link." />}
            {transactions.slice(0, 7).map((transaction: any) => (
              <div key={transaction.id} className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[#111827]">{transaction.reference}</p>
                  <p className="truncate text-[12px] text-[#6B7280]">{transaction.customerName || transaction.customerEmail || transaction.provider}</p>
                </div>
                <StatusPill status={transaction.status} />
                <p className="text-[13px] font-bold text-[#111827]">{money(transaction.amount, transaction.currency)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded border border-[#DDE3EA] bg-white">
          <div className="border-b border-[#E5E7EB] p-5">
            <SectionTitle title="Gateway routing" detail="Main server payment methods available to Tiwlo Pay checkout." icon={CreditCard} />
          </div>
          <div className="divide-y divide-[#EEF2F7]">
            {gateways.length === 0 && <EmptyState icon={CreditCard} title="No gateway enabled" detail="Enable Stripe, PayPal, bKash, or another provider from admin payment settings." />}
            {gateways.map((gateway: any) => (
              <div key={gateway.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border ${providerClass(gateway.provider)}`}>
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-[#111827]">{gateway.name}</p>
                    <p className="truncate text-[12px] text-[#6B7280]">{gateway.provider} / {gateway.mode}</p>
                  </div>
                </div>
                <StatusPill status={gateway.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const LinksPage = () => (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={createLink} className="rounded border border-[#DDE3EA] bg-white p-5">
        <SectionTitle
          title="Create payment link"
          detail="Invoice ID is generated automatically unless you enter your own."
          icon={Plus}
          action={<StatusPill status={isLive ? 'active' : 'inactive'} />}
        />
        {!isLive && <div className="mb-4"><VerificationNotice isLive={isLive} status={profile.status || 'inactive'} verificationStatus={verificationStatus} /></div>}
        <fieldset disabled={!isLive || saving} className="space-y-5 disabled:opacity-60">
          <div className="rounded border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-blue-700">Invoice ID</p>
                <p className="mt-1 text-lg font-bold text-[#111827]">{nextInvoiceId}</p>
              </div>
              <button type="button" onClick={() => setLinkForm((current) => ({ ...current, invoiceId: autoInvoiceId() }))} className="flex items-center justify-center gap-2 rounded border border-blue-200 bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:border-blue-400">
                <RefreshCw className="h-4 w-4" /> Generate
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <FieldLabel>Custom invoice ID</FieldLabel>
              <input value={linkForm.invoiceId} onChange={(event) => setLinkForm((current) => ({ ...current, invoiceId: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Optional" />
            </label>
            <label className="space-y-2">
              <FieldLabel>Amount</FieldLabel>
              <input required type="number" min="1" step="0.01" value={linkForm.amount} onChange={(event) => setLinkForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="99.00" />
            </label>
            <label className="space-y-2">
              <FieldLabel>Title</FieldLabel>
              <input required value={linkForm.title} onChange={(event) => setLinkForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Website design invoice" />
            </label>
            <label className="space-y-2">
              <FieldLabel>Currency</FieldLabel>
              <input value={linkForm.currency} onChange={(event) => setLinkForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm uppercase outline-none focus:border-blue-500" placeholder="USD" />
            </label>
            <label className="space-y-2">
              <FieldLabel>Customer name</FieldLabel>
              <input value={linkForm.customerName} onChange={(event) => setLinkForm((current) => ({ ...current, customerName: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Customer name" />
            </label>
            <label className="space-y-2">
              <FieldLabel>Customer email</FieldLabel>
              <input type="email" value={linkForm.customerEmail} onChange={(event) => setLinkForm((current) => ({ ...current, customerEmail: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="customer@example.com" />
            </label>
            <label className="space-y-2">
              <FieldLabel>Expire after days</FieldLabel>
              <input type="number" min="0" max="365" value={linkForm.expiresInDays} onChange={(event) => setLinkForm((current) => ({ ...current, expiresInDays: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="14" />
            </label>
            <label className="space-y-2">
              <FieldLabel>Reference</FieldLabel>
              <input value={linkForm.reference} onChange={(event) => setLinkForm((current) => ({ ...current, reference: event.target.value }))} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Order or cart ID" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <textarea value={linkForm.description} onChange={(event) => setLinkForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Invoice note shown on checkout" />
            </label>
          </div>

          <div className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#0069ff]" />
              <p className="text-sm font-bold text-[#111827]">Advanced options</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={linkForm.successUrl} onChange={(event) => setLinkForm((current) => ({ ...current, successUrl: event.target.value }))} className="rounded border border-[#DDE3EA] bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Success URL" />
              <input value={linkForm.cancelUrl} onChange={(event) => setLinkForm((current) => ({ ...current, cancelUrl: event.target.value }))} className="rounded border border-[#DDE3EA] bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Cancel URL" />
              <select value={linkForm.taxBehavior} onChange={(event) => setLinkForm((current) => ({ ...current, taxBehavior: event.target.value }))} className="rounded border border-[#DDE3EA] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500">
                <option value="exclusive">Tax exclusive</option>
                <option value="inclusive">Tax inclusive</option>
                <option value="none">No tax</option>
              </select>
              <input value={linkForm.customFieldLabel} onChange={(event) => setLinkForm((current) => ({ ...current, customFieldLabel: event.target.value }))} className="rounded border border-[#DDE3EA] bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Custom field label" />
              <input value={linkForm.customFieldValue} onChange={(event) => setLinkForm((current) => ({ ...current, customFieldValue: event.target.value }))} className="rounded border border-[#DDE3EA] bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Custom field value" />
              <input value={linkForm.internalNote} onChange={(event) => setLinkForm((current) => ({ ...current, internalNote: event.target.value }))} className="rounded border border-[#DDE3EA] bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Internal note" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded border border-[#DDE3EA] bg-white p-3 text-[13px] font-bold text-[#374151]">
                <input type="checkbox" checked={linkForm.collectPhone} onChange={(event) => setLinkForm((current) => ({ ...current, collectPhone: event.target.checked }))} />
                Collect phone
              </label>
              <label className="flex items-center gap-2 rounded border border-[#DDE3EA] bg-white p-3 text-[13px] font-bold text-[#374151]">
                <input type="checkbox" checked={linkForm.collectAddress} onChange={(event) => setLinkForm((current) => ({ ...current, collectAddress: event.target.checked }))} />
                Collect billing address
              </label>
            </div>
          </div>

          <button disabled={!isLive || saving || gateways.length === 0 || selectedProviders.length === 0} className="flex w-full items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
            <Send className="h-4 w-4" /> {saving ? 'Creating link' : 'Generate payment link'}
          </button>
        </fieldset>
      </form>

      <div className="space-y-5">
        <section className="rounded border border-[#DDE3EA] bg-white p-5">
          <SectionTitle title="Available methods" detail="Customer checkout will show the enabled main-server gateways selected here." icon={CreditCard} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {gateways.map((gateway: any) => {
              const selected = selectedProviders.includes(gateway.provider);
              return (
                <button key={gateway.id} type="button" onClick={() => toggleProvider(gateway.provider)} className={`rounded border p-4 text-left ${selected ? providerClass(gateway.provider) : 'border-[#DDE3EA] bg-white text-[#374151] hover:border-blue-400'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <CreditCard className="h-5 w-5" />
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${selected ? 'border-current' : 'border-[#DDE3EA]'}`}>{selected ? 'on' : 'off'}</span>
                  </div>
                  <p className="mt-3 text-sm font-bold">{gateway.name}</p>
                  <p className="text-[11px] uppercase text-[#6B7280]">{gateway.provider} / {gateway.mode}</p>
                </button>
              );
            })}
            {gateways.length === 0 && <EmptyState icon={CreditCard} title="No payment method ready" detail="Admin must enable payment gateways before merchants can create live links." />}
          </div>
        </section>

        <section className="rounded border border-[#111827] bg-[#111827] p-5 text-white">
          <SectionTitle title="Command link" detail="Copy a checkout command or open the latest hosted link." icon={Terminal} action={<button type="button" onClick={() => copyText(commandSnippet, 'Command')} className="rounded border border-white/20 p-2 text-white hover:bg-white/10"><Copy className="h-4 w-4" /></button>} />
          <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-green-200">{commandSnippet}</code>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => latestLink?.publicUrl && copyText(latestLink.publicUrl, 'Latest payment link')} disabled={!latestLink?.publicUrl} className="flex items-center justify-center gap-2 rounded border border-white/20 px-3 py-2 text-[12px] font-bold text-white hover:bg-white/10 disabled:opacity-50">
              <Copy className="h-4 w-4" /> Copy latest
            </button>
            <button type="button" onClick={() => latestLink?.publicUrl && window.open(latestLink.publicUrl, '_blank')} disabled={!latestLink?.publicUrl} className="flex items-center justify-center gap-2 rounded border border-white/20 px-3 py-2 text-[12px] font-bold text-white hover:bg-white/10 disabled:opacity-50">
              <ExternalLink className="h-4 w-4" /> Open latest
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  const InvoicesPage = () => (
    <section className="overflow-hidden rounded border border-[#DDE3EA] bg-white">
      <div className="border-b border-[#E5E7EB] p-5">
        <SectionTitle
          title="Invoices"
          detail="Payment links are stored as invoice records with a public hosted checkout URL."
          icon={Receipt}
          action={<button type="button" onClick={exportLinks} className="flex items-center justify-center gap-2 rounded border border-[#DDE3EA] px-3 py-2 text-[12px] font-bold text-[#374151] hover:border-blue-400"><FileDown className="h-4 w-4" /> Export CSV</button>}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} className="w-full rounded border border-[#DDE3EA] py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" placeholder="Search invoice, customer, slug" />
          </label>
          <label className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full appearance-none rounded border border-[#DDE3EA] py-2 pl-9 pr-3 text-sm font-bold outline-none focus:border-blue-500">
              {['all', 'unpaid', 'paid', 'expired'].map((status) => <option key={status} value={status}>{status.toUpperCase()}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              {['Invoice', 'Customer', 'Amount', 'Status', 'Expires', 'Created', 'Actions'].map((heading) => (
                <th key={heading} className="px-5 py-3 text-[11px] font-bold uppercase text-[#6B7280]">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F7]">
            {filteredLinks.length === 0 && <tr><td colSpan={7}><EmptyState icon={Receipt} title="No invoice found" detail="Create a payment link and it will appear here as an invoice record." /></td></tr>}
            {filteredLinks.map((link: any) => (
              <tr key={link.id} className="hover:bg-[#F9FAFB]">
                <td className="px-5 py-4">
                  <p className="text-[13px] font-bold text-[#111827]">{link.invoiceId}</p>
                  <p className="text-[12px] text-[#6B7280]">{link.title}</p>
                </td>
                <td className="px-5 py-4 text-[13px] text-[#4B5563]">{link.customerName || link.customerEmail || 'Open customer'}</td>
                <td className="px-5 py-4 text-[13px] font-bold text-[#111827]">{money(link.amount, link.currency)}</td>
                <td className="px-5 py-4"><StatusPill status={link.status} /></td>
                <td className="px-5 py-4 text-[12px] text-[#6B7280]">{dateLabel(link.expiresAt)}</td>
                <td className="px-5 py-4 text-[12px] text-[#6B7280]">{dateLabel(link.createdAt)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => copyText(link.publicUrl, 'Payment link')} className="rounded border border-[#DDE3EA] p-2 text-[#4B5563] hover:border-blue-400" title="Copy link"><Copy className="h-4 w-4" /></button>
                    <button type="button" onClick={() => window.open(link.publicUrl, '_blank')} className="rounded border border-[#DDE3EA] p-2 text-[#4B5563] hover:border-blue-400" title="Open link"><ExternalLink className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const PayoutsPage = () => (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <form onSubmit={requestWithdrawal} className="rounded border border-[#DDE3EA] bg-white p-5">
        <SectionTitle title="Request payout" detail={`${money(summary.availableForWithdrawal, currency)} available`} icon={Landmark} action={<StatusPill status={isLive ? 'active' : 'inactive'} />} />
        {!isLive && <div className="mb-4"><VerificationNotice isLive={isLive} status={profile.status || 'inactive'} verificationStatus={verificationStatus} /></div>}
        <fieldset disabled={!isLive || saving} className="grid grid-cols-1 gap-3 sm:grid-cols-2 disabled:opacity-60">
          <input required type="number" min="1" step="0.01" value={withdrawalForm.amount} onChange={(event) => setWithdrawalForm((current) => ({ ...current, amount: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Amount" />
          <select value={withdrawalForm.method} onChange={(event) => setWithdrawalForm((current) => ({ ...current, method: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm font-bold outline-none focus:border-blue-500">
            {['bank', 'bkash', 'nagad', 'manual'].map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}
          </select>
          <input value={withdrawalForm.accountName} onChange={(event) => setWithdrawalForm((current) => ({ ...current, accountName: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Account name" />
          <input value={withdrawalForm.accountNumber} onChange={(event) => setWithdrawalForm((current) => ({ ...current, accountNumber: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Account number" />
          <input value={withdrawalForm.bankName} onChange={(event) => setWithdrawalForm((current) => ({ ...current, bankName: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Bank name" />
          <input value={withdrawalForm.walletNumber} onChange={(event) => setWithdrawalForm((current) => ({ ...current, walletNumber: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Wallet number" />
          <input value={withdrawalForm.branchName} onChange={(event) => setWithdrawalForm((current) => ({ ...current, branchName: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Branch" />
          <input value={withdrawalForm.routingNumber} onChange={(event) => setWithdrawalForm((current) => ({ ...current, routingNumber: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Routing number" />
          <textarea value={withdrawalForm.note} onChange={(event) => setWithdrawalForm((current) => ({ ...current, note: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500 sm:col-span-2" placeholder="Payout note" />
          <button disabled={!isLive || saving || Number(summary.availableForWithdrawal || 0) <= 0} className="flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60 sm:col-span-2">
            <Wallet className="h-4 w-4" /> Submit payout request
          </button>
        </fieldset>
      </form>

      <section className="overflow-hidden rounded border border-[#DDE3EA] bg-white">
        <div className="border-b border-[#E5E7EB] p-5">
          <SectionTitle title="Payout ledger" detail="Admin-reviewed withdrawal requests." icon={Wallet} />
        </div>
        <div className="divide-y divide-[#EEF2F7]">
          {withdrawals.length === 0 && <EmptyState icon={Landmark} title="No payout requests" detail="Payout requests will appear here after the account is verified and has available balance." />}
          {withdrawals.map((withdrawal: any) => (
            <div key={withdrawal.id} className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="text-[13px] font-bold uppercase text-[#111827]">{withdrawal.method}</p>
                <p className="text-[12px] text-[#6B7280]">{withdrawal.destination?.accountName || withdrawal.destination?.walletNumber || timeLabel(withdrawal.requestedAt)}</p>
              </div>
              <StatusPill status={withdrawal.status} />
              <p className="text-[13px] font-bold text-[#111827]">{money(withdrawal.amount, withdrawal.currency)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const SettingsPage = () => (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={saveProfile} className="rounded border border-[#DDE3EA] bg-white p-5">
        <SectionTitle title="Merchant profile" detail="These details appear on hosted checkout and receipts." icon={Settings} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input value={profileForm.displayName} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Display name" />
          <input value={profileForm.companyName} onChange={(event) => setProfileForm((current) => ({ ...current, companyName: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Company name" />
          <input type="email" value={profileForm.supportEmail} onChange={(event) => setProfileForm((current) => ({ ...current, supportEmail: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Support email" />
          <input value={profileForm.statementDescriptor} onChange={(event) => setProfileForm((current) => ({ ...current, statementDescriptor: event.target.value.toUpperCase() }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm uppercase outline-none focus:border-blue-500" placeholder="Statement descriptor" />
          <input type="number" value={profileForm.paymentLinkExpiryDays} onChange={(event) => setProfileForm((current) => ({ ...current, paymentLinkExpiryDays: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Default expiry days" />
          <input type="number" step="0.01" value={profileForm.feePercent} onChange={(event) => setProfileForm((current) => ({ ...current, feePercent: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Fee percent" />
          <input type="number" step="0.01" value={profileForm.feeFixed} onChange={(event) => setProfileForm((current) => ({ ...current, feeFixed: event.target.value }))} className="rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-2" placeholder="Fixed fee" />
        </div>
        <button disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-[#111827] px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60">
          <ShieldCheck className="h-4 w-4" /> Save settings
        </button>
      </form>

      <section className="rounded border border-[#DDE3EA] bg-white p-5">
        <SectionTitle
          title="API keys"
          detail={isLive ? 'Live API access is available for verified merchants.' : 'API access is locked until admin approves ID verification.'}
          icon={KeyRound}
          action={<button type="button" onClick={rotateKeys} disabled={!isLive || saving} className="flex items-center gap-2 rounded border border-[#DDE3EA] px-3 py-2 text-[12px] font-bold text-[#374151] hover:border-blue-400 disabled:opacity-50"><RotateCw className="h-4 w-4" /> Rotate</button>}
        />
        {!isLive && <div className="mb-4"><VerificationNotice isLive={isLive} status={profile.status || 'inactive'} verificationStatus={verificationStatus} /></div>}
        <div className="space-y-3">
          <div className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[10px] font-bold uppercase text-[#6B7280]">Publishable key</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#111827]">{profile.apiKey || 'Loading'}</code>
              <button type="button" onClick={() => copyText(profile.apiKey, 'API key')} disabled={!isLive} className="rounded border border-[#DDE3EA] bg-white p-2 disabled:opacity-50"><Copy className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[10px] font-bold uppercase text-[#6B7280]">Secret key</p>
            <p className="mt-2 text-[13px] font-bold text-[#111827]">{profile.secretPreview || 'Loading'}</p>
            {lastSecret && (
              <div className="mt-3 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 p-3">
                <code className="min-w-0 flex-1 truncate text-[12px] font-bold text-amber-900">{lastSecret}</code>
                <button type="button" onClick={() => copyText(lastSecret, 'Secret key')} className="rounded border border-amber-200 bg-white p-2 text-amber-900"><Copy className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          <div className="rounded border border-[#111827] bg-[#111827] p-3 text-white">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-blue-200">Checkout command</p>
              <button type="button" onClick={() => copyText(commandSnippet, 'Command')} className="rounded border border-white/20 p-1.5 text-white hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button>
            </div>
            <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-green-200">{commandSnippet}</code>
          </div>
        </div>
      </section>
    </div>
  );

  const VerifyPage = () => (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded border border-[#DDE3EA] bg-white p-5">
        <SectionTitle title="Verification status" detail="Admin approval activates payment links, API access, and payouts." icon={UserCheck} action={<StatusPill status={verificationStatus} />} />
        <div className="space-y-3">
          {[
            { label: 'Merchant status', value: profile.status || 'inactive', icon: Building2 },
            { label: 'Verification', value: verificationStatus, icon: ShieldCheck },
            { label: 'Submitted', value: verification.submittedAt ? timeLabel(verification.submittedAt) : 'Not submitted', icon: Clock3 },
            { label: 'Reviewed', value: verification.reviewedAt ? timeLabel(verification.reviewedAt) : 'Waiting for admin', icon: UserCheck },
            { label: 'Payment links', value: isLive ? 'enabled' : 'locked', icon: Link2 },
            { label: 'Payouts', value: isLive ? 'enabled' : 'locked', icon: Landmark }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded border border-[#E5E7EB] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-[#0069ff]" />
                  <span className="text-[12px] font-bold text-[#4B5563]">{item.label}</span>
                </div>
                <span className="truncate text-right text-[12px] font-bold text-[#111827]">{item.value}</span>
              </div>
            );
          })}
        </div>
      </section>

      <form onSubmit={submitVerification} className="rounded border border-[#DDE3EA] bg-white p-5">
        <SectionTitle title="Submit ID verification" detail="ID card, license, bank statement, and live selfie are captured on the secure verification page." icon={FileText} />
        <div className="rounded border border-blue-100 bg-blue-50 p-5">
          <UserCheck className="h-8 w-8 text-[#0069ff]" />
          <h3 className="mt-4 text-lg font-black text-[#111827]">Open mobile verification</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-[#4B5563]">Tiwlo Pay stays inactive until an administrator approves the submitted documents.</p>
        </div>
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc]">
          <UserCheck className="h-4 w-4" /> Start ID verification
        </button>
      </form>
    </div>
  );

  if (loading && !overview) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-[1220px] items-center justify-center rounded-md border border-[#d9e1ec] bg-white text-[13px] font-bold text-gray-500 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading Tiwlo Pay
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1220px] space-y-5 pb-12">
      <section className="rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        <div className="flex flex-col gap-5 border-b border-[#E5E7EB] p-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-[#111827]">Tiwlo Pay</h1>
                <StatusPill status={isLive ? 'active' : profile.status || 'inactive'} />
                <StatusPill status={verificationStatus} />
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
                {profile.companyName || profile.displayName || 'Merchant account'} can create hosted payment links, invoice customers, route checkout through enabled gateways, and request payouts after admin-approved ID verification.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadOverview} className="flex items-center gap-2 rounded border border-[#DDE3EA] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] hover:border-blue-400">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <RouterLink to="/billing" className="flex items-center gap-2 rounded border border-[#DDE3EA] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] hover:border-blue-400">
              <Receipt className="h-4 w-4" /> Billing
            </RouterLink>
            <NavLink to="/tiwlo-pay/links" className="flex items-center gap-2 rounded bg-[#0069ff] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#0056cc]">
              <Plus className="h-4 w-4" /> New link
            </NavLink>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: active }) => `flex shrink-0 items-center gap-2 rounded border px-3 py-2 text-[12px] font-bold ${active ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#DDE3EA] bg-white text-[#4B5563] hover:border-blue-400'}`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </NavLink>
            );
          })}
        </div>
      </section>

      <VerificationNotice isLive={isLive} status={profile.status || 'inactive'} verificationStatus={verificationStatus} />

      {(error || notice) && (
        <div className={`flex items-center gap-2 rounded border px-4 py-3 text-[13px] font-bold ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {error || notice}
        </div>
      )}

      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="verify" element={<VerifyPage />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </div>
  );
}
