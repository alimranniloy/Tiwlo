import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Landmark,
  LockKeyhole,
  Mail,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { fetchPublicTiwloPayLinkWithApi, payTiwloPayLinkWithApi } from '../lib/tiwloApi';

const money = (value: number, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`;

const dateLabel = (value?: string) => {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid' || normalized === 'succeeded') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'unpaid') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
};

const providerClass = (provider = '') => {
  const normalized = provider.toLowerCase();
  if (normalized.includes('stripe')) return 'border-sky-200 bg-sky-50 text-sky-700';
  if (normalized.includes('paypal')) return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  if (normalized.includes('bkash')) return 'border-pink-200 bg-pink-50 text-pink-700';
  return 'border-gray-200 bg-gray-50 text-gray-700';
};

function SummaryLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-medium text-[#6B7280]">{label}</span>
      <span className="text-right font-bold text-[#111827]">{value}</span>
    </div>
  );
}

export default function TiwloPayCheckout() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [checkout, setCheckout] = React.useState<any | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [paying, setPaying] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [result, setResult] = React.useState<any | null>(null);

  const loadCheckout = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPublicTiwloPayLinkWithApi(slug);
      setCheckout(data);
      setCustomerName(data.link?.customerName || '');
      setCustomerEmail(data.link?.customerEmail || '');
      setSelectedProvider(data.gateways?.[0]?.provider || '');
    } catch (err) {
      setCheckout(null);
      setError(err instanceof Error ? err.message : 'Payment link was not found');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  React.useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  React.useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const provider = searchParams.get('provider');
    const message = searchParams.get('message');
    if (paymentStatus === 'success') {
      setNotice(`Payment completed${provider ? ` with ${provider}` : ''}`);
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      setError(message || `Payment ${paymentStatus}`);
    }
  }, [searchParams]);

  const copyInvoice = async () => {
    const invoiceId = (result?.link || checkout?.link)?.invoiceId;
    if (!invoiceId) return;
    await navigator.clipboard?.writeText(invoiceId);
    setNotice('Invoice ID copied');
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setPaying(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const payment = await payTiwloPayLinkWithApi({
        slug,
        provider: selectedProvider,
        customerName,
        customerEmail
      });
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl;
        return;
      }
      setResult(payment);
      setNotice(payment.message || 'Payment completed');
      await loadCheckout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be completed');
    } finally {
      setPaying(false);
    }
  };

  const profile = checkout?.profile;
  const link = result?.link || checkout?.link;
  const gateways = checkout?.gateways || [];
  const merchantName = profile?.companyName || profile?.displayName || 'Tiwlo Merchant';
  const selectedGateway = gateways.find((gateway: any) => gateway.provider === selectedProvider);
  const isPaid = result?.status === 'succeeded' || link?.status === 'paid';
  const isPayable = link?.status === 'unpaid' && gateways.length > 0;
  const merchantReady = profile?.status === 'active' && gateways.length > 0;

  return (
    <div className="min-h-screen bg-[#F3F5F9] px-4 py-6 text-[#111827] md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <a href="/" className="flex w-fit items-center gap-2 rounded border border-[#DDE3EA] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] hover:border-blue-400">
            <ArrowLeft className="h-4 w-4" /> Tiwlo
          </a>
          <div className="grid grid-cols-1 gap-2 text-[12px] font-bold text-[#4B5563] sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded border border-[#DDE3EA] bg-white px-3 py-2"><LockKeyhole className="h-4 w-4 text-emerald-600" /> Secure checkout</div>
            <div className="flex items-center gap-2 rounded border border-[#DDE3EA] bg-white px-3 py-2"><ShieldCheck className={`h-4 w-4 ${merchantReady ? 'text-blue-600' : 'text-amber-600'}`} /> {merchantReady ? 'Merchant verified' : 'Merchant inactive'}</div>
            <div className="flex items-center gap-2 rounded border border-[#DDE3EA] bg-white px-3 py-2"><Receipt className="h-4 w-4 text-amber-600" /> Invoice payment</div>
          </div>
        </header>

        {(error || notice) && (
          <div className={`flex items-center gap-2 rounded border px-4 py-3 text-[13px] font-bold ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
            {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {error || notice}
          </div>
        )}

        <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="overflow-hidden rounded border border-[#DDE3EA] bg-white">
            <div className="border-b border-[#E5E7EB] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase text-[#6B7280]">Tiwlo Pay</p>
                  <h1 className="truncate text-xl font-bold">{merchantName}</h1>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[460px] items-center justify-center text-[13px] font-bold text-gray-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading payment
              </div>
            ) : error && !link ? (
              <div className="flex min-h-[460px] items-center justify-center p-8 text-center">
                <div>
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
                  <p className="text-sm font-bold text-red-700">{error}</p>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="rounded border border-[#EEF2F7] bg-[#F9FAFB] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase text-[#6B7280]">Invoice</p>
                      <p className="mt-1 truncate text-lg font-bold">{link.invoiceId}</p>
                      <p className="mt-1 text-sm text-[#6B7280]">{link.title}</p>
                    </div>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(link.status)}`}>{link.status}</span>
                  </div>
                  <div className="mt-8">
                    <p className="text-[11px] font-bold uppercase text-[#6B7280]">Amount due</p>
                    <p className="mt-1 text-4xl font-bold">{money(link.amount, link.currency)}</p>
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
                    <div className="rounded border border-[#E5E7EB] bg-white p-3">
                      <p className="font-bold uppercase text-[#6B7280]">Customer</p>
                      <p className="mt-1 font-semibold text-[#111827]">{link.customerName || link.customerEmail || 'Open checkout'}</p>
                    </div>
                    <div className="rounded border border-[#E5E7EB] bg-white p-3">
                      <p className="font-bold uppercase text-[#6B7280]">Expires</p>
                      <p className="mt-1 font-semibold text-[#111827]">{dateLabel(link.expiresAt)}</p>
                    </div>
                  </div>
                </div>

                {isPaid ? (
                  <div className="mt-5 rounded border border-emerald-100 bg-emerald-50 p-5 text-emerald-800">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="h-5 w-5" /> Payment completed
                    </div>
                    <p className="mt-2 text-[13px] font-medium">Reference {result?.transaction?.reference || 'recorded'}</p>
                  </div>
                ) : link.status !== 'unpaid' ? (
                  <div className="mt-5 rounded border border-red-100 bg-red-50 p-5 text-[13px] font-bold text-red-700">
                    This payment link is {link.status}.
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <form onSubmit={submitPayment} className="overflow-hidden rounded border border-[#DDE3EA] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] p-5">
              <div>
                <h2 className="text-sm font-bold uppercase">Checkout</h2>
                <p className="mt-1 text-[12px] text-[#6B7280]">{profile?.supportEmail || 'support@tiwlo.app'}</p>
              </div>
              <LockKeyhole className="h-4 w-4 text-emerald-600" />
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-[#6B7280]">Name</span>
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Customer name" />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-[#6B7280]">Email</span>
                  <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="w-full rounded border border-[#DDE3EA] px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Customer email" />
                </label>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase text-[#6B7280]">Payment method</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {gateways.map((gateway: any) => (
                    <button key={gateway.id} type="button" onClick={() => setSelectedProvider(gateway.provider)} className={`rounded border px-4 py-3 text-left ${selectedProvider === gateway.provider ? providerClass(gateway.provider) : 'border-[#DDE3EA] text-[#374151] hover:border-blue-400'}`}>
                      <CreditCard className="mb-3 h-5 w-5" />
                      <p className="text-[13px] font-bold">{gateway.name}</p>
                      <p className="text-[11px] uppercase text-[#6B7280]">{gateway.mode}</p>
                    </button>
                  ))}
                  {!loading && gateways.length === 0 && (
                    <div className="rounded border border-amber-100 bg-amber-50 p-4 text-[13px] font-bold text-amber-700 sm:col-span-3">
                      This merchant is inactive or no payment gateway is enabled for this invoice.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <SummaryLine label="Invoice" value={<button type="button" onClick={copyInvoice} className="inline-flex items-center gap-1 hover:text-blue-600">{link?.invoiceId || '-'} <Copy className="h-3.5 w-3.5" /></button>} />
                <SummaryLine label="Merchant" value={merchantName} />
                <SummaryLine label="Method" value={selectedGateway?.name || 'Select gateway'} />
                <SummaryLine label="Amount" value={link ? money(link.amount, link.currency) : '-'} />
              </div>

              <button disabled={!isPayable || paying || !selectedProvider} className="flex w-full items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                {paying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {paying ? 'Processing' : `Pay ${link ? money(link.amount, link.currency) : ''}`}
              </button>

              <div className="grid grid-cols-1 gap-3 text-[12px] font-bold text-[#4B5563] sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded border border-[#E5E7EB] p-3"><BadgeCheck className={`h-4 w-4 ${merchantReady ? 'text-emerald-600' : 'text-amber-600'}`} /> {merchantReady ? 'Verified merchant' : 'Inactive merchant'}</div>
                <div className="flex items-center gap-2 rounded border border-[#E5E7EB] p-3"><Clock3 className="h-4 w-4 text-amber-600" /> {dateLabel(link?.expiresAt)}</div>
                <div className="flex items-center gap-2 rounded border border-[#E5E7EB] p-3"><Landmark className="h-4 w-4 text-blue-600" /> Gateway logged</div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
