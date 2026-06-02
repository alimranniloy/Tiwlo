import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Cloud,
  CreditCard,
  Database,
  Search,
  Server,
  Shield,
  ShoppingCart,
  Sparkles,
  Zap
} from 'lucide-react';
import { createCloudResourceWithApi, fetchPlansWithApi } from '../lib/tiwloApi';

const productIcons: Record<string, any> = {
  cloud: Server,
  ecommerce: ShoppingCart,
  isp: Cloud,
  database: Database,
  security: Shield
};

function featureList(features: unknown) {
  if (Array.isArray(features)) return features.map(String);
  if (features && typeof features === 'object') {
    return Object.entries(features).map(([key, value]) => `${key}: ${String(value)}`);
  }
  return [];
}

export default function Marketplace() {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    fetchPlansWithApi()
      .then(setPlans)
      .catch((err) => {
        setPlans([]);
        setError(err instanceof Error ? err.message : 'Unable to load marketplace plans');
      })
      .finally(() => setLoading(false));
  }, []);

  const products: string[] = Array.from(new Set<string>(plans.map((plan) => String(plan.product || '')))).filter(Boolean);
  const filteredPlans = plans.filter((plan) => {
    const productMatch = selectedProduct === 'all' || plan.product === selectedProduct;
    const searchMatch = `${plan.name} ${plan.product} ${plan.code}`.toLowerCase().includes(search.toLowerCase());
    return productMatch && searchMatch;
  });

  const addToProject = async (plan: any) => {
    setError('');
    setSuccess('');
    try {
      const resourceType = plan.product === 'cloud' ? 'droplet' : `${plan.product}_subscription`;
      await createCloudResourceWithApi({
        type: resourceType,
        name: plan.name,
        region: 'Global',
        specs: featureList(plan.features).join(' / ') || `${plan.product} plan`,
        plan: plan.code,
        monthlyCost: Number(plan.price || 0),
        metadata: {
          planId: plan.id,
          product: plan.product,
          interval: plan.interval,
          source: 'marketplace'
        }
      });
      setSuccess(`${plan.name} added to project resources.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add plan to project');
    }
  };

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-20">
      <div className="overflow-hidden rounded-md bg-[#031b4e] px-6 py-12 text-white shadow-[0_12px_28px_rgba(3,27,78,0.15)] md:px-8 md:py-14">
        <div className="relative z-10 max-w-4xl">
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Marketplace</h1>
          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-blue-100/70">
            Plans and launch actions are loaded from the billing plan API.
          </p>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-300" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search plans..."
                className="w-full rounded-md border border-white/20 bg-white/10 py-3 pl-12 pr-4 font-medium text-white placeholder-blue-300 transition-all focus:bg-white/20 focus:outline-none"
              />
            </div>
            <button className="flex items-center gap-2 rounded-md bg-white px-6 py-3 font-bold text-[#031b4e] shadow-xl shadow-black/20">
              <CreditCard className="h-5 w-5" /> {plans.length} Plans
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600 shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700 shadow-sm">
          <Check className="mt-0.5 h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        <button
          onClick={() => setSelectedProduct('all')}
          className={`flex shrink-0 items-center gap-3 rounded-md border px-6 py-4 text-left transition-all ${
            selectedProduct === 'all' ? 'border-[#0069ff] bg-white shadow-md shadow-blue-100 ring-4 ring-blue-50' : 'border-[#d9e1ec] bg-white hover:bg-[#f7faff]'
          }`}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedProduct === 'all' ? 'bg-[#0069ff] text-white' : 'bg-gray-100 text-gray-400'}`}>
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-[14px] font-bold ${selectedProduct === 'all' ? 'text-[#0069ff]' : 'text-[#2e3d49]'}`}>All Products</p>
            <p className="text-[11px] font-medium text-gray-400">{plans.length} plans</p>
          </div>
        </button>
        {products.map((product) => {
          const Icon = productIcons[product] || Zap;
          const count = plans.filter((plan) => plan.product === product).length;
          return (
            <button
              key={product}
              onClick={() => setSelectedProduct(product)}
              className={`flex shrink-0 items-center gap-3 rounded-md border px-6 py-4 text-left transition-all ${
                selectedProduct === product ? 'border-[#0069ff] bg-white shadow-md shadow-blue-100 ring-4 ring-blue-50' : 'border-[#d9e1ec] bg-white hover:bg-[#f7faff]'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedProduct === product ? 'bg-[#0069ff] text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className={`text-[14px] font-bold capitalize ${selectedProduct === product ? 'text-[#0069ff]' : 'text-[#2e3d49]'}`}>{product}</p>
                <p className="text-[11px] font-medium text-gray-400">{count} plans</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold capitalize text-[#2e3d49]">{selectedProduct === 'all' ? 'Available' : selectedProduct} Plans</h2>
        </div>

        {loading ? (
          <div className="rounded-md border border-[#d9e1ec] bg-white p-12 text-center text-sm font-bold text-gray-400 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">Loading marketplace from API...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-white p-12 text-center shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-gray-300" />
            <h3 className="text-lg font-bold text-[#2e3d49]">No plans found</h3>
            <p className="mt-1 text-sm text-gray-500">Plans will appear here when they exist in the database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => {
              const Icon = productIcons[plan.product] || Zap;
              const features = featureList(plan.features);
              return (
                <div key={plan.id} className="flex flex-col justify-between rounded-md border border-[#d9e1ec] bg-white p-8 shadow-[0_1px_2px_rgba(3,27,78,0.04)] transition-all hover:border-[#0069ff] hover:shadow-md">
                  <div>
                    <div className="mb-8 flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0069ff]">
                        <Icon className="h-8 w-8" />
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold tracking-tight text-[#2e3d49]">${Number(plan.price || 0).toFixed(2)}</p>
                        <p className="text-[11px] font-bold uppercase text-gray-400">/ {plan.interval}</p>
                      </div>
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-[#2e3d49]">{plan.name}</h3>
                    <p className="mb-6 text-xs font-bold uppercase tracking-widest text-gray-400">{plan.product} / {plan.code}</p>

                    <div className="mb-10 space-y-4">
                      {features.length === 0 ? (
                        <div className="text-[13px] font-medium text-gray-400">No feature metadata configured.</div>
                      ) : features.slice(0, 5).map((feature) => (
                        <div key={feature} className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-[#4a4a4a]">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => addToProject(plan)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#0069ff] bg-white py-4 text-sm font-extrabold text-[#0069ff] transition-all hover:bg-blue-50"
                  >
                    Add to Project <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
