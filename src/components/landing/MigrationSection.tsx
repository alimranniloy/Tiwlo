import React from 'react';
import { MoveRight, RefreshCcw, FileCheck, Rocket } from 'lucide-react';

export default function MigrationSection() {
  const steps = [
    { title: 'Full Backup', desc: 'We take a snapshot of your current servers.', icon: <RefreshCcw className="h-5 w-5" /> },
    { title: 'Data Validation', desc: 'Integrity checks on all databases & files.', icon: <FileCheck className="h-5 w-5" /> },
    { title: 'Live Cutover', desc: 'Switch DNS with zero downtime migration.', icon: <Rocket className="h-5 w-5" /> },
  ];

  return (
    <section className="py-12 px-6 border-t border-gray-100 bg-blue-600 text-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Switch to Professional Hosting with Zero Downtime</h2>
            <p className="text-blue-100 font-medium mb-8 leading-relaxed max-w-md text-sm">
              Tired of slow support and lagging servers? Our migration specialists will move your entire 
              infrastructure—including WHM, cPanel, and local data—completely free of charge.
            </p>
            <button className="px-6 py-3 bg-white text-blue-600 rounded font-bold text-sm hover:bg-blue-50 transition-all flex items-center gap-2">
              Request Free Migration <MoveRight className="h-4 w-4" />
            </button>
          </div>
          <div className="md:w-1/2 grid grid-cols-1 gap-4">
             {steps.map((step, i) => (
               <div key={i} className="flex gap-4 p-4 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg">
                  <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                    <p className="text-xs text-blue-100 font-medium">{step.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
    </section>
  );
}
