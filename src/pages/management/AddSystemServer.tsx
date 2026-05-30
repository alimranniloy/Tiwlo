import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Package,
  RefreshCw,
  Server,
  Shield,
  UserRound
} from 'lucide-react';
import {
  createCloudResourceOrderWithApi,
  createHostingProvisioningOrderWithApi,
  fetchHostingComputeNodesWithApi,
  fetchHostingPackagesWithApi,
  fetchHostingProductsWithApi,
  notifyDataRefresh
} from '../../lib/tiwloApi';
import { OrderCompleteSummary, TowerOrderLoader, type OrderSummary } from '../../components/SetupLoader';

type SizeOption = {
  id: string;
  name: string;
  code: string;
  productId?: string;
  packageId?: string;
  module: string;
  accountType: string;
  monthlyCost: number;
  limits: Record<string, number>;
  whmPackageName?: string;
};

const hoursPerMonth = 730;

function money(value: number) {
  return `USD ${Number(value || 0).toFixed(2)}`;
}

function hourlyRate(monthlyCost: number) {
  return Number((Number(monthlyCost || 0) / hoursPerMonth).toFixed(4));
}

function panelLabel(panel: string) {
  const value = String(panel || '').toLowerCase();
  if (value === 'tpanel') return 'tPanel';
  if (value === 'hosting-panel') return 'Hosting Panel';
  if (value === 'cpanel') return 'cPanel / WHM';
  return value.toUpperCase();
}

function moduleLogo(module: string) {
  return module === 'tpanel' ? '/brand/icon.png' : '/brand/logo.png';
}

function nodeFreeSlots(node: any) {
  return Number(node?.maxAccounts || 0)
    ? Math.max(0, Number(node.maxAccounts || 0) - Number(node.activeAccounts || 0))
    : Infinity;
}

function nodeAvailable(node: any) {
  return node?.status === 'active' && nodeFreeSlots(node) > 0;
}

function limitText(limits: Record<string, number>) {
  const parts = [
    `${limits.cpu || 1} CPU`,
    `${limits.ramMb || 1024} MB RAM`,
    `${limits.diskGb || 10} GB SSD`,
    `${limits.bandwidthGb || 100} GB BW`
  ];
  return parts.join(' / ');
}

