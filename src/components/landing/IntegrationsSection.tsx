import React from 'react';
import { Layers, Database, Code2, Zap } from 'lucide-react';

export default function IntegrationsSection() {
  const tools = [
    { name: 'Hosting Panel', desc: 'Powerful Server Control' },
    { name: 'CloudLinux', desc: 'Secure Server Environment' },
    { name: 'cPanel', desc: 'Industry leading panel' },
    { name: 'Linux', desc: 'Enterprise grade OS' },
  ];

  return (
    <section className="py-6 px-6 border-t border-gray-100 bg-gray-50/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {tools.map((tool, i) => (
            <div key={i} className="flex items-center gap-4 p-4 grayscale hover:grayscale-0 transition-all">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center shadow-sm shrink-0">
                <Layers className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{tool.name}</h4>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
