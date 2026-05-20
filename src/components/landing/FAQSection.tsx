import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQSection() {
  const faqs = [
    {
      q: "What is included in the Cloud Server package?",
      a: "Our cloud servers include root access, CloudLinux OS, daily backups, and a choice of cPanel or WHM control panels. All nodes are protected by enterprise-grade DDoS mitigation."
    },
    {
      q: "How does the ISP Billing automation work?",
      a: "The system integrates via Radius API to monitor bandwidth. It automatically generates invoices and can suspend/resume accounts based on payment status without manual intervention."
    },
    {
      q: "Can I migrate my existing WHMCS data?",
      a: "Yes, we provide full migration support for WHMCS databases and cPanel accounts. Our technical team ensures zero downtime during the transfer."
    },
    {
      q: "Do you offer localized payment gateways?",
      a: "Absolutely. We support major regional gateways across Southeast Asia including BKash, Nagad, SSLCommerz, and international providers like Stripe and PayPal."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-10 px-6 border-t border-gray-100 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 
          className="text-2xl font-bold text-gray-900 tracking-tight mb-8 text-center"
        >
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="border border-gray-200 rounded overflow-hidden"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={openIndex === i}
              >
                <span className="text-sm font-bold text-gray-900">{faq.q}</span>
                <div
                  className={`transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
                >
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-xs text-gray-500 font-medium leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
