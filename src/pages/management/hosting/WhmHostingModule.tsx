import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  Edit3,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  Shield,
  Trash2,
  Users,
  X
} from 'lucide-react';
import {
  createHostingProvisioningOrderWithApi,
  deleteHostingComputeNodeWithApi,
  fetchHostingComputeNodesWithApi,
  fetchHostingPackagesWithApi,
  fetchHostingProductGroupsWithApi,
  fetchHostingProductsWithApi,
  fetchHostingProvisioningOrdersWithApi,
  testHostingComputeNodeWithApi,
  upsertHostingComputeNodeWithApi,
  upsertHostingPackageWithApi,
  upsertHostingProductGroupWithApi,
  upsertHostingProductWithApi
} from '../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../components/ActionConfirmation';

const panels = ['whm', 'cpanel', 'plesk', 'virtualizor', 'directadmin', 'droplet'];
const modules = ['whm', 'cpanel', 'droplet', 'plesk', 'directadmin'];
const accountTypes = ['shared', 'reseller', 'vps', 'dedicated'];
const intervals = ['month', 'quarter', 'year', 'one_time'];

const blankNode = {
  id: '',
  name: '',
  hostname: '',
  ip: '',
  panel: 'whm',
  port: '2087',
  username: 'root',
  apiToken: '',
  accessHash: '',
  nameservers: '',
  maxAccounts: '100',
  activeAccounts: '0',
  status: 'active',
  monthlyCost: '0',
  location: 'Global'
};

const blankGroup = {
  id: '',
  name: '',
  slug: '',
  description: '',
  sortOrder: '0',
  status: 'active'
};

const blankProduct = {
  id: '',
  groupId: '',
  nodeId: '',
  code: '',
  name: '',
  module: 'whm',
  accountType: 'shared',
  status: 'active',
  price: '0',
  setupFee: '0',
  interval: 'month',
  whmPackageName: '',
  cpu: '1',
  ramMb: '1024',
  diskGb: '10',
  bandwidthGb: '100',
  websites: '1',
  databases: '5',
  emailAccounts: '10'
};

const blankPackage = {
  id: '',
  productId: '',
  nodeId: '',
  name: '',
  whmPackageName: '',
  accountType: 'shared',
  status: 'active',
  price: '0',
  cpu: '1',
  ramMb: '1024',
  diskGb: '10',
  bandwidthGb: '100',
  websites: '1'
};

const blankOrder = {
  productId: '',
  packageId: '',
  nodeId: '',
  domain: '',
  hostname: '',
  username: '',
  password: '',
  amount: '',
  currency: 'USD'
};

function money(value: number | string) {
  return `USD ${Number(value || 0).toFixed(2)}`;
}

