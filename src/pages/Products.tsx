import React from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { motion } from 'framer-motion';
import { 
  Server, 
  Database, 
  HardDrive, 
  Network, 
  ShieldCheck, 
  Code2, 
  Cpu, 
  Globe, 
  Activity, 
  Layers,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const products = [
  {
    icon: <Server className="w-8 h-8 text-blue-600" />,
    title: "Virtual Machines",
    description: "Highly scalable, high-performance compute instances for any workload.",
    features: ["Dedicated CPU options", "Instant deployment", "SLA-backed uptime"],
    color: "bg-blue-50"
  },
  {
    icon: <Database className="w-8 h-8 text-emerald-600" />,
    title: "Managed Databases",
    description: "Fully managed PostgreSQL, MongoDB, and Redis clusters without the overhead.",
    features: ["Automated backups", "One-click scaling", "High availability"],
    color: "bg-emerald-50"
  },
  {
    icon: <HardDrive className="w-8 h-8 text-purple-600" />,
    title: "Block Storage",
    description: "Flexible, high-performance storage that grows with your needs.",
    features: ["SSD performance", "Data replication", "Live resizing"],
    color: "bg-purple-50"
  },
  {
    icon: <Network className="w-8 h-8 text-orange-600" />,
    title: "Cloud Networking",
    description: "Isolated VPC networks, load balancers, and global anycast DNS.",
    features: ["Private networking", "DDoS protection", "Auto-scaling LBs"],
    color: "bg-orange-50"
  },
  {
    icon: <Layers className="w-8 h-8 text-cyan-600" />,
    title: "App Platform",
    description: "PaaS solution to deploy code directly from GitHub with zero config.",
    features: ["Auto-SSL", "Build automation", "Global edge caching"],
    color: "bg-cyan-50"
  },
  {
    icon: <Cpu className="w-8 h-8 text-rose-600" />,
    title: "AI Infrastructure",
    description: "GPU-accelerated instances for training and deploying machine learning models.",
    features: ["NVIDIA H100/A100", "CUDA optimized", "Pre-built models"],
    color: "bg-rose-50"
  }
];

const capabilities = [
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Global Data Centers",
    text: "Strategically located nodes across North America, Europe, and Asia for low latency."
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Enterprise Security",
    text: "SOC2 Type II compliant with built-in firewalls and private networking by default."
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: "Developer First",
    text: "The most intuitive API and CLI in the industry. Infrastructure as code ready."
  },
  {
    icon: <Activity className="w-6 h-6" />,
    title: "Native Monitoring",
    text: "Real-time metrics, logs, and alerts integrated directly into your dashboard."
  }
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <Navbar />
      
      <main>
        {/* Section 1: Hero */}
        <section className="pt-32 pb-20 px-6 border-b border-gray-100">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 font-display">
                Engineered for <span className="text-blue-600">Builders.</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                A complete suite of cloud infrastructure products designed to help developers and businesses ship faster and scale globally.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button className="px-8 py-4 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition-all shadow-lg hover:shadow-xl">
                  Get Started for Free
                </button>
                <button className="px-8 py-4 bg-white text-gray-900 font-bold border border-gray-200 rounded-full hover:bg-gray-50 transition-all">
                  View Full Specs
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 2: Product Grid */}
        <section className="py-24 px-6 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="text-3xl font-black mb-4">Core Infrastructure</h2>
              <p className="text-gray-500">Scalable building blocks for modern applications.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group bg-white p-8 rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/5 transition-all cursor-pointer relative"
                >
                  <div className={`w-14 h-14 ${product.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    {product.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{product.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {product.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-500 gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
                    Learn more <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Detailed Capabilities (Alternating) */}
        {capabilities.slice(0, 2).map((cap, idx) => (
          <section key={idx} className={`py-24 px-6 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 border-y border-gray-100'}`}>
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
              <div className={idx % 2 !== 0 ? 'md:order-2' : ''}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest mb-6">
                  {cap.icon}
                  Capability
                </div>
                <h2 className="text-4xl font-black mb-6 leading-tight">{cap.title}</h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  {cap.text} Our specialized infrastructure layer provides unmatched stability and performance, ensuring your application stays online even under extreme load.
                </p>
                <button className="flex items-center gap-2 font-bold text-gray-900 group">
                  Technical Documentation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className={`aspect-square bg-gray-100 rounded-3xl overflow-hidden relative ${idx % 2 !== 0 ? 'md:order-1' : ''}`}>
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                 <div className="flex items-center justify-center h-full">
                    <div className="w-3/4 h-3/4 border border-dashed border-gray-300 rounded-2xl flex items-center justify-center">
                       <span className="font-mono text-xs text-gray-400">Product Preview</span>
                    </div>
                 </div>
              </div>
            </div>
          </section>
        ))}

        {/* Section 4: Enterprise Grade */}
        <section className="py-24 px-6 bg-gray-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-3xl">
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
                Infrastructure for High-Growth Startups and Enterprises.
              </h2>
              <div className="grid sm:grid-cols-2 gap-8 mt-12">
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-blue-400">99.99% Uptime</h4>
                  <p className="text-gray-400 leading-relaxed">
                    Industry leading service level agreements to keep your business running smoothly.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-blue-400">24/7 Premium Support</h4>
                  <p className="text-gray-400 leading-relaxed">
                    Our team of cloud engineers is always available to help with your infrastructure needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: The Remaining Capabilities in a Grid */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {capabilities.map((cap, idx) => (
              <div key={idx} className="p-8 border border-gray-100 rounded-3xl">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6 text-gray-900">
                  {cap.icon}
                </div>
                <h3 className="text-lg font-bold mb-3">{cap.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{cap.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Simple Pricing Teaser */}
        <section className="py-24 px-6 bg-gray-50 border-t border-gray-100">
           <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-black mb-6">Simple, Predictable Pricing</h2>
              <p className="text-gray-600 mb-10 leading-relaxed">
                No hidden fees or surprise bills. Pay exactly for what you use with our transparent hourly pricing. Bandwidth is included for free up to 1TB.
              </p>
              <div className="p-10 bg-white rounded-3xl border border-gray-200 shadow-sm inline-block">
                 <div className="text-sm font-black text-blue-600 uppercase tracking-widest mb-2">Starting at</div>
                 <div className="text-6xl font-black text-gray-900 mb-6">$4<span className="text-2xl text-gray-400">/mo</span></div>
                 <button className="w-full py-4 px-8 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">
                    Start Building Now
                 </button>
              </div>
           </div>
        </section>

        {/* Section 7: Final CTA */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto text-center bg-gray-900 rounded-[3rem] p-16 relative overflow-hidden">
             <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
             <div className="relative z-10 text-white">
                <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                  Ready to deploy your next big idea?
                </h2>
                <div className="flex flex-wrap justify-center gap-6">
                   <button className="px-10 py-5 bg-white text-gray-900 font-black rounded-full hover:scale-105 transition-all text-lg">
                      Sign Up Now
                   </button>
                   <button className="px-10 py-5 bg-transparent text-white border-2 border-white/20 font-black rounded-full hover:bg-white/10 transition-all text-lg">
                      Talk to Sales
                   </button>
                </div>
             </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
