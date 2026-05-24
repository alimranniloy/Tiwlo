import React from 'react';
import { Check } from 'lucide-react';

export default function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '$19',
      features: ['100 ISP Subscribers', '2 Cloud Servers', 'Shared cPanel', 'Email Support']
    },
    {
      name: 'Professional',
      price: '$49',
      features: ['1000 ISP Subscribers', '5 Cloud Servers', 'Dedicated hosting panel', 'Priority 24/7 Support'],
      popular: true
    },
    {
      name: 'Business',
      price: '$99',
      features: ['Unlimited Subscribers', '15 Cloud Servers', 'CloudLinux Included', 'Dedicated Architect']
    }
  ];

  return (
    <section className="py-10 px-6 border-t border-gray-100 bg-gray-50/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Simple, Transparent Pricing</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div key={i} className={`p-6 bg-white border ${plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'} rounded-lg relative`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-[10px] font-bold text-white uppercase rounded">Most Popular</div>
              )}
              <h3 className="text-sm font-bold text-gray-900 mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-xs text-gray-400 font-medium">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <Check className="h-3.5 w-3.5 text-blue-600" /> {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-2.5 rounded text-xs font-bold transition-all ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-950 text-white hover:bg-black'}`}>
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
