import React from 'react';
import { Cpu, Zap, HardDrive, Activity } from 'lucide-react';

export default function InfrastructureSection() {
  const specs = [
    { label: 'Processors', value: 'AMD EPYC™ 7003', icon: <Cpu className="h-4 w-4" /> },
    { label: 'Storage', value: 'NVMe Gen4 SSD', icon: <HardDrive className="h-4 w-4" /> },
    { label: 'Network', value: '100Gbps Backbone', icon: <Zap className="h-4 w-4" /> },
    { label: 'Uptime', value: '99.99% Guaranteed', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <section className="py-12 px-6 border-t border-gray-100 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div 
            className="lg:w-1/2"
          >
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Enterprise Grade Hardware</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
              We don't compromise on quality. Every Cloud Server is powered by the latest 
              AMD EPYC processors and ultra-fast NVMe storage to ensure your applications 
              run at peak performance.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {specs.map((spec, i) => (
                <div 
                  key={i} 
                  className="p-4 bg-gray-50 rounded border border-gray-100 group hover:border-blue-200 transition-colors"
                >
                  <div className="text-gray-400 group-hover:text-blue-600 transition-colors mb-2">{spec.icon}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{spec.label}</div>
                  <div className="text-sm font-bold text-gray-900">{spec.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div 
            className="lg:w-1/2 w-full"
          >
            <div className="aspect-video bg-gray-950 rounded-lg p-6 font-mono text-[11px] text-blue-400 border border-gray-800 shadow-2xl overflow-hidden relative">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none"></div>
               <div className="flex gap-2 mb-4 relative z-10">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
               </div>
               <div className="space-y-1 relative z-10">
                  <p 
                    className="text-gray-500"
                  >
                    # System performance audit...
                  </p>
                  {[
                    "CPU: AMD EPYC 7763 64-Core Processor",
                    "RAM: 1024GB ECC Registered DDR4-3200",
                    "DISK: 4x 3.84TB NVMe Gen4 RAID-10",
                    "NET: Dual 100GbE QSFP28 Uplinks"
                  ].map((line, i) => (
                    <p 
                      key={i}
                    >
                      {line}  [ <span className="text-emerald-400 uppercase font-bold">OK</span> ]
                    </p>
                  ))}
                  <p 
                    className="mt-4 text-white"
                  >
                    system@cloud-node-01:~$ ./benchmark.sh
                  </p>
                  <p 
                    className="text-white animate-pulse"
                  >
                    Running IOPS test... <span className="text-emerald-400 font-bold">850,000 IOPS achieved.</span>
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
