import React from 'react';
import { Star } from 'lucide-react';

export default function TestimonialsSection() {
  const reviews = [
    {
      name: "Ahmed Al-Fayed",
      role: "ISP Owner, Dhaka",
      text: "The billing automation saved us 20 hours a week. Switching to their Cloud Servers was the best decision for our growth."
    },
    {
      name: "Sarah Jenkins",
      role: "E-commerce Founder",
      text: "Solid cPanel hosting and great support. The sub-20ms latency is real - our site loading speed improved by 40%."
    },
    {
      name: "Michael Chen",
      role: "CTO, Tech Solutions",
      text: "The hosting management interface is intuitive and powerful. Their security layers are truly enterprise-grade."
    }
  ];

  return (
    <section className="py-10 px-6 border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-8 text-center">Trusted by Industry Leaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((row, i) => (
            <div key={i} className="p-6 bg-gray-50 border border-gray-100 rounded-lg">
              <div className="flex gap-0.5 mb-4 text-orange-400">
                {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <p className="text-sm text-gray-600 font-medium leading-relaxed italic mb-6">"{row.text}"</p>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{row.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{row.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
