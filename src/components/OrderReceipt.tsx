import React from 'react';
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  Cloud,
  Copy,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  Server,
  ShieldCheck,
  User
} from 'lucide-react';

export type OrderReceiptRow = {
  label: string;
  value: React.ReactNode;
  badge?: boolean;
};

type OrderReceiptProps = {
  title?: string;
  subtitle?: string;
  description?: string;
  orderId?: string;
  summaryTitle?: string;
  summarySubtitle?: string;
  rows: OrderReceiptRow[];
  nextTitle?: string;
  nextDescription?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryHref?: string;
  supportHref?: string;
  showActions?: boolean;
  compact?: boolean;
};

const rowIcons = [CalendarDays, Server, ClipboardCheck, User, MessageSquare];

function statusClass(value: React.ReactNode) {
  const text = String(value || '').toLowerCase();
  if (['paid', 'completed', 'complete', 'ready', 'active', 'succeeded'].some((item) => text.includes(item))) {
    return 'bg-emerald-50 text-emerald-600';
  }
  if (['failed', 'cancelled', 'rejected', 'overdue'].some((item) => text.includes(item))) {
    return 'bg-rose-50 text-rose-600';
  }
  return 'bg-emerald-50 text-emerald-600';
}

function AccentDots() {
  const dots = [
    'left-[42%] top-0 h-2 w-2 bg-sky-300 animate-bounce',
    'left-[34%] top-12 h-1.5 w-1.5 bg-rose-400 animate-pulse',
    'left-[58%] top-10 h-1.5 w-1.5 bg-cyan-300 animate-bounce',
    'left-[62%] top-2 h-1 w-1 bg-amber-400 animate-pulse',
    'left-[38%] top-24 h-1.5 w-1.5 bg-emerald-300 animate-pulse',
    'left-[55%] top-24 h-1 w-1 bg-indigo-300 animate-bounce',
    'left-[47%] top-28 h-1 w-1 bg-sky-300 animate-pulse',
    'left-[66%] top-18 h-1.5 w-1.5 bg-rose-300 animate-pulse'
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto h-36 max-w-[420px]">
      {dots.map((classes, index) => (
        <span key={index} className={`absolute rounded-full ${classes}`} />
      ))}
      <span className="absolute left-[30%] top-2 text-[13px] font-black text-amber-300 animate-pulse">+</span>
      <span className="absolute right-[29%] top-14 text-[13px] font-black text-rose-300 animate-pulse">+</span>
      <span className="absolute left-[61%] top-28 text-[12px] font-black text-emerald-300 animate-bounce">+</span>
    </div>
  );
}

