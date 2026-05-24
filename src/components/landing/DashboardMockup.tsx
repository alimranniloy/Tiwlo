import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Server, Users, Globe, Terminal, Plus, CheckCircle2, ShoppingBag, ShieldCheck, Database, FileText, Settings, Key, BarChart3, CreditCard, Cpu, HardDrive, Lock } from 'lucide-react';
import BrandLogo from '../BrandLogo';

// Sub-components for various states
const IdleState = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center h-full flex-col text-center">
    <Terminal className="h-12 w-12 text-gray-200 mb-2" />
    <p className="text-[10px] text-gray-400 font-medium tracking-tight">System standing by...</p>
  </motion.div>
);

const CreateServerState = ({ isCliking }: { isCliking: boolean }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="text-[11px] font-bold text-gray-900 flex items-center gap-2">
        Inventory <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full text-[8px]">14 ACTIVE</span>
      </div>
      <motion.button 
        animate={isCliking ? { scale: 0.95, backgroundColor: '#1d4ed8' } : {}}
        className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold flex items-center gap-1.5"
      >
        <Plus className="h-3 w-3" /> Create Instance
      </motion.button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white border border-gray-100 rounded-md p-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <div className="flex-1 space-y-1">
             <div className="w-full h-1.5 bg-gray-100 rounded"></div>
             <div className="w-1/2 h-1 bg-gray-50 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const ProvisioningState = ({ progress }: { progress: number }) => (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center p-6">
    <div className="w-full max-w-[200px] text-center">
      <div className="text-[11px] font-bold text-gray-900 mb-3 uppercase tracking-tighter">Initializing sgp-1...</div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
        <div className="text-[9px] text-gray-400 font-mono">attaching_ebs_volume</div>
      </div>
    </div>
  </motion.div>
);

