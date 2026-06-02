import React, { useState } from 'react';
import {
  ArrowLeft,
  Database,
  KeyRound,
  Lock,
  Minus,
  Plus,
  Server,
  TerminalSquare,
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

function accountDomain(hostname: string) {
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
  const selectedCpu = limitValue(selectedPlanRecord, 'cpu', fallbackLimits.cpu);
  const selectedRam = limitValue(selectedPlanRecord, 'ram', fallbackLimits.ram);
  const selectedDisk = limitValue(selectedPlanRecord, 'disk', fallbackLimits.disk);
  const selectedFeatures = selectedPlanRecord ? featureList(selectedPlanRecord) : [];
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
              domain: accountDomain(hostname),
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
    <div className="min-h-screen bg-white pb-20 text-[#031b4e]">
      <div className="mx-auto max-w-[980px] px-4 pt-5 md:px-6">
        <button
          onClick={() => navigate('/droplets')}
          className="mb-10 inline-flex items-center gap-2 text-[14px] font-medium text-[#2d4473] transition-colors hover:text-[#0069ff]"
          id="back-button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Droplets
        </button>

        {error && (
          <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            {error}
          </div>
        )}

        {creditEmpty && (
          <div className="mb-5 flex flex-col gap-3 border border-red-200 bg-red-50 px-4 py-3 text-red-700 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[13px] font-bold">Add Credit Now</p>
              <p className="text-[12px]">Droplet deployment uses credit only. Add balance before ordering.</p>
            </div>
            <button onClick={() => navigate('/billing')} className="bg-red-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-red-700">
              Add Credit
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,560px)_360px]">
          <main className="min-w-0">
            <h1 className="mb-10 text-[40px] font-bold leading-tight tracking-normal text-[#031b4e]">Create Droplet</h1>

            <section className="mb-14">
              <SectionTitle title="Choose a datacenter region" />
              <div className="border border-[#94a3c7] bg-white">
                <select
                  value={selectedNodeId}
                  onChange={(event) => setSelectedNodeId(event.target.value)}
                  disabled={nodesLoading || moduleNodes.length === 0}
                  className="h-[54px] w-full bg-white px-4 text-[15px] font-semibold text-[#031b4e] outline-none disabled:bg-[#f3f5fa]"
                >
                  {nodesLoading && <option>Loading regions...</option>}
                  {!nodesLoading && moduleNodes.length === 0 && <option>No active region available</option>}
                  {moduleNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.location || 'Global'}{node.countryCode ? ` - ${node.countryCode.toUpperCase()}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="mb-14">
              <SectionTitle title="Choose an image" />
              <TabBar items={['OS', 'Solutions', 'Custom Images']} active="OS" />
              <div className="space-y-2">
                {nodesLoading ? (
                  <EmptyRow text="Loading available modules..." />
                ) : modules.length === 0 ? (
                  <EmptyRow text="No active deployment module is available." warning />
                ) : (
                  modules.map((module, index) => {
                    const selected = selectedModule === module.key;
                    const logo = moduleLogo(module.key);
                    return (
                      <button
                        key={module.key}
                        onClick={() => setSelectedModule(module.key)}
                        className={`flex h-[58px] w-full items-center border text-left transition-colors ${
                          selected ? 'border-[#0069ff] bg-[#f2f7ff]' : 'border-[#94a3c7] bg-white hover:border-[#0069ff]'
                        }`}
                      >
                        <span className="flex h-full w-[44px] items-center justify-center">
                          <RadioDot selected={selected} />
                        </span>
                        <span className="flex h-full flex-1 items-center gap-3 border-l border-transparent px-1">
                          <span className="grid h-6 w-6 place-items-center">
                            {logo ? <img src={logo} alt={moduleLabel(module.key)} className="h-6 w-6 object-contain" /> : <Server className="h-5 w-5 text-[#62708f]" />}
                          </span>
                          <span className="w-[135px] text-[14px] font-bold text-[#031b4e]">{moduleLabel(module.key)}</span>
                          {index === 0 && (
                            <span className="hidden bg-[#6f7c9d] px-4 py-1 text-[11px] font-bold uppercase text-white sm:inline-flex">
                              Recommended
                            </span>
                          )}
                        </span>
                        <span className="flex h-full min-w-[108px] items-center justify-end border-l border-[#94a3c7] px-4 text-[14px] font-semibold text-[#4b5d87]">
                          {module.count} region{module.count === 1 ? '' : 's'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <button type="button" className="mt-5 text-[14px] font-bold text-[#0069ff]">Show all images</button>
            </section>

            <section className="mb-14">
              <SectionTitle title="Choose a Droplet Plan" />
              <TabBar items={['Basic', 'General Purpose', 'CPU-Optimized', 'Memory-Optimized']} active="Basic" />
              <p className="mb-3 mt-6 text-[13px] font-bold text-[#031b4e]">CPU Options</p>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {['Regular', 'Premium AMD', 'Premium Intel'].map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    className={`flex min-h-[52px] items-center gap-3 border px-3 text-left ${
                      index === 2 ? 'border-[#0069ff] bg-[#f2f7ff]' : 'border-[#94a3c7] bg-white'
                    }`}
                  >
                    <RadioDot selected={index === 2} />
                    <span>
                      <span className="block text-[14px] font-bold text-[#031b4e]">{item}</span>
                      <span className="block text-[12px] text-[#4d5f85]">Disk Type: {index === 0 ? 'SSD' : 'NVMe SSD'}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mb-8 border border-[#a58cff] bg-[#f7f4ff] px-4 py-4 text-[13px] leading-5 text-[#031b4e]">
                <span className="font-bold">Basic - Premium plans</span> are available only in administrator connected tPanel regions.
              </div>

              <p className="mb-3 text-[13px] font-bold text-[#031b4e]">Select a Plan</p>
              <div className="space-y-2">
                {plansLoading ? (
                  <EmptyRow text="Loading active cloud packages..." />
                ) : plans.length === 0 ? (
                  <EmptyRow text="No active cloud package is configured. Add cloud plans from Administrator Plans first." warning />
                ) : (
                  plans.map((plan) => {
                    const selected = selectedPlan === plan.code;
                    const ram = limitValue(plan, 'ram', fallbackLimits.ram);
                    const cpu = limitValue(plan, 'cpu', fallbackLimits.cpu);
                    const disk = limitValue(plan, 'disk', fallbackLimits.disk);
                    const features = featureList(plan);
                    return (
                      <button
                        key={plan.id || plan.code}
                        onClick={() => setSelectedPlan(plan.code)}
                        className={`flex min-h-[58px] w-full items-center gap-3 border px-3 text-left transition-colors ${
                          selected ? 'border-[#0069ff] bg-[#f2f7ff]' : 'border-[#d7deed] bg-[#f5f7fb] hover:border-[#0069ff]'
                        }`}
                        id={`plan-${plan.code}`}
                      >
                        <RadioDot selected={selected} />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold text-[#566992]">${Number(plan.price || 0).toFixed(2)}/mo</span>
                          <span className="block truncate text-[13px] text-[#46577c]">
                            {cpu} - {ram} - {disk} NVMe SSD{features.length > 0 ? ` - ${features.slice(0, 1).join('')}` : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <button type="button" className="mt-5 text-[14px] font-bold text-[#0069ff]">Show all plans</button>
            </section>

            <section className="mb-14 space-y-8">
              <OptionalBox title="Add additional storage" description="Volumes are network block storage. You can attach storage after deployment." />
              <OptionalBox title="Enable automated backups" description="Restore your Droplet if it fails. Configure backup frequency and retention." />
            </section>

            <section className="mb-14">
              <SectionTitle title="Authentication" />
              <TabBar items={['SSH Keys', 'Password']} active="Password" />
              <div className="mt-5 border border-[#e4e8f2] bg-white p-5">
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center border border-[#cdd8ee] text-[#0069ff]">
                    <Lock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-[#031b4e]">Create secure account credentials</p>
                    <p className="mt-1 text-[13px] leading-5 text-[#536489]">This account is created on the selected tPanel server after billing is confirmed.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-[13px] font-bold text-[#031b4e]">Username</span>
                    <div className="flex h-[46px] items-center gap-2 border border-[#94a3c7] bg-white px-3 focus-within:border-[#0069ff]">
                      <User className="h-4 w-4 text-[#62708f]" />
                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="account username"
                        className="w-full bg-transparent text-[14px] outline-none"
                      />
                    </div>
                    {(usernameChecking || usernameCheck) && (
                      <p className={`text-[12px] font-semibold ${usernameCheck?.available ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {usernameChecking ? 'Checking username...' : usernameCheck?.message}
                      </p>
                    )}
                    {usernameCheck?.suggestions?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {usernameCheck.suggestions.map((item: string) => (
                          <button key={item} type="button" onClick={() => setUsername(item)} className="border border-[#b8c8eb] bg-[#f7faff] px-2 py-1 text-[12px] font-semibold text-[#0069ff]">
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label className="space-y-2">
                    <span className="block text-[13px] font-bold text-[#031b4e]">Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="h-[46px] w-full border border-[#94a3c7] bg-white px-3 text-[14px] outline-none focus:border-[#0069ff]"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="mb-14 space-y-8">
              <OptionalBox
                title="Improved Metrics and monitoring (Free)"
                description="Install lightweight metrics to graph performance and set up alerts inside the control panel."
                icon={TerminalSquare}
              />
              <OptionalBox
                title="Add a worry-free Managed Database"
                description="Add a separate database service with backups, SSL, and restore controls."
                price="$15.00 / month"
                icon={Database}
              />
            </section>

            <section className="mb-14">
              <SectionTitle title="Finalize" />
              <label className="block">
                <span className="mb-2 block text-[13px] font-bold text-[#031b4e]">Give your Droplet a domain name</span>
                <span className="mb-3 block text-[12px] text-[#536489]">Must be a real domain such as example.com. Auto local subdomains are disabled.</span>
                <input
                  value={hostname}
                  onChange={(event) => setHostname(event.target.value)}
                  placeholder="example.com"
                  className="h-[46px] w-full border border-[#94a3c7] bg-white px-3 text-[14px] outline-none focus:border-[#0069ff]"
                />
              </label>
              <div className="mt-7">
                <span className="mb-2 block text-[13px] font-bold text-[#031b4e]">Quantity</span>
                <p className="mb-3 text-[12px] text-[#536489]">Deploy one managed tPanel account with this configuration.</p>
                <div className="inline-flex h-[42px] border border-[#94a3c7]">
                  <button type="button" className="grid w-44 place-items-center border-r border-[#94a3c7] text-[#9aa8c2]">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="grid w-[70px] place-items-center text-[14px] font-semibold">1</span>
                  <button type="button" className="grid w-11 place-items-center border-l border-[#94a3c7] text-[#355180]">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </main>

          <aside className="lg:sticky lg:top-5 lg:self-start">
            <div className="border border-[#94a3c7] bg-white">
              <div className="border-b border-[#94a3c7] px-6 py-5">
                <h2 className="text-[15px] font-bold text-[#031b4e]">Summary</h2>
              </div>
              <div className="max-h-[245px] overflow-y-auto border-b border-[#94a3c7] px-6 py-5">
                <div className="flex items-start gap-4">
                  <span className="mt-1 grid h-5 w-5 place-items-center text-[#0069ff]">
                    <Server className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-bold text-[#031b4e]">Compute</p>
                      <p className="whitespace-nowrap text-[14px] font-medium text-[#233b66]">${Number(selectedPlanRecord?.price || 0).toFixed(2)}/mo</p>
                    </div>
                    <div className="mt-1 space-y-1 text-[13px] leading-5 text-[#284265]">
                      <SummaryLine label="Plan Type" value="Basic" />
                      <SummaryLine label="Module" value={moduleLabel(selectedModule)} />
                      <SummaryLine label="CPU" value={selectedCpu} />
                      <SummaryLine label="RAM" value={selectedRam} />
                      <SummaryLine label="Disk" value={selectedDisk} />
                      <SummaryLine label="Region" value={selectedNode?.location || 'Select region'} />
                      <SummaryLine label="Slug" value={selectedPlanRecord?.code || 'select-plan'} />
                      {hostname && <SummaryLine label="Domain" value={hostname} />}
                      {username && <SummaryLine label="User" value={username} />}
                      {selectedFeatures.length > 0 && <SummaryLine label="Includes" value={selectedFeatures.slice(0, 2).join(', ')} />}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-b border-[#94a3c7] px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-bold text-[#031b4e]">Total cost</p>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-[#031b4e]">${Number(selectedPlanRecord?.price || 0).toFixed(2)}/month</p>
                    <p className="text-[13px] text-[#566992]">${selectedHourly.toFixed(2)}/hour</p>
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creditEmpty || plansLoading || nodesLoading || !selectedPlanRecord || !selectedNode}
                  className="mt-5 h-[44px] w-full bg-[#80b4f8] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#0069ff] disabled:cursor-not-allowed disabled:bg-[#b8c5d8]"
                >
                  {creditEmpty ? 'Add Payment Method and Create Droplet' : 'Create Droplet'}
                </button>
                <p className="mt-4 flex items-center gap-2 text-[12px] text-[#536489]">
                  <KeyRound className="h-4 w-4 text-[#6d63ff]" />
                  Password authentication is enabled for this Droplet
                </p>
              </div>
            </div>

            <div className="mt-4 grid min-h-[96px] grid-cols-[88px_1fr] border border-[#cfd7e6] bg-white">
              <div className="grid place-items-center bg-[#ffd6f4]">
                <TerminalSquare className="h-8 w-8 text-black" />
              </div>
              <div className="px-4 py-4">
                <p className="text-[14px] font-bold leading-5 text-[#031b4e]">Want to maximize efficiency and cost?</p>
                <p className="mt-3 text-[12px] leading-5 text-[#284265]">
                  Programmatically manage Droplets in a repeatable and reusable way with our API. <span className="font-semibold text-[#0069ff]">Create via API</span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-[14px] font-bold text-[#031b4e]">{title}</h2>;
}

function TabBar({ items, active }: { items: string[]; active: string }) {
  return (
    <div className="mb-5 flex overflow-x-auto border-b border-[#94a3c7]">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className={`h-[42px] shrink-0 border-r border-t border-[#94a3c7] px-7 text-[13px] font-bold ${
            item === active ? 'border-l bg-white text-[#031b4e]' : 'bg-[#f8f9fc] text-[#566992]'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span className={`grid h-4 w-4 place-items-center rounded-full border ${selected ? 'border-[#0069ff]' : 'border-[#a6b3cf]'}`}>
      {selected && <span className="h-2 w-2 rounded-full bg-[#0069ff]" />}
    </span>
  );
}

function EmptyRow({ text, warning = false }: { text: string; warning?: boolean }) {
  return (
    <div className={`border px-4 py-5 text-[13px] font-semibold ${warning ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#d7deed] bg-[#f5f7fb] text-[#4d5f85]'}`}>
      {text}
    </div>
  );
}

function OptionalBox({
  title,
  description,
  price,
  icon: Icon
}: {
  title: string;
  description: string;
  price?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex min-h-[78px] items-start gap-3 border border-[#94a3c7] bg-white px-4 py-4">
      <input type="checkbox" className="mt-1 h-4 w-4 border-[#94a3c7]" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-[#031b4e]">{title}</p>
        <p className="mt-1 max-w-[420px] text-[13px] leading-5 text-[#536489]">{description}</p>
        {price && <p className="mt-3 text-[14px] font-bold text-[#031b4e]">{price}</p>}
      </div>
      {Icon && <Icon className="mt-3 h-8 w-8 shrink-0 text-[#0069ff]" />}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-bold">{label}: </span>
      <span>{value}</span>
    </p>
  );
}
