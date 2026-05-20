import React from 'react';
import { Shield, Zap, Server, Globe } from 'lucide-react';

export default function Stats() {
  const highlights = [
    { label: "Uptime Guaranteed", value: "99.99%", color: "blue" },
    { label: "Local Latency", value: "< 20ms", color: "blue" },
    { label: "Business Clients", value: "12k+", color: "blue" },
    { label: "Regional Nodes", value: "450+", color: "blue" }
  ];

  return (
    <section className="bg-white py-20 px-6 border-b border-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {highlights.map((h, i) => (
            <div key={i} className="space-y-2">
              <div className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tighter">
                {h.value}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {h.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
