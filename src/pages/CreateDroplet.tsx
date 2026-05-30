import React, { useState } from 'react';
import { 
  Server, 
  Globe, 
  Key, 
  Lock, 
  Settings, 
  ChevronRight, 
  Plus, 
  Cpu, 
  HardDrive, 
  Shield, 
  Zap,
  ArrowLeft,
  CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createCloudResourceOrderWithApi, fetchBillingOverviewWithApi, notifyDataRefresh } from '../lib/tiwloApi';
import { OrderCompleteSummary, TowerOrderLoader, type OrderSummary } from '../components/SetupLoader';

const DISTRIBUTIONS = [
  { id: 'ubuntu', name: 'Ubuntu', version: '22.04 LTS x64', color: 'bg-orange-500' },
  { id: 'fedora', name: 'Fedora', version: '39 x64', color: 'bg-blue-600' },
  { id: 'debian', name: 'Debian', version: '12 x64', color: 'bg-red-600' },
  { id: 'centos', name: 'CentOS', version: '7.9 x64', color: 'bg-indigo-600' },
  { id: 'rocky', name: 'Rocky Linux', version: '9.3 x64', color: 'bg-green-600' },
];

const REGIONS = [
  { id: 'nyc', name: 'New York', datacenter: 'NYC3', flag: '🇺🇸' },
  { id: 'sfo', name: 'San Francisco', datacenter: 'SFO3', flag: '🇺🇸' },
  { id: 'fra', name: 'Frankfurt', datacenter: 'FRA1', flag: '🇩🇪' },
  { id: 'lon', name: 'London', datacenter: 'LON1', flag: '🇬🇧' },
  { id: 'sgp', name: 'Singapore', datacenter: 'SGP1', flag: '🇸🇬' },
  { id: 'blr', name: 'Bangalore', datacenter: 'BLR1', flag: '🇮🇳' },
];

const PLANS = [
  { id: 'basic', name: 'Basic', price: 6, ram: '1 GB', cpu: '1 vCPU', ssd: '25 GB' },
  { id: 'standard', name: 'Standard', price: 12, ram: '2 GB', cpu: '1 vCPU', ssd: '50 GB' },
  { id: 'pro', name: 'Pro', price: 24, ram: '4 GB', cpu: '2 vCPU', ssd: '80 GB' },
  { id: 'ultra', name: 'Ultra', price: 48, ram: '8 GB', cpu: '4 vCPU', ssd: '160 GB' },
];

const PAYMENT_METHODS = [
  { id: 'credit', label: 'Credit balance' },
  { id: 'bkash', label: 'bKash' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'paypal', label: 'PayPal' }
];

function hourlyPrice(monthly: number) {
  return Math.max(Math.round((monthly / 730) * 100) / 100, 0.01);
}

