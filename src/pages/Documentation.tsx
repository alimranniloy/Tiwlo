import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Book, 
  Search, 
  ChevronRight, 
  Server, 
  Globe, 
  Shield, 
  ShieldCheck, 
  Terminal, 
  Database, 
  Cpu, 
  Zap, 
  ArrowRight,
  Code2,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Info,
  Clock,
  Layers,
  Box,
  Copy,
  Check,
  HardDrive,
  Activity,
  CreditCard,
  Lock,
  Smartphone,
  Cpu as CpuIcon
} from 'lucide-react';
import { useCurrency } from '../lib/useCurrency';
import Seo, { createTiwloBreadcrumbSchema, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';

const documentationDescription =
  'Read Tiwlo documentation for cloud hosting, droplets, networking, DNS, storage, databases, monitoring, billing, API usage, and security workflows.';

const documentationSchema = [
  tiwloOrganizationSchema,
  tiwloWebsiteSchema,
  {
    '@type': 'TechArticle',
    '@id': 'https://tiwlo.com/documentation#webpage',
    url: 'https://tiwlo.com/documentation',
    name: 'Tiwlo Documentation',
    headline: 'Tiwlo cloud hosting and platform documentation',
    description: documentationDescription,
    keywords: 'Tiwlo documentation, cloud hosting docs, VPS documentation, DNS guide, API documentation, hosting support docs',
    dateModified: '2026-06-14',
    inLanguage: 'en',
    isPartOf: { '@id': 'https://tiwlo.com/#website' },
    publisher: { '@id': 'https://tiwlo.com/#organization' },
    about: { '@id': 'https://tiwlo.com/#organization' },
    breadcrumb: { '@id': 'https://tiwlo.com/documentation#breadcrumb' }
  },
  createTiwloBreadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'Documentation', item: '/documentation' }
    ],
    'https://tiwlo.com/documentation#breadcrumb'
  )
];

