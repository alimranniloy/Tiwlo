import React from 'react';
import { Wifi, ShoppingBag, Layers, ArrowRight } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: <Wifi className="h-5 w-5" />,
      title: "Broadband Operations",
      description: "Advanced billing & management for network providers. Automated invoicing, radius integration, and live monitoring.",
      color: "blue",
      href: "#isp"
    },
    {
      icon: <ShoppingBag className="h-5 w-5" />,
      title: "Domains & Cloud Server",
      description: "Secure domain registration with DNS, SSL, and hosting automation. Scale instantly with high-performance Cloud Server environments.",
      color: "emerald",
      href: "#ecommerce"
    },
    {
      icon: <Layers className="h-5 w-5" />,
      title: "E-commerce Solutions",
      description: "Launch global storefronts with professional themes and regional payment gateway integrations.",
      color: "indigo",
      href: "#features"
    }
  ];

  return (
    <section id="features" className="py-10 px-6 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">
            Platform Capabilities
          </h2>
          <p className="text-gray-500 font-medium max-w-xl mx-auto">
            Scalable solutions for modern infrastructure and commerce.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div 
              key={i} 
              className="p-8 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-all group"
            >
              <div className={`w-10 h-10 bg-${f.color}-50 text-${f.color}-600 rounded flex items-center justify-center mb-6`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">{f.description}</p>
              <a href={f.href} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:gap-2 transition-all">
                Learn more <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
