import React from 'react';
import { Globe, CheckCircle2, Layout, Shield } from 'lucide-react';

export default function BentoSection() {
  return (
    <section className="py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12 mb-6 text-center">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Performance where it matters.</h2>
          </div>
          
          <div className="lg:col-span-8 bg-blue-600 rounded-lg p-10 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded flex items-center justify-center mb-6">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4">Regional Edge Hosting</h3>
              <p className="text-blue-50 text-base font-medium max-w-md opacity-90 leading-relaxed">
                Host your applications in Southeast Asia with sub-20ms latency. Optimized for speed and security.
              </p>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="lg:col-span-4 bg-white rounded-lg p-10 border border-gray-200 flex flex-col justify-between shadow-sm">
            <div>
              <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center mb-6">
                <Layout className="h-5 w-5 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">White-Label Ready.</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">Present your services under your own brand. We handle the technical infrastructure.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
