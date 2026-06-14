import React from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { motion } from 'framer-motion';
import Seo, { createTiwloBreadcrumbSchema, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import { 
  ShoppingBag, 
  CreditCard, 
  Package, 
  BarChart3, 
  Users, 
  Globe, 
  Zap,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

const commerceFeatures = [
  {
    icon: <ShoppingBag className="w-8 h-8 text-indigo-600" />,
    title: "Headless Commerce API",
    description: "Build unique shopping experiences with our highly flexible APIs.",
    details: ["GraphQL support", "Extensible data models", "Instant sync"]
  },
  {
    icon: <CreditCard className="w-8 h-8 text-emerald-600" />,
    title: "Global Payments",
    description: "Accept payments in 130+ currencies with local payment methods.",
    details: ["PCI DSS Level 1", "Fraud protection", "One-click checkout"]
  },
  {
    icon: <Package className="w-8 h-8 text-amber-600" />,
    title: "Inventory Control",
    description: "Manage stock across multiple locations and sales channels in real-time.",
    details: ["Low stock alerts", "Multi-warehouse", "Batch tracking"]
  },
  {
    icon: <Zap className="w-8 h-8 text-blue-600" />,
    title: "Lightning Performance",
    description: "Sub-100ms response times for your storefront, anywhere in the world.",
    details: ["Edge caching", "Image optimization", "Global CDN"]
  }
];

const commerceDescription =
  'Tiwlo Commerce helps teams launch storefronts, products, orders, customers, checkout, inventory, analytics, and payment workflows from one connected cloud platform.';

const commerceSchema = [
  tiwloOrganizationSchema,
  tiwloWebsiteSchema,
  {
    '@type': 'WebPage',
    '@id': 'https://tiwlo.com/commerce#webpage',
    url: 'https://tiwlo.com/commerce',
    name: 'Commerce - Tiwlo',
    headline: 'Tiwlo Commerce and Cloud Store',
    description: commerceDescription,
    keywords: 'Tiwlo commerce, Cloud Store, ecommerce platform, storefront builder, ecommerce checkout, inventory management, Tiwlo Pay',
    dateModified: '2026-06-14',
    inLanguage: 'en',
    isPartOf: { '@id': 'https://tiwlo.com/#website' },
    about: { '@id': 'https://tiwlo.com/#organization' },
    publisher: { '@id': 'https://tiwlo.com/#organization' },
    breadcrumb: { '@id': 'https://tiwlo.com/commerce#breadcrumb' }
  },
  createTiwloBreadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'Commerce', item: '/commerce' }
    ],
    'https://tiwlo.com/commerce#breadcrumb'
  )
];

export default function CommercePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100">
      <Seo
        title="Commerce - Tiwlo Cloud Store, Checkout, Inventory, and Payments"
        description={commerceDescription}
        canonicalPath="/commerce"
        keywords={['Tiwlo commerce', 'Cloud Store', 'ecommerce platform', 'storefront builder', 'Tiwlo Pay', 'inventory management']}
        schema={commerceSchema}
      />
      <Navbar />
      
      <main>
        {/* Section 1: Hero */}
        <section className="pt-32 pb-20 px-6 bg-indigo-50/30">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 uppercase">
                The Future of <span className="text-indigo-600">Commerce.</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Build, launch, and scale your global storefront with our enterprise-grade commerce infrastructure. 
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <button className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">
                  Start Your Store
                </button>
                <button className="px-8 py-4 bg-white text-indigo-600 border border-indigo-200 font-bold rounded-xl hover:bg-indigo-50 transition-all">
                  Documentation
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 2: Features Grid */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {commerceFeatures.map((f, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-8 bg-gray-50 rounded-3xl border border-gray-100 transition-all"
                >
                  <div className="mb-6">{f.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-gray-500 mb-6 text-sm leading-relaxed">{f.description}</p>
                  <div className="space-y-2">
                    {f.details.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        {d}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Value Prop */}
        <section className="py-24 px-6 border-y border-gray-100">
           <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                 <h2 className="text-4xl font-black leading-tight">Beyond a Simple Shopping Cart.</h2>
                 <p className="text-lg text-gray-600 leading-relaxed">
                    We provide a full-stack commerce engine that handles the complexity of modern retail. From multi-tenant architecture to complex shipping logic, we have the tools you need.
                 </p>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                       <BarChart3 className="text-indigo-600 w-6 h-6 mt-1" />
                       <div>
                          <h4 className="font-bold">Real-time Analytics</h4>
                          <p className="text-sm text-gray-500">Track every conversion and customer journey.</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <Smartphone className="text-indigo-600 w-6 h-6 mt-1" />
                       <div>
                          <h4 className="font-bold">Mobile Ready</h4>
                          <p className="text-sm text-gray-500">Optimized for rapid mobile shopping experiences.</p>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="h-[400px] bg-indigo-600 rounded-3xl relative overflow-hidden shadow-2xl">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent)]" />
                 <div className="flex items-center justify-center h-full text-white/20 select-none">
                    <ShoppingBag className="w-48 h-48" />
                 </div>
              </div>
           </div>
        </section>

        {/* Section 4: Global Reach */}
        <section className="py-24 px-6 bg-gray-900 text-white overflow-hidden">
           <div className="max-w-7xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-black mb-6">Global Scale. Local Reach.</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Wherever your customers are, we deliver a local experience with global efficiency.</p>
           </div>
           <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12 text-center">
              <div>
                 <div className="text-4xl font-black text-indigo-400 mb-2">130+</div>
                 <p className="text-gray-400">Currencies Supported</p>
              </div>
              <div>
                 <div className="text-4xl font-black text-indigo-400 mb-2">250+</div>
                 <p className="text-gray-400">Payment Methods</p>
              </div>
              <div>
                 <div className="text-4xl font-black text-indigo-400 mb-2">0.05s</div>
                 <p className="text-gray-400">Avg. API Response</p>
              </div>
           </div>
        </section>

        {/* Section 5: CTA */}
        <section className="py-32 px-6">
           <div className="max-w-5xl mx-auto p-12 bg-indigo-600 rounded-[2rem] text-center text-white relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500 rounded-full blur-3xl opacity-50" />
              <div className="relative z-10">
                 <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Sell Anything, Anywhere.</h2>
                 <p className="text-indigo-100 mb-10 text-xl max-w-2xl mx-auto">Join 10,000+ brands using our commerce infrastructure to power their growth.</p>
                 <button className="px-12 py-5 bg-white text-indigo-600 font-black rounded-full hover:scale-105 transition-all text-lg shadow-xl shadow-indigo-900/20">
                    Get Started Now
                 </button>
              </div>
           </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