export default function CreateDroplet() {
  const navigate = useNavigate();
  const [selectedDist, setSelectedDist] = useState('ubuntu');
  const [selectedRegion, setSelectedRegion] = useState('nyc');
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [authMethod, setAuthMethod] = useState('password');
  const [hostname, setHostname] = useState('ubuntu-s-1vcpu-1gb-nyc3-01');
  const [paymentProvider, setPaymentProvider] = useState('credit');
  const [billingOverview, setBillingOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderPhase, setOrderPhase] = useState<'form' | 'loading' | 'complete'>('form');
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    fetchBillingOverviewWithApi()
      .then(setBillingOverview)
      .catch(() => setBillingOverview(null));
  }, []);

  const handleCreate = async () => {
    if (billingOverview && Number(billingOverview.credits || 0) <= 0) {
      setError('Add credit now before placing a droplet order.');
      return;
    }

    setIsLoading(true);
    setError('');

    const plan = PLANS.find(p => p.id === selectedPlan)!;
    const region = REGIONS.find(r => r.id === selectedRegion)!;
    const distribution = DISTRIBUTIONS.find(d => d.id === selectedDist)!;
    const hourly = hourlyPrice(plan.price);

    try {
      const checkout = await createCloudResourceOrderWithApi({
        provider: paymentProvider,
        currency: 'USD',
        initialCharge: hourly,
        hourlyRate: hourly,
        resource: {
          type: 'droplet',
          name: hostname,
          region: `${region.name} ${region.datacenter}`,
          specs: `${plan.ram} / ${plan.cpu} / ${plan.ssd} Disk`,
          image: `${distribution.name} ${distribution.version}`,
          plan: selectedPlan,
          cpu: plan.cpu,
          ram: plan.ram,
          disk: plan.ssd,
          monthlyCost: plan.price,
          metadata: {
            authMethod,
            billing: {
              hourlyRate: hourly,
              initialCharge: hourly,
              monthlyCost: plan.price
            }
          }
        }
      });

      if (checkout.paymentUrl) {
        window.location.href = checkout.paymentUrl;
        return;
      }

      if (checkout.status === 'requires_payment') {
        setBillingOverview((current: any) => ({ ...(current || {}), credits: checkout.creditBalance }));
        setError(checkout.message || 'Add credit or pay the generated invoice before this droplet can be deployed.');
        setIsLoading(false);
        return;
      }

      notifyDataRefresh();
      setOrderSummary({
        title: 'Droplet order completed',
        invoiceNumber: checkout.invoice?.number,
        packageName: plan.name,
        serverIp: checkout.resource?.ip || 'Provisioning',
        hourlyRate: hourly,
        monthlyCost: plan.price,
        status: checkout.status === 'paid' ? 'Provisioning queued' : checkout.status
      });
      setOrderPhase('loading');
      setTimeout(() => {
        setIsLoading(false);
        setOrderPhase('complete');
      }, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create checkout. Check your credit balance or configured payment gateway.');
      setIsLoading(false);
      return;
    }
  };

  const selectedPlanRecord = PLANS.find(p => p.id === selectedPlan)!;
  const selectedHourly = hourlyPrice(selectedPlanRecord.price);
  const creditBalance = Number(billingOverview?.credits || 0);
  const creditEmpty = Boolean(billingOverview) && creditBalance <= 0;

  if (isLoading || orderPhase === 'loading') {
    return (
      <TowerOrderLoader
        messages={[
          'Setting up your droplet',
          'Checking billing and credit',
          'Preparing the selected image',
          'Reserving compute capacity',
          'Creating invoice details',
          'Finalizing deployment'
        ]}
      />
    );
  }

  if (orderPhase === 'complete' && orderSummary) {
    return <OrderCompleteSummary summary={orderSummary} onPrimary={() => navigate('/droplets')} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between border-b border-[#e5e8ed] pb-5">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/droplets')}
            className="p-1.5 hover:bg-[#f3f5f9] rounded transition-colors border border-transparent hover:border-[#e5e8ed]"
            id="back-button"
          >
            <ArrowLeft className="h-4 w-4 text-[#4a4a4a]" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#2e3d49]">Create Droplets</h1>
            <p className="text-[12px] text-[#4a4a4a]">A Droplet is a full server that you can control.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Total Cost</p>
            <p className="text-lg font-bold text-[#2e3d49] leading-none">${selectedHourly.toFixed(2)}/hr</p>
            <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">${selectedPlanRecord.price}.00/mo cap</p>
          </div>
          <button 
            onClick={handleCreate}
            disabled={creditEmpty}
            className="group bg-[#0069ff] text-white px-5 py-2 rounded font-bold text-[13px] hover:bg-[#0056cc] transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-gray-300"
            id="create-droplet-top"
          >
            Create <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}

      {creditEmpty && (
        <div className="flex flex-col gap-3 rounded border border-red-100 bg-red-50 px-4 py-3 text-red-700 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[13px] font-bold">Add Credit Now</p>
            <p className="text-[12px]">You cannot order droplets with 0 credit. Existing servers remain off until credit is added.</p>
          </div>
          <button onClick={() => navigate('/billing')} className="rounded bg-red-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-red-700">
            Add Credit
          </button>
        </div>
      )}

      {/* 1. Choose an Image */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
           <div className="w-5 h-5 bg-[#2e3d49] rounded flex items-center justify-center text-white font-bold text-[10px]">1</div>
           <h2 className="text-[13px] font-bold text-[#2e3d49] uppercase tracking-wide">Choose an image</h2>
        </div>
        
        <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
          <div className="flex border-b border-[#f3f5f9] bg-[#f8f9fa] no-scrollbar overflow-x-auto">
            {['Distributions', 'Marketplace', 'Snapshots'].map((tab, i) => (
              <button 
                key={tab}
                className={`px-6 py-3 text-[13px] font-bold transition-all border-b-2 ${
                  i === 0 ? 'text-[#0069ff] border-[#0069ff] bg-white' : 'text-[#4a4a4a] border-transparent hover:text-[#0069ff]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {DISTRIBUTIONS.map((dist) => (
                <button
                  key={dist.id}
                  onClick={() => setSelectedDist(dist.id)}
                  className={`p-4 border rounded relative transition-all text-center ${
                    selectedDist === dist.id 
                      ? 'border-[#0069ff] bg-[#f3f5f9] ring-1 ring-[#0069ff]' 
                      : 'border-[#e5e8ed] bg-white hover:border-[#0069ff]'
                  }`}
                  id={`dist-${dist.id}`}
                >
                  <div className={`w-10 h-10 ${dist.color} rounded-full mx-auto flex items-center justify-center text-white font-bold text-sm mb-2 shadow-sm`}>
                    {dist.name.charAt(0)}
                  </div>
                  <p className="font-bold text-[13px] text-[#2e3d49]">{dist.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{dist.version}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Choose a Plan */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
           <div className="w-5 h-5 bg-[#2e3d49] rounded flex items-center justify-center text-white font-bold text-[10px]">2</div>
           <h2 className="text-[13px] font-bold text-[#2e3d49] uppercase tracking-wide">Choose a plan</h2>
        </div>
        <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
          <div className="border-b border-[#f3f5f9] px-6 py-3 bg-[#f8f9fa] flex gap-8 no-scrollbar overflow-x-auto">
            {['Basic', 'General Purpose', 'CPU-Optimized'].map((tab, i) => (
              <button 
                key={tab}
                className={`text-[13px] font-bold pb-1 transition-all border-b-2 ${
                  i === 0 ? 'text-[#0069ff] border-[#0069ff]' : 'text-[#4a4a4a] border-transparent hover:text-[#0069ff]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`p-5 border rounded transition-all text-left relative ${
                    selectedPlan === plan.id 
                      ? 'border-[#0069ff] bg-[#f3f5f9] ring-1 ring-[#0069ff]' 
                      : 'border-[#e5e8ed] hover:border-[#0069ff]'
                  }`}
                  id={`plan-${plan.id}`}
                >
                  <p className="text-[11px] font-bold text-gray-400 px-1 py-0.5 border border-gray-100 rounded inline-block mb-3 uppercase">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-[#2e3d49]">${plan.price}</span>
                    <span className="text-[11px] font-medium text-gray-400 capitalize">/ mo</span>
                  </div>
                  <p className="mb-3 rounded bg-white px-2 py-1 text-[11px] font-bold text-[#0069ff]">
                    ${hourlyPrice(plan.price).toFixed(2)} / hour
                  </p>
                  <div className="grid grid-cols-2 gap-y-2 text-[12px] font-medium text-gray-600">
                    <span className="text-gray-400">RAM</span>
                    <span className="text-right text-[#2e3d49] font-bold">{plan.ram}</span>
                    <span className="text-gray-400">CPU</span>
                    <span className="text-right text-[#2e3d49] font-bold">{plan.cpu}</span>
                    <span className="text-gray-400">SSD</span>
                    <span className="text-right text-[#2e3d49] font-bold">{plan.ssd}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
           <div className="w-5 h-5 bg-[#2e3d49] rounded flex items-center justify-center text-white font-bold text-[10px]">5</div>
           <h2 className="text-[13px] font-bold text-[#2e3d49] uppercase tracking-wide">Payment method</h2>
        </div>
        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[13px] font-bold text-[#2e3d49]">First hour charge: ${selectedHourly.toFixed(2)}</p>
              <p className="text-[11px] text-gray-500">Monthly cap: ${selectedPlanRecord.price.toFixed(2)}. Usage continues to bill hourly from credit.</p>
            </div>
            <div className="rounded border border-[#e5e8ed] bg-[#f8f9fa] px-3 py-2 text-[12px] font-bold text-[#2e3d49]">
              Credit: USD {creditBalance.toFixed(2)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentProvider(method.id)}
                className={`flex items-center justify-center gap-2 rounded border px-4 py-3 text-[13px] font-bold transition-all ${
                  paymentProvider === method.id ? 'border-[#0069ff] bg-[#f3f5f9] text-[#0069ff] ring-1 ring-[#0069ff]' : 'border-[#e5e8ed] text-[#4a4a4a] hover:border-[#0069ff]'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                {method.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Choose a Datacenter Region */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
           <div className="w-5 h-5 bg-[#2e3d49] rounded flex items-center justify-center text-white font-bold text-[10px]">3</div>
           <h2 className="text-[13px] font-bold text-[#2e3d49] uppercase tracking-wide">Choose a datacenter region</h2>
        </div>
        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {REGIONS.map((region) => (
                <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={`p-4 border rounded flex flex-col items-center text-center transition-all ${
                  selectedRegion === region.id 
                    ? 'border-[#0069ff] bg-[#f3f5f9] ring-1 ring-[#0069ff]' 
                    : 'border-[#e5e8ed] bg-white hover:border-[#0069ff]'
                }`}
                id={`region-${region.id}`}
              >
                <span className="text-2xl mb-2">{region.flag}</span>
                <p className="font-bold text-[#2e3d49] text-[13px]">{region.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{region.datacenter}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Authentication */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
           <div className="w-5 h-5 bg-[#2e3d49] rounded flex items-center justify-center text-white font-bold text-[10px]">4</div>
           <h2 className="text-[13px] font-bold text-[#2e3d49] uppercase tracking-wide">Authentication</h2>
        </div>
        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6 space-y-6">
          <div className="flex gap-4">
            <button
              onClick={() => setAuthMethod('ssh')}
              className={`flex-1 p-4 border rounded text-left transition-all flex items-center gap-4 ${
                authMethod === 'ssh' ? 'border-[#0069ff] bg-[#f3f5f9] ring-1 ring-[#0069ff]' : 'border-[#e5e8ed]'
              }`}
            >
              <Key className="h-5 w-5 text-[#0069ff]" />
              <div>
                <p className="text-[14px] font-bold text-[#2e3d49]">SSH Keys</p>
                <p className="text-[11px] text-gray-500">More secure authentication</p>
              </div>
            </button>
            <button
              onClick={() => setAuthMethod('password')}
              className={`flex-1 p-4 border rounded text-left transition-all flex items-center gap-4 ${
                authMethod === 'password' ? 'border-[#0069ff] bg-[#f3f5f9] ring-1 ring-[#0069ff]' : 'border-[#e5e8ed]'
              }`}
            >
              <Lock className="h-5 w-5 text-[#0069ff]" />
              <div>
                <p className="text-[14px] font-bold text-[#2e3d49]">Password</p>
                <p className="text-[11px] text-gray-500">Easier authentication</p>
              </div>
            </button>
          </div>
          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-[#2e3d49]">Create root password</label>
            <input 
              type="password" 
              placeholder="Enter your root password"
              className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#0069ff]"
            />
          </div>
        </div>
      </section>

      {/* Recap & Launch */}
      <section className="bg-[#031b4e] rounded-lg p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-wrap items-center gap-10">
           <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Image</p>
              <p className="font-bold text-[15px]">{DISTRIBUTIONS.find(d => d.id === selectedDist)?.name} {DISTRIBUTIONS.find(d => d.id === selectedDist)?.version}</p>
           </div>
           <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Configuration</p>
              <p className="font-bold text-[15px]">{PLANS.find(p => p.id === selectedPlan)?.ram} / {PLANS.find(p => p.id === selectedPlan)?.cpu}</p>
           </div>
           <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Region</p>
              <p className="font-bold text-[15px]">{REGIONS.find(r => r.id === selectedRegion)?.name}</p>
           </div>
        </div>
        <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 border-white/10 pt-6 md:pt-0">
           <div className="text-right">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
              <p className="text-3xl font-bold text-white leading-none">${selectedHourly.toFixed(2)}</p>
              <p className="mt-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">${selectedPlanRecord.price}.00/mo cap</p>
           </div>
           <button 
              onClick={handleCreate}
              disabled={creditEmpty}
              className="flex-1 md:flex-none bg-[#0069ff] text-white px-10 py-3.5 rounded font-bold text-[15px] hover:bg-[#0056cc] transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-gray-500"
           >
              Deploy Droplet
           </button>
        </div>
      </section>
    </div>
  );
}
