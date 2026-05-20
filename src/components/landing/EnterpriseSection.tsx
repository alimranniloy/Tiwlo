import React from 'react';
import { Building2, Users, PieChart, Briefcase } from 'lucide-react';

export default function EnterpriseSection() {
  const features = [
    { title: 'Dedicated Accounts', desc: 'Direct access to senior cloud architects.', icon: <Users className="h-5 w-5" /> },
    { title: 'Business Analytics', desc: 'Detailed usage and financial reporting.', icon: <PieChart className="h-5 w-5" /> },
    { title: 'SLA Guarantee', desc: 'Financial backed 99.99% uptime promise.', icon: <Briefcase className="h-5 w-5" /> },
  ];

  return (
    <section className="py-10 px-6 border-t border-gray-100 bg-gray-50/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="md:w-1/3">
             <div className="w-10 h-10 bg-blue-600 text-white rounded flex items-center justify-center mb-6">
                <Building2 className="h-5 w-5" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Enterprise Ready</h2>
             <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Solutions designed for high-density environments and multi-regional business operations. 
             </p>
          </div>
          <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-6">
             {features.map((f, i) => (
               <div key={i} className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                  <div className="text-blue-500 mb-4">{f.icon}</div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">{f.title}</h4>
                  <p className="text-xs text-gray-400 font-medium">{f.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </div>
    </section>
  );
}
