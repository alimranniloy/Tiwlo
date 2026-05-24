import React from 'react';
import { ShoppingBag, CreditCard, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EcommerceSection() {
  const navigate = useNavigate();

  return (
    <section id="ecommerce" className="py-10 px-6 border-t border-gray-100 bg-gray-50/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-6">
              Domains, Hosting & Commerce.
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed mb-10 max-w-lg">
              Registration to full-scale deployment. Get premier Domains, manage with 
              hosting panels, DNS, SSL, and specialized Linux or Windows Cloud Servers 
              built for modern e-commerce storefronts.
            </p>
            <div className="grid grid-cols-2 gap-8 mb-10">
               <div className="space-y-2">
                  <ShoppingBag className="h-6 w-6 text-emerald-600 mb-2" />
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">Rapid Stores</h4>
                  <p className="text-xs text-gray-500">Go live in minutes with pre-optimized themes.</p>
               </div>
               <div className="space-y-2">
                  <CreditCard className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">Global Payments</h4>
                  <p className="text-xs text-gray-500">Accept 50+ currencies with secure gateways.</p>
               </div>
            </div>
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-3 bg-gray-900 text-white rounded-md font-semibold text-sm hover:bg-black transition-all active:scale-95 flex items-center gap-2"
            >
              Start selling <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="lg:w-1/2 w-full">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="h-24 bg-gray-50 rounded border border-gray-100 flex items-center justify-center">
                    <div className="h-8 w-8 bg-emerald-100 rounded-full"></div>
                  </div>
                  <div className="h-24 bg-emerald-600 rounded flex flex-col justify-between p-4">
                    <div className="h-2 w-10 bg-white/30 rounded"></div>
                    <div className="text-2xl font-bold text-white">94%</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-6 w-full bg-gray-50 rounded"></div>
                  <div className="h-6 w-2/3 bg-gray-50 rounded"></div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
