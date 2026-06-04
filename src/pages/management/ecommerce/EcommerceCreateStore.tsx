import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkStoreSubdomainAvailability, createStoreWithApi, notifyDataRefresh } from '../../../lib/tiwloApi';
import { OrderCompleteSummary, TowerOrderLoader, type OrderSummary } from '../../../components/SetupLoader';
import { useCurrency } from '../../../lib/useCurrency';
import { 
  ArrowLeft, 
  ShoppingBag, 
  CheckCircle2, 
  Globe, 
  Store, 
  Mail, 
  MapPin, 
  CreditCard,
  Plus,
  ArrowRight,
  Info,
  ShieldCheck,
  Zap,
  Layout,
  Search,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

const normalizeSubdomain = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '');

export default function EcommerceCreateStore() {
  const navigate = useNavigate();
  const { money } = useCurrency({ scope: 'platform', scopeId: 'console' });
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderPhase, setOrderPhase] = useState<'form' | 'loading' | 'complete'>('form');
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [subdomainStatus, setSubdomainStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    subdomain: string;
    domain: string;
    reason?: string;
  }>({ checking: false, available: null, subdomain: '', domain: '' });
  
  const [formData, setFormData] = useState({
    storeName: '',
    subdomain: '',
    category: 'fashion',
    contactEmail: '',
    phone: '',
    address: '',
    customDomain: '',
    useCustomDomain: false
  });

  const plans = [
    {
      id: 'basic',
      name: 'Basic Merchant',
      price: '19',
      description: 'For growing small businesses',
      features: [
        '500 Products Allowed',
        '1 Custom Domain Allowed',
        'Inventory Management',
        'Email Marketing Tools',
        '1% Transaction Fee'
      ]
    },
    {
      id: 'pro',
      name: 'Business Pro',
      price: '49',
      description: 'Advanced tools for large stores',
      features: [
        '10,000 Products Allowed',
        '3 Custom Domains Allowed',
        'Advanced Analytics Hub',
        'Priority Phone Support',
        '0.5% Transaction Fee'
      ]
    },
    {
      id: 'enterprise',
      name: 'Global Enterprise',
      price: '199',
      description: 'Dedicated infrastructure for brands',
      features: [
        'Unlimited Products',
        'Unlimited Domains',
        'Dedicated Cluster Instance',
        'Custom API Integrations',
        'Zero Transaction Fees'
      ]
    }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let value: string | boolean = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    if (e.target.name === 'subdomain' && typeof value === 'string') value = normalizeSubdomain(value);
    setFormData({ ...formData, [e.target.name]: value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);
  const normalizedSubdomain = useMemo(() => normalizeSubdomain(formData.subdomain || formData.storeName || ''), [formData.storeName, formData.subdomain]);
  const generatedDomain = subdomainStatus.domain || `${normalizedSubdomain || 'shop'}.tiwlo.com`;

  useEffect(() => {
    if (!normalizedSubdomain) {
      setSubdomainStatus({ checking: false, available: null, subdomain: '', domain: '' });
      return;
    }

    let cancelled = false;
    setSubdomainStatus((current) => ({
      ...current,
      checking: true,
      subdomain: normalizedSubdomain,
      domain: `${normalizedSubdomain}.tiwlo.com`
    }));

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkStoreSubdomainAvailability(normalizedSubdomain);
        if (!cancelled) setSubdomainStatus({ checking: false, ...result });
      } catch (err) {
        if (!cancelled) {
          setSubdomainStatus({
            checking: false,
            available: false,
            subdomain: normalizedSubdomain,
            domain: `${normalizedSubdomain}.tiwlo.com`,
            reason: err instanceof Error ? err.message : 'Unable to check subdomain.'
          });
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedSubdomain]);

  const ensureSubdomainAvailable = async () => {
    if (!normalizedSubdomain) throw new Error('Choose a store subdomain first.');
    if (subdomainStatus.subdomain === normalizedSubdomain && subdomainStatus.available === true) return normalizedSubdomain;
    const result = await checkStoreSubdomainAvailability(normalizedSubdomain);
    setSubdomainStatus({ checking: false, ...result });
    if (!result.available) throw new Error(result.reason || 'This subdomain is not available.');
    return result.subdomain;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step < 5) {
      try {
        if (step === 2) await ensureSubdomainAvailable();
        if (step === 4 && formData.useCustomDomain && !formData.customDomain.trim()) {
          throw new Error('Enter your custom domain or turn off custom domain hosting.');
        }
        nextStep();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Please check the form details.');
      }
    } else {
      setSubmitting(true);

      try {
        const slug = await ensureSubdomainAvailable();
        const createdStore = await createStoreWithApi({
          name: formData.storeName || slug,
          slug,
          category: formData.category,
          planCode: selectedPlan,
          contactEmail: formData.contactEmail,
          phone: formData.phone,
          address: formData.address,
          customDomain: formData.useCustomDomain ? formData.customDomain : undefined,
          settings: {
            useCustomDomain: formData.useCustomDomain,
            rootDomain: 'tiwlo.com',
            provisionedFrom: 'store-create-flow'
          }
        });
        notifyDataRefresh();
        const plan = plans.find((item) => item.id === selectedPlan);
        setOrderSummary({
          title: 'E-commerce store order completed',
          invoiceNumber: 'Processing',
          orderNumber: createdStore.slug ? `STORE-${createdStore.slug}` : createdStore.id,
          packageName: plan?.name || selectedPlan,
          serverIp: createdStore.slug ? `${createdStore.slug}.tiwlo.com` : createdStore.id,
          monthlyCost: Number(plan?.price || 0),
          hourlyRate: Number(((Number(plan?.price || 0) / 730) || 0).toFixed(4)),
          status: 'Store provisioned',
          supportPath: '/support'
        });
        setOrderPhase('loading');
        window.setTimeout(() => setOrderPhase('complete'), 10000);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to deploy store');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (orderPhase === 'loading') {
    return (
      <TowerOrderLoader
        messages={[
          'Setting up your commerce store',
          'Checking selected plan',
          'Provisioning storefront modules',
          'Preparing dashboard access',
          'Syncing domain settings',
          'Finalizing store summary'
        ]}
      />
    );
  }

  if (orderPhase === 'complete' && orderSummary) {
    return <OrderCompleteSummary summary={orderSummary} onPrimary={() => navigate('/store/admin')} />;
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
        <button 
          onClick={() => navigate('/store')}
          className="p-2 border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Deploy E-Commerce Instance</h1>
          <p className="text-sm text-gray-500">Configure your global merchant store on our high-performance SaaS infrastructure.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-between mb-12 overflow-x-auto no-scrollbar pb-4 px-1">
        {[
          { n: 1, label: 'Plan Selection' },
          { n: 2, label: 'Store Identity' },
          { n: 3, label: 'Merchant Details' },
          { n: 4, label: 'Domain Setup' },
          { n: 5, label: 'Provision Store' }
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-3 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= s.n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </div>
            <span className={`text-sm font-bold tracking-tight ${step >= s.n ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {s.n < 5 && <div className="w-12 h-px bg-gray-200 ml-2"></div>}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          
          {/* Step 1: Packages */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                   <h2 className="text-xl font-bold text-gray-900 tracking-tight">Select Infrastructure Tier</h2>
                   <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Scalable commerce clusters ready</p>
                </div>
                {selectedPlan && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest animate-in zoom-in">
                    Selected: {selectedPlan}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
                {plans.map((plan) => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`group relative p-6 bg-white border-2 rounded-sm cursor-pointer transition-all flex flex-col min-h-[380px] ${
                      selectedPlan === plan.id ? 'border-blue-600' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-sm transition-colors ${selectedPlan === plan.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                           <Zap className="h-4 w-4" />
                        </div>
                        {selectedPlan === plan.id && (
                          <div className="flex items-center gap-1 text-blue-600">
                             <CheckCircle2 className="h-4 w-4" />
                             <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-black text-gray-900 tracking-tight mb-1">{plan.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em] mb-4">{plan.description}</p>
                      
                      <div className="flex items-baseline mb-6">
                        <span className="text-4xl font-black text-gray-900 tracking-tighter">{money(Number(plan.price || 0), 'USD')}</span>
                        <span className="text-xs font-bold text-gray-400 ml-1.5 uppercase">/ mo</span>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Plan Features</p>
                        <div className="grid grid-cols-1 gap-2.5">
                          {plan.features.map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 transition-colors ${selectedPlan === plan.id ? 'text-blue-600' : 'text-emerald-500'}`} />
                              <span className="text-[12px] font-semibold text-gray-600 tracking-tight leading-none">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={`mt-6 text-center py-2.5 rounded-sm text-[10px] font-black uppercase tracking-[0.15em] transition-all border ${
                      selectedPlan === plan.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-600'
                    }`}>
                      {selectedPlan === plan.id ? 'Active Selection' : 'Select Plan'}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-gray-50 p-6 rounded-sm border border-gray-200 border-dashed flex items-center gap-4">
                 <div className="p-3 bg-white rounded-full text-blue-600">
                    <Info className="h-5 w-5" />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-gray-900">Enterprise Customization</h4>
                    <p className="text-[11px] text-gray-500 font-medium">For multi-national brands requiring dedicated clusters or custom SLA contracts, please contact our implementation team before provisioning.</p>
                 </div>
              </div>
            </div>
          )}

          {/* Step 2: Identity */}
          {step === 2 && (
            <div className="bg-white p-8 rounded-sm border border-gray-100 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="p-2 bg-indigo-50 rounded-sm">
                  <Store className="h-5 w-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Brand Identity</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Store Public Name</label>
                    <input 
                      type="text" 
                      name="storeName"
                      required
                      value={formData.storeName}
                      onChange={handleChange}
                      placeholder="e.g. Moonlight Boutique" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Preferred Subdomain</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        name="subdomain"
                        required
                        value={formData.subdomain}
                        onChange={handleChange}
                        placeholder="moonlight" 
                        className="w-full pl-4 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">.tiwlo.com</span>
                    </div>
                    <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold ${
                      subdomainStatus.checking
                        ? 'text-gray-500'
                        : subdomainStatus.available === true
                          ? 'text-emerald-600'
                          : subdomainStatus.available === false
                            ? 'text-red-600'
                            : 'text-gray-400'
                    }`}>
                      {subdomainStatus.checking ? (
                        <>
                          <Info className="h-3.5 w-3.5" /> Checking {generatedDomain}
                        </>
                      ) : subdomainStatus.available === true ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {generatedDomain} is available
                        </>
                      ) : subdomainStatus.available === false ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5" /> {subdomainStatus.reason || 'This subdomain is not available'}
                        </>
                      ) : (
                        <>
                          <Globe className="h-3.5 w-3.5" /> Your store will use {generatedDomain}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Business Category</label>
                    <select 
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium appearance-none"
                    >
                      <option value="fashion">Fashion & Apparel</option>
                      <option value="tech">Electronics & Tech</option>
                      <option value="home">Home & Decor</option>
                      <option value="beauty">Beauty & Health</option>
                    </select>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm">
                    <p className="text-[11px] text-blue-600 leading-relaxed font-medium">
                      Store identifiers are checked in real time and published under the configured PowerDNS root with automatic SSL.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Merchant Details */}
          {step === 3 && (
            <div className="bg-white p-8 rounded-sm border border-gray-100 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="p-2 bg-emerald-50 rounded-sm">
                  <Mail className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Merchant Contact</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Business Email</label>
                  <input 
                    type="email" 
                    name="contactEmail"
                    required
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="sales@moonlight.com" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Support Phone</label>
                  <input 
                    type="text" 
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+880 1XXX-XXXXXX" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Store Physical Address</label>
                  <textarea 
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Street No, Area, City, Zip Code" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Domain Setup */}
          {step === 4 && (
            <div className="bg-white p-8 rounded-sm border border-gray-100 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
                  <h4 className="text-sm font-bold text-gray-900">Enable Custom Domain Hosting</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Connect your existing domain to our commerce cloud infrastructure.</p>
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
                        placeholder="www.yourstore.com" 
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-blue-500 transition-all font-medium"
                      />
                      <button type="button" className="px-4 py-2 bg-gray-900 text-white text-[10px] font-bold uppercase rounded-sm hover:bg-black transition-all flex items-center gap-2">
                        <Search className="h-3 w-3" /> Scan Domain
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-900/5 p-6 rounded-sm border border-blue-100">
                      <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Required DNS Target</h5>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between p-3 bg-white rounded border border-blue-100">
                            <div>
                              <span className="block text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">CNAME Target</span>
                              <code className="text-xs font-bold text-gray-900">tiwlo.com</code>
                            </div>
                            <button type="button" onClick={() => handleCopy('tiwlo.com')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                               {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                         </div>
                         <div className="flex items-center justify-between p-3 bg-white rounded border border-blue-100">
                            <div>
                              <span className="block text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">Platform Route</span>
                              <code className="text-xs font-bold text-gray-900">*.tiwlo.com</code>
                            </div>
                            <button type="button" onClick={() => handleCopy('*.tiwlo.com')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                         </div>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-6 rounded-sm text-white">
                      <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Propagation Status</h5>
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

          {/* Step 5: Provision */}
          {step === 5 && (
            <div className="bg-white p-10 rounded-sm border border-gray-100 text-center animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
                  <ShieldCheck className="h-10 w-10" />
               </div>
               <h2 className="text-2xl font-bold text-gray-900">Complete Store Provisioning</h2>
               <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                 We are ready to deploy your store node to the {selectedPlan} cluster. All merchant tools will be activated immediately.
               </p>

               <div className="mt-8 max-w-sm mx-auto p-6 bg-gray-50 rounded-sm border border-gray-100 text-left space-y-4">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400 font-medium">Selected Tier</span>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400 font-medium">Store URL</span>
                    <span className="text-xs font-bold text-gray-900">{generatedDomain}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-3">
                    <span className="text-sm text-gray-900 font-bold">Total Bill</span>
                    <span className="text-lg font-black text-gray-900">{money(Number(plans.find(p => p.id === selectedPlan)?.price || 0), 'USD')}</span>
                  </div>
               </div>

               <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-sm inline-flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-tight">System Ready for Instant Deployment</span>
               </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6">
            <button 
              type="button"
              onClick={() => step > 1 ? prevStep() : navigate('/store')}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              {step === 1 ? 'Cancel Instance' : 'Previous Step'}
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="px-10 py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-sm transition-all flex items-center gap-2 group disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting ? 'Deploying...' : step === 5 ? 'Confirm & Deploy Store' : 'Next Step'}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 border border-gray-100 rounded-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Layout className="h-4 w-4 text-blue-600" /> Subscription Summary
            </h3>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Store Owner</p>
                <p className="text-sm font-bold text-gray-900 truncate">{formData.storeName || 'Moonlight Store'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Billing Cycle</p>
                <p className="text-sm font-bold text-gray-900">Monthly Billing</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Instance Layer</p>
                <p className="text-sm font-bold text-gray-900">SaaS Multi-Tenant</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-sm text-white relative overflow-hidden">
             <div className="relative z-10">
                <CreditCard className="h-8 w-8 text-blue-300 mb-4" />
                <h4 className="text-lg font-bold mb-1">Secure Checkout</h4>
                <p className="text-xs text-blue-100 leading-relaxed mb-4">You will not be charged until the store is successfully provisioned.</p>
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-200 flex items-center gap-2">
                   <ShieldCheck className="h-3.5 w-3.5" /> 256-bit Encryption
                </div>
             </div>
             <ShoppingBag className="absolute -right-8 -bottom-8 h-32 w-32 text-white/10" />
          </div>

          <div className="bg-gray-50 border border-dashed border-gray-300 p-6 rounded-sm">
             <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-gray-400" />
                <h4 className="text-[11px] font-bold text-gray-900">Quick Configuration</h4>
             </div>
             <p className="text-[100px]- text-[10px] text-gray-500 leading-tight">
               Need help? Reach out to our technical support team for assisted store setup and migration.
             </p>
          </div>
        </div>
      </form>
    </div>
  );
}
