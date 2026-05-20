import { CreditCard, FileText, AlertCircle } from 'lucide-react';

export default function BillingContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Managed Billing & Invoicing</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo offers transparent, hourly-granularity billing. Our intuitive billing interface ensures you have full visibility into your resource usage and costs at all times.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Cost Management Features</h3>
        <ul className="list-disc pl-5 text-sm text-[#4a4a4a] space-y-4">
          <li><strong>Hourly Billing:</strong> Never pay for what you don't use. Scale down during off-peak times and save instantly.</li>
          <li><strong>Detailed Invoicing:</strong> Clear, project-level, and resource-level cost tracking for easy budget management.</li>
          <li><strong>Usage Alerts:</strong> Set monthly budget limits and receive alerts when you approach your spending thresholds.</li>
        </ul>
      </section>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Manage Budget</h4>
          <p className="text-sm text-[#4a4a4a]">Review invoices and adjust payment methods.</p>
        </div>
        <a href="/billing" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Go to Billing
        </a>
      </div>
    </div>
  );
}
