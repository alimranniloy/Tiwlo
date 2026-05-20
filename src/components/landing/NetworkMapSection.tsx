import React from 'react';
import { MapPin } from 'lucide-react';

export default function NetworkMapSection() {
  const nodes = [
    { city: 'Singapore', latency: '< 5ms', top: '70%', left: '75%' },
    { city: 'Dhaka', latency: '12ms', top: '45%', left: '70%' },
    { city: 'Mumbai', latency: '28ms', top: '55%', left: '60%' },
    { city: 'New York', latency: '90ms', top: '35%', left: '20%' },
    { city: 'London', latency: '75ms', top: '30%', left: '45%' },
  ];

  return (
    <section className="py-10 px-6 border-t border-gray-100 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/3">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Global Network Edge</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Experience ultra-low latency with our strategically placed cloud nodes. 
              Optimized routes for regional service provider traffic.
            </p>
            <div className="mt-8 space-y-4">
               {nodes.slice(0, 3).map((node, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                    <span className="text-xs font-bold text-gray-700">{node.city}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{node.latency}</span>
                 </div>
               ))}
            </div>
          </div>
          <div className="md:w-2/3 relative h-[300px] bg-blue-50 rounded-lg border border-blue-100 overflow-hidden">
             {/* Simple visual map representation */}
             <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
             </div>
             {nodes.map((node, i) => (
               <div key={i} className="absolute group cursor-pointer" style={{ top: node.top, left: node.left }}>
                  <div className="relative">
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping absolute inset-0"></div>
                    <div className="w-3 h-3 bg-blue-600 rounded-full relative z-10 border-2 border-white"></div>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                      {node.city}: {node.latency}
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </section>
  );
}
