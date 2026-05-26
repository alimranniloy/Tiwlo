import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIspRouterWithApi, createIspSiteWithApi, notifyDataRefresh } from '../../lib/tiwloApi';
import { 
  ArrowLeft, 
  Server, 
  Terminal, 
  Lock, 
  Key, 
  Globe, 
  Plus, 
  PlayCircle, 
  Info,
  Shield,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Search,
  Copy,
  Check
} from 'lucide-react';

export default function ISPAddRouter() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('enterprise');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    siteName: '',
    subdomain: '',
    clusterSize: 'standard',
    ip: '',
    port: '8728',
    username: '',
    password: '',
    region: 'asia-south-1',
    customDomain: '',
    useCustomDomain: false
  });

  const plans = [
    {
      id: 'starter',
      name: 'Starter Hub',
      price: '29',
      description: 'Standard local ISP tier',
      features: [
        '1 MikroTik Node Allowed',
        '500 User Allowance',
        '2 Global Regions',
        'Basic RADIUS Engine',
        '24/7 Server Monitoring'
      ],
      color: 'blue'
    },
    {
      id: 'enterprise',
      name: 'Enterprise Backbone',
      price: '99',
      description: 'Regional fiber management',
      features: [
        '10 MikroTik Nodes Allowed',
        '15,000 User Allowance',
        'All Global Regions',
        'Advanced RADIUS + API',
        'Priority Bandwidth Shaping'
      ],
      color: 'indigo'
    },
    {
      id: 'global',
      name: 'Global Carrier',
      price: '249',
      description: 'Large scale infrastructure',
      features: [
        'Unlimited Nodes Allowed',
        'Unlimited User Allowance',
        'Dedicated Cluster Host',
        'BGP & Peering Analytics',
        'White-label Billing Panel'
      ],
      color: 'purple'
    }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    const code = (formData.subdomain || formData.siteName || 'isp-site')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    try {
      const site = await createIspSiteWithApi({
        name: formData.siteName || code,
        code,
        region: formData.region,
        node: `${selectedPlan} node`,
        bandwidth: selectedPlan === 'global' ? '100 Gbps' : selectedPlan === 'enterprise' ? '12.4 Gbps' : '1 Gbps',
        planCode: selectedPlan,
        settings: {
          customDomain: formData.useCustomDomain ? formData.customDomain : undefined,
          apiPort: formData.port,
          clusterSize: formData.clusterSize
        }
      });

      if (formData.ip) {
        await createIspRouterWithApi({
          siteId: site.id,
          name: `${formData.siteName || 'ISP'} MikroTik Core`,
          ip: formData.ip,
          vendor: 'MikroTik',
          config: {
            port: formData.port,
            username: formData.username,
            customDomain: formData.useCustomDomain ? formData.customDomain : undefined
          }
        });
      }

      notifyDataRefresh();
      navigate(`/isp-billing/admin?siteId=${site.id}`);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to deploy ISP billing site');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
        <button 
          onClick={() => navigate('/isp-billing')}
          className="text-gray-400 hover:text-gray-900 bg-white border border-gray-200 p-2 rounded-sm hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Provision SaaS Cluster</h1>
          <p className="text-sm text-gray-500 mt-1">Scale your ISP operations with enterprise RADIUS and fiber management.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-8 mb-8 overflow-x-auto no-scrollbar pb-2">
         {[
           { n: 1, label: 'Choose Plan' },
           { n: 2, label: 'General Identity' },
           { n: 3, label: 'Core Handshake' },
           { n: 4, label: 'Domain Setup' },
           { n: 5, label: 'Finalize' }
         ].map((s) => (
           <div key={s.n} className="flex items-center gap-3 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s.n ? 'bg-[#0069ff] text-white' : 'bg-gray-100 text-gray-400'}`}>
                 {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-sm font-bold tracking-tight ${step >= s.n ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              {s.n < 5 && <div className="w-8 h-px bg-gray-200 ml-2"></div>}
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Form Area */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`cursor-pointer p-6 bg-white border-2 rounded-sm transition-all flex flex-col ${
                        selectedPlan === plan.id ? 'border-[#0069ff]' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="font-bold text-gray-900">{plan.name}</h3>
                           {selectedPlan === plan.id && <CheckCircle2 className="w-4 h-4 text-[#0069ff]" />}
                        </div>
                        <div className="mb-4">
                           <span className="text-2xl font-black text-gray-900">${plan.price}</span>
                           <span className="text-xs text-gray-400 ml-1">/mo</span>
                        </div>
                        <ul className="space-y-2.5 mb-6">
                           {plan.features.map((f, i) => (
                             <li key={i} className="flex items-start gap-2">
                               <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5" />
                               <span className="text-[12px] text-gray-600 font-medium leading-tight">{f}</span>
                             </li>
                           ))}
                        </ul>
                      </div>
                      <div className={`mt-auto text-center py-2 rounded-sm text-[10px] font-black uppercase tracking-widest ${selectedPlan === plan.id ? 'bg-[#0069ff] text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {selectedPlan === plan.id ? 'Selected Tier' : 'Select Plan'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white p-8 rounded-sm border border-gray-200 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-4 mb-4">
                   <div className="p-2 bg-blue-50 rounded-sm">
                      <Terminal className="w-5 h-5 text-[#0069ff]" />
                   </div>
                   <h2 className="text-lg font-bold text-gray-900">General Identity</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Site Identity Name</label>
                      <input 
                        type="text" 
                        name="siteName"
                        value={formData.siteName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Dhaka Metro Core" 
                        className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 bg-gray-50/30 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Preferred Subdomain</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          name="subdomain"
                          value={formData.subdomain}
                          onChange={handleChange}
                          required
                          placeholder="dhaka-metro" 
                          className="w-full pl-4 pr-32 py-3 bg-gray-50/30 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">.tiwlo.com</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Deployment Region</label>
                    <select 
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all bg-gray-50/30 font-medium cursor-pointer"
                    >
                       <option value="asia-south-1">Asia-South (Dhaka Cluster)</option>
                       <option value="asia-southeast-1">Asia-Southeast (Singapore Cluster)</option>
                       <option value="us-east-1">US-East (New York Cluster)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-white p-8 rounded-sm border border-gray-200 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-4 mb-4">
                   <div className="p-2 bg-indigo-50 rounded-sm">
                      <Cpu className="w-5 h-5 text-indigo-600" />
                   </div>
                   <h2 className="text-lg font-bold text-gray-900">Network Handshake</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">MikroTik IP / Host</label>
                      <input 
                        type="text" 
                        name="ip"
                        value={formData.ip}
                        onChange={handleChange}
                        required
                        placeholder="103.112.58.x" 
                        className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono bg-gray-50/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">API Port</label>
                      <input 
                        type="text" 
                        name="port"
                        value={formData.port}
                        onChange={handleChange}
                        className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono bg-gray-50/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">API Username</label>
                      <input 
                        type="text" 
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all bg-gray-50/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">API Password</label>
                      <input 
                        type="password" 
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all bg-gray-50/30"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="bg-white p-8 rounded-sm border border-gray-200 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                  <div className="p-2 bg-blue-50 rounded-sm">
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Custom Domain Configuration</h2>
                </div>

                <div className="flex items-start gap-4 p-5 bg-gray-50 border border-gray-200 rounded-sm">
                  <input 
                    type="checkbox" 
                    name="useCustomDomain"
                    checked={formData.useCustomDomain}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Enable Custom DNS Mapping</h4>
                    <p className="text-[11px] text-gray-500 mt-1">Map your enterprise IP to a custom domain for white-label client panels.</p>
                  </div>
                </div>

                {formData.useCustomDomain && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Enter Root Domain</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          name="customDomain"
                          value={formData.customDomain}
                          onChange={handleChange}
                          placeholder="radius.yourisp.com" 
                          className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 transition-all font-medium"
                        />
                        <button type="button" className="px-4 py-2 bg-gray-900 text-white text-[10px] font-bold uppercase rounded-sm hover:bg-black transition-all flex items-center gap-2">
                          <Search className="h-3 w-3" /> Verify Record
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-900/5 p-6 rounded-sm border border-blue-100">
                        <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Required CNAME / A Records</h5>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-3 bg-white rounded border border-blue-100">
                              <div>
                                <span className="block text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">Target IP</span>
                                <code className="text-xs font-bold text-gray-900">{formData.ip || '103.x.x.x'}</code>
                              </div>
                              <button type="button" onClick={() => handleCopy(formData.ip)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                 {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                           </div>
                           <div className="flex items-center justify-between p-3 bg-white rounded border border-blue-100">
                              <div>
                                <span className="block text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">Cloud Edge Proxy</span>
                                <code className="text-xs font-bold text-gray-900">tiwlo.com</code>
                              </div>
                              <button type="button" onClick={() => handleCopy('tiwlo.com')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                           </div>
                        </div>
                      </div>

                      <div className="bg-gray-900 p-6 rounded-sm text-white">
                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Status Monitor</h5>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                            <span className="text-gray-400">DNS Ownership</span>
                            <span className="text-orange-400 font-bold flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div> Pending
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                            <span className="text-gray-400">SSL Certificate</span>
                            <span className="text-gray-600 font-bold">Waiting...</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2">
                             <span className="text-gray-500 italic text-[10px]">PowerDNS route queued...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="bg-white p-8 rounded-sm border border-gray-200 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="text-center py-4">
                    <div className="w-16 h-16 bg-blue-50 text-[#0069ff] rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                       <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Confirm Subscription</h2>
                    <p className="text-sm text-gray-500 mt-2">Provisioning will begin immediately after confirmation.</p>
                 </div>

                 <div className="bg-gray-50 rounded-sm p-6 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                       <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Plan Selection</span>
                       <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm uppercase">{selectedPlan} Tier</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-xs text-gray-500">Site Identity</span>
                       <span className="text-xs font-bold text-gray-900">{formData.siteName || 'Default Node'}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-xs text-gray-500">Public URL</span>
                       <span className="text-xs font-bold text-indigo-600 font-mono italic">{formData.subdomain ? `isp-${formData.subdomain}.tiwlo.com` : 'isp-dhaka-metro.tiwlo.com'}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-xs text-gray-500">Infrastructure Region</span>
                       <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">{formData.region}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-200">
                       <span className="text-sm font-bold text-gray-900">Total Monthly Renewal</span>
                       <span className="text-lg font-black text-gray-900">${plans.find(p => p.id === selectedPlan)?.price}.00</span>
                    </div>
                 </div>

                 <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-sm">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                       Provisioning creates an isolated RADIUS cluster. Ensure your MikroTik has the API service active and whitelisted for connectivity from the SaaS cloud.
                    </p>
                 </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6">
              <button 
                type="button"
                onClick={() => step > 1 ? setStep(step - 1) : navigate('/isp-billing')}
                className="px-6 py-2.5 font-bold text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {step === 1 ? 'Cancel' : 'System: Back'}
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="px-10 py-3 bg-gray-900 hover:bg-black text-white rounded-sm text-sm font-bold transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {submitting ? 'Deploying...' : step < 5 ? 'Continue Setup' : 'Activate & Deploy Site'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-blue-50 rounded-sm">
                    <Layers className="w-5 h-5 text-blue-600" />
                 </div>
                 <h3 className="font-bold text-gray-900 text-sm tracking-tight">Active Summary</h3>
              </div>
              
              <div className="space-y-5">
                 <div>
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nodes Requested</span>
                    <span className="text-sm font-bold text-gray-900">1 Core Node</span>
                 </div>
                 
                 <div>
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Infrastructure</span>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest leading-relaxed">Global Fiber Backbone</span>
                 </div>

                 <div className="pt-5 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-green-600">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                       REAL-TIME PROVISIONING ACTIVE
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-gray-50 p-6 rounded-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                 <PlayCircle className="w-4 h-4 text-blue-600" /> Site Checklist
              </h3>
              <ul className="space-y-3">
                 {[
                   'Active MikroTik License',
                   'API-Svc Port Open',
                   'Radius-Svc Configured',
                   'Public IP Reachable'
                 ].map((item, i) => (
                   <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-200 mt-0.5" />
                      <span className="text-[11px] text-gray-500 font-medium leading-tight">{item}</span>
                   </li>
                 ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
