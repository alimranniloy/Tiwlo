import React from 'react';
import { Wifi, CheckCircle2, BarChart3 } from 'lucide-react';

export default function ISPSection() {
  return (
    <section id="isp" className="py-10 px-6 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div 
            className="lg:w-1/2"
          >
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-6">
              Broadband & Network Management.
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed mb-8 max-w-lg">
              The enterprise toolkit for digital service providers. From automated billing 
              and recurring invoicing to Radius authentication and network health monitoring.
            </p>
            <div className="space-y-4">
              {[
                { title: "Smart Billing", desc: "Native invoicing and payment collection for subscribers." },
                { title: "Advanced Monitoring", desc: "Real-time bandwidth tracking and network pulse." },
                { title: "Radius Integration", desc: "Simplified subscriber authentication and management." }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="flex gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div 
            className="lg:w-1/2 w-full"
          >
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800 shadow-xl overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="h-2 w-24 bg-gray-800 rounded"></div>
                <div className="flex gap-1">
                  <div className="h-1.5 w-6 bg-blue-500 rounded"></div>
                  <div className="h-1.5 w-6 bg-gray-800 rounded"></div>
                </div>
              </div>
              <div className="space-y-3">
                {[0.33, 0.66, 0.25].map((w, i) => (
                   <div key={i} className="h-4 w-full bg-gray-800/50 rounded flex items-center px-4 overflow-hidden">
                      <div 
                        style={{ width: `${w * 100}%` }}
                        className="h-1.5 bg-blue-500 rounded"
                      />
                   </div>
                ))}
              </div>
              <div className="mt-8 flex justify-between items-end">
                <div className="text-2xl font-bold text-white tracking-tight">1.2 Gbps</div>
                <div 
                  className="text-[10px] text-blue-400 font-bold uppercase"
                >
                  Peak Pulse
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
