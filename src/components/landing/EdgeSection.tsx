import React from 'react';
import { Globe, Shield, Cloud } from 'lucide-react';

export default function EdgeSection() {
  return (
    <section className="py-10 px-6 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
             <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 tracking-tight">Global Proximity</h3>
             <p className="text-sm text-gray-500 font-medium leading-relaxed">
               Strategic data centers ensure your users get the fastest possible experience.
             </p>
          </div>
          
          <div className="space-y-4">
             <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 tracking-tight">Enterprise Shield</h3>
             <p className="text-sm text-gray-500 font-medium leading-relaxed">
               Built-in advanced DDoS protection and encrypted data handling at every node.
             </p>
          </div>

          <div className="space-y-4">
             <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
                <Cloud className="h-5 w-5 text-indigo-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 tracking-tight">Seamless Integration</h3>
             <p className="text-sm text-gray-500 font-medium leading-relaxed">
               Connect your ISP hub and retail store with a single environment.
             </p>
          </div>
        </div>
      </div>
    </section>
  );
}