export default function Documentation() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'docs' });
  const docsSectionFromSearch = (search = '') => {
    const params = new URLSearchParams(search);
    const section = String(params.get('section') || '').toLowerCase();
    if (['tiwlo-pay-api', 'tiwlo-pay', 'payments'].includes(section)) return 'Tiwlo-Pay-API';
    return 'Introduction';
  };
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => docsSectionFromSearch(location.search));
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || params.get('search') || '';
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const docsOrigin = (() => {
    if (typeof window === 'undefined') return 'https://tiwlo.com';
    const localHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
    return localHostnames.has(window.location.hostname) ? 'https://tiwlo.com' : window.location.origin;
  })();
  const tiwloPayApiBase = `${docsOrigin}/api/tiwlo-pay/v1`;

  React.useEffect(() => {
    setActiveSection(docsSectionFromSearch(location.search));
  }, [location.search]);

  const sections = [
    { 
      id: 'Introduction', 
      title: 'Introduction', 
      icon: Book,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
            <h2 className="text-lg font-bold text-blue-900 mb-1">Welcome to Tiwlo Cloud</h2>
            <p className="text-blue-800 text-sm leading-relaxed">
              Tiwlo is a next-generation cloud service provider offering scalable infrastructure, managed databases, and developer-friendly tools. This documentation will guide you through our core services and help you build enterprise-grade applications.
            </p>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-[#2e3d49] mb-4">Platform Overview</h3>
            <p className="text-[#4a4a4a] leading-relaxed mb-6">
              Our platform is built on top of high-performance NVMe storage and dedicated core processors. We've simplified the complex world of infrastructure so you can focus on writing code.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Global Infrastructure', desc: 'Deploy in 15+ data centers worldwide with <10ms latency.', icon: Globe },
                { title: '99.99% Uptime SLA', desc: 'Our redundant architecture ensures your services stay online.', icon: ShieldCheck },
                { title: 'Developer API', desc: 'Complete control via our RESTful API and CLI tools.', icon: Terminal },
                { title: 'Smart Billing', desc: 'Pay only for what you use with hourly granularity.', icon: Zap },
              ].map(feature => (
                <div key={feature.title} className="p-4 bg-gray-50 hover:bg-gray-100 transition-all group border border-transparent hover:border-gray-200 rounded-lg">
                   <feature.icon className="h-5 w-5 text-blue-600 mb-2" />
                   <h4 className="font-bold text-[#2e3d49] text-sm mb-1">{feature.title}</h4>
                   <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <h3 className="text-xl font-bold text-[#2e3d49] mb-4">Getting Started</h3>
            <p className="text-[#4a4a4a] leading-relaxed mb-4">Follow these steps to deploy your first application:</p>
            <div className="space-y-3">
              {[
                'Create an account and set up billing.',
                'Generate an SSH key for secure access.',
                'Deploy your first Droplet or App Platform project.',
                'Configure your domain nameservers.',
                'Enable daily backups to protect your data.'
              ].map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                   <div className="w-6 h-6 bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</div>
                   <p className="text-sm text-[#4a4a4a]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    { 
      id: 'Droplets', 
      title: 'Droplets (VMs)', 
      icon: Server,
      content: (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2e3d49] mb-4">Compute Instances</h2>
            <p className="text-[#4a4a4a] leading-relaxed">
              Droplets are our scalable virtual machines. Each droplet we provide is a full server that you can use for web servers, database clusters, or development environments.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#2e3d49]">Instance Types</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Best For</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pricing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-4 font-bold text-[#0069ff]">General Purpose</td>
                    <td className="px-4 py-4 text-sm text-[#4a4a4a]">Web servers, small DBs</td>
                    <td className="px-4 py-4 text-sm font-mono">{money(5, 'USD')} - {money(80, 'USD')}/mo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 font-bold text-indigo-600">CPU Optimized</td>
                    <td className="px-4 py-4 text-sm text-[#4a4a4a]">High traffic, ML training</td>
                    <td className="px-4 py-4 text-sm font-mono">{money(40, 'USD')} - {money(480, 'USD')}/mo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 font-bold text-amber-600">Memory Optimized</td>
                    <td className="px-4 py-4 text-sm text-[#4a4a4a]">In-memory DBs, Caching</td>
                    <td className="px-4 py-4 text-sm font-mono">{money(80, 'USD')} - {money(960, 'USD')}/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-100 p-5 rounded-lg space-y-3">
             <h3 className="font-bold text-[#2e3d49] text-sm">Backup Policy</h3>
             <p className="text-xs text-[#4a4a4a]">Backups are disk images of your Droplets. When enabled, we automatically create a backup once a week. We recommend keeping backups enabled for all production instances.</p>
             <div className="flex items-center gap-2 text-xs font-bold text-[#0069ff]">
               Learn about Recovery <ArrowRight className="h-3 w-3" />
             </div>
          </div>

          <div className="bg-gray-900 p-5 text-white overflow-hidden relative rounded-lg">
            <div className="relative z-10">
              <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">Quick Setup via CLI</p>
              <div className="flex items-center justify-between gap-4 font-mono text-xs bg-black/40 p-3 rounded-md">
                <span className="text-emerald-400 flex items-center gap-2">
                  <span className="text-gray-500">$</span> twlo droplets create --name "prod-web-01" --region "sgp1" --size "s-1vcpu-2gb"
                </span>
                <button 
                  onClick={() => handleCopy('cli-1', 'twlo droplets create --name "prod-web-01" --region "sgp1" --size "s-1vcpu-2gb"')}
                  className="p-1.5 hover:bg-white/10 rounded transition-all"
                >
                  {copiedId === 'cli-1' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    { 
      id: 'VPC', 
      title: 'VPC Networking', 
      icon: Shield,
      content: (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2e3d49] mb-4">Virtual Private Cloud (VPC)</h2>
            <p className="text-[#4a4a4a] leading-relaxed">
              VPC networking provides an isolated network layer for all your resources. Every account comes with a default VPC enabling secure internal communication between Droplets and Databases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-5 bg-gray-50 border border-gray-100 uppercase rounded-lg">
                <h4 className="font-bold text-[#2e3d49] text-[10px] mb-1">Internal IPs</h4>
                <p className="text-[10px] text-gray-400">Communicate between nodes using private 10.x.x.x addresses for zero-cost bandwidth.</p>
             </div>
             <div className="p-5 bg-gray-50 border border-gray-100 uppercase rounded-lg">
                <h4 className="font-bold text-[#2e3d49] text-[10px] mb-1">Isolation</h4>
                <p className="text-[10px] text-gray-400">Your resources are logically separated from other users at the hypervisor level.</p>
             </div>
          </div>

          <div className="bg-blue-50 p-5 border border-blue-100 rounded-lg">
             <h3 className="font-bold text-blue-900 mb-1 text-xs">Security Policy 2.0</h3>
             <p className="text-xs text-blue-800">All new accounts must enable Default VPC. Legacy networking is no longer supported for new deployments.</p>
          </div>
        </div>
      )
    },
    { 
      id: 'Load-Balancers', 
      title: 'Load Balancers', 
      icon: Layers,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#2e3d49]">High Availability Load Balancers</h2>
          <p className="text-[#4a4a4a]">Distribute traffic across multiple Droplets to ensure high performance and application reliability.</p>
          
          <div className="space-y-4">
             {[
               { t: 'HTTP/2 Support', d: 'Fully supports modern web standards and binary protocols.' },
               { t: 'SSL Termination', d: 'Free Let\'s Encrypt certificates managed automatically.' },
               { t: 'Health Checks', d: 'Automatically routes traffic away from unhealthy instances.' },
               { t: 'Sticky Sessions', d: 'Ensure users stay connected to the same backend node.' }
             ].map(item => (
               <div key={item.t} className="p-3 bg-gray-50 border-l-2 border-blue-600 rounded-r-md">
                  <h4 className="font-bold text-[#2e3d49] text-xs mb-1">{item.t}</h4>
                  <p className="text-[10px] text-gray-500">{item.d}</p>
               </div>
             ))}
          </div>
        </div>
      )
    },
    { 
      id: 'Storage', 
      title: 'Volumes & Spaces', 
      icon: HardDrive,
      content: (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2e3d49] mb-4">Scalable Storage Solutions</h2>
            <p className="text-[#4a4a4a]">Scale your storage independently of your compute resources with our block and object storage offerings.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <div className="flex gap-4 items-start p-5 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="w-10 h-10 bg-white flex items-center justify-center shrink-0 rounded-md">
                   <Box className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                   <h4 className="font-bold text-[#2e3d49] text-sm mb-1">Block Storage (Volumes)</h4>
                   <p className="text-xs text-gray-500 leading-relaxed mb-3">
                      SSD-based block storage that can be attached to any Droplet in the same region. Ideal for databases and file systems that require high IOPS.
                   </p>
                   <ul className="text-[10px] text-gray-400 space-y-1 list-disc ml-4">
                      <li>Resize up to 16TiB</li>
                      <li>Automated formatting scripts</li>
                      <li>High-availability NVMe performance</li>
                   </ul>
                </div>
             </div>

             <div className="flex gap-4 items-start p-5 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="w-10 h-10 bg-white flex items-center justify-center shrink-0 rounded-md">
                   <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                   <h4 className="font-bold text-[#2e3d49] text-sm mb-1">Object Storage (Spaces)</h4>
                   <p className="text-xs text-gray-500 leading-relaxed mb-3">
                      S3-compatible object storage with a built-in CDN. Perfect for hosting static assets, user uploads, and large data sets.
                   </p>
                   <div className="flex gap-2">
                      <span className="px-2 py-1 bg-white text-[10px] font-bold text-gray-400 rounded">Public/Private Buckets</span>
                      <span className="px-2 py-1 bg-white text-[10px] font-bold text-gray-400 rounded">Free Outbound CDN</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )
    },
    { 
      id: 'Networking', 
      title: 'Networking & DNS', 
      icon: Globe,
      content: (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2e3d49] mb-4">VPC & Global DNS</h2>
            <p className="text-[#4a4a4a] leading-relaxed">
              Tiwlo provides an isolated network layer for all your resources. Every account comes with a default VPC (Virtual Private Cloud) enabling secure internal communication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-3">
               <h3 className="font-bold text-[#2e3d49] flex items-center gap-2">
                 <Shield className="h-4 w-4 text-blue-500" /> Cloud Firewalls
               </h3>
               <p className="text-[13px] text-[#4a4a4a] leading-relaxed">
                 Apply stateful firewalls to groups of Droplets. Control both inbound and outbound traffic with granular rules based on port or source IP.
               </p>
             </div>
             <div className="space-y-3">
               <h3 className="font-bold text-[#2e3d49] flex items-center gap-2">
                 <Globe className="h-4 w-4 text-emerald-500" /> Floating IPs
               </h3>
               <p className="text-[13px] text-[#4a4a4a] leading-relaxed">
                 Highly available static IP addresses that can be redirected instantly to any of your Droplets in the same data center.
               </p>
             </div>
          </div>

          <div className="bg-gray-50 p-8 border border-gray-100">
             <h4 className="font-bold text-[#2e3d49] mb-2 text-sm uppercase tracking-wider">Nameserver Setup</h4>
             <p className="text-sm text-[#4a4a4a] mb-6">Point your domain registrar to our global Anycast nameservers for lightning-fast DNS resolution:</p>
             <div className="space-y-2">
                {['ns1.tiwlo.com', 'ns2.tiwlo.com', 'ns3.tiwlo.com'].map(ns => (
                  <div key={ns} className="flex items-center justify-between p-3 bg-white border border-gray-100">
                     <span className="font-mono text-[13px] text-[#2e3d49]">{ns}</span>
                     <button className="text-blue-600 font-bold text-[11px] uppercase">Copy</button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )
    },
    { 
      id: 'Security', 
      title: 'Security & Access', 
      icon: Lock,
      content: (
        <div className="space-y-6">
           <h2 className="text-2xl font-bold text-[#2e3d49]">Security Best Practices</h2>
           <p className="text-[#4a4a4a]">Securing your cloud infrastructure is a top priority. Follow these guidelines to protect your resources.</p>
           
           <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-md">
                 <h4 className="font-bold text-red-900 mb-1 text-sm">SSH Key Authentication</h4>
                 <p className="text-xs text-red-800">We strongly recommend using SSH keys instead of passwords for Droplet access. SSH keys are much more secure and resistant to brute-force attacks.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-5 bg-gray-50 border border-gray-100">
                    <ShieldCheck className="h-5 w-5 text-emerald-500 mb-3" />
                    <h5 className="font-bold text-[#2e3d49] mb-1">Two-Factor Auth (2FA)</h5>
                    <p className="text-xs text-gray-500">Enable 2FA on your account using Google Authenticator or hardware keys.</p>
                 </div>
                 <div className="p-5 bg-gray-50 border border-gray-100">
                    <Smartphone className="h-5 w-5 text-blue-500 mb-3" />
                    <h5 className="font-bold text-[#2e3d49] mb-1">Team Permissions</h5>
                    <p className="text-xs text-gray-500">Use RBAC to grant specific permissions to team members.</p>
                 </div>
              </div>
           </div>
        </div>
      )
    },
    { 
      id: 'Managed-DB', 
      title: 'Managed Databases', 
      icon: Database,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#2e3d49]">Enterprise Managed Databases</h2>
          <p className="text-[#4a4a4a]">Focus on your data, not on its maintenance. Our clusters handle patching, backups, and failover automatically.</p>
          
          <div className="grid grid-cols-1 gap-4">
             <div className="p-6 bg-gray-50 border border-gray-100 flex items-start gap-4">
                <div className="w-12 h-12 bg-white flex items-center justify-center shrink-0">
                   <Database className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                   <h4 className="font-bold text-[#2e3d49] mb-1">PostgreSQL & MongoDB</h4>
                   <p className="text-[13px] text-gray-500 leading-relaxed">
                      Deploy relational or document-based clusters with point-in-time recovery and automated daily backups. Scale storage or memory without downtime.
                   </p>
                </div>
             </div>
             <div className="p-6 bg-gray-50 border border-gray-100 flex items-start gap-4">
                <div className="w-12 h-12 bg-white flex items-center justify-center shrink-0">
                   <Zap className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                   <h4 className="font-bold text-[#2e3d49] mb-1">Redis Caching</h4>
                   <p className="text-[13px] text-gray-500 leading-relaxed">
                      Lightning-fast in-memory caching. Perfect for session management, leaderboards, and real-time processing.
                   </p>
                </div>
             </div>
          </div>
        </div>
      )
    },
    { 
      id: 'Monitoring', 
      title: 'Monitoring & Alerts', 
      icon: Activity,
      content: (
        <div className="space-y-6">
           <h2 className="text-2xl font-bold text-[#2e3d49]">Resource Monitoring</h2>
           <p className="text-[#4a4a4a]">Tiwlo includes free monitoring for all Droplets. Gain insights into CPU, memory, and disk usage with real-time graphs.</p>
           
           <div className="space-y-4">
              <div className="p-5 bg-gray-50 border border-gray-100 rounded-lg">
                 <h4 className="font-bold text-[#2e3d49] mb-1 text-xs">Uptime Checks</h4>
                 <p className="text-[11px] text-gray-500">Monitor your website's availability from multiple probes worldwide. Get notified instantly when your service goes down.</p>
              </div>
              <div className="p-5 bg-gray-50 border border-gray-100 rounded-lg">
                 <h4 className="font-bold text-[#2e3d49] mb-1">Alert Policies</h4>
                 <p className="text-[11px] text-gray-500">Set threshold-based alerts for any metric. Receive notifications via Email, Slack, or Webhooks.</p>
              </div>
           </div>
        </div>
      )
    },
    {
      id: 'Tiwlo-Pay-API',
      title: 'Tiwlo Pay API',
      icon: CreditCard,
      content: (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2e3d49] mb-4">Merchant payment gateway API</h2>
            <p className="text-[#4a4a4a] leading-relaxed">
              Verified Tiwlo Pay merchants can create hosted checkout links from their own website, ecommerce plugin, billing panel, or backend. The API returns a stable checkout URL that customers can pay through the enabled Tiwlo Pay gateways.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Base URL', value: tiwloPayApiBase },
              { title: 'Create payment link', value: 'POST /payment-links' },
              { title: 'Create checkout session', value: 'POST /checkout-sessions' },
              { title: 'Read payment status', value: 'GET /payment-links/{idOrSlug}' }
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{item.title}</p>
                <p className="mt-2 break-all font-mono text-[12px] font-bold text-[#2e3d49]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-[#2e3d49]">Authentication</h3>
            <p className="text-sm text-[#4a4a4a]">
              Open Tiwlo Pay, go to API Settings, rotate keys once, then store the secret key only on your server. Send both headers with every server-side request.
            </p>
            <div className="rounded-lg border border-emerald-900 bg-gray-900 p-4 font-mono text-[12px] leading-6 text-emerald-300">
              <div>Authorization: Bearer twsk_live_secret</div>
              <div>X-Tiwlo-Pay-Key: twpk_live_key</div>
              <div>Content-Type: application/json</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-bold text-[#2e3d49]">Create a hosted payment link</h3>
              <button
                onClick={() => handleCopy('tiwlo-pay-create-link', `curl -X POST ${tiwloPayApiBase}/payment-links\n  -H "Authorization: Bearer twsk_live_secret"\n  -H "X-Tiwlo-Pay-Key: twpk_live_key"\n  -H "Content-Type: application/json"\n  -d '{"amount":99,"currency":"USD","title":"Website invoice","customerEmail":"customer@example.com"}'`)}
                className="rounded border border-gray-200 p-2 text-gray-500 hover:text-blue-600"
              >
                {copiedId === 'tiwlo-pay-create-link' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-900 p-4 text-[12px] leading-6 text-emerald-300"><code>{`curl -X POST ${tiwloPayApiBase}/payment-links
  -H "Authorization: Bearer twsk_live_secret"
  -H "X-Tiwlo-Pay-Key: twpk_live_key"
  -H "Content-Type: application/json"
  -d '{
    "amount": 99,
    "currency": "USD",
    "title": "Website invoice",
    "description": "Order #10021",
    "customerName": "Customer Name",
    "customerEmail": "customer@example.com",
    "successUrl": "https://your-site.com/payment/success",
    "cancelUrl": "https://your-site.com/payment/cancel",
    "webhookUrl": "https://your-site.com/webhooks/tiwlo-pay",
    "metadata": {
      "orderId": "10021"
    }
  }'`}</code></pre>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              The response includes <span className="font-mono font-bold">checkoutUrl</span>. Redirect the customer to that URL or show it inside your invoice page.
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-[#2e3d49]">Plugin and website flow</h3>
            <div className="space-y-3">
              {[
                'Save twpk and twsk in your plugin/server settings. Never expose twsk in browser JavaScript.',
                'When an order is placed, call POST /payment-links with amount, currency, customer, return URLs, and your orderId in metadata.',
                'Store the returned id, slug, and checkoutUrl with your local order.',
                'Redirect the customer to checkoutUrl. Tiwlo Pay handles Stripe, PayPal, bKash, or any enabled platform gateway.',
                'After return, call GET /payment-links/{idOrSlug} or GET /transactions to confirm paid status before marking the local order complete.'
              ].map((step, index) => (
                <div key={step} className="flex gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-600 text-[11px] font-black text-white">{index + 1}</div>
                  <p className="text-sm leading-6 text-[#4a4a4a]">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-[#2e3d49]">Response fields</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['id / slug', 'Stable identifiers for lookup and checkout routing.'],
                    ['checkoutUrl', 'Hosted payment page URL for the customer.'],
                    ['status', 'unpaid, paid, expired, or payment_failed.'],
                    ['allowedProviders', 'Gateways enabled for this invoice.'],
                    ['metadata', 'Your orderId, plugin name, webhook URL, and custom references.']
                  ].map(([field, meaning]) => (
                    <tr key={field}>
                      <td className="px-4 py-3 font-mono font-bold text-[#2e3d49]">{field}</td>
                      <td className="px-4 py-3 text-[#4a4a4a]">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'Billing', 
      title: 'Billing & Account', 
      icon: CreditCard,
      content: (
        <div className="space-y-6">
           <h2 className="text-2xl font-bold text-[#2e3d49]">Billing and Invoices</h2>
           <p className="text-[#4a4a4a]">Understand how our hourly billing works and manage your payment methods.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 border border-gray-100">
                 <h4 className="font-bold text-[#2e3d49] mb-1 text-sm">Hourly Granite</h4>
                 <p className="text-xs text-gray-500 leading-relaxed">You only pay for the time your resources are active. If you delete a Droplet after 2 hours, you only pay for 2 hours.</p>
              </div>
              <div className="p-5 bg-gray-50 border border-gray-100">
                 <h4 className="font-bold text-[#2e3d49] mb-1 text-sm">Credit Management</h4>
                 <p className="text-xs text-gray-500 leading-relaxed">Add credits to your account for future invoices. Credits are auto-applied to your monthly bill.</p>
              </div>
           </div>

           <div className="p-6 bg-blue-50 border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-2">Invoice Cycles</h4>
              <p className="text-sm text-blue-800">Invoices are generated on the 1st of every month for the previous month's usage. Payments are automatically charged to your default method on the 3rd.</p>
           </div>
        </div>
      )
    },
    { 
      id: 'API', 
      title: 'API Reference', 
      icon: Terminal,
      content: (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2e3d49] mb-4">REST API v2</h2>
            <p className="text-[#4a4a4a] leading-relaxed">
              The Tiwlo API allows you to manage Droplets and other resources in a programmatic way using conventional HTTP requests.
            </p>
          </div>

          <div className="space-y-4">
             <h3 className="font-bold text-[#2e3d49]">Authentication</h3>
             <p className="text-sm text-[#4a4a4a]">All API requests must be authenticated with a Personal Access Token sent in the Bearer header.</p>
             <div className="bg-gray-900 p-4 font-mono text-[13px] text-emerald-400 border border-emerald-900">
                Authorization: Bearer YOUR_API_TOKEN
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="font-bold text-[#2e3d49]">Endpoints</h3>
             <div className="divide-y divide-gray-100">
                {[
                  { method: 'GET', url: '/v2/droplets', desc: 'List all Droplets' },
                  { method: 'POST', url: '/v2/droplets', desc: 'Create a new Droplet' },
                  { method: 'GET', url: '/v2/volumes', desc: 'List all block storage volumes' },
                  { method: 'DELETE', url: '/v2/firewalls/{id}', desc: 'Delete a specific firewall' },
                ].map(api => (
                  <div key={api.url} className="py-4 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 font-bold ${api.method === 'GET' ? 'bg-emerald-100 text-emerald-600' : api.method === 'POST' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{api.method}</span>
                        <span className="font-mono text-sm text-[#2e3d49]">{api.url}</span>
                     </div>
                     <span className="text-xs text-gray-400">{api.desc}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <>
    <Seo
      title="Documentation - Tiwlo Cloud Hosting, API, DNS, and Billing Guides"
      description={documentationDescription}
      canonicalPath="/documentation"
      keywords={['Tiwlo documentation', 'cloud hosting docs', 'VPS documentation', 'DNS guide', 'API documentation', 'hosting support docs']}
      schema={documentationSchema}
    />
    <div className="mx-auto max-w-[1220px] space-y-6 pb-32">
      {/* Header with Search */}
      <div className="relative rounded-md border-b border-white/5 bg-[#031b4e] px-6 py-10 text-white shadow-[0_12px_28px_rgba(3,27,78,0.15)] md:px-8">
         <div className="max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-xl font-black tracking-tight uppercase">
               Developer Documentation
            </h1>
            <p className="text-xs text-blue-100/50 max-w-xl mx-auto leading-relaxed">
               Searchable guides, API references, and infrastructure tutorials for professional teams.
            </p>
            <div className="relative max-w-lg mx-auto">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
               <input 
                 type="text" 
                 placeholder="Search docs..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full rounded-md border border-white/10 bg-white/10 py-2.5 pl-12 pr-4 text-xs text-white placeholder-blue-300 transition-all focus:bg-white/20 focus:outline-none"
               />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-6">
        {/* Navigation Sidebar */}
        <div className="space-y-8">
           <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-4">Documentation</h3>
              <div className="space-y-1">
                 {sections.map(section => (
                   <button 
                     key={section.id}
                     onClick={() => setActiveSection(section.id)}
                     className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] font-bold transition-all border-l-2 ${
                       activeSection === section.id 
                       ? 'bg-blue-600/5 text-blue-500 border-blue-600' 
                       : 'text-[#4a4a4a] hover:bg-gray-50 border-transparent'
                     }`}
                   >
                     <section.icon className={`h-3.5 w-3.5 ${activeSection === section.id ? 'text-blue-500' : 'text-gray-400'}`} />
                     {section.title}
                     {activeSection === section.id && <ChevronRight className="h-3.5 w-3.5 ml-auto text-blue-400" />}
                   </button>
                 ))}
              </div>
           </div>

           <div className="px-5 border-t border-gray-100 pt-8">
              <h4 className="font-bold text-[#2e3d49] text-[10px] uppercase tracking-[0.2em] mb-4">Support Channels</h4>
              <div className="space-y-4">
                 <div className="p-3 bg-gray-50 grayscale hover:grayscale-0 transition-all cursor-pointer rounded-md border border-gray-100">
                    <p className="text-xs font-bold text-[#2e3d49] mb-1 text-[11px]">Developer Slack</p>
                    <p className="text-[9px] text-gray-400 leading-tight">Join 50k+ devs discussing architecture.</p>
                 </div>
                 <div className="p-3 bg-gray-50 grayscale hover:grayscale-0 transition-all cursor-pointer rounded-md border border-gray-100">
                    <p className="text-xs font-bold text-[#2e3d49] mb-1 text-[11px]">GitHub Discussions</p>
                    <p className="text-[9px] text-gray-400 leading-tight">Request new platform features here.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
           <div className="min-h-[800px] rounded-md border border-[#d9e1ec] bg-white p-8 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                 <div className="p-3 bg-gray-100 rounded-lg">
                    <currentSection.icon className="h-8 w-8 text-blue-600" />
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-0.5">
                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Live Documentation</p>
                    </div>
                    <h2 className="text-3xl font-black text-[#2e3d49] tracking-tight uppercase">{currentSection.title}</h2>
                 </div>
              </div>

              <div className="max-w-4xl space-y-10">
                 {currentSection.content}
              </div>

              <div className="mt-24 pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div>
                    <h4 className="font-bold text-[#2e3d49] mb-1 text-xl uppercase tracking-tighter">Was this helpful?</h4>
                    <p className="text-sm text-gray-400">Your feedback helps us build a better dev experience.</p>
                 </div>
                 <div className="flex gap-1">
                    <button className="px-8 py-3 bg-gray-50 text-xs font-black uppercase hover:bg-gray-100 transition-all border border-gray-200">
                       Yes
                    </button>
                    <button className="px-8 py-3 bg-gray-50 text-xs font-black uppercase hover:bg-gray-100 transition-all border border-gray-200">
                       No
                    </button>
                 </div>
              </div>

              <div className="mt-16 bg-[#031b4e] p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white relative overflow-hidden rounded-lg">
                 <div className="relative z-10">
                    <h4 className="text-xl font-black mb-1 uppercase tracking-tight">Cloud Certification</h4>
                    <p className="text-blue-100/60 max-w-md text-xs">Become a certified Tiwlo infrastructure architect. Enroll in our free masterclass.</p>
                 </div>
                 <button className="bg-white text-[#031b4e] px-8 py-3 font-black text-[10px] uppercase hover:bg-blue-50 transition-all shrink-0 rounded-md">
                    Enroll Now
                 </button>
                 <Zap className="absolute right-0 top-0 h-40 w-40 text-white/5 -translate-y-12 translate-x-12" />
              </div>
           </div>
        </div>
      </div>
    </div>
    </>
  );
}