export default function AddSystemServer() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [showAllSizes, setShowAllSizes] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [orderPhase, setOrderPhase] = useState<'form' | 'loading' | 'complete'>('form');
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [nodeRows, productRows, packageRows] = await Promise.all([
        fetchHostingComputeNodesWithApi(),
        fetchHostingProductsWithApi(),
        fetchHostingPackagesWithApi()
      ]);
      setNodes(nodeRows.filter((node) => node.status !== 'deleted'));
      setProducts(productRows.filter((product) => product.status === 'active'));
      setPackages(packageRows.filter((pkg) => pkg.status === 'active'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Hosting Account Module records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const modules = useMemo(() => {
    const keys = new Set<string>();
    products.forEach((product) => keys.add(String(product.module || 'tpanel').toLowerCase()));
    nodes.forEach((node) => keys.add(String(node.panel || '').toLowerCase()));
    return Array.from(keys)
      .filter(Boolean)
      .map((key) => ({
        key,
        label: panelLabel(key),
        products: products.filter((product) => String(product.module || '').toLowerCase() === key).length,
        nodes: nodes.filter((node) => String(node.panel || '').toLowerCase() === key && nodeAvailable(node)).length
      }))
      .filter((module) => module.products > 0 || module.nodes > 0);
  }, [nodes, products]);

  useEffect(() => {
    if (!selectedModule && modules[0]) setSelectedModule(modules[0].key);
  }, [modules, selectedModule]);

  const moduleProducts = products.filter((product) => String(product.module || '').toLowerCase() === selectedModule);
  const moduleProductIds = new Set(moduleProducts.map((product) => product.id));
  const moduleNodes = nodes.filter((node) => {
    const panel = String(node.panel || '').toLowerCase();
    const productMatch = moduleProducts.some((product) => product.nodeId === node.id);
    return nodeAvailable(node) && (panel === selectedModule || productMatch || (selectedModule === 'tpanel' && panel === 'hosting-panel'));
  });

  useEffect(() => {
    if (moduleNodes.length > 0 && !moduleNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(moduleNodes[0].id);
    }
  }, [moduleNodes, selectedNodeId]);

  const sizeOptions = useMemo<SizeOption[]>(() => {
    const packageOptions = packages
      .filter((pkg) => !pkg.productId || moduleProductIds.has(pkg.productId))
      .map((pkg) => {
        const product = moduleProducts.find((item) => item.id === pkg.productId);
        return {
          id: `package:${pkg.id}`,
          packageId: pkg.id,
          productId: pkg.productId,
          name: pkg.name,
          code: pkg.whmPackageName || pkg.name,
          module: selectedModule || product?.module || 'tpanel',
          accountType: pkg.accountType || product?.accountType || 'shared',
          monthlyCost: Number(pkg.pricing?.monthly || product?.price || 0),
          limits: { ...(product?.limits || {}), ...(pkg.limits || {}) },
          whmPackageName: pkg.whmPackageName
        };
      });

    const productOptions = moduleProducts.map((product) => ({
      id: `product:${product.id}`,
      productId: product.id,
      name: product.name,
      code: product.code,
      module: product.module || selectedModule || 'tpanel',
      accountType: product.accountType || 'shared',
      monthlyCost: Number(product.price || 0),
      limits: product.limits || {},
      whmPackageName: product.serverConfig?.whmPackageName || product.code
    }));

    return [...packageOptions, ...productOptions].sort((a, b) => a.monthlyCost - b.monthlyCost);
  }, [moduleProductIds, moduleProducts, packages, selectedModule]);

  useEffect(() => {
    if (sizeOptions.length > 0 && !sizeOptions.some((size) => size.id === selectedSizeId)) {
      setSelectedSizeId(sizeOptions[0].id);
    }
  }, [selectedSizeId, sizeOptions]);

  const selectedNode = moduleNodes.find((node) => node.id === selectedNodeId);
  const selectedSize = sizeOptions.find((size) => size.id === selectedSizeId);
  const visibleSizes = showAllSizes ? sizeOptions : sizeOptions.slice(0, 4);

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedModule || !selectedNode || !selectedSize) {
      setError('Select a module, available server IP, and package size first.');
      return;
    }

    setIsConnecting(true);
    setError('');
    try {
      const rate = hourlyRate(selectedSize.monthlyCost);
      const label = `${selectedSize.name} on ${selectedNode.ip}`;
      const order = await createCloudResourceOrderWithApi({
        resource: {
          type: 'system_server',
          name: domain || label,
          region: selectedNode.location || 'Hosting Account Module',
          specs: `${panelLabel(selectedModule)} ${selectedSize.name} (${limitText(selectedSize.limits)})`,
          image: panelLabel(selectedModule),
          plan: selectedSize.code,
          cpu: String(selectedSize.limits.cpu || 1),
          ram: `${selectedSize.limits.ramMb || 1024} MB`,
          disk: `${selectedSize.limits.diskGb || 10} GB`,
          monthlyCost: selectedSize.monthlyCost,
          ip: selectedNode.ip,
          metadata: {
            provider: selectedModule,
            role: `${panelLabel(selectedModule)} managed hosting account`,
            ip: selectedNode.ip,
            nodeId: selectedNode.id,
            packageId: selectedSize.packageId,
            productId: selectedSize.productId,
            billing: {
              monthlyCost: selectedSize.monthlyCost,
              hourlyRate: rate,
              billingCycle: 'hourly_monthly_cap'
            }
          }
        },
        provider: 'credit',
        currency: 'USD',
        hourlyRate: rate,
        initialCharge: Math.max(rate, 0.01)
      });

      if (order.status === 'requires_payment') {
        throw new Error(order.message || 'Add credit before connecting this server package.');
      }

      await createHostingProvisioningOrderWithApi({
        productId: selectedSize.productId,
        packageId: selectedSize.packageId,
        nodeId: selectedNode.id,
        domain: domain || `${username}.${selectedModule}.local`,
        hostname: domain || selectedNode.hostname || selectedNode.ip,
        username,
        password,
        module: selectedModule,
        accountType: selectedSize.accountType,
        amount: selectedSize.monthlyCost,
        currency: 'USD',
        whmPackageName: selectedSize.whmPackageName || selectedSize.code,
        limits: selectedSize.limits
      });

      setOrderSummary({
        title: 'Management server order completed',
        invoiceNumber: order.invoice?.number,
        packageName: selectedSize.name,
        serverIp: selectedNode.ip,
        hourlyRate: rate,
        monthlyCost: selectedSize.monthlyCost,
        status: order.status === 'paid' ? 'Provisioning queued' : order.status
      });
      notifyDataRefresh();
      setOrderPhase('loading');
      window.setTimeout(() => setOrderPhase('complete'), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect server. Check credit, package, and credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (orderPhase === 'loading') {
    return (
      <TowerOrderLoader
        messages={[
          'Setting up your management server',
          'Checking billing and invoice',
          'Reserving selected IP capacity',
          'Installing selected package',
          'Queuing tPanel automation',
          'Preparing order summary'
        ]}
      />
    );
  }

  if (orderPhase === 'complete' && orderSummary) {
    return (
      <OrderCompleteSummary
        summary={orderSummary}
        onPrimary={() => navigate('/management/resources/compute')}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Connect Management Server</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Create managed accounts from active Hosting Account Module nodes and packages.</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleConnect} className="space-y-6">
        <section className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">1. Hosting Account Module</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 p-6 text-sm font-bold text-gray-400 sm:col-span-2 lg:col-span-3">No active hosting modules found.</div>
            ) : modules.map((module) => (
              <button
                type="button"
                key={module.key}
                onClick={() => {
                  setSelectedModule(module.key);
                  setSelectedNodeId('');
                  setSelectedSizeId('');
                  setShowAllSizes(false);
                }}
                className={`flex items-center gap-4 rounded border p-4 text-left transition-all ${
                  selectedModule === module.key ? 'border-[#0069ff] bg-[#f3f5f9] ring-1 ring-[#0069ff]' : 'border-[#e5e8ed] hover:border-[#0069ff]'
                }`}
              >
                <img src={moduleLogo(module.key)} alt="" className="h-10 w-10 rounded object-contain" />
                <div>
                  <p className="text-[14px] font-bold text-[#2e3d49]">{module.label}</p>
                  <p className="text-[11px] text-gray-500">{module.products} packages / {module.nodes} available nodes</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">2. Select Server IP</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            {moduleNodes.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 p-6 text-sm font-bold text-gray-400 md:col-span-2">No active node has free account capacity for this module.</div>
            ) : moduleNodes.map((node) => (
              <button
                type="button"
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`rounded border p-4 text-left transition-all ${
                  selectedNodeId === node.id ? 'border-[#0069ff] bg-blue-50 ring-1 ring-[#0069ff]' : 'border-[#e5e8ed] hover:border-[#0069ff]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-[#0069ff]" />
                    <div>
                      <p className="text-sm font-bold text-[#2e3d49]">{node.name}</p>
                      <p className="font-mono text-[12px] text-gray-500">{node.ip}</p>
                    </div>
                  </div>
                  <span className="rounded border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                    {nodeFreeSlots(node) === Infinity ? 'unlimited' : `${nodeFreeSlots(node)} free`}
                  </span>
                </div>
                <p className="mt-3 text-[12px] text-gray-500">{node.hostname}:{node.port} / {node.location || 'Global'}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">3. Size</h2>
            {sizeOptions.length > 4 && (
              <button type="button" onClick={() => setShowAllSizes((value) => !value)} className="text-[12px] font-bold text-[#0069ff] hover:underline">
                {showAllSizes ? 'Show less' : 'See more'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {visibleSizes.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 p-6 text-sm font-bold text-gray-400 md:col-span-2 xl:col-span-4">No package size exists for this module.</div>
            ) : visibleSizes.map((size) => (
              <button
                type="button"
                key={size.id}
                onClick={() => setSelectedSizeId(size.id)}
                className={`rounded border p-4 text-left transition-all ${
                  selectedSizeId === size.id ? 'border-[#0069ff] bg-blue-50 ring-1 ring-[#0069ff]' : 'border-[#e5e8ed] hover:border-[#0069ff]'
                }`}
              >
                <Package className="mb-3 h-5 w-5 text-[#0069ff]" />
                <p className="text-sm font-bold text-[#2e3d49]">{size.name}</p>
                <p className="mt-1 text-[11px] font-bold uppercase text-gray-400">{size.accountType}</p>
                <p className="mt-4 text-xl font-bold text-[#2e3d49]">{money(size.monthlyCost)}</p>
                <p className="mt-1 text-[11px] font-bold text-green-600">{money(hourlyRate(size.monthlyCost))}/hour credit</p>
                <p className="mt-3 text-[11px] leading-5 text-gray-500">{limitText(size.limits)}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">4. Authentication</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#4a4a4a]"><Shield className="h-4 w-4" /> Authentication Type</span>
              <div className="flex h-[42px] items-center gap-2 rounded border border-[#0069ff] bg-blue-50 px-3 text-sm font-bold text-[#0069ff]">
                <Lock className="h-4 w-4" /> Password
              </div>
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#4a4a4a]"><UserRound className="h-4 w-4" /> Username</span>
              <input required value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#0069ff]" />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#4a4a4a]"><KeyRound className="h-4 w-4" /> Password</span>
              <div className="flex rounded border border-[#e5e8ed] bg-[#f8f9fa] focus-within:border-[#0069ff]">
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[14px] outline-none" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-3 text-gray-400 hover:text-gray-700">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="space-y-2 md:col-span-3">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4a4a4a]">Domain / Hostname</span>
              <input required value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="clientdomain.com" className="w-full rounded border border-[#e5e8ed] bg-[#f8f9fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#0069ff]" />
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700 md:flex-row md:items-center md:justify-between">
          <span>Selected package will bill from credits hourly, capped by its monthly price.</span>
          <button
            type="submit"
            disabled={isConnecting || loading || !selectedNode || !selectedSize}
            className="inline-flex items-center justify-center gap-2 rounded bg-[#0069ff] px-8 py-3 text-[14px] font-bold text-white transition-all hover:bg-[#0056cc] disabled:opacity-70"
          >
            {isConnecting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Connecting...</> : <>Connect Server <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