export function OrderReceipt({
  title = 'Thanks for Your Order!',
  subtitle = 'Your order has been placed successfully.',
  description = "We're setting things up and will notify you once it's ready.",
  orderId,
  summaryTitle = 'Order Summary',
  summarySubtitle = 'Here are the details of your order.',
  rows,
  nextTitle = "What's Next?",
  nextDescription = 'Our team is now reviewing your order and preparing everything for you.',
  primaryLabel = 'Go to Dashboard',
  onPrimary,
  primaryHref,
  supportHref = '/support',
  showActions = true,
  compact = false
}: OrderReceiptProps) {
  const [copied, setCopied] = React.useState(false);
  const cleanOrderId = String(orderId || 'Processing').trim() || 'Processing';

  const copyOrderId = async () => {
    await navigator.clipboard?.writeText(cleanOrderId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const primaryContent = (
    <>
      <LayoutDashboard className="h-4 w-4" />
      {primaryLabel}
    </>
  );

  return (
    <div className={`relative mx-auto w-full max-w-[900px] overflow-hidden bg-[#fbfaff] px-4 text-[#071437] sm:px-6 ${compact ? 'py-6' : 'py-8 sm:py-10'}`}>
      <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-72 rounded-full bg-[#f0edff]" />
      <div className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-[#f5f2ff]" />
      <AccentDots />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative grid h-[82px] w-[82px] place-items-center rounded-full bg-[#f1edff]">
          <span className="absolute inset-2 rounded-full border border-[#dcd3ff] animate-ping opacity-30" />
          <span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-br from-[#6d5dfc] to-[#3e22e8] text-white">
            <Check className="h-8 w-8 stroke-[3]" />
          </span>
        </div>

        <h1 className="mt-6 font-display text-[28px] font-extrabold leading-tight tracking-normal text-[#071437] sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-3 max-w-[560px] text-[14px] font-semibold leading-6 text-[#536079]">{subtitle}</p>
        <p className="max-w-[620px] text-[14px] font-semibold leading-6 text-[#536079]">{description}</p>

        <button
          type="button"
          onClick={copyOrderId}
          className="mt-7 inline-flex min-w-0 items-center gap-4 rounded-[22px] border border-[#dcd7f2] bg-white/80 px-6 py-3 text-left backdrop-blur-sm"
        >
          <span className="min-w-0">
            <span className="block text-center text-[11px] font-extrabold text-[#5f667a]">Order ID</span>
            <span className="block truncate font-display text-[18px] font-extrabold text-[#4f32f5] sm:text-[20px]">{cleanOrderId}</span>
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[#f2f0ff] text-[#6046f4]">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </span>
        </button>
      </div>

      <section className="relative z-10 mt-8 rounded-[8px] border border-[#ebeef6] bg-white p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[#f1edff] text-[#5b35f5]">
            <Server className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-[17px] font-extrabold text-[#071437]">{summaryTitle}</h2>
            <p className="mt-1 text-[12px] font-medium text-[#65738a]">{summarySubtitle}</p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-[#edf1f7]">
          {rows.map((row, index) => {
            const Icon = rowIcons[index] || MessageSquare;
            return (
              <div key={`${row.label}-${index}`} className="grid grid-cols-[36px_1fr] gap-3 py-4 sm:grid-cols-[36px_1fr_minmax(160px,auto)] sm:items-center">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#f8f9fc] text-[#5f667a]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-extrabold text-[#48536a]">{row.label}</span>
                <span className="min-w-0 text-left text-[13px] font-extrabold text-[#071437] sm:text-right">
                  {row.badge ? (
                    <span className={`inline-flex rounded-[8px] px-3 py-1 text-[12px] ${statusClass(row.value)}`}>{row.value}</span>
                  ) : row.value}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mt-6 overflow-hidden rounded-[8px] border border-[#ded8fb] bg-[#f4f0ff] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 text-left">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#785cf5] text-[#5b35f5]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-extrabold text-[#071437]">{nextTitle}</h2>
              <p className="mt-2 max-w-[540px] text-[13px] font-medium leading-6 text-[#536079]">{nextDescription}</p>
            </div>
          </div>
          <div className="relative mx-auto h-[88px] w-[150px] shrink-0 sm:mx-0">
            <Cloud className="absolute bottom-0 left-0 h-16 w-16 text-white" />
            <Cloud className="absolute bottom-0 right-0 h-16 w-16 text-white" />
            <div className="absolute right-8 top-0 h-[76px] w-[70px] rounded-[16px] bg-gradient-to-br from-[#6956f3] to-[#24168f] p-3">
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <span key={item} className="block h-2 rounded-full bg-white/30" />
                ))}
              </div>
            </div>
            <span className="absolute right-0 top-9 grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="h-5 w-5 stroke-[3]" />
            </span>
          </div>
        </div>
      </section>

      {showActions && (
        <div className="relative z-10 mt-8 text-center">
          <p className="mx-auto max-w-[620px] text-[13px] font-medium leading-6 text-[#536079]">
            You can go to your dashboard to view your order or contact our support team if you have any questions.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:px-24">
            {primaryHref ? (
              <a href={primaryHref} className="inline-flex h-12 items-center justify-center gap-3 rounded-[8px] bg-gradient-to-r from-[#613cf5] to-[#3d22de] px-5 text-[14px] font-extrabold text-white">
                {primaryContent}
              </a>
            ) : (
              <button type="button" onClick={onPrimary} className="inline-flex h-12 items-center justify-center gap-3 rounded-[8px] bg-gradient-to-r from-[#613cf5] to-[#3d22de] px-5 text-[14px] font-extrabold text-white">
                {primaryContent}
              </button>
            )}
            <a href={supportHref} className="inline-flex h-12 items-center justify-center gap-3 rounded-[8px] border border-[#5b35f5] bg-white px-5 text-[14px] font-extrabold text-[#071437]">
              <Headphones className="h-4 w-4" />
              Contact Support
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