function splitNameservers(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function limitsFrom(form: Record<string, string>) {
  return {
    cpu: Number(form.cpu || 0),
    ramMb: Number(form.ramMb || 0),
    diskGb: Number(form.diskGb || 0),
    bandwidthGb: Number(form.bandwidthGb || 0),
    websites: Number(form.websites || 0),
    databases: Number((form as any).databases || 0),
    emailAccounts: Number((form as any).emailAccounts || 0)
  };
}

function usagePercent(node: any) {
  if (!Number(node?.maxAccounts || 0)) return 0;
  return Math.min(100, Math.round((Number(node.activeAccounts || 0) / Number(node.maxAccounts || 1)) * 100));
}

function statusTone(status: string) {
  const value = String(status || '').toLowerCase();
  if (value === 'active' || value === 'provisioned') return 'border-green-100 bg-green-50 text-green-700';
  if (value === 'pending' || value === 'queued') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (value === 'failed' || value === 'error') return 'border-red-100 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-600';
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export default function WhmHostingModule() {
  const [activeTab, setActiveTab] = React.useState<'nodes' | 'products' | 'orders'>('nodes');
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [groups, setGroups] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [packages, setPackages] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [nodeForm, setNodeForm] = React.useState(blankNode);
  const [groupForm, setGroupForm] = React.useState(blankGroup);
  const [productForm, setProductForm] = React.useState(blankProduct);
  const [packageForm, setPackageForm] = React.useState(blankPackage);
  const [orderForm, setOrderForm] = React.useState(blankOrder);
  const [modal, setModal] = React.useState<'node' | 'group' | 'product' | 'package' | 'order' | null>(null);
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nodeRows, groupRows, productRows, packageRows, orderRows] = await Promise.all([
        fetchHostingComputeNodesWithApi(search || undefined),
        fetchHostingProductGroupsWithApi(search || undefined),
        fetchHostingProductsWithApi(search || undefined),
        fetchHostingPackagesWithApi(search || undefined),
        fetchHostingProvisioningOrdersWithApi(search || undefined)
      ]);
      setNodes(nodeRows);
      setGroups(groupRows);
      setProducts(productRows);
      setPackages(packageRows);
      setOrders(orderRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load hosting module data');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadAll, 250);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const nodeOptions = [{ value: '', label: 'Auto select' }, ...nodes.filter((node) => node.status !== 'deleted').map((node) => ({ value: node.id, label: `${node.name} (${node.ip})` }))];
  const groupOptions = [{ value: '', label: 'No group' }, ...groups.map((group) => ({ value: group.id, label: group.name }))];
  const productOptions = [{ value: '', label: 'No product' }, ...products.map((product) => ({ value: product.id, label: product.name }))];
  const packageOptions = [{ value: '', label: 'No package' }, ...packages.map((pkg) => ({ value: pkg.id, label: `${pkg.name} (${pkg.whmPackageName})` }))];

  const openNode = async (node?: any) => {
    if (node) {
      const confirmed = await confirmEdit({
        title: 'Edit compute node?',
        message: 'Are you sure you want to edit this compute node?',
        resourceName: node.name
      });
      if (!confirmed) return;
    }

    setNodeForm(node ? {
      id: node.id,
      name: node.name || '',
      hostname: node.hostname || '',
      ip: node.ip || '',
      panel: node.panel || 'whm',
      port: String(node.port || 2087),
      username: node.username || 'root',
      apiToken: node.apiToken || '',
      accessHash: node.accessHash || '',
      nameservers: Array.isArray(node.nameservers) ? node.nameservers.join(', ') : '',
      maxAccounts: String(node.maxAccounts || 0),
      activeAccounts: String(node.activeAccounts || 0),
      status: node.status || 'active',
      monthlyCost: String(node.monthlyCost || 0),
      location: node.location || 'Global'
    } : blankNode);
    setModal('node');
  };

  const openGroup = async (group?: any) => {
    if (group) {
      const confirmed = await confirmEdit({
        title: 'Edit product group?',
        message: 'Are you sure you want to edit this product group?',
        resourceName: group.name
      });
      if (!confirmed) return;
    }

    setGroupForm(group ? {
      id: group.id,
      name: group.name || '',
      slug: group.slug || '',
      description: group.description || '',
      sortOrder: String(group.sortOrder || 0),
      status: group.status || 'active'
    } : blankGroup);
    setModal('group');
  };

  const openProduct = async (product?: any) => {
    if (product) {
      const confirmed = await confirmEdit({
        title: 'Edit hosting product?',
        message: 'Are you sure you want to edit this hosting product?',
        resourceName: product.name
      });
      if (!confirmed) return;
    }

    const limits = product?.limits || {};
    setProductForm(product ? {
      id: product.id,
      groupId: product.groupId || '',
      nodeId: product.nodeId || '',
      code: product.code || '',
      name: product.name || '',
      module: product.module || 'whm',
      accountType: product.accountType || 'shared',
      status: product.status || 'active',
      price: String(product.price || 0),
      setupFee: String(product.setupFee || 0),
      interval: product.interval || 'month',
      whmPackageName: product.serverConfig?.whmPackageName || '',
      cpu: String(limits.cpu || 1),
      ramMb: String(limits.ramMb || 1024),
      diskGb: String(limits.diskGb || 10),
      bandwidthGb: String(limits.bandwidthGb || 100),
      websites: String(limits.websites || 1),
      databases: String(limits.databases || 5),
      emailAccounts: String(limits.emailAccounts || 10)
    } : { ...blankProduct, groupId: groups[0]?.id || '', nodeId: nodes[0]?.id || '' });
    setModal('product');
  };

  const openPackage = async (pkg?: any) => {
    if (pkg) {
      const confirmed = await confirmEdit({
        title: 'Edit WHM package?',
        message: 'Are you sure you want to edit this WHM package?',
        resourceName: pkg.name
      });
      if (!confirmed) return;
    }

    const limits = pkg?.limits || {};
    setPackageForm(pkg ? {
      id: pkg.id,
      productId: pkg.productId || '',
      nodeId: pkg.nodeId || '',
      name: pkg.name || '',
      whmPackageName: pkg.whmPackageName || '',
      accountType: pkg.accountType || 'shared',
      status: pkg.status || 'active',
      price: String(pkg.pricing?.monthly || 0),
      cpu: String(limits.cpu || 1),
      ramMb: String(limits.ramMb || 1024),
      diskGb: String(limits.diskGb || 10),
      bandwidthGb: String(limits.bandwidthGb || 100),
      websites: String(limits.websites || 1)
    } : { ...blankPackage, productId: products[0]?.id || '', nodeId: nodes[0]?.id || '' });
    setModal('package');
  };

  const openOrder = () => {
    const product = products[0];
    setOrderForm({
      ...blankOrder,
      productId: product?.id || '',
      nodeId: product?.nodeId || nodes[0]?.id || '',
      amount: product ? String(product.price || 0) : ''
    });
    setModal('order');
  };

  const saveNode = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await upsertHostingComputeNodeWithApi({
        id: nodeForm.id || undefined,
        name: nodeForm.name,
        hostname: nodeForm.hostname,
        ip: nodeForm.ip,
        panel: nodeForm.panel,
        port: Number(nodeForm.port || 2087),
        username: nodeForm.username,
        apiToken: nodeForm.apiToken || undefined,
        accessHash: nodeForm.accessHash || undefined,
        nameservers: splitNameservers(nodeForm.nameservers),
        maxAccounts: Number(nodeForm.maxAccounts || 0),
        activeAccounts: Number(nodeForm.activeAccounts || 0),
        status: nodeForm.status,
        monthlyCost: Number(nodeForm.monthlyCost || 0),
        location: nodeForm.location,
        metadata: { source: 'whm_hosting_module', ssl: Number(nodeForm.port) === 2087 }
      });
      setModal(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save compute node');
    } finally {
      setSaving(false);
    }
  };

  const saveGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await upsertHostingProductGroupWithApi({
        id: groupForm.id || undefined,
        name: groupForm.name,
        slug: groupForm.slug || undefined,
        description: groupForm.description,
        sortOrder: Number(groupForm.sortOrder || 0),
        status: groupForm.status
      });
      setModal(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product group');
    } finally {
      setSaving(false);
    }
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await upsertHostingProductWithApi({
        id: productForm.id || undefined,
        groupId: productForm.groupId || undefined,
        nodeId: productForm.nodeId || undefined,
        code: productForm.code,
        name: productForm.name,
        module: productForm.module,
        accountType: productForm.accountType,
        status: productForm.status,
        price: Number(productForm.price || 0),
        setupFee: Number(productForm.setupFee || 0),
        interval: productForm.interval,
        limits: limitsFrom(productForm),
        serverConfig: {
          whmPackageName: productForm.whmPackageName || productForm.code,
          createMode: productForm.module === 'whm' || productForm.module === 'cpanel' ? 'createacct' : 'provision',
          reseller: productForm.accountType === 'reseller'
        },
        welcomeEmail: { template: 'hosting-welcome', includeCredentials: true }
      });
      setModal(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save hosting product');
    } finally {
      setSaving(false);
    }
  };

  const savePackage = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await upsertHostingPackageWithApi({
        id: packageForm.id || undefined,
        productId: packageForm.productId || undefined,
        nodeId: packageForm.nodeId || undefined,
        name: packageForm.name,
        whmPackageName: packageForm.whmPackageName,
        accountType: packageForm.accountType,
        status: packageForm.status,
        limits: limitsFrom(packageForm),
        pricing: { monthly: Number(packageForm.price || 0), currency: 'USD' }
      });
      setModal(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save hosting package');
    } finally {
      setSaving(false);
    }
  };

  const createOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const product = products.find((item) => item.id === orderForm.productId);
      const pkg = packages.find((item) => item.id === orderForm.packageId);
      await createHostingProvisioningOrderWithApi({
        productId: orderForm.productId || undefined,
        packageId: orderForm.packageId || undefined,
        nodeId: orderForm.nodeId || pkg?.nodeId || product?.nodeId || undefined,
        domain: orderForm.domain,
        hostname: orderForm.hostname || orderForm.domain,
        username: orderForm.username,
        password: orderForm.password,
        module: product?.module || 'whm',
        accountType: pkg?.accountType || product?.accountType || 'shared',
        amount: Number(orderForm.amount || product?.price || pkg?.pricing?.monthly || 0),
        currency: orderForm.currency,
        whmPackageName: pkg?.whmPackageName || product?.serverConfig?.whmPackageName,
        limits: { ...(product?.limits || {}), ...(pkg?.limits || {}) }
      });
      setModal(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create hosting order');
    } finally {
      setSaving(false);
    }
  };

  const testNode = async (node: any) => {
    setError('');
    try {
      await testHostingComputeNodeWithApi(node.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to test compute node');
    }
  };

  const deleteNode = async (node: any) => {
    const confirmed = await confirmDelete({
      title: 'Remove compute node?',
      message: 'Are you sure you want to remove this compute node?',
      resourceName: node.name,
      confirmLabel: 'Remove node'
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteHostingComputeNodeWithApi(node.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove compute node');
    }
  };

  const activeNodes = nodes.filter((node) => node.status !== 'deleted');

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">WHM / cPanel Hosting Module</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Compute nodes, hosting products, WHM packages, and account provisioning.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={loadAll} className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => openNode()} className="inline-flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-[13px] font-bold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Compute Node
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Compute Nodes', value: activeNodes.length, icon: Server },
          { label: 'Hosting Products', value: products.length, icon: Package },
          { label: 'WHM Packages', value: packages.length, icon: Layers },
          { label: 'Provisioned Orders', value: orders.length, icon: CheckCircle2 }
        ].map((stat) => (
          <div key={stat.label} className="rounded border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-[#2e3d49]">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-200 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'nodes', label: 'Compute Nodes', icon: Server },
            { id: 'products', label: 'Products & Packages', icon: Package },
            { id: 'orders', label: 'Provisioning Orders', icon: Globe }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-bold ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-[#2e3d49]'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>
        <div className="relative mb-3 md:mb-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hosting records..."
            className="w-full rounded border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 md:w-72"
          />
        </div>
      </div>

      {activeTab === 'nodes' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {loading ? (
            <div className="rounded border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-400 xl:col-span-2">Loading compute nodes...</div>
          ) : activeNodes.length === 0 ? (
            <div className="rounded border border-dashed border-gray-300 bg-white p-10 text-center xl:col-span-2">
              <Server className="mx-auto mb-4 h-10 w-10 text-gray-300" />
              <p className="text-sm font-bold text-[#2e3d49]">No hosting compute nodes found.</p>
            </div>
          ) : activeNodes.map((node) => (
            <div key={node.id} className="rounded border border-gray-200 bg-white p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#2e3d49]">{node.name}</p>
                    <p className="font-mono text-[11px] text-gray-400">{node.hostname} / {node.ip}:{node.port}</p>
                  </div>
                </div>
                <span className="rounded border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">{node.panel}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div className="rounded bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Accounts</p>
                  <p className="mt-1 font-bold text-[#2e3d49]">{node.activeAccounts}/{node.maxAccounts || 'unlimited'}</p>
                </div>
                <div className="rounded bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Cost</p>
                  <p className="mt-1 font-bold text-[#2e3d49]">{money(node.monthlyCost)}</p>
                </div>
                <div className="rounded bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400">User</p>
                  <p className="mt-1 font-bold text-[#2e3d49]">{node.username}</p>
                </div>
                <div className="rounded bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Status</p>
                  <p className={`mt-1 inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(node.status)}`}>{node.status}</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded bg-gray-100">
                <div className="h-full bg-blue-600" style={{ width: `${usagePercent(node)}%` }} />
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button onClick={() => testNode(node)} className="rounded border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                  Test API
                </button>
                <button onClick={() => openNode(node)} className="rounded border border-gray-200 p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => deleteNode(node)} className="rounded border border-red-100 p-2 text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openGroup()} className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              <Plus className="h-4 w-4" /> Product Group
            </button>
            <button onClick={() => openProduct()} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Product Name
            </button>
            <button onClick={() => openPackage()} className="inline-flex items-center gap-2 rounded bg-[#2e3d49] px-4 py-2 text-xs font-bold text-white hover:bg-black">
              <Plus className="h-4 w-4" /> WHM Package
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2e3d49]">Product Groups</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {groups.length === 0 ? (
                  <div className="p-6 text-sm font-bold text-gray-400">No groups.</div>
                ) : groups.map((group) => (
                  <button key={group.id} onClick={() => openGroup(group)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50">
                    <span>
                      <span className="block text-sm font-bold text-[#2e3d49]">{group.name}</span>
                      <span className="font-mono text-[11px] text-gray-400">{group.slug}</span>
                    </span>
                    <Edit3 className="h-4 w-4 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-gray-200 bg-white xl:col-span-2">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2e3d49]">Hosting Products</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-4 py-3">Limits</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3 text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm font-bold text-gray-400">No hosting products.</td></tr>
                    ) : products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-[#2e3d49]">{product.name}</p>
                          <p className="font-mono text-[11px] text-gray-400">{product.code} / {product.groupName || 'No group'}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold uppercase text-gray-600">{product.module} {product.accountType}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {product.limits?.cpu || 0} CPU / {product.limits?.ramMb || 0} MB / {product.limits?.diskGb || 0} GB
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#2e3d49]">{money(product.price)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openProduct(product)} className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Edit3 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#2e3d49]">WHM Packages</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {packages.length === 0 ? (
                <div className="text-sm font-bold text-gray-400">No WHM packages.</div>
              ) : packages.map((pkg) => (
                <button key={pkg.id} onClick={() => openPackage(pkg)} className="rounded border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/30">
                  <p className="text-sm font-bold text-[#2e3d49]">{pkg.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-gray-400">{pkg.whmPackageName}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-bold text-gray-500">
                    <span>{pkg.limits?.websites || 0} sites</span>
                    <span>{pkg.limits?.diskGb || 0} GB SSD</span>
                    <span>{money(pkg.pricing?.monthly || 0)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openOrder} className="inline-flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-[13px] font-bold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Create Hosting Account
            </button>
          </div>
          <div className="overflow-hidden rounded border border-gray-200 bg-white">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Server</th>
                  <th className="px-4 py-3">Login</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm font-bold text-gray-400">No provisioning orders.</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-[#2e3d49]">{order.domain}</p>
                      <p className="font-mono text-[11px] text-gray-400">{order.hostname || order.domain}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-600">{order.productName || order.module} / {order.packageName || order.accountType}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{order.nodeName || order.nodeIp || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{order.username}</td>
                    <td className="px-4 py-3"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(order.status)}`}>{order.status}</span></td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#2e3d49]">{money(order.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'node' && (
        <Modal title={nodeForm.id ? 'Edit Compute Node' : 'Add Compute Node'} onClose={() => setModal(null)}>
          <form onSubmit={saveNode} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput required label="Server Name" value={nodeForm.name} onChange={(value) => setNodeForm({ ...nodeForm, name: value })} placeholder="WHM Node 01" />
            <FormInput required label="Hostname" value={nodeForm.hostname} onChange={(value) => setNodeForm({ ...nodeForm, hostname: value })} placeholder="server.example.com" />
            <FormInput required label="IP Address" value={nodeForm.ip} onChange={(value) => setNodeForm({ ...nodeForm, ip: value })} placeholder="192.0.2.10" />
            <FormSelect label="Panel / Module" value={nodeForm.panel} onChange={(value) => setNodeForm({ ...nodeForm, panel: value, port: value === 'whm' ? '2087' : value === 'cpanel' ? '2083' : nodeForm.port })} options={panels.map((item) => ({ value: item, label: item.toUpperCase() }))} />
            <FormInput label="Port" value={nodeForm.port} onChange={(value) => setNodeForm({ ...nodeForm, port: value })} type="number" />
            <FormInput required label="Username" value={nodeForm.username} onChange={(value) => setNodeForm({ ...nodeForm, username: value })} />
            <FormInput label="API Token" value={nodeForm.apiToken} onChange={(value) => setNodeForm({ ...nodeForm, apiToken: value })} type="password" />
            <FormInput label="Access Hash" value={nodeForm.accessHash} onChange={(value) => setNodeForm({ ...nodeForm, accessHash: value })} type="password" />
            <FormInput label="Max Accounts" value={nodeForm.maxAccounts} onChange={(value) => setNodeForm({ ...nodeForm, maxAccounts: value })} type="number" />
            <FormInput label="Active Accounts" value={nodeForm.activeAccounts} onChange={(value) => setNodeForm({ ...nodeForm, activeAccounts: value })} type="number" />
            <FormInput label="Monthly Cost" value={nodeForm.monthlyCost} onChange={(value) => setNodeForm({ ...nodeForm, monthlyCost: value })} type="number" />
            <FormInput label="Location" value={nodeForm.location} onChange={(value) => setNodeForm({ ...nodeForm, location: value })} />
            <FormSelect label="Server Status" value={nodeForm.status} onChange={(value) => setNodeForm({ ...nodeForm, status: value })} options={['active', 'inactive', 'maintenance', 'error'].map((item) => ({ value: item, label: item }))} />
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Nameservers</span>
              <textarea value={nodeForm.nameservers} onChange={(event) => setNodeForm({ ...nodeForm, nameservers: event.target.value })} rows={2} className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="ns1.example.com, ns2.example.com" />
            </label>
            <ModalActions saving={saving} onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === 'group' && (
        <Modal title={groupForm.id ? 'Edit Product Group' : 'New Product Group'} onClose={() => setModal(null)}>
          <form onSubmit={saveGroup} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput required label="Group Name" value={groupForm.name} onChange={(value) => setGroupForm({ ...groupForm, name: value })} />
            <FormInput label="Slug" value={groupForm.slug} onChange={(value) => setGroupForm({ ...groupForm, slug: value })} />
            <FormInput label="Sort Order" value={groupForm.sortOrder} onChange={(value) => setGroupForm({ ...groupForm, sortOrder: value })} type="number" />
            <FormSelect label="Status" value={groupForm.status} onChange={(value) => setGroupForm({ ...groupForm, status: value })} options={['active', 'hidden', 'archived'].map((item) => ({ value: item, label: item }))} />
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Description</span>
              <textarea value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} rows={3} className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </label>
            <ModalActions saving={saving} onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === 'product' && (
        <Modal title={productForm.id ? 'Edit Hosting Product' : 'New Hosting Product'} onClose={() => setModal(null)}>
          <form onSubmit={saveProduct} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormSelect label="Product Group" value={productForm.groupId} onChange={(value) => setProductForm({ ...productForm, groupId: value })} options={groupOptions} />
            <FormInput required label="Product Name" value={productForm.name} onChange={(value) => setProductForm({ ...productForm, name: value })} />
            <FormInput required label="Product Code" value={productForm.code} onChange={(value) => setProductForm({ ...productForm, code: value })} />
            <FormSelect label="Module" value={productForm.module} onChange={(value) => setProductForm({ ...productForm, module: value })} options={modules.map((item) => ({ value: item, label: item.toUpperCase() }))} />
            <FormSelect label="Account Type" value={productForm.accountType} onChange={(value) => setProductForm({ ...productForm, accountType: value })} options={accountTypes.map((item) => ({ value: item, label: item }))} />
            <FormSelect label="Product Status" value={productForm.status} onChange={(value) => setProductForm({ ...productForm, status: value })} options={['active', 'hidden', 'archived'].map((item) => ({ value: item, label: item }))} />
            <FormSelect label="Default Server" value={productForm.nodeId} onChange={(value) => setProductForm({ ...productForm, nodeId: value })} options={nodeOptions} />
            <FormInput label="Monthly Price" value={productForm.price} onChange={(value) => setProductForm({ ...productForm, price: value })} type="number" />
            <FormInput label="Setup Fee" value={productForm.setupFee} onChange={(value) => setProductForm({ ...productForm, setupFee: value })} type="number" />
            <FormSelect label="Billing Cycle" value={productForm.interval} onChange={(value) => setProductForm({ ...productForm, interval: value })} options={intervals.map((item) => ({ value: item, label: item }))} />
            <FormInput label="WHM Package Name" value={productForm.whmPackageName} onChange={(value) => setProductForm({ ...productForm, whmPackageName: value })} />
            <FormInput label="CPU Cores" value={productForm.cpu} onChange={(value) => setProductForm({ ...productForm, cpu: value })} type="number" />
            <FormInput label="RAM MB" value={productForm.ramMb} onChange={(value) => setProductForm({ ...productForm, ramMb: value })} type="number" />
            <FormInput label="SSD GB" value={productForm.diskGb} onChange={(value) => setProductForm({ ...productForm, diskGb: value })} type="number" />
            <FormInput label="Bandwidth GB" value={productForm.bandwidthGb} onChange={(value) => setProductForm({ ...productForm, bandwidthGb: value })} type="number" />
            <FormInput label="Websites Allowed" value={productForm.websites} onChange={(value) => setProductForm({ ...productForm, websites: value })} type="number" />
            <FormInput label="Databases" value={productForm.databases} onChange={(value) => setProductForm({ ...productForm, databases: value })} type="number" />
            <FormInput label="Email Accounts" value={productForm.emailAccounts} onChange={(value) => setProductForm({ ...productForm, emailAccounts: value })} type="number" />
            <ModalActions saving={saving} onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === 'package' && (
        <Modal title={packageForm.id ? 'Edit WHM Package' : 'New WHM Package'} onClose={() => setModal(null)}>
          <form onSubmit={savePackage} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormSelect label="Product" value={packageForm.productId} onChange={(value) => setPackageForm({ ...packageForm, productId: value })} options={productOptions} />
            <FormSelect label="Server" value={packageForm.nodeId} onChange={(value) => setPackageForm({ ...packageForm, nodeId: value })} options={nodeOptions} />
            <FormSelect label="Account Type" value={packageForm.accountType} onChange={(value) => setPackageForm({ ...packageForm, accountType: value })} options={accountTypes.map((item) => ({ value: item, label: item }))} />
            <FormSelect label="Package Status" value={packageForm.status} onChange={(value) => setPackageForm({ ...packageForm, status: value })} options={['active', 'hidden', 'archived'].map((item) => ({ value: item, label: item }))} />
            <FormInput required label="Package Name" value={packageForm.name} onChange={(value) => setPackageForm({ ...packageForm, name: value })} />
            <FormInput required label="WHM Package Name" value={packageForm.whmPackageName} onChange={(value) => setPackageForm({ ...packageForm, whmPackageName: value })} />
            <FormInput label="Monthly Price" value={packageForm.price} onChange={(value) => setPackageForm({ ...packageForm, price: value })} type="number" />
            <FormInput label="CPU Cores" value={packageForm.cpu} onChange={(value) => setPackageForm({ ...packageForm, cpu: value })} type="number" />
            <FormInput label="RAM MB" value={packageForm.ramMb} onChange={(value) => setPackageForm({ ...packageForm, ramMb: value })} type="number" />
            <FormInput label="SSD GB" value={packageForm.diskGb} onChange={(value) => setPackageForm({ ...packageForm, diskGb: value })} type="number" />
            <FormInput label="Bandwidth GB" value={packageForm.bandwidthGb} onChange={(value) => setPackageForm({ ...packageForm, bandwidthGb: value })} type="number" />
            <FormInput label="Websites Allowed" value={packageForm.websites} onChange={(value) => setPackageForm({ ...packageForm, websites: value })} type="number" />
            <ModalActions saving={saving} onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === 'order' && (
        <Modal title="Create Hosting Account" onClose={() => setModal(null)}>
          <form onSubmit={createOrder} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormSelect label="Product" value={orderForm.productId} onChange={(value) => {
              const product = products.find((item) => item.id === value);
              setOrderForm({ ...orderForm, productId: value, nodeId: product?.nodeId || orderForm.nodeId, amount: product ? String(product.price || 0) : orderForm.amount });
            }} options={productOptions} />
            <FormSelect label="Package" value={orderForm.packageId} onChange={(value) => {
              const pkg = packages.find((item) => item.id === value);
              setOrderForm({ ...orderForm, packageId: value, nodeId: pkg?.nodeId || orderForm.nodeId, amount: pkg?.pricing?.monthly ? String(pkg.pricing.monthly) : orderForm.amount });
            }} options={packageOptions} />
            <FormSelect label="Target Server" value={orderForm.nodeId} onChange={(value) => setOrderForm({ ...orderForm, nodeId: value })} options={nodeOptions} />
            <FormInput label="Amount" value={orderForm.amount} onChange={(value) => setOrderForm({ ...orderForm, amount: value })} type="number" />
            <FormInput required label="Domain Name" value={orderForm.domain} onChange={(value) => setOrderForm({ ...orderForm, domain: value })} placeholder="clientdomain.com" />
            <FormInput label="Hostname" value={orderForm.hostname} onChange={(value) => setOrderForm({ ...orderForm, hostname: value })} placeholder="clientdomain.com" />
            <FormInput required label="Username" value={orderForm.username} onChange={(value) => setOrderForm({ ...orderForm, username: value })} />
            <FormInput required label="Password" value={orderForm.password} onChange={(value) => setOrderForm({ ...orderForm, password: value })} type="password" />
            <ModalActions saving={saving} onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
          <h2 className="text-base font-bold text-[#2e3d49]">{title}</h2>
          <button onClick={onClose} className="rounded p-2 text-gray-400 hover:bg-white hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 md:col-span-3">
      <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
      <button disabled={saving} className="inline-flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
