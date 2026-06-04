import React from 'react';
import { OrderReceipt } from './OrderReceipt';
import { useCurrency } from '../lib/useCurrency';

const accountMessages = [
  'Preparing your workspace',
  'Checking account profile',
  'Syncing dashboard modules',
  'Opening your console'
];

const orderMessages = [
  'Setting up your order',
  'Checking billing and credit balance',
  'Reserving server capacity',
  'Creating the account package',
  'Queuing panel automation',
  'Preparing invoice details'
];

export type OrderSummary = {
  title: string;
  invoiceNumber?: string;
  orderNumber?: string;
  packageName?: string;
  serverIp?: string;
  hourlyRate?: number;
  monthlyCost?: number;
  status?: string;
  supportPath?: string;
  orderedBy?: string;
  createdAt?: string;
  note?: string;
};

function RotatingText({ messages, interval = 1200 }: { messages: string[]; interval?: number }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % messages.length), interval);
    return () => window.clearInterval(timer);
  }, [interval, messages.length]);

  return <p className="min-h-5 text-center text-[13px] font-semibold text-[#4b5563]">{messages[index]}</p>;
}

export function CrystalSetupLoader({ messages = accountMessages }: { messages?: string[] }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-6 text-[#111827]">
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <div className="relative h-[200px] w-[200px] [perspective:800px]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className={[
                'absolute left-1/2 top-1/2 h-[60px] w-[60px] rounded-[10px] opacity-0',
                '[transform-origin:bottom_center]',
                '[animation:tiwlo-crystal-emerge_2s_ease-in-out_infinite_alternate,tiwlo-crystal-fade_300ms_ease-out_forwards]',
                index === 0 ? 'bg-[linear-gradient(45deg,#003366,#336699)] [animation-delay:0s]' : '',
                index === 1 ? 'bg-[linear-gradient(45deg,#003399,#3366cc)] [animation-delay:0.3s]' : '',
                index === 2 ? 'bg-[linear-gradient(45deg,#0066cc,#3399ff)] [animation-delay:0.6s]' : '',
                index === 3 ? 'bg-[linear-gradient(45deg,#0099ff,#66ccff)] [animation-delay:0.9s]' : '',
                index === 4 ? 'bg-[linear-gradient(45deg,#33ccff,#99ccff)] [animation-delay:1.2s]' : '',
                index === 5 ? 'bg-[linear-gradient(45deg,#66ffff,#ccffff)] [animation-delay:1.5s]' : ''
              ].join(' ')}
            />
          ))}
        </div>
        <div className="space-y-2">
          <h1 className="text-center text-xl font-bold tracking-tight">Setting up Tiwlo</h1>
          <RotatingText messages={messages} interval={750} />
        </div>
      </div>
    </div>
  );
}

export function TowerOrderLoader({ messages = orderMessages }: { messages?: string[] }) {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-white px-6 text-[#111827]">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="relative h-[150px] w-[120px]">
          <div className="absolute left-1/2 top-1/2 h-[50px] w-[40px] -translate-x-1/2 -translate-y-1/2 scale-[3]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={[
                  'absolute left-[10px] opacity-0',
                  index % 2 === 0 ? '[animation:tiwlo-tower-left_4s_infinite]' : '[animation:tiwlo-tower-right_4s_infinite]',
                  index === 1 ? '[animation-delay:1s]' : '',
                  index === 2 ? '[animation-delay:2s]' : '',
                  index === 3 ? '[animation-delay:3s]' : ''
                ].join(' ')}
              >
                <div className="absolute left-[10px] top-[14px] h-[5px] w-[19px] skew-y-[-25deg] bg-[#286cb5]" />
                <div className="absolute left-[-9px] top-[14px] h-[5px] w-[19px] skew-y-[25deg] bg-[#2f85e0]" />
                <div className="h-[20px] w-[20px] rotate-45 skew-x-[-20deg] skew-y-[-20deg] bg-[#5fa8f5]" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-center text-xl font-bold tracking-tight">Working on your order</h1>
          <RotatingText messages={messages} />
        </div>
      </div>
    </div>
  );
}

export function OrderCompleteSummary({ summary, onPrimary }: { summary: OrderSummary; onPrimary: () => void }) {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'console' });
  const orderDate = summary.createdAt
    ? new Date(summary.createdAt)
    : new Date();
  const dateText = Number.isNaN(orderDate.getTime())
    ? 'Just now'
    : orderDate.toLocaleString(undefined, { month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const costText = [
    summary.hourlyRate !== undefined ? `${money(summary.hourlyRate, 'USD')} / hour` : '',
    summary.monthlyCost !== undefined ? `${money(summary.monthlyCost, 'USD')} monthly cap` : ''
  ].filter(Boolean).join(' - ');
  const rows = [
    { label: 'Order Date', value: dateText },
    { label: 'Server Configuration', value: summary.packageName || 'Custom Configuration' },
    { label: 'Order Status', value: summary.status || 'Processing', badge: true },
    { label: 'Ordered By', value: summary.orderedBy || 'Account Owner' },
    { label: 'Note', value: summary.note || (costText ? `${costText}. You will be notified via email once your order is ready.` : 'You will be notified via email once your order is ready.') }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fbfaff]">
      <OrderReceipt
        title="Thanks for Your Order!"
        subtitle={summary.title || 'Your order has been placed successfully.'}
        description="We're setting things up and will notify you once it's ready."
        orderId={summary.orderNumber || summary.invoiceNumber}
        rows={rows}
        nextDescription="Our team is now reviewing your order and preparing the service. You will receive an email notification once it's ready to use."
        onPrimary={onPrimary}
        supportHref={summary.supportPath || '/support'}
      />
    </div>
  );
}
