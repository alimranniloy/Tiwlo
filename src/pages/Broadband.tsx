import React from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { motion } from 'framer-motion';
import Seo, { createTiwloBreadcrumbSchema, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import { 
  Wifi, 
  Satellite, 
  Cable, 
  Router, 
  Server, 
  Shield, 
  Clock,
  ArrowRight,
  Globe,
  Radio
} from 'lucide-react';

const broadbandSolutions = [
  {
    icon: <Cable className="w-8 h-8 text-blue-600" />,
    title: "Dedicated Fiber",
    description: "Symmetrical bandwidth up to 10Gbps with enterprise-level SLAs.",
    suitable: ["Data centers", "Large offices", "Streaming services"]
  },
  {
    icon: <Satellite className="w-8 h-8 text-purple-600" />,
    title: "Business Satellite",
    description: "High-speed LEO connectivity for remote locations and redundant backups.",
    suitable: ["Rural sites", "Disaster recovery", "Maritime"]
  },
  {
    icon: <Radio className="w-8 h-8 text-emerald-600" />,
    title: "Managed SD-WAN",
    description: "Optimize your WAN traffic across multiple connections for maximum reliablity.",
    suitable: ["Branch offices", "Cloud migrations", "Security focused"]
  },
  {
    icon: <Router className="w-8 h-8 text-rose-600" />,
    title: "Fixed Wireless",
    description: "Rapid deployment microwave links for instant high-capacity connectivity.",
    suitable: ["Temporary events", "Construction sites", "Primary links"]
  }
];

const broadbandDescription =
  'Tiwlo Broadband and tFiber workflows help operators manage connectivity services, subscriber records, routers, ISP billing, support, and network operations.';

const broadbandSchema = [
  tiwloOrganizationSchema,
  tiwloWebsiteSchema,
  {
    '@type': 'WebPage',
    '@id': 'https://tiwlo.com/broadband#webpage',
    url: 'https://tiwlo.com/broadband',
    name: 'Broadband - Tiwlo',
    headline: 'Tiwlo Broadband and tFiber ISP operations',
    description: broadbandDescription,
    keywords: 'Tiwlo broadband, tFiber, ISP billing, broadband billing, router management, subscriber management, connectivity operations',
    dateModified: '2026-06-14',
    inLanguage: 'en',
    isPartOf: { '@id': 'https://tiwlo.com/#website' },
    about: { '@id': 'https://tiwlo.com/#organization' },
    publisher: { '@id': 'https://tiwlo.com/#organization' },
    breadcrumb: { '@id': 'https://tiwlo.com/broadband#breadcrumb' }
  },
  createTiwloBreadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'Broadband', item: '/broadband' }
    ],
    'https://tiwlo.com/broadband#breadcrumb'
  )
];

export default function BroadbandPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <Seo
        title="Broadband - Tiwlo tFiber ISP Billing and Connectivity Operations"
        description={broadbandDescription}
        canonicalPath="/broadband"
        keywords={['Tiwlo broadband', 'tFiber', 'ISP billing', 'broadband billing', 'router management', 'subscriber management']}
        schema={broadbandSchema}
      />
      <Navbar />
      
      <main>
        {/* Section 1: Hero */}
        <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 font-display">
                Connectivity Without <span className="text-blue-600">Limits.</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Empower your business with ultra-fast, reliable, and secure broadband solutions tailored for the modern enterprise.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button className="px-8 py-4 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition-all shadow-xl">
                  Check Availability
                </button>
                <button className="px-8 py-4 bg-white text-gray-900 border border-gray-200 font-bold rounded-full hover:bg-gray-50 transition-all">
                  Browse Plans
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 2: Solution Cards */}
        <section className="py-24 px-6">
           <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                 {broadbandSolutions.map((sol, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="p-8 bg-white border border-gray-100 shadow-sm rounded-3xl hover:shadow-xl transition-all"
                    >
                       <div className="mb-6">{sol.icon}</div>
                       <h3 className="text-xl font-bold mb-3">{sol.title}</h3>
                       <p className="text-sm text-gray-500 mb-6 leading-relaxed">{sol.description}</p>
                       <div className="pt-4 border-t border-gray-50">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Ideal for</span>
                          <div className="flex flex-wrap gap-2">
                             {sol.suitable.map((s, idx) => (
                                <span key={idx} className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-600 rounded">
                                   {s}
                                </span>
                             ))}
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </div>
        </section>

        {/* Section 3: Performance features */}
        <section className="py-24 px-6 bg-gray-900 text-white">
           <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
              <div className="space-y-4">
                 <Clock className="w-10 h-10 text-blue-400" />
                 <h3 className="text-2xl font-bold">99.9% Symmetrical</h3>
                 <p className="text-gray-400 text-sm leading-relaxed">Get equal upload and download speeds, crucial for cloud backups and video conferencing.</p>
              </div>
              <div className="space-y-4">
                 <Shield className="w-10 h-10 text-blue-400" />
                 <h3 className="text-2xl font-bold">Encrypted Transit</h3>
                 <p className="text-gray-400 text-sm leading-relaxed">All data is managed over a secure network with built-in DDoS mitigation at the core.</p>
              </div>
              <div className="space-y-4">
                 <Globe className="w-10 h-10 text-blue-400" />
                 <h3 className="text-2xl font-bold">Zero-Congestion</h3>
                 <p className="text-gray-400 text-sm leading-relaxed">No data caps or throttling. Our private network ensures consistent throughput 24/7.</p>
              </div>
           </div>
        </section>

        {/* Section 4: Process */}
        <section className="py-24 px-6">
           <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-black mb-6">Simple Onboarding.</h2>
              <p className="text-gray-600">From initial site survey to full activation in as little as 3 business days.</p>
           </div>
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12">
              {[
                "Site Survey & Feasibility",
                "Infrastructure Installation",
                "Network Configuration",
                "Live Testing & Handover"
              ].map((step, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black mx-auto mb-6">
                    {idx + 1}
                  </div>
                  <h4 className="font-bold mb-2">{step}</h4>
                  <p className="text-xs text-gray-500">Professional execution at every stage.</p>
                </div>
              ))}
           </div>
        </section>

        {/* Section 5: CTA */}
        <section className="py-24 px-6 border-t border-gray-100">
           <div className="max-w-5xl mx-auto bg-blue-600 rounded-[3rem] p-16 text-center text-white">
              <h2 className="text-4xl md:text-5xl font-black mb-8">Ready for a faster connection?</h2>
              <p className="text-blue-100 mb-10 text-xl max-w-2xl mx-auto">Get a custom quote for your business today. Our connectivity specialists are ready to help.</p>
              <div className="flex flex-wrap justify-center gap-4">
                 <button className="px-10 py-5 bg-white text-blue-600 font-black rounded-full hover:scale-105 transition-all shadow-xl">
                    Request a Quote
                 </button>
                 <button className="px-10 py-5 bg-blue-700 text-white font-black rounded-full hover:bg-blue-800 transition-all">
                    Talk to Support
                 </button>
              </div>
           </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
