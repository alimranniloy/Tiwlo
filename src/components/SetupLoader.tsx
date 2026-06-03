import React from 'react';
import { CheckCircle2, Headphones, ReceiptText } from 'lucide-react';
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
  packageName?: string;
  serverIp?: string;
  hourlyRate?: number;
  monthlyCost?: number;
  status?: string;
  supportPath?: string;
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
  const rows = [
    ['Invoice', summary.invoiceNumber || 'Processing'],
    ['Package', summary.packageName || 'Selected package'],
    ['Server IP', summary.serverIp || 'Auto selected'],
    ['Per hour', summary.hourlyRate !== undefined ? money(summary.hourlyRate, 'USD') : 'Included'],
    ['Monthly cap', summary.monthlyCost !== undefined ? money(summary.monthlyCost, 'USD') : 'Included'],
    ['Status', summary.status || 'Completed']
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 bg-white px-4 py-8 text-[#111827] md:px-0">
      <div className="border border-[#d9dee7] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-[#16a34a]" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">{summary.title}</h1>
              <p className="mt-1 text-sm text-[#64748b]">Your order details are ready and notifications have been queued.</p>
            </div>
          </div>
          <ReceiptText className="hidden h-6 w-6 text-[#0069ff] md:block" />
        </div>

        <div className="mt-6 grid grid-cols-1 border border-[#e5e8ed] md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="border-b border-[#e5e8ed] px-4 py-3 last:border-b-0 md:border-r md:even:border-r-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">{label}</p>
              <p className="mt-1 break-words text-sm font-bold text-[#111827]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <a href={summary.supportPath || '/support'} className="inline-flex items-center justify-center gap-2 border border-[#d9dee7] px-4 py-2 text-sm font-bold text-[#334155] hover:bg-[#f8fafc]">
            <Headphones className="h-4 w-4" /> Contact Support
          </a>
          <button onClick={onPrimary} className="inline-flex items-center justify-center bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc]">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