const DatabaseState = () => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3">
    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
      <Database className="h-4 w-4 text-blue-500" />
      <span className="text-[11px] font-bold text-gray-900">Active DB Nodes</span>
    </div>
    <div className="space-y-2">
      {['MySQL 8.0', 'PostgreSQL 14', 'Redis 7.0'].map((db, i) => (
        <div key={i} className="flex items-center justify-between p-2 bg-white border border-gray-50 rounded">
          <span className="text-[10px] font-medium text-gray-600">{db}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-emerald-500 font-bold uppercase">Healthy</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const SecurityState = () => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 p-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-orange-500" />
        <span className="text-[11px] font-bold text-gray-900 font-sans tracking-tight">Access Control</span>
      </div>
      <div className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Live: 42 Rules</div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[
        { port: '80/443', action: 'Allow Any', color: 'emerald' },
        { port: '22', action: 'Allow MyIP', color: 'blue' },
        { port: '3306', action: 'Block All', color: 'red' },
        { port: 'ICMP', action: 'Rate Limit', color: 'orange' }
      ].map((rule, i) => (
        <div key={i} className="flex flex-col p-2 bg-gray-50/50 rounded border border-gray-100 text-[9px] font-bold">
          <div className="flex justify-between items-center mb-1 text-gray-300">
             <span>PORT</span>
             <ShieldCheck className="h-2 w-2" />
          </div>
          <code className="text-gray-900 mb-2">{rule.port}</code>
          <span className={`text-${rule.color}-600 bg-white border border-${rule.color}-100 px-2 py-0.5 rounded text-center`}>{rule.action}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

const StorageState = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 uppercase tracking-widest text-[9px] font-black text-gray-400">
        <HardDrive className="h-3 w-3" /> Object Storage
      </div>
      <div className="text-[10px] font-bold text-blue-600">Upgrade Plan</div>
    </div>
    <div className="grid grid-cols-1 gap-4">
      {[
        { name: 'media-bucket-sg', p: 72, c: 'blue' },
        { name: 'backups-v2', p: 24, c: 'emerald' },
        { name: 'temp-files', p: 12, c: 'orange' }
      ].map((s, i) => (
        <div key={i}>
          <div className="flex justify-between text-[10px] mb-1 font-bold">
            <span className="text-gray-900">{s.name}</span>
            <span className="text-gray-400">{s.p}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full w-[${s.p}%] bg-${s.c}-500 rounded-full`}></div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const MetricsState = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col pt-2">
    <div className="flex items-center justify-between mb-4">
       <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[11px] font-bold text-gray-900 tracking-tight">CPU Clustering</span>
       </div>
       <div className="text-[9px] font-mono text-gray-400">avg: 42.1%</div>
    </div>
    <div className="flex-1 grid grid-cols-8 gap-1.5 items-end">
       {[30, 45, 60, 40, 75, 90, 65, 80, 55, 45, 60, 35, 70, 85, 50, 40].map((h, i) => (
         <motion.div
           key={i}
           initial={{ height: 0 }} animate={{ height: `${h}%` }}
           className={`rounded-t-[2px] ${h > 80 ? 'bg-red-400' : h > 60 ? 'bg-orange-400' : 'bg-blue-400'}`}
         />
       ))}
    </div>
  </motion.div>
);

const InvoicingState = () => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3">
    <div className="flex items-center gap-2 mb-2">
        <CreditCard className="h-4 w-4 text-emerald-500" />
        <span className="text-[11px] font-bold text-gray-900 font-sans tracking-tight">Ledger & Invoices</span>
    </div>
    <div className="p-3 bg-white border border-gray-100 rounded-lg">
      <div className="flex justify-between items-center mb-3">
         <span className="text-[9px] font-bold text-gray-400">ID: INV-2024-061</span>
         <span className="text-[11px] font-black text-gray-900">$142.00</span>
      </div>
      <div className="space-y-2">
         {[
           { item: 'sgp-1 Instance (2h)', price: '$0.42' },
           { item: 'Managed Database', price: '$120.00' }
         ].map((li, i) => (
           <div key={i} className="flex justify-between text-[8px] font-medium text-gray-500">
             <span>{li.item}</span>
             <span>{li.price}</span>
           </div>
         ))}
      </div>
      <div className="mt-4 h-8 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded flex items-center justify-center border border-emerald-100 uppercase tracking-tighter">
         Finalized & Paid
      </div>
    </div>
  </motion.div>
);

const DomainState = () => (
  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
     <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold text-gray-900">DNS Zones</div>
        <Plus className="h-3 w-3 text-gray-400 cursor-pointer" />
     </div>
     <div className="space-y-2">
        {['api.tiwlo.com', 'shop.client-x.net'].map((domain, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded group">
             <span className="text-[10px] font-medium text-gray-700">{domain}</span>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <Settings className="h-2.5 w-2.5 text-gray-300 opacity-0 group-hover:opacity-100" />
             </div>
          </div>
        ))}
     </div>
  </motion.div>
);

const UserAccessState = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
     <div className="text-[11px] font-bold text-gray-900">Team Management</div>
     <div className="flex -space-x-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 relative group cursor-pointer">
             {i === 4 ? '+' : i}
             <motion.div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></motion.div>
          </div>
        ))}
     </div>
     <div className="p-2 border border-blue-50 bg-blue-50/20 rounded flex items-center justify-between">
        <div className="text-[9px] font-bold text-blue-600">Admin Approval Required</div>
        <Key className="h-3 w-3 text-blue-400" />
     </div>
  </motion.div>
);

const EcommerceState = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
    <div className="flex items-center gap-2">
      <ShoppingBag className="h-4 w-4 text-emerald-600" />
      <span className="text-[11px] font-bold text-gray-900 uppercase tracking-tighter">Automated Store Engine</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
       {[1,2,3].map(i => (
         <div key={i} className="aspect-square bg-gray-50 border border-gray-100 rounded flex items-center justify-center">
            <span className="text-[8px] font-bold text-gray-300">ITEM_{i}</span>
         </div>
       ))}
    </div>
    <div className="flex items-center justify-between text-[9px] font-bold p-2 bg-emerald-50 rounded text-emerald-700">
       <span>Webhook Payload Received</span>
       <span>200 OK</span>
    </div>
  </motion.div>
);

const AnalyticSummaryState = () => (
  <motion.div 
  initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
  className="flex items-center justify-center h-full flex-col bg-gray-950 text-white rounded-lg p-2"
 >
    <Activity className="h-6 w-6 text-blue-400 mb-2 animate-pulse" />
    <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Edge Logic Success</div>
    <div className="text-lg font-bold mt-1">SLA: 100%</div>
    <div className="grid grid-cols-2 gap-2 mt-4 w-full text-center">
       <div className="p-2 bg-white/5 rounded">
          <div className="text-[8px] text-gray-500 uppercase">Requests</div>
          <div className="text-[10px] font-bold text-blue-300">140k/s</div>
       </div>
       <div className="p-2 bg-white/5 rounded">
          <div className="text-[8px] text-gray-500 uppercase">Latency</div>
          <div className="text-[10px] font-bold text-emerald-300">8ms</div>
       </div>
    </div>
 </motion.div>
);

export default function DashboardMockup() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 15);
    }, 2000); // Increased interval to 2000ms to slow animations
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: 'Uptime', val: '99.9%', icon: <Activity className="h-3 w-3" /> },
    { label: 'Nodes', val: step > 4 ? '143' : '142', icon: <Server className="h-3 w-3" /> },
    { label: 'Users', val: step > 12 ? '12.6k' : '12.4k', icon: <Users className="h-3 w-3" /> },
    { label: 'Edge', val: '18', icon: <Globe className="h-3 w-3" /> }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden relative">
      {/* Browser Bar */}
      <div className="h-9 bg-gray-50/50 border-b border-gray-100 flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
        </div>
        <div className="flex-1 text-center">
          <div className="inline-block px-3 py-0.5 bg-white border border-gray-200/50 rounded text-[10px] text-gray-400 font-medium">
             tiwlo.com/api/v2/console
          </div>
        </div>
      </div>

      <div className="p-5 bg-white min-h-[420px] relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
             <BrandLogo variant="icon" className="h-5 w-5" />
             <div className="text-[11px] font-bold text-gray-900 tracking-tight">Main Console</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase">Production</span>
          </div>
        </div>

        {/* Dynamic Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, i) => (
            <div key={i} className="p-3 bg-gray-50/50 border border-gray-100 rounded-lg">
              <div className="text-gray-300 mb-1">{stat.icon}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">{stat.label}</div>
              <motion.div key={stat.val} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-black text-gray-900 tracking-tight">
                {stat.val}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Central Display */}
        <div className="h-52 bg-white rounded-lg border border-gray-100 p-4 relative overflow-hidden">
          <AnimatePresence mode="wait">
             {step === 0 && (
               <motion.div key="state-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <IdleState />
               </motion.div>
             )}
             {step === 1 && (
               <motion.div key="state-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <CreateServerState isCliking={false} />
               </motion.div>
             )}
             {step === 2 && (
               <motion.div key="state-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <CreateServerState isCliking={true} />
               </motion.div>
             )}
             {step === 3 && (
               <motion.div key="state-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <ProvisioningState progress={45} />
               </motion.div>
             )}
             {step === 4 && (
               <motion.div key="state-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <ProvisioningState progress={95} />
               </motion.div>
             )}
             {step === 5 && (
               <motion.div key="state-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <DatabaseState />
               </motion.div>
             )}
             {step === 6 && (
               <motion.div key="state-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <SecurityState />
               </motion.div>
             )}
             {step === 7 && (
               <motion.div key="state-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <StorageState />
               </motion.div>
             )}
             {step === 8 && (
               <motion.div key="state-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <MetricsState />
               </motion.div>
             )}
             {step === 9 && (
               <motion.div key="state-9" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <InvoicingState />
               </motion.div>
             )}
             {step === 10 && (
               <motion.div key="state-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <DomainState />
               </motion.div>
             )}
             {step === 11 && (
               <motion.div key="state-11" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <UserAccessState />
               </motion.div>
             )}
             {step === 12 && (
               <motion.div key="state-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <EcommerceState />
               </motion.div>
             )}
             {step === 13 && (
               <motion.div key="state-13" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <AnalyticSummaryState />
               </motion.div>
             )}
             {step === 14 && (
               <motion.div key="state-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                 <IdleState />
               </motion.div>
             )}
          </AnimatePresence>
        </div>

        {/* Console Logs Footer */}
        <div className="mt-4 p-3 bg-gray-950 rounded-md font-mono text-[9px] text-blue-400 border border-gray-800 space-y-1">
           <div className="flex items-center gap-2">
              <span className="text-gray-600">[info]</span>
              <span>Syncing global CDN nodes...</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-emerald-500">[done]</span>
              <span>Propagated to 42 locations in 18ms.</span>
           </div>
        </div>
      </div>
    </div>
  );
}
