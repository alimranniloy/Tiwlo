import React from 'react';
import { ShieldAlert, Fingerprint, Lock, ShieldCheck } from 'lucide-react';

export default function SecuritySection() {
  const steps = [
    { title: 'DDoS Protection', desc: 'L3/L4/L7 mitigated traffic scrubbing.', icon: <ShieldAlert className="h-5 w-5" /> },
    { title: 'Identity Guard', desc: 'Multi-factor authentication system.', icon: <Fingerprint className="h-5 w-5" /> },
    { title: 'SSL/TLS Nodes', desc: 'End-to-end encryption for all data.', icon: <Lock className="h-5 w-5" /> },
    { title: 'Firewall API', desc: 'Programmable network security layers.', icon: <ShieldCheck className="h-5 w-5" /> },
  ];

  return (
    <section className="py-10 px-6 border-t border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 
            className="text-2xl font-bold text-gray-900 tracking-tight mb-2"
          >
            Hardened Security
          </h2>
          <p 
            className="text-sm text-gray-500 font-medium"
          >
            Enterprise-grade protection at every edge node.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div 
              key={i} 
              className="p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-shadow hover:shadow-lg"
            >
              <div className="text-blue-600 mb-4">{step.icon}</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{step.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
