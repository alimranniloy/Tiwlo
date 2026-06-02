import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Globe2,
  HardDrive,
  Lock,
  MapPin,
  Package,
  Server,
  Sparkles,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createCloudResourceOrderWithApi,
  checkTPanelUsernameAvailabilityWithApi,
  fetchBillingOverviewWithApi,
  fetchCloudDeploymentNodesWithApi,
  fetchPlansWithApi,
  notifyDataRefresh
} from '../lib/tiwloApi';
import { OrderCompleteSummary, TowerOrderLoader, type OrderSummary } from '../components/SetupLoader';

type CloudPlan = {
  id: string;
  code: string;
  name: string;
  price: number;
  interval?: string;
  features?: unknown;
  limits?: Record<string, unknown> | null;
};

type CloudDeploymentNode = {
  id: string;
  name: string;
  module: string;
  ip: string;
  panel: string;
  port: number;
  maxAccounts: number;
  activeAccounts: number;
  remainingAccounts?: number;
  location?: string | null;
  countryCode?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
};

const fallbackLimits = {
  cpu: '1 vCPU',
  ram: '1 GB',
  disk: '25 GB'
};

function hourlyPrice(monthly: number) {
  return Math.max(Math.round((monthly / 730) * 100) / 100, 0.01);
}

function limitValue(plan: CloudPlan | null, key: string, fallback: string) {
  const value = plan?.limits?.[key];
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function featureList(plan: CloudPlan) {
  if (Array.isArray(plan.features)) return plan.features.map(String).filter(Boolean);
  if (typeof plan.features === 'string') return plan.features.split('\n').map((item) => item.trim()).filter(Boolean);
  return [];
}

function moduleLabel(module: string) {
  if (module === 'tpanel') return 'tPanel';
  return module ? module.replace(/(^|-)([a-z])/g, (_match, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`) : 'Module';
}

function moduleLogo(module: string) {
  return module === 'tpanel' ? '/brand/icon.png' : '';
}

function moduleGradient(module: string) {
  if (module === 'tpanel') return 'from-[#071f4a] via-[#0f5dd8] to-[#00a884]';
  return 'from-[#111827] via-[#334155] to-[#0069ff]';
}

function flagUrl(countryCode?: string | null) {
  const code = String(countryCode || '').trim().toLowerCase();
  return /^[a-z]{2}$/.test(code) ? `https://flagcdn.com/w40/${code}.png` : '';
}

function accountDomain(hostname: string, username: string) {
  const cleanHost = hostname.trim().toLowerCase();
  return cleanHost;
}

function isValidDomainName(value: string) {
  const domain = value.trim().toLowerCase();
  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain) && !domain.endsWith('.tpanel.local');
}

export default function CreateDroplet() {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState('tpanel');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [hostname, setHostname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [nodes, setNodes] = useState<CloudDeploymentNode[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [billingOverview, setBillingOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderPhase, setOrderPhase] = useState<'form' | 'loading' | 'complete'>('form');
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [usernameCheck, setUsernameCheck] = useState<any | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    fetchBillingOverviewWithApi()
      .then(setBillingOverview)
      .catch(() => setBillingOverview(null));

    fetchCloudDeploymentNodesWithApi()
      .then((records) => {
        const activeNodes = (records || []).filter((node: CloudDeploymentNode) => (
          node.status === 'active' &&
          node.ip &&
          (!Number(node.maxAccounts || 0) || Number(node.activeAccounts || 0) < Number(node.maxAccounts || 0))
        ));
        setNodes(activeNodes);
        setSelectedModule(activeNodes[0]?.module || 'tpanel');
        setSelectedNodeId(activeNodes[0]?.id || '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load deployment servers.');
        setNodes([]);
      })
      .finally(() => setNodesLoading(false));

    fetchPlansWithApi('cloud')
      .then((records) => {
        const activePlans = (records || []).filter((plan: CloudPlan) => Number(plan.price || 0) > 0);
        setPlans(activePlans);
        setSelectedPlan(activePlans[0]?.code || '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load cloud plans.');
        setPlans([]);
      })
      .finally(() => setPlansLoading(false));
  }, []);

  const modules = React.useMemo(() => {
    const map = new Map<string, { key: string; count: number; countryCode?: string | null }>();
    nodes.forEach((node) => {
      const key = node.module || 'tpanel';
      const current = map.get(key) || { key, count: 0, countryCode: node.countryCode };
      map.set(key, { ...current, count: current.count + 1, countryCode: current.countryCode || node.countryCode });
    });
    return Array.from(map.values());
  }, [nodes]);
  const moduleNodes = React.useMemo(() => nodes.filter((node) => (node.module || 'tpanel') === selectedModule), [nodes, selectedModule]);
  React.useEffect(() => {
    if (moduleNodes.length > 0 && !moduleNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(moduleNodes[0].id);
    }
    if (moduleNodes.length === 0) {
      setSelectedNodeId('');
    }
  }, [moduleNodes, selectedNodeId]);

  const selectedPlanRecord = plans.find((plan) => plan.code === selectedPlan) || plans[0] || null;
  const selectedNode = moduleNodes.find((node) => node.id === selectedNodeId) || moduleNodes[0] || null;
  const selectedHourly = hourlyPrice(Number(selectedPlanRecord?.price || 0));
  const creditBalance = Number(billingOverview?.credits || 0);
  const creditEmpty = Boolean(billingOverview) && creditBalance <= 0;

  React.useEffect(() => {
    const clean = username.trim();
    if (!clean || clean.length < 3 || !selectedNode?.id) {
      setUsernameCheck(null);
      return;
    }
    let cancelled = false;
    setUsernameChecking(true);
    const timer = window.setTimeout(() => {
      checkTPanelUsernameAvailabilityWithApi(clean, selectedNode.id, selectedModule)
        .then((result) => {
          if (!cancelled) setUsernameCheck(result);
        })
        .catch((err) => {
          if (!cancelled) setUsernameCheck({ available: false, message: err instanceof Error ? err.message : 'Unable to check username.' });
        })
        .finally(() => {
          if (!cancelled) setUsernameChecking(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, selectedNode?.id, selectedModule]);

  const handleCreate = async () => {
    if (!selectedPlanRecord) {
      setError('No active cloud package is configured. Ask administrator to add a cloud plan first.');
      return;
    }
    if (!selectedNode) {
      setError('No active deployment server is configured. Ask administrator to connect a tPanel server first.');
      return;
    }
    if (!hostname.trim()) {
      setError('Domain name is required before creating a droplet.');
      return;
    }
    if (!isValidDomainName(hostname)) {
      setError('Domain must be a real domain name like example.com. Auto tpanel.local subdomains are disabled.');
      return;
    }
    if (!username.trim()) {
      setError('Username is required before creating a droplet.');
      return;
    }
    if (usernameCheck && usernameCheck.available === false) {
      setError(usernameCheck.message || 'Choose another tPanel username.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters before creating a droplet.');
      return;
    }
    if (creditEmpty || creditBalance < selectedHourly) {
      setError(`Add credit now. This package needs at least USD ${selectedHourly.toFixed(2)} for the first hour.`);
      return;
    }

    setIsLoading(true);
    setError('');

    const cpu = limitValue(selectedPlanRecord, 'cpu', fallbackLimits.cpu);
    const ram = limitValue(selectedPlanRecord, 'ram', fallbackLimits.ram);
    const disk = limitValue(selectedPlanRecord, 'disk', fallbackLimits.disk);

    try {
      const checkout = await createCloudResourceOrderWithApi({
        provider: 'credit',
        currency: 'USD',
        initialCharge: selectedHourly,
        hourlyRate: selectedHourly,
        resource: {
          type: 'droplet',
          name: hostname.trim(),
          region: selectedNode.location || 'Global',
          specs: `${ram} / ${cpu} / ${disk} Disk`,
          ip: selectedNode.ip,
          image: 'tPanel managed deployment',
          plan: selectedPlanRecord.code,
          cpu,
          ram,
          disk,
          monthlyCost: Number(selectedPlanRecord.price || 0),
          metadata: {
            auth: {
              method: 'password',
              username: username.trim(),
              passwordConfigured: true
            },
            billing: {
              hourlyRate: selectedHourly,
              initialCharge: selectedHourly,
              monthlyCost: Number(selectedPlanRecord.price || 0)
            },
            deploymentNode: {
              id: selectedNode.id,
              ip: selectedNode.ip,
              name: selectedNode.name,
              module: selectedNode.module,
              panel: selectedNode.panel,
              port: selectedNode.port,
              location: selectedNode.location || 'Global',
              countryCode: selectedNode.countryCode || ''
            },
            tpanelAccount: {
              module: selectedModule,
              username: username.trim().toLowerCase(),
              password,
              domain: accountDomain(hostname, username),
              limits: selectedPlanRecord.limits || {},
              packageCode: selectedPlanRecord.code,
              packageName: selectedPlanRecord.name
            }
          }
        }
      });

      if (checkout.status === 'requires_payment') {
        setBillingOverview((current: any) => ({ ...(current || {}), credits: checkout.creditBalance }));
        setError(checkout.message || 'Add credit before this droplet can be deployed.');
        setIsLoading(false);
        return;
      }

      notifyDataRefresh();
      setOrderSummary({
        title: 'Droplet order completed',
        invoiceNumber: checkout.invoice?.number,
        packageName: selectedPlanRecord.name,
        serverIp: checkout.resource?.ip || 'Provisioning',
        hourlyRate: selectedHourly,
        monthlyCost: Number(selectedPlanRecord.price || 0),
        status: checkout.status === 'paid' ? 'Provisioning queued' : checkout.status
      });
      setOrderPhase('loading');
      setTimeout(() => {
        setIsLoading(false);
        setOrderPhase('complete');
      }, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create droplet. Check your credit balance and try again.');
      setIsLoading(false);
    }
  };

  if (isLoading || orderPhase === 'loading') {
    return (
      <TowerOrderLoader
        messages={[
          'Setting up your droplet',
          'Checking credit balance',
          'Preparing the selected module',
          'Reserving compute capacity',
          'Checking tPanel username',
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
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      <div className="overflow-hidden rounded-lg border border-[#dbe4f0] bg-white">
        <div className={`bg-gradient-to-r ${moduleGradient(selectedModule)} px-5 py-6 text-white md:px-7`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/droplets')}
                className="rounded-md border border-white/15 bg-white/10 p-2 transition-colors hover:bg-white/20"
            id="back-button"
          >
                <ArrowLeft className="h-4 w-4 text-white" />
          </button>
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  Managed deployment
                </div>
          <div>
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">Create Droplet</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Deploy a production-ready {moduleLabel(selectedModule)} hosting account from administrator connected regions with credit billing.</p>
                </div>
          </div>
        </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-white/15 bg-white/10 p-4 md:min-w-[260px]">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase leading-none tracking-wider text-white/60">Credit billing</p>
                <p className="text-2xl font-black leading-none">${selectedHourly.toFixed(2)}<span className="text-sm text-white/60">/hr</span></p>
                <p className="mt-1 text-[10px] font-black uppercase text-white/60">${Number(selectedPlanRecord?.price || 0).toFixed(2)}/mo cap</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creditEmpty || plansLoading || nodesLoading || !selectedPlanRecord || !selectedNode}
                className="group flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[13px] font-black text-[#0f4db8] transition-all hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:bg-white/40"
            id="create-droplet-top"
          >
            Create <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-[#edf1f7] bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
          <TopMetric label="Module" value={moduleLabel(selectedModule)} />
          <TopMetric label="Selected plan" value={selectedPlanRecord?.name || 'Choose plan'} />
          <TopMetric label="Region" value={selectedNode?.location || 'Choose location'} />
        </div>
      </div>

      {error && (
        <div className="rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}

      {creditEmpty && (
        <div className="flex flex-col gap-3 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-red-700 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[13px] font-bold">Add Credit Now</p>
            <p className="text-[12px]">Droplet deployment uses credit only. Add balance before ordering.</p>
          </div>
          <button onClick={() => navigate('/billing')} className="rounded-sm bg-red-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-red-700">
            Add Credit
          </button>
        </div>
      )}

      <section className="space-y-3">
        <StepTitle number="1" title="Choose module" />
        <div className="rounded-lg border border-[#dbe4f0] bg-white p-5">
          {nodesLoading ? (
            <div className="rounded-sm border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-5 text-[13px] font-bold text-[#4a4a4a]">
              Loading available modules...
            </div>
          ) : modules.length === 0 ? (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-5 text-[13px] font-bold text-amber-700">
              No active deployment module is available.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => {
                const logo = moduleLogo(module.key);
                const selected = selectedModule === module.key;
                return (
                <button
                  key={module.key}
                  onClick={() => setSelectedModule(module.key)}
                    className={`group relative overflow-hidden rounded-lg border p-5 text-left transition-all ${
                      selected
                        ? 'border-[#0069ff] bg-[#f3f7ff] ring-2 ring-[#0069ff]/20'
                        : 'border-[#e5e8ed] bg-white hover:border-[#8bbcff]'
                  }`}
                >
                    <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${moduleGradient(module.key)}`} />
                    <span className="flex items-center gap-4">
                      <span className={`grid h-14 w-14 place-items-center rounded-lg border ${selected ? 'border-[#cfe1ff] bg-white' : 'border-[#e5e8ed] bg-[#f8fbff]'}`}>
                        {logo ? <img src={logo} alt="tPanel" className="h-9 w-9 object-contain" /> : <Server className="h-6 w-6 text-[#0069ff]" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[16px] font-black text-[#111827]">{moduleLabel(module.key)}</span>
                        <span className="mt-1 block text-[12px] font-bold text-gray-500">{module.count} location{module.count === 1 ? '' : 's'} available</span>
                        {module.key === 'tpanel' && <span className="mt-2 inline-flex rounded-full bg-[#e8fff6] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#128c7e]">Panel managed</span>}
                      </span>
                    </span>
                    {selected && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-[#0069ff]" />}
                </button>
              );})}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <StepTitle number="2" title="Choose package size" />
        <div className="overflow-hidden rounded-lg border border-[#dbe4f0] bg-white">
          <div className="flex items-center gap-3 border-b border-[#edf1f7] bg-[#f8fbff] px-5 py-4">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-[#0069ff]">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13px] font-black text-[#111827]">Size packages from Administrator tPanel</p>
              <p className="text-[11px] font-bold text-[#6B7280]">Choose the resource limit for this managed account.</p>
            </div>
          </div>
          <div className="p-5">
            {plansLoading ? (
              <div className="rounded-sm border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-5 text-[13px] font-bold text-[#4a4a4a]">
                Loading active cloud packages...
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-5 text-[13px] font-bold text-amber-700">
                No active cloud package is configured. Add cloud plans from Administrator Plans first.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                  const features = featureList(plan);
                  const ram = limitValue(plan, 'ram', fallbackLimits.ram);
                  const cpu = limitValue(plan, 'cpu', fallbackLimits.cpu);
                  const disk = limitValue(plan, 'disk', fallbackLimits.disk);
                  return (
                    <button
                      key={plan.id || plan.code}
                      onClick={() => setSelectedPlan(plan.code)}
                      className={`relative overflow-hidden rounded-lg border p-5 text-left transition-all ${
                        selectedPlan === plan.code
                          ? 'border-[#0069ff] bg-[#f3f7ff] ring-2 ring-[#0069ff]/20'
                          : 'border-[#e5e8ed] hover:border-[#8bbcff]'
                      }`}
                      id={`plan-${plan.code}`}
                    >
                      {selectedPlan === plan.code && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-[#0069ff]" />}
                      <p className="mb-3 inline-block rounded-full border border-[#e5e8ed] bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-500">{plan.name}</p>
                      <div className="mb-4 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#111827]">${Number(plan.price || 0).toFixed(2)}</span>
                        <span className="text-[11px] font-bold capitalize text-gray-400">/ mo</span>
                      </div>
                      <p className="mb-4 rounded-md bg-white px-3 py-2 text-[11px] font-black text-[#0069ff]">
                        ${hourlyPrice(Number(plan.price || 0)).toFixed(2)} / hour
                      </p>
                      <div className="space-y-2 text-[12px] font-bold text-gray-600">
                        <PlanSpec icon={HardDrive} label="RAM" value={ram} />
                        <PlanSpec icon={Cpu} label="CPU" value={cpu} />
                        <PlanSpec icon={Server} label="Disk" value={disk} />
                      </div>
                      {features.length > 0 && (
                        <p className="mt-4 line-clamp-2 text-[11px] font-medium text-gray-500">{features.slice(0, 2).join(' / ')}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <StepTitle number="3" title={`Select ${moduleLabel(selectedModule)} server location`} />
        <div className="rounded-lg border border-[#dbe4f0] bg-white p-5">
          {nodesLoading ? (
            <div className="rounded-sm border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-5 text-[13px] font-bold text-[#4a4a4a]">
              Loading connected servers...
            </div>
          ) : moduleNodes.length === 0 ? (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-5 text-[13px] font-bold text-amber-700">
              No active {moduleLabel(selectedModule)} location is connected. Add a compute node from Administrator Hosting Account Module first.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {moduleNodes.map((node) => {
                const flag = flagUrl(node.countryCode);
                return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`relative overflow-hidden rounded-lg border p-5 text-left transition-all ${
                    selectedNodeId === node.id
                      ? 'border-[#0069ff] bg-[#f3f7ff] ring-2 ring-[#0069ff]/20'
                      : 'border-[#e5e8ed] bg-white hover:border-[#8bbcff]'
                  }`}
                  id={`node-${node.id}`}
                >
                  {selectedNodeId === node.id && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-[#0069ff]" />}
                  <span className="flex min-w-0 items-center gap-4">
                    {flag ? <img src={flag} alt={node.countryCode || ''} className="h-11 w-16 rounded-md border border-[#e5e8ed] object-cover" /> : <span className="grid h-11 w-16 place-items-center rounded-md border border-[#e5e8ed] bg-[#f3f5f9]"><Globe2 className="h-5 w-5 text-gray-400" /></span>}
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[15px] font-black text-[#111827]">
                        <MapPin className="h-4 w-4 shrink-0 text-[#0069ff]" />
                        <span className="truncate">{node.location || 'Global'}</span>
                      </span>
                      <span className="mt-1 block text-[11px] font-black uppercase tracking-wider text-gray-400">{node.countryCode || 'Global'} region</span>
                      <span className="mt-2 inline-flex rounded-full bg-[#f8fafc] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#64748b]">{Number(node.remainingAccounts ?? (Number(node.maxAccounts || 0) - Number(node.activeAccounts || 0))) || 'Ready'} slots</span>
                    </span>
                  </span>
                </button>
              );})}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <StepTitle number="4" title="Authentication" />
        <div className="space-y-5 rounded-lg border border-[#dbe4f0] bg-white p-5">
          <div className="flex items-start gap-3 rounded-lg border border-[#d8e6ff] bg-[#f3f7ff] px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-[#0069ff]">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-black text-[#111827]">Secure account credentials</p>
              <p className="text-[12px] leading-5 text-[#4a4a4a]">Selected {moduleLabel(selectedModule)} server will receive this deployment after billing is confirmed.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-[12px] font-bold text-[#2e3d49]">Username</span>
              <div className="flex items-center gap-2 rounded-md border border-[#e5e8ed] bg-[#f8f9fa] px-3 focus-within:border-[#0069ff]">
                <User className="h-4 w-4 text-gray-400" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="account username"
                  className="w-full bg-transparent py-2.5 text-[14px] outline-none"
                />
              </div>
              {(usernameChecking || usernameCheck) && (
                <p className={`text-[11px] font-bold ${usernameCheck?.available ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {usernameChecking ? 'Checking username...' : usernameCheck?.message}
                </p>
              )}
              {usernameCheck?.suggestions?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {usernameCheck.suggestions.map((item: string) => (
                    <button key={item} type="button" onClick={() => setUsername(item)} className="rounded-md border border-[#d8e6ff] bg-[#f8fbff] px-2 py-1 text-[11px] font-bold text-[#0069ff]">
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label className="space-y-2">
              <span className="block text-[12px] font-bold text-[#2e3d49]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-md border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#0069ff]"
              />
            </label>
          </div>
          <label className="space-y-2">
              <span className="block text-[12px] font-bold text-[#2e3d49]">Domain name</span>
              <input
                value={hostname}
                onChange={(event) => setHostname(event.target.value)}
                placeholder="example.com"
                className="w-full rounded-md border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#0069ff]"
              />
          </label>
        </div>
      </section>

      <section className={`flex flex-col gap-6 overflow-hidden rounded-lg bg-gradient-to-r ${moduleGradient(selectedModule)} p-6 text-white md:flex-row md:items-center md:justify-between`}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <RecapItem label="Module" value={moduleLabel(selectedModule)} />
          <RecapItem label="Package" value={selectedPlanRecord ? `${limitValue(selectedPlanRecord, 'ram', fallbackLimits.ram)} / ${limitValue(selectedPlanRecord, 'cpu', fallbackLimits.cpu)}` : 'No plan'} />
          <RecapItem label="Location" value={selectedNode ? selectedNode.location || 'Global' : 'No server'} />
        </div>
        <div className="flex w-full items-center gap-5 border-t border-white/10 pt-5 md:w-auto md:border-t-0 md:pt-0">
          <div className="text-right">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Credit charge</p>
            <p className="text-3xl font-bold leading-none text-white">${selectedHourly.toFixed(2)}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">${Number(selectedPlanRecord?.price || 0).toFixed(2)}/mo cap</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creditEmpty || plansLoading || nodesLoading || !selectedPlanRecord || !selectedNode}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white px-8 py-3.5 text-[15px] font-black text-[#0f4db8] transition-all hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:bg-white/40 md:flex-none"
          >
            Deploy Droplet <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

function StepTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#111827] text-[11px] font-black text-white">{number}</div>
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#2e3d49]">{title}</h2>
    </div>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">{label}</p>
      <p className="mt-1 truncate text-[14px] font-black text-[#111827]">{value}</p>
    </div>
  );
}

function PlanSpec({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
      <span className="inline-flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4 text-[#0069ff]" />
        {label}
      </span>
      <span className="text-right font-black text-[#111827]">{value}</span>
    </div>
  );
}

function RecapItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-[15px] font-bold">{value}</p>
    </div>
  );
}
