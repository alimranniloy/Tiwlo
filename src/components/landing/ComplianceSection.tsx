import React from 'react';
import { CheckCircle, Scale, ShieldCheck } from 'lucide-react';

export default function ComplianceSection() {
  return (
    <section className="py-8 px-6 border-t border-gray-100">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Regional Compliance & Security</h3>
          <p className="text-sm text-gray-500 font-medium max-w-lg">
            We adhere to local data protection laws and international hosting standards to keep your business fully compliant.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 opacity-40">
           <div className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Regulatory Ready</span>
           </div>
           <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">ISO Certified</span>
           </div>
           <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">GDPR Compliant</span>
           </div>
        </div>
      </div>
    </section>
  );
}
