import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_STOREFRONT_THEME_KEY,
  AURA_PLUGIN_MODULES,
  STOREFRONT_THEME_CATALOG,
  defaultThemeSettings
} from '../src/modules/ecommerce/themeCatalog.js';

const prisma = new PrismaClient();

const now = new Date();
const addDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

async function upsertUser(data) {
  return prisma.user.upsert({
    where: { email: data.email },
    create: data,
    update: {
      name: data.name,
      role: data.role,
      status: data.status,
      credits: data.credits,
      passwordHash: data.passwordHash
    }
  });
}

async function main() {
  const adminHash = await bcrypt.hash('admin', 10);
  const userHash = await bcrypt.hash('password', 10);

  const admin = await upsertUser({
    id: 'user_admin',
    email: 'admin@tiwlo.app',
    passwordHash: adminHash,
    name: 'Administrator',
    credits: 250,
    role: 'admin',
    status: 'active',
    primaryRegion: 'New York (NYC3)'
  });

  const demoUser = await upsertUser({
    id: 'user_demo',
    email: 'user@tiwlo.app',
    passwordHash: userHash,
    name: 'Demo User',
    credits: 0,
    role: 'user',
    status: 'active',
    primaryRegion: 'New York (NYC3)'
  });

  const storeOwner = await upsertUser({
    id: 'user_store_owner',
    email: 'merchant@tiwlo.app',
    passwordHash: userHash,
    name: 'Blueberry Merchant',
    credits: 75,
    role: 'store_owner',
    status: 'active',
    primaryRegion: 'NYC-1'
  });

  const ispOwner = await upsertUser({
    id: 'user_isp_owner',
    email: 'isp@tiwlo.app',
    passwordHash: userHash,
    name: 'NetCore Operator',
    credits: 125,
    role: 'isp_admin',
    status: 'active',
    primaryRegion: 'Asia-South (Dhaka)'
  });

  await prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'accountCreditPolicy' } },
    create: {
      scope: 'platform',
      scopeId: '',
      key: 'accountCreditPolicy',
      value: {
        newAccountCredit: 0,
        blockOrdersWithoutCredit: true,
        suspendServicesWhenEmpty: true,
        autoResumeWhenCreditAdded: true
      }
    },
    update: {
      value: {
        newAccountCredit: 0,
        blockOrdersWithoutCredit: true,
        suspendServicesWhenEmpty: true,
        autoResumeWhenCreditAdded: true
      }
    }
  });

  const permissionGroups = [
    {
      key: 'platform',
      name: 'Platform Administration',
      description: 'Core cloud, users, billing, security, and support control.',
      permissions: ['admin:read', 'admin:write', 'users:write', 'billing:write', 'settings:write', 'security:write']
    },
    {
      key: 'ecommerce',
      name: 'Ecommerce SaaS',
      description: 'Merchant platform, stores, themes, plugins, orders, and plans.',
      permissions: ['ecommerce:read', 'ecommerce:write', 'store:write', 'plugins:write', 'themes:write']
    },
    {
      key: 'isp',
      name: 'ISP SaaS',
      description: 'ISP sites, RADIUS, routers, subscribers, billing, and network operations.',
      permissions: ['isp:read', 'isp:write', 'radius:write', 'network:write', 'subscribers:write']
    },
    {
      key: 'support',
      name: 'Support Operations',
      description: 'Ticket inbox, SLA, notifications, and customer communication.',
      permissions: ['support:read', 'support:write', 'notifications:write']
    }
  ];

  for (const group of permissionGroups) {
    await prisma.permissionGroup.upsert({
      where: { key: group.key },
      create: group,
      update: { name: group.name, description: group.description, permissions: group.permissions }
    });
  }

  const roles = [
    {
      key: 'super_admin',
      name: 'Super Admin',
      description: 'Full platform control across every dashboard and SaaS product.',
      permissions: ['*'],
      isSystem: true
    },
    {
      key: 'admin',
      name: 'Admin',
      description: 'Platform admin access for daily operations and settings.',
      permissions: ['admin:read', 'admin:write', 'users:write', 'billing:write', 'support:write', 'settings:write', 'ecommerce:write', 'isp:write'],
      isSystem: true
    },
    {
      key: 'manager',
      name: 'Manager',
      description: 'Operational manager with reporting and limited update access.',
      permissions: ['admin:read', 'users:read', 'billing:read', 'support:write', 'ecommerce:read', 'isp:read'],
      isSystem: true
    },
    {
      key: 'staff',
      name: 'Staff',
      description: 'Support and operations staff access.',
      permissions: ['support:write', 'users:read', 'notifications:read'],
      isSystem: true
    },
    {
      key: 'store_owner',
      name: 'Store Owner',
      description: 'Merchant store owner access.',
      permissions: ['store:write', 'orders:write', 'products:write', 'customers:write', 'themes:write', 'plugins:write'],
      isSystem: true
    },
    {
      key: 'isp_admin',
      name: 'ISP Admin',
      description: 'ISP billing and network admin access.',
      permissions: ['isp:write', 'radius:write', 'network:write', 'subscribers:write', 'billing:write'],
      isSystem: true
    },
    {
      key: 'user',
      name: 'User',
      description: 'Customer console access.',
      permissions: ['cloud:write', 'domain:write', 'billing:read', 'support:write'],
      isSystem: true
    }
  ];

  const roleRecords = {};
  for (const role of roles) {
    roleRecords[role.key] = await prisma.role.upsert({
      where: { key: role.key },
      create: role,
      update: { name: role.name, description: role.description, permissions: role.permissions, isSystem: role.isSystem }
    });
  }

  const userRoles = [
    [admin.id, roleRecords.admin.id, 'global', ''],
    [demoUser.id, roleRecords.user.id, 'global', ''],
    [storeOwner.id, roleRecords.store_owner.id, 'store', 'store_blueberry'],
    [ispOwner.id, roleRecords.isp_admin.id, 'isp', 'isp_site_dhaka']
  ];

  for (const [userId, roleId, scope, scopeId] of userRoles) {
    await prisma.userRole.upsert({
      where: { userId_roleId_scope_scopeId: { userId, roleId, scope, scopeId } },
      create: { userId, roleId, scope, scopeId },
      update: { scope, scopeId }
    });
  }

  const plans = [
    {
      id: 'plan_cloud_basic',
      product: 'cloud',
      code: 'basic',
      name: 'Basic Droplet',
      price: 6,
      features: ['1 GB RAM', '1 vCPU', '25 GB SSD', '1 TB Transfer'],
      limits: { droplets: 3 }
    },
    {
      id: 'plan_ecom_basic',
      product: 'ecommerce',
      code: 'basic',
      name: 'Basic Merchant',
      price: 19,
      features: ['500 Products Allowed', '1 Custom Domain Allowed', 'Inventory Management', 'Email Marketing Tools', '1% Transaction Fee'],
      limits: { products: 500, domains: 1 }
    },
    {
      id: 'plan_ecom_pro',
      product: 'ecommerce',
      code: 'pro',
      name: 'Business Pro',
      price: 49,
      features: ['10,000 Products Allowed', '3 Custom Domains Allowed', 'Advanced Analytics Hub', 'Priority Phone Support', '0.5% Transaction Fee'],
      limits: { products: 10000, domains: 3 }
    },
    {
      id: 'plan_ecom_enterprise',
      product: 'ecommerce',
      code: 'enterprise',
      name: 'Global Enterprise',
      price: 199,
      features: ['Unlimited Products', 'Unlimited Domains', 'Dedicated Cluster Instance', 'Custom API Integrations', 'Zero Transaction Fees'],
      limits: { products: -1, domains: -1 }
    },
    {
      id: 'plan_isp_starter',
      product: 'isp',
      code: 'starter',
      name: 'ISP Starter',
      price: 99,
      features: ['2 RADIUS Nodes', '2,000 Subscribers', 'Basic NMS', 'Invoice Automation'],
      limits: { subscribers: 2000, routers: 5 }
    },
    {
      id: 'plan_isp_enterprise',
      product: 'isp',
      code: 'enterprise',
      name: 'ISP Enterprise',
      price: 499,
      features: ['Unlimited RADIUS Nodes', 'Dedicated Monitoring', 'MikroTik Automation', 'Priority Support'],
      limits: { subscribers: -1, routers: -1 }
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { product_code: { product: plan.product, code: plan.code } },
      create: plan,
      update: {
        name: plan.name,
        price: plan.price,
        features: plan.features,
        limits: plan.limits,
        isActive: true
      }
    });
  }

  const ecommerceProPlan = await prisma.plan.findUnique({ where: { product_code: { product: 'ecommerce', code: 'pro' } } });
  const ispEnterprisePlan = await prisma.plan.findUnique({ where: { product_code: { product: 'isp', code: 'enterprise' } } });

  const resources = [
    {
      id: 'resource_droplet_1',
      ownerId: demoUser.id,
      type: 'droplet',
      name: 'prod-api-cluster-01',
      ip: '138.197.181.12',
      status: 'active',
      region: 'Frankfurt 1',
      specs: '1 GB / 1 vCPU / 25 GB Disk',
      image: 'ubuntu-22-04',
      plan: 'basic',
      cpu: '1 vCPU',
      ram: '1 GB',
      disk: '25 GB',
      monthlyCost: 6,
      metadata: { load: 24, memory: 56 }
    },
    {
      id: 'resource_droplet_2',
      ownerId: demoUser.id,
      type: 'droplet',
      name: 'staging-web-worker',
      ip: '165.22.42.101',
      status: 'off',
      region: 'New York 3',
      specs: '2 GB / 1 vCPU / 50 GB Disk',
      image: 'debian-12',
      plan: 'standard',
      cpu: '1 vCPU',
      ram: '2 GB',
      disk: '50 GB',
      monthlyCost: 12,
      metadata: { load: 8, memory: 12 }
    },
    {
      id: 'resource_droplet_3',
      ownerId: demoUser.id,
      type: 'droplet',
      name: 'db-master-sgp1',
      ip: '128.199.141.55',
      status: 'active',
      region: 'Singapore 1',
      specs: '4 GB / 2 vCPU / 80 GB Disk',
      image: 'ubuntu-22-04',
      plan: 'pro',
      cpu: '2 vCPU',
      ram: '4 GB',
      disk: '80 GB',
      monthlyCost: 24,
      metadata: { load: 64, memory: 71 }
    },
    {
      id: 'resource_volume_1',
      ownerId: demoUser.id,
      type: 'volume',
      name: 'backup-volume-nyc',
      ip: null,
      status: 'active',
      region: 'New York 3',
      specs: '100 GB SSD Block Storage',
      image: null,
      plan: 'storage',
      cpu: null,
      ram: null,
      disk: '100 GB',
      monthlyCost: 10,
      metadata: { attachedTo: 'prod-api-cluster-01' }
    }
  ];

  for (const resource of resources) {
    await prisma.cloudResource.upsert({
      where: { id: resource.id },
      create: resource,
      update: resource
    });
  }

  const domains = [
    { id: 'domain_tiwlo_app', ownerId: demoUser.id, name: 'tiwlo.app', dns: ['ns1.tiwlo.com', 'ns2.tiwlo.com'], records: [{ type: 'A', name: '@', value: '138.197.181.12' }], expiresAt: addDays(365) },
    { id: 'domain_project_io', ownerId: demoUser.id, name: 'mycoolproject.io', dns: ['ns1.tiwlo.com', 'ns2.tiwlo.com'], records: [{ type: 'CNAME', name: 'www', value: 'mycoolproject.io' }], expiresAt: addDays(730) },
    { id: 'domain_api_tiwlo', ownerId: demoUser.id, name: 'api.tiwlo.app', dns: ['ns1.tiwlo.com', 'ns2.tiwlo.com'], records: [{ type: 'A', name: '@', value: '128.199.141.55' }], expiresAt: addDays(365) }
  ];

  for (const domain of domains) {
    await prisma.domain.upsert({
      where: { name: domain.name },
      create: domain,
      update: {
        ownerId: domain.ownerId,
        dns: domain.dns,
        records: domain.records,
        status: 'active',
        expiresAt: domain.expiresAt
      }
    });
  }

  const seededDomains = await prisma.domain.findMany({ where: { ownerId: demoUser.id } });
  for (const domain of seededDomains) {
    const baseRecords = [
      { type: 'A', name: '@', value: domain.name.includes('api') ? '128.199.141.55' : '138.197.181.12', ttl: 300 },
      { type: 'CNAME', name: 'www', value: domain.name, ttl: 300 },
      { type: 'MX', name: '@', value: 'mail.tiwlo.com', ttl: 600, priority: 10 }
    ];

    for (const record of baseRecords) {
      const key = `${domain.id}_${record.type}_${record.name}`;
      await prisma.dnsRecord.upsert({
        where: { id: key },
        create: { id: key, domainId: domain.id, ...record, metadata: { source: 'seed' } },
        update: { value: record.value, ttl: record.ttl, priority: record.priority, status: 'active' }
      });
    }
  }

  const store = await prisma.store.upsert({
    where: { slug: 'blueberry' },
    create: {
      id: 'store_blueberry',
      ownerId: storeOwner.id,
      planId: ecommerceProPlan?.id,
      name: 'Blueberry Fashion',
      slug: 'blueberry',
      category: 'fashion',
      domain: 'blueberry.tiwlo.store',
      customDomain: 'shop.blueberry.example',
      contactEmail: 'sales@blueberry.example',
      phone: '+1 555 120 8800',
      address: '120 Market Street, New York, NY',
      settings: {
        theme: DEFAULT_STOREFRONT_THEME_KEY,
        homepageTemplate: DEFAULT_STOREFRONT_THEME_KEY,
        demoMode: true,
        themeDataMode: 'demo',
        checkout: { provider: 'stripe', currency: 'USD' },
        shipping: { defaultCarrier: 'DHL', freeShippingAt: 100 }
      }
    },
    update: {
      name: 'Blueberry Fashion',
      planId: ecommerceProPlan?.id,
      status: 'active',
      settings: {
        theme: DEFAULT_STOREFRONT_THEME_KEY,
        homepageTemplate: DEFAULT_STOREFRONT_THEME_KEY,
        demoMode: true,
        themeDataMode: 'demo',
        checkout: { provider: 'stripe', currency: 'USD' },
        shipping: { defaultCarrier: 'DHL', freeShippingAt: 100 }
      }
    }
  });

  const storeProducts = [
    { id: 'product_sneaker', storeId: store.id, name: 'Ultra Boost Sneakers', sku: 'BB-SHOE-001', category: 'Shoes', price: 142, stock: 42, status: 'active', image: '/products/sneaker.jpg', metadata: { revenue: 4280 } },
    { id: 'product_denim', storeId: store.id, name: 'Classic Denim Jacket', sku: 'BB-JACKET-002', category: 'Outerwear', price: 89.5, stock: 12, status: 'active', image: '/products/denim.jpg', metadata: { revenue: 1120 } },
    { id: 'product_tee', storeId: store.id, name: 'Graphic Tee - White', sku: 'BB-TEE-003', category: 'T-Shirts', price: 34, stock: 156, status: 'active', image: '/products/tee.jpg', metadata: { revenue: 3400 } },
    { id: 'product_wallet', storeId: store.id, name: 'Leather Pocket Wallet', sku: 'BB-WALLET-004', category: 'Accessories', price: 45, stock: 0, status: 'out_of_stock', image: '/products/wallet.jpg', metadata: { revenue: 890 } }
  ];

  for (const product of storeProducts) {
    await prisma.storeProduct.upsert({
      where: { id: product.id },
      create: product,
      update: product
    });
  }

  const customer = await prisma.storeCustomer.upsert({
    where: { storeId_email: { storeId: store.id, email: 'john.doe@example.com' } },
    create: {
      id: 'store_customer_john',
      storeId: store.id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 555 240 4411',
      passwordHash: await bcrypt.hash('password', 10),
      status: 'active',
      tier: 'gold',
      points: 2125,
      address: { city: 'New York', country: 'US' }
    },
    update: {
      name: 'John Doe',
      passwordHash: await bcrypt.hash('password', 10),
      status: 'active',
      tier: 'gold',
      points: 2125
    }
  });

  const orders = [
    { id: 'order_841', storeId: store.id, customerId: customer.id, number: '#TW00841', status: 'in_transit', total: 142, items: [{ sku: 'BB-SHOE-001', qty: 1, price: 142 }], shipping: { carrier: 'DHL', tracking: 'DHL-88241' }, payment: { provider: 'stripe', status: 'paid' } },
    { id: 'order_822', storeId: store.id, customerId: customer.id, number: '#TW00822', status: 'delivered', total: 89.5, items: [{ sku: 'BB-JACKET-002', qty: 1, price: 89.5 }], shipping: { carrier: 'UPS' }, payment: { provider: 'stripe', status: 'paid' } },
    { id: 'order_801', storeId: store.id, customerId: customer.id, number: '#TW00801', status: 'delivered', total: 210, items: [{ sku: 'BB-TEE-003', qty: 5, price: 34 }], shipping: { carrier: 'FedEx' }, payment: { provider: 'stripe', status: 'paid' } }
  ];

  for (const order of orders) {
    await prisma.storeOrder.upsert({
      where: { storeId_number: { storeId: store.id, number: order.number } },
      create: order,
      update: {
        status: order.status,
        total: order.total,
        items: order.items,
        shipping: order.shipping,
        payment: order.payment
      }
    });
  }

  const themes = STOREFRONT_THEME_CATALOG.map((catalogTheme) => ({
    id: `theme_${catalogTheme.key}`,
    storeId: store.id,
    key: catalogTheme.key,
    name: catalogTheme.name,
    status: catalogTheme.key === DEFAULT_STOREFRONT_THEME_KEY ? 'active' : 'available',
    settings: {
      ...defaultThemeSettings(catalogTheme.defaultTemplate),
      palette: 'blueberry',
      layout: catalogTheme.templates[0]?.layout || 'electronics-marketplace'
    }
  }));

  for (const theme of themes) {
    await prisma.storeTheme.upsert({
      where: { storeId_key: { storeId: store.id, key: theme.key } },
      create: theme,
      update: { name: theme.name, status: theme.status, settings: theme.settings }
    });
  }

  await prisma.storeTheme.updateMany({
    where: { storeId: store.id, key: { not: DEFAULT_STOREFRONT_THEME_KEY } },
    data: { status: 'available' }
  });

  const plugins = [
    ...AURA_PLUGIN_MODULES.map((plugin, index) => ({
      id: `plugin_aura_${index + 1}`,
      storeId: store.id,
      key: plugin.key,
      name: plugin.name,
      status: plugin.status,
      settings: plugin.settings
    })),
    { id: 'plugin_google_sales', storeId: store.id, key: 'google-sales', name: 'Google Sales Channel', status: 'inactive', settings: {} }
  ];

  for (const plugin of plugins) {
    await prisma.storePlugin.upsert({
      where: { storeId_key: { storeId: store.id, key: plugin.key } },
      create: plugin,
      update: { name: plugin.name, status: plugin.status, settings: plugin.settings }
    });
  }

  const ispPackage = await prisma.ispPackage.upsert({
    where: { name: 'Fiber Pro 100 Mbps' },
    create: {
      id: 'isp_package_pro_100',
      name: 'Fiber Pro 100 Mbps',
      speed: '100 Mbps',
      price: 29.99,
      billingCycle: 'month',
      features: ['PPPoE', 'Static IP Optional', '24/7 Support']
    },
    update: {
      speed: '100 Mbps',
      price: 29.99,
      features: ['PPPoE', 'Static IP Optional', '24/7 Support'],
      status: 'active'
    }
  });

  const ispSite = await prisma.ispSite.upsert({
    where: { code: 'isp-dhaka-main' },
    create: {
      id: 'isp_site_dhaka',
      ownerId: ispOwner.id,
      planId: ispEnterprisePlan?.id,
      name: 'South Dhaka Fiber Network',
      code: 'isp-dhaka-main',
      region: 'Asia-South (Dhaka)',
      status: 'healthy',
      node: 'Core Cluster 01',
      bandwidth: '12.4 Gbps',
      subscribers: 12420,
      settings: { radiusMode: 'clustered', billingDay: 1, mikrotikSync: true }
    },
    update: {
      name: 'South Dhaka Fiber Network',
      status: 'healthy',
      bandwidth: '12.4 Gbps',
      subscribers: 12420,
      settings: { radiusMode: 'clustered', billingDay: 1, mikrotikSync: true }
    }
  });

  const ispClients = [
    { id: 'isp_client_1', siteId: ispSite.id, packageId: ispPackage.id, name: 'Rahim Telecom', username: 'rahim.pppoe', email: 'rahim@example.com', phone: '+880171000001', address: 'Dhanmondi, Dhaka', status: 'active', balance: 0, metadata: { onu: 'ONU-8821' } },
    { id: 'isp_client_2', siteId: ispSite.id, packageId: ispPackage.id, name: 'Karim Home Fiber', username: 'karim.pppoe', email: 'karim@example.com', phone: '+880171000002', address: 'Mirpur, Dhaka', status: 'active', balance: 12.5, metadata: { onu: 'ONU-8822' } },
    { id: 'isp_client_3', siteId: ispSite.id, packageId: ispPackage.id, name: 'Nila Corporate', username: 'nila.corp', email: 'it@nila.example.com', phone: '+880171000003', address: 'Gulshan, Dhaka', status: 'suspended', balance: 89.99, metadata: { vlan: 120 } }
  ];

  for (const client of ispClients) {
    await prisma.ispClient.upsert({
      where: { username: client.username },
      create: client,
      update: {
        packageId: client.packageId,
        name: client.name,
        status: client.status,
        balance: client.balance,
        metadata: client.metadata
      }
    });
  }

  await prisma.ispRouter.upsert({
    where: { id: 'isp_router_core_1' },
    create: { id: 'isp_router_core_1', siteId: ispSite.id, name: 'MikroTik CCR Core-01', ip: '10.10.0.1', vendor: 'MikroTik', status: 'online', config: { model: 'CCR2004', bgp: true } },
    update: { status: 'online', config: { model: 'CCR2004', bgp: true } }
  });

  await prisma.radiusServer.upsert({
    where: { id: 'radius_dhaka_1' },
    create: { id: 'radius_dhaka_1', siteId: ispSite.id, name: 'RADIUS Dhaka Primary', host: 'radius-01.dhaka.tiwlo.net', secret: 'change-me', status: 'online', metadata: { authPort: 1812, accountingPort: 1813 } },
    update: { status: 'online', metadata: { authPort: 1812, accountingPort: 1813 } }
  });

  await prisma.ispInvoice.upsert({
    where: { number: 'ISP-INV-1001' },
    create: {
      id: 'isp_invoice_1001',
      siteId: ispSite.id,
      number: 'ISP-INV-1001',
      clientName: 'Rahim Telecom',
      amount: 29.99,
      status: 'paid',
      dueDate: addDays(15),
      items: [{ label: 'Fiber Pro 100 Mbps', amount: 29.99 }]
    },
    update: { status: 'paid', amount: 29.99 }
  });

  const invoices = [
    {
      id: 'invoice_cloud_1001',
      ownerId: demoUser.id,
      number: 'CLD-INV-1001',
      amount: 49.4,
      status: 'paid',
      scope: 'cloud',
      items: [
        { label: 'Compute', amount: 24.5 },
        { label: 'Storage', amount: 8.2 },
        { label: 'Database', amount: 12.4 },
        { label: 'Network', amount: 4.3 }
      ],
      paidAt: addDays(-2)
    },
    {
      id: 'invoice_store_1001',
      ownerId: storeOwner.id,
      number: 'ECM-INV-1001',
      amount: 49,
      status: 'open',
      scope: 'ecommerce',
      scopeId: store.id,
      items: [{ label: 'Business Pro Subscription', amount: 49 }],
      dueDate: addDays(10)
    }
  ];

  for (const invoice of invoices) {
    await prisma.invoice.upsert({
      where: { number: invoice.number },
      create: invoice,
      update: {
        amount: invoice.amount,
        status: invoice.status,
        items: invoice.items,
        paidAt: invoice.paidAt,
        dueDate: invoice.dueDate
      }
    });
  }

  await prisma.supportTicket.upsert({
    where: { id: 'ticket_1' },
    create: {
      id: 'ticket_1',
      ownerId: demoUser.id,
      subject: 'Need help with DNS propagation',
      category: 'Technical',
      priority: 'Medium',
      status: 'open',
      message: 'The new DNS record is still pending in one region.',
      metadata: { domain: 'tiwlo.app' }
    },
    update: {
      status: 'open',
      message: 'The new DNS record is still pending in one region.'
    }
  });

  const settings = [
    { scope: 'platform', scopeId: '', key: 'branding', value: { name: 'Tiwlo Cloud', supportEmail: 'support@tiwlo.app' } },
    { scope: 'platform', scopeId: '', key: 'paymentGateways', value: { stripe: true, paypal: false, manualBank: true } },
    { scope: 'store', scopeId: store.id, key: 'checkout', value: { provider: 'stripe', taxIncluded: false, currency: 'USD' } },
    { scope: 'isp', scopeId: ispSite.id, key: 'radius', value: { authPort: 1812, accountingPort: 1813, nasSync: true } }
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { scope_scopeId_key: { scope: setting.scope, scopeId: setting.scopeId, key: setting.key } },
      create: setting,
      update: { value: setting.value }
    });
  }

  const adminModules = [
    ['admin.system-overview', 'main-admin', 'System Overview', '/', 'Platform-wide overview, health, revenue, and live operations.'],
    ['admin.service-statistics', 'main-admin', 'Service Statistics', '/activity', 'Usage statistics across cloud services and products.'],
    ['admin.notifications', 'main-admin', 'Live Notifications', '/alerts', 'Operational alerts, customer notifications, and incident feed.'],
    ['admin.clients', 'main-admin', 'Client List', '/management/users', 'Search, verify, suspend, and support user accounts.'],
    ['admin.identity', 'main-admin', 'User Identities', '/management/identity', 'KYC, MFA, roles, and account identity controls.'],
    ['admin.support', 'main-admin', 'Support Tickets', '/management/support', 'Central support inbox with SLA and escalation.'],
    ['admin.invoices', 'main-admin', 'All Invoices', '/invoices', 'Cloud, ecommerce, ISP, and manual invoices.'],
    ['admin.payments', 'main-admin', 'Payments Received', '/management/payments', 'Gateway settlement, refunds, disputes, and payouts.'],
    ['admin.pricing', 'main-admin', 'Pricing/Plans', '/billing', 'Plan catalog for cloud, ecommerce, and ISP products.'],
    ['admin.tax', 'main-admin', 'Tax Configuration', '/management/core', 'VAT, sales tax, invoice numbering, and region rules.'],
    ['admin.store-products', 'main-admin', 'Store Products', '/apps', 'Marketplace products, apps, and extensions.'],
    ['admin.domain-reseller', 'main-admin', 'Domain Reseller', '/management/domains', 'Domain availability, registrar settings, DNS, SSL.'],
    ['admin.cloud-templates', 'main-admin', 'Cloud Templates', '/marketplace', 'Server images, templates, app blueprints.'],
    ['admin.addons', 'main-admin', 'System Addons', '/management/plugins', 'Plugin catalog, install state, and compatibility.'],
    ['admin.compute-nodes', 'main-admin', 'Compute Nodes', '/management/servers', 'Physical/virtual node onboarding, region, health.'],
    ['admin.storage', 'main-admin', 'Block Storage', '/volumes', 'Volumes, snapshots, replication, quotas.'],
    ['admin.databases', 'main-admin', 'Data Instances', '/databases', 'Managed DB provisioning, backups, failover.'],
    ['admin.network', 'main-admin', 'Network Topology', '/networking', 'VPCs, load balancers, private networks.'],
    ['admin.firewalls', 'main-admin', 'Edge Firewalls', '/firewalls', 'Rules, policies, WAF, and DDoS controls.'],
    ['admin.logs', 'main-admin', 'Automation Logs', '/management/logs', 'Audit events, jobs, hooks, and system cron.'],
    ['admin.api', 'main-admin', 'API Management', '/api', 'API keys, scopes, webhooks, and rate limits.'],
    ['admin.security', 'main-admin', 'Security Policy', '/management/security', 'MFA, password policy, sessions, IP allowlists.'],
    ['admin.settings', 'main-admin', 'System Settings', '/settings', 'Branding, platform defaults, notifications, regions.'],

    ['ecommerce.global-insight', 'ecommerce-admin', 'Global Insight', '/management/ecommerce', 'Merchant SaaS overview and revenue intelligence.'],
    ['ecommerce.live-traffic', 'ecommerce-admin', 'Live Traffic Hub', '/management/ecommerce/live-traffic', 'Realtime storefront traffic, carts, checkout events.'],
    ['ecommerce.health', 'ecommerce-admin', 'System Health', '/management/ecommerce/health', 'Store cluster uptime, queue health, job status.'],
    ['ecommerce.performance', 'ecommerce-admin', 'Performance Metrics', '/management/ecommerce/performance', 'Core web vitals, checkout speed, CDN cache.'],
    ['ecommerce.merchants', 'ecommerce-admin', 'Merchant Directory', '/management/ecommerce/merchants', 'Merchant onboarding, status, KYC, plans.'],
    ['ecommerce.stores', 'ecommerce-admin', 'Store Deployments', '/management/ecommerce/stores', 'Store provisioning, domains, SSL, theme state.'],
    ['ecommerce.kyc', 'ecommerce-admin', 'Identity KYC', '/management/ecommerce/kyc', 'Business verification and risk review.'],
    ['ecommerce.revenue', 'ecommerce-admin', 'Revenue Streams', '/management/ecommerce/revenue', 'Subscriptions, transaction fees, revenue share.'],
    ['ecommerce.plans', 'ecommerce-admin', 'Subscription Plans', '/management/ecommerce/plans', 'Merchant plans, feature limits, billing cycles.'],
    ['ecommerce.invoices', 'ecommerce-admin', 'Invoicing Core', '/management/ecommerce/invoices', 'Merchant invoices, tax, failed payments.'],
    ['ecommerce.usage', 'ecommerce-admin', 'Usage Meters', '/management/ecommerce/usage', 'Products, orders, storage, bandwidth metering.'],
    ['ecommerce.campaigns', 'ecommerce-admin', 'Campaign Manager', '/management/ecommerce/campaigns', 'Email, coupon, retargeting campaign controls.'],
    ['ecommerce.seo', 'ecommerce-admin', 'SEO Platform', '/management/ecommerce/seo', 'Sitemap, meta, redirects, search indexing.'],
    ['ecommerce.cdn', 'ecommerce-admin', 'Asset CDN', '/management/ecommerce/cdn', 'Media CDN, image transforms, cache purge.'],
    ['ecommerce.domains', 'ecommerce-admin', 'Domain Reseller', '/management/ecommerce/domains', 'Store domain mapping and SSL automation.'],
    ['ecommerce.themes', 'ecommerce-admin', 'Theme Directory', '/management/ecommerce/themes', 'Theme catalog, install, preview, publish.'],
    ['ecommerce.apps', 'ecommerce-admin', 'Extension Hub', '/management/ecommerce/apps', 'Store app/plugin marketplace.'],
    ['ecommerce.support', 'ecommerce-admin', 'Merchant Support', '/management/ecommerce/support', 'Merchant support tickets and SLA.'],
    ['ecommerce.api', 'ecommerce-admin', 'API & Webhooks', '/management/ecommerce/api', 'Storefront API, webhooks, app credentials.'],
    ['ecommerce.settings', 'ecommerce-admin', 'Platform Settings', '/management/ecommerce/settings', 'SaaS ecommerce platform defaults.'],

    ['store.home', 'store-admin', 'Home', '/store/admin', 'Store owner KPIs, sales, orders, traffic.'],
    ['store.pos', 'store-admin', 'Point of Sale', '/store/admin/pos', 'In-person checkout, register, cash drawer.'],
    ['store.orders', 'store-admin', 'Orders', '/store/admin/orders', 'Order lifecycle, invoices, fulfillment, returns.'],
    ['store.products', 'store-admin', 'Products', '/store/admin/products', 'Products, categories, tags, stock, variants.'],
    ['store.customers', 'store-admin', 'Customers', '/store/admin/customers', 'Customer database, segments, loyalty.'],
    ['store.analytics', 'store-admin', 'Analytics', '/store/admin/analytics', 'Sales, conversion, margin, channels.'],
    ['store.marketing', 'store-admin', 'Marketing', '/store/admin/marketing', 'Campaigns, discounts, abandoned carts.'],
    ['store.shipping', 'store-admin', 'Shipping & Delivery', '/store/admin/shipping', 'Carriers, zones, rates, pickup.'],
    ['store.payments', 'store-admin', 'Payment Gateways', '/store/admin/payments', 'Stripe, PayPal, COD, local gateways.'],
    ['store.themes', 'store-admin', 'Themes', '/store/admin/themes', 'Theme install, customize, publish.'],
    ['store.plugins', 'store-admin', 'Plugins', '/store/admin/plugins', 'Plugin install, settings, permissions.'],
    ['store.domains', 'store-admin', 'Domains', '/store/admin/domains', 'Storefront domains, SSL, redirects.'],
    ['store.settings', 'store-admin', 'General Settings', '/store/admin/settings', 'Brand, tax, checkout, notification settings.'],

    ['isp.core-dashboard', 'isp-admin', 'Core Dashboard', '/management/isp', 'ISP SaaS overview and network revenue.'],
    ['isp.clients', 'isp-admin', 'Active Subscribers', '/management/isp/clients', 'Subscriber accounts, status, packages, balance.'],
    ['isp.billing', 'isp-admin', 'Master Invoices', '/management/isp/invoices', 'Subscriber invoices, payment cycles, arrears.'],
    ['isp.plans', 'isp-admin', 'Subscription Plans', '/management/isp/plans', 'Bandwidth packages, FUP, recurring price.'],
    ['isp.radius', 'isp-admin', 'RADIUS Clusters', '/management/isp/radius', 'RADIUS servers, NAS, auth/accounting logs.'],
    ['isp.ip-pools', 'isp-admin', 'IP Pool Manager', '/management/isp/ip-pools', 'IPv4/IPv6 pools, allocation, CGNAT.'],
    ['isp.vlan', 'isp-admin', 'VLAN Configuration', '/management/isp/vlan', 'VLAN, PPPoE profiles, queue trees.'],
    ['isp.onu', 'isp-admin', 'ONU Data Center', '/management/isp/onu', 'ONU inventory, signal, OLT ports.'],
    ['isp.storage', 'isp-admin', 'Storage Pools', '/management/isp/storage', 'Logs, backups, invoice files.'],
    ['isp.cdn', 'isp-admin', 'Asset CDN Hub', '/management/isp/cdn', 'Portal assets and cache.'],
    ['isp.support', 'isp-admin', 'Support Tickets', '/management/isp/tickets', 'Subscriber tickets and technician dispatch.'],
    ['isp.security', 'isp-admin', 'Security Audit', '/management/isp/security', 'Admin access, router changes, suspicious activity.'],
    ['isp.api', 'isp-admin', 'API Management', '/management/isp/api', 'ISP API credentials and webhooks.'],
    ['isp.settings', 'isp-admin', 'SaaS Settings', '/management/isp/settings', 'ISP billing, RADIUS, notification defaults.']
  ];

  adminModules.push(
    ['ecommerce.clusters', 'ecommerce-admin', 'Cluster Analytics', '/management/ecommerce/clusters', 'Database, queue, and worker cluster analytics for commerce SaaS.'],
    ['ecommerce.segments', 'ecommerce-admin', 'Client Segments', '/management/ecommerce/segments', 'Merchant segmentation, tags, cohorts, and retention groups.'],
    ['ecommerce.groups', 'ecommerce-admin', 'Merchant Groups', '/management/ecommerce/groups', 'Organization groups, team ownership, and account hierarchy.'],
    ['ecommerce.partners', 'ecommerce-admin', 'Partner Portals', '/management/ecommerce/partners', 'Partner channel portals, reseller links, and commission rules.'],
    ['ecommerce.cycles', 'ecommerce-admin', 'Billing Cycles', '/management/ecommerce/cycles', 'Recurring billing calendars, retries, and grace periods.'],
    ['ecommerce.taxes', 'ecommerce-admin', 'Tax Engine', '/management/ecommerce/taxes', 'Tax/VAT rules, invoice tax lines, and region mappings.'],
    ['ecommerce.affiliates', 'ecommerce-admin', 'Affiliate Engine', '/management/ecommerce/affiliates', 'Affiliate tracking, payouts, and fraud controls.'],
    ['ecommerce.email', 'ecommerce-admin', 'Email Automation', '/management/ecommerce/email', 'Lifecycle emails, templates, triggers, and delivery health.'],
    ['ecommerce.social', 'ecommerce-admin', 'Social Connect', '/management/ecommerce/social', 'Social sales channels, product feeds, and sync status.'],
    ['ecommerce.databases', 'ecommerce-admin', 'DB Clusters', '/management/ecommerce/databases', 'Commerce database clusters, replicas, and backup policies.'],
    ['ecommerce.storage', 'ecommerce-admin', 'Storage Pools', '/management/ecommerce/storage', 'Product media, invoices, backup storage, and quotas.'],
    ['ecommerce.nodes', 'ecommerce-admin', 'Edge Nodes', '/management/ecommerce/nodes', 'Storefront edge nodes, routing, and capacity.'],
    ['ecommerce.ssl', 'ecommerce-admin', 'SSL Manager', '/management/ecommerce/ssl', 'Store SSL certificates, renewals, and validation status.'],
    ['ecommerce.shares', 'ecommerce-admin', 'Revenue Shares', '/management/ecommerce/shares', 'Marketplace revenue share, app payouts, and split rules.'],
    ['ecommerce.dev-portal', 'ecommerce-admin', 'Developer Portal', '/management/ecommerce/dev-portal', 'App developer onboarding, API docs, and app review.'],
    ['ecommerce.alerts', 'ecommerce-admin', 'Global Alerts', '/management/ecommerce/alerts', 'Commerce incidents, alerts, and merchant notices.'],
    ['ecommerce.security', 'ecommerce-admin', 'Security Policy', '/management/ecommerce/security', 'Merchant auth policy, app scopes, and checkout security.'],
    ['ecommerce.compliance', 'ecommerce-admin', 'Compliance Hub', '/management/ecommerce/compliance', 'KYC, PCI, privacy, and audit readiness.'],
    ['ecommerce.audits', 'ecommerce-admin', 'Audit Logs', '/management/ecommerce/audits', 'Commerce admin actions, app changes, and sensitive events.'],
    ['ecommerce.translations', 'ecommerce-admin', 'Translation Hub', '/management/ecommerce/translations', 'Locale settings, storefront translation, and currency text.'],
    ['ecommerce.fields', 'ecommerce-admin', 'Custom Fields', '/management/ecommerce/fields', 'Merchant-defined data fields for products, orders, and customers.'],
    ['ecommerce.mobile', 'ecommerce-admin', 'Mobile Config', '/management/ecommerce/mobile', 'Mobile app storefront settings and release channel config.'],

    ['store.invoices', 'store-admin', 'Invoices', '/store/admin/invoices', 'Order invoice generation, customer invoice status, and printable receipts.'],
    ['store.abandoned-carts', 'store-admin', 'Abandoned Carts', '/store/admin/abandoned-carts', 'Recover abandoned checkouts with email/SMS automations.'],
    ['store.categories', 'store-admin', 'Categories', '/store/admin/categories', 'Product category tree, visibility, and SEO metadata.'],
    ['store.tags', 'store-admin', 'Tags', '/store/admin/tags', 'Product tags, search filters, and internal organization.'],
    ['store.inventory', 'store-admin', 'Inventory', '/store/admin/inventory', 'Stock levels, low-stock alerts, warehouse movement, and adjustments.'],
    ['store.b2b-wholesale', 'store-admin', 'B2B Wholesale', '/store/admin/b2b', 'Wholesale customers, company accounts, price lists, and terms.'],
    ['store.discounts', 'store-admin', 'Discounts', '/store/admin/discounts', 'Coupons, automatic discounts, eligibility, and usage limits.'],
    ['store.wallet', 'store-admin', 'My Wallet', '/store/admin/wallet', 'Merchant balance, payouts, reserves, and withdrawal records.'],
    ['store.taxes', 'store-admin', 'Taxes & Duties', '/store/admin/taxes', 'Store tax collection, shipping duties, and invoice tax settings.'],
    ['store.online-store', 'store-admin', 'Online Store', '/store/admin/online-store', 'Storefront sales channel, navigation, pages, and publishing state.'],
    ['store.google-sales', 'store-admin', 'Google Sales', '/store/admin/google', 'Google product feed, sync health, and ads channel setup.'],
    ['store.staff', 'store-admin', 'Staff Accounts', '/store/admin/staff', 'Store staff invitations, roles, permissions, and sessions.'],
    ['store.languages', 'store-admin', 'Languages', '/store/admin/languages', 'Store languages, translations, and locale publishing.'],
    ['store.email-templates', 'store-admin', 'Email Templates', '/store/admin/email-templates', 'Transactional email templates, branding, and triggers.'],
    ['store.backups', 'store-admin', 'Backups', '/store/admin/backups', 'Store backup snapshots, restore points, and export jobs.'],

    ['isp.live-traffic', 'isp-admin', 'Live Traffic Hub', '/management/isp/live-traffic', 'Realtime ISP traffic, subscriber sessions, and throughput.'],
    ['isp.nodes', 'isp-admin', 'Node Monitoring', '/management/isp/nodes', 'POP nodes, uptime, CPU, memory, and link health.'],
    ['isp.latency', 'isp-admin', 'Latency Monitor', '/management/isp/latency', 'Ping, jitter, packet loss, and SLA measurements.'],
    ['isp.clusters', 'isp-admin', 'Cluster Health', '/management/isp/clusters', 'RADIUS/database/API cluster health and failover state.'],
    ['isp.traffic', 'isp-admin', 'Traffic Analysis', '/management/isp/traffic', 'Bandwidth reports, peak usage, and traffic class analytics.'],
    ['isp.kyc', 'isp-admin', 'Pending KYCs', '/management/isp/kyc', 'Subscriber verification workflow and risk checks.'],
    ['isp.segments', 'isp-admin', 'Account Segments', '/management/isp/segments', 'Subscriber segments, tags, and billing cohorts.'],
    ['isp.partners', 'isp-admin', 'Partner Portals', '/management/isp/partners', 'Reseller, franchise, and partner portal controls.'],
    ['isp.activity', 'isp-admin', 'Client Activity', '/management/isp/activity', 'Subscriber login/session/activity timeline.'],
    ['isp.revenue', 'isp-admin', 'Revenue Streams', '/management/isp/revenue', 'Recurring revenue, arrears, churn, and collection metrics.'],
    ['isp.gateways', 'isp-admin', 'Payment Gateways', '/management/isp/gateways', 'Payment provider setup for ISP billing portals.'],
    ['isp.usage', 'isp-admin', 'Usage Metering', '/management/isp/usage', 'Bandwidth usage, FUP, quota, and overage metering.'],
    ['isp.taxes', 'isp-admin', 'Tax Compliance', '/management/isp/taxes', 'VAT/tax rules for subscriber invoices and reports.'],
    ['isp.auth-logs', 'isp-admin', 'Auth Server Logs', '/management/isp/auth-logs', 'RADIUS auth/accounting events and failure reasons.'],
    ['isp.backbone', 'isp-admin', 'Backbone Config', '/management/isp/backbone', 'Backbone links, routing policy, and capacity planning.'],
    ['isp.db-clusters', 'isp-admin', 'Database Clusters', '/management/isp/db-clusters', 'ISP database replicas, backups, and restore health.'],
    ['isp.domains', 'isp-admin', 'Domain Proxy', '/management/isp/domains', 'ISP portal domains, DNS proxy, and tenant hostnames.'],
    ['isp.ssl', 'isp-admin', 'SSL Certificate Manager', '/management/isp/ssl', 'Certificates for ISP portals, renewals, and validation.'],
    ['isp.leads', 'isp-admin', 'Lead Manager', '/management/isp/leads', 'Prospects, sales pipeline, and conversion workflow.'],
    ['isp.affiliates', 'isp-admin', 'Affiliate Portal', '/management/isp/affiliates', 'Referral tracking, partner payouts, and commissions.'],
    ['isp.alerts', 'isp-admin', 'Alert Policies', '/management/isp/alerts', 'Network alerts, escalation rules, and notification targets.'],
    ['isp.email', 'isp-admin', 'Email Automation', '/management/isp/email', 'Billing reminders, outage notices, and campaign templates.'],
    ['isp.compliance', 'isp-admin', 'Platform Compliance', '/management/isp/compliance', 'Data retention, audit reports, and regulatory controls.'],
    ['isp.webhooks', 'isp-admin', 'Webhook Center', '/management/isp/webhooks', 'Webhook endpoints, delivery retries, and signing secrets.'],
    ['isp.logs', 'isp-admin', 'System Logs', '/management/isp/logs', 'ISP platform logs, automation jobs, and operator events.'],

    ['isp-billing.home', 'isp-billing-admin', 'Dashboard Overview', '/isp-billing/admin', 'ISP operator dashboard, revenue, sessions, and health.'],
    ['isp-billing.network-map', 'isp-billing-admin', 'Network & Fiber GIS', '/isp-billing/admin/network-map', 'Fiber map, POPs, splitters, and subscriber routes.'],
    ['isp-billing.nms', 'isp-billing-admin', 'NMS Network Monitor', '/isp-billing/admin/nms', 'NMS probes, devices, and live alarms.'],
    ['isp-billing.bandwidth', 'isp-billing-admin', 'Bandwidth Monitor', '/isp-billing/admin/bandwidth', 'Live bandwidth graphs and per-client usage.'],
    ['isp-billing.data-usage', 'isp-billing-admin', 'Data Usage Stats', '/isp-billing/admin/data-usage', 'Daily/monthly usage summaries and FUP state.'],
    ['isp-billing.customers', 'isp-billing-admin', 'Subscribers', '/isp-billing/admin/customers', 'Subscriber CRUD, packages, balances, and status.'],
    ['isp-billing.corporate', 'isp-billing-admin', 'Corporate Clients', '/isp-billing/admin/corporate', 'Corporate accounts, contacts, links, and contracts.'],
    ['isp-billing.pppoe', 'isp-billing-admin', 'PPPoE Sessions', '/isp-billing/admin/pppoe', 'PPPoE users, sessions, secrets, and NAS state.'],
    ['isp-billing.hotspot', 'isp-billing-admin', 'Hotspot Vouchers', '/isp-billing/admin/hotspot', 'Hotspot voucher batches, expiry, and usage.'],
    ['isp-billing.static-ip', 'isp-billing-admin', 'Static IP Clients', '/isp-billing/admin/static-ip', 'Static IP allocations and address history.'],
    ['isp-billing.resellers', 'isp-billing-admin', 'Reseller Portal', '/isp-billing/admin/resellers', 'Reseller balance, subscribers, and package limits.'],
    ['isp-billing.franchise', 'isp-billing-admin', 'Franchise Tracking', '/isp-billing/admin/franchise', 'Franchise areas, revenue, and operator staff.'],
    ['isp-billing.billing', 'isp-billing-admin', 'Invoices & Billing', '/isp-billing/admin/billing', 'Invoices, recurring runs, dues, and payment matching.'],
    ['isp-billing.payments', 'isp-billing-admin', 'Payment Gateways', '/isp-billing/admin/payments', 'Gateway configuration, settlements, and disputes.'],
    ['isp-billing.wallet', 'isp-billing-admin', 'Top-up & Wallet', '/isp-billing/admin/wallet', 'Wallet balance, top-up, transaction ledger, and adjustments.'],
    ['isp-billing.grace-period', 'isp-billing-admin', 'Auto Grace Period', '/isp-billing/admin/grace-period', 'Auto-suspend grace, reminders, and reactivation rules.'],
    ['isp-billing.tax', 'isp-billing-admin', 'Tax & VAT Settings', '/isp-billing/admin/tax', 'VAT, tax regions, invoice numbering, and reports.'],
    ['isp-billing.expenses', 'isp-billing-admin', 'Expense Manager', '/isp-billing/admin/expenses', 'Expenses, vendors, categories, and approval workflow.'],
    ['isp-billing.payroll', 'isp-billing-admin', 'Salary & Payroll', '/isp-billing/admin/payroll', 'Staff payroll, commissions, and attendance links.'],
    ['isp-billing.mikrotik', 'isp-billing-admin', 'MikroTik BNG/BRAS', '/isp-billing/admin/mikrotik', 'MikroTik routers, queues, PPP profiles, and sync jobs.'],
    ['isp-billing.olt', 'isp-billing-admin', 'OLT Management', '/isp-billing/admin/olt', 'OLT devices, ports, VLANs, and ONU provisioning.'],
    ['isp-billing.onu', 'isp-billing-admin', 'ONU/ONT Devices', '/isp-billing/admin/onu', 'ONU inventory, signal levels, and authorization state.'],
    ['isp-billing.radius', 'isp-billing-admin', 'RADIUS Server', '/isp-billing/admin/radius', 'RADIUS servers, secrets, NAS, and accounting data.'],
    ['isp-billing.mac-binding', 'isp-billing-admin', 'Device Binding', '/isp-billing/admin/mac-binding', 'MAC binding, device locks, and fraud prevention.'],
    ['isp-billing.ip-pool', 'isp-billing-admin', 'IP Pool Range', '/isp-billing/admin/ip-pool', 'IP pools, leases, CGNAT, and allocation status.'],
    ['isp-billing.packages', 'isp-billing-admin', 'Internet Plans', '/isp-billing/admin/packages', 'Internet packages, speed profiles, FUP, and pricing.'],
    ['isp-billing.iptv', 'isp-billing-admin', 'IPTV Management', '/isp-billing/admin/iptv', 'IPTV subscribers, packages, boxes, and renewals.'],
    ['isp-billing.catv', 'isp-billing-admin', 'Cable TV Billing', '/isp-billing/admin/catv', 'CATV plans, subscribers, and monthly billing.'],
    ['isp-billing.ott', 'isp-billing-admin', 'VOD & OTT Subscriptions', '/isp-billing/admin/ott', 'OTT subscriptions, renewals, and reseller packages.'],
    ['isp-billing.stock', 'isp-billing-admin', 'Item Stock', '/isp-billing/admin/stock', 'Inventory stock, serials, warehouse, and issue history.'],
    ['isp-billing.vendors', 'isp-billing-admin', 'Vendor Directory', '/isp-billing/admin/vendors', 'Vendor profiles, payable balance, and purchase contacts.'],
    ['isp-billing.purchases', 'isp-billing-admin', 'Purchase Orders', '/isp-billing/admin/purchases', 'Purchase orders, receiving, and vendor invoices.'],
    ['isp-billing.fleet', 'isp-billing-admin', 'Fleet & Vehicles', '/isp-billing/admin/fleet', 'Vehicles, technician assignment, and service routes.'],
    ['isp-billing.tickets', 'isp-billing-admin', 'Helpdesk Tickets', '/isp-billing/admin/tickets', 'Subscriber helpdesk, SLA, dispatch, and resolution.'],
    ['isp-billing.live-chat', 'isp-billing-admin', 'Live Chat Center', '/isp-billing/admin/live-chat', 'Chat inbox, operators, canned replies, and routing.'],
    ['isp-billing.sms-server', 'isp-billing-admin', 'SMS & WhatsApp', '/isp-billing/admin/sms', 'SMS/WhatsApp provider, templates, and delivery logs.'],
    ['isp-billing.emails', 'isp-billing-admin', 'Email Automations', '/isp-billing/admin/emails', 'Email templates, triggers, and delivery status.'],
    ['isp-billing.referrals', 'isp-billing-admin', 'Referral Program', '/isp-billing/admin/referrals', 'Referral links, rewards, and anti-abuse rules.'],
    ['isp-billing.complaints', 'isp-billing-admin', 'SLA Complaints', '/isp-billing/admin/complaints', 'Complaints, SLA timers, and escalation rules.'],
    ['isp-billing.reports', 'isp-billing-admin', 'Financial Reports', '/isp-billing/admin/reports', 'Revenue, collection, arrears, and tax reports.'],
    ['isp-billing.permissions', 'isp-billing-admin', 'Staff Roles', '/isp-billing/admin/permissions', 'Staff roles, permissions, and scoped access.'],
    ['isp-billing.attendance', 'isp-billing-admin', 'Staff Attendance', '/isp-billing/admin/attendance', 'Attendance, shifts, technician visits, and payroll exports.'],
    ['isp-billing.logs', 'isp-billing-admin', 'Audit Trail Logs', '/isp-billing/admin/logs', 'Audit logs, operator actions, and router changes.'],
    ['isp-billing.backups', 'isp-billing-admin', 'Cloud Backups', '/isp-billing/admin/backups', 'Backup policy, restore tests, and retention windows.'],
    ['isp-billing.api', 'isp-billing-admin', 'Webhooks & API', '/isp-billing/admin/api', 'API keys, webhooks, and partner integrations.'],
    ['isp-billing.settings', 'isp-billing-admin', 'App Settings', '/isp-billing/admin/settings', 'Billing, notification, radius, and portal settings.']
  );

  for (const [key, group, label, path, description] of adminModules) {
    await prisma.adminModule.upsert({
      where: { key },
      create: {
        key,
        group,
        label,
        path,
        description,
        status: 'active',
        config: { productionReady: true, source: 'seed' },
        metrics: { records: 0, health: 'ready' }
      },
      update: {
        group,
        label,
        path,
        description,
        status: 'active',
        config: { productionReady: true, source: 'seed' }
      }
    });
  }

  const paymentGateways = [
    { key: 'stripe', name: 'Stripe', provider: 'stripe', status: 'enabled', mode: 'live', settings: { cards: true, wallets: true, supportsRedirectCheckout: true, webhookPath: '/webhooks/stripe', currency: 'USD' } },
    { key: 'paypal', name: 'PayPal', provider: 'paypal', status: 'enabled', mode: 'live', settings: { captureMode: 'automatic', supportsRedirectCheckout: true, currency: 'USD' } },
    { key: 'sslcommerz', name: 'SSLCommerz', provider: 'sslcommerz', status: 'enabled', mode: 'test', settings: { currency: 'BDT', ipnPath: '/webhooks/sslcommerz' } },
    { key: 'bkash', name: 'bKash', provider: 'bkash', status: 'enabled', mode: 'live', settings: { currency: 'BDT', exchangeRates: { USD_BDT: 110 }, supportsRedirectCheckout: true, callbackPath: '/payments/bkash/callback' } },
    { key: 'nagad', name: 'Nagad', provider: 'nagad', status: 'disabled', mode: 'test', settings: { currency: 'BDT' } },
    { key: 'manual-bank', name: 'Manual Bank Transfer', provider: 'manual', status: 'enabled', mode: 'live', settings: { requiresApproval: true } }
  ];

  for (const gateway of paymentGateways) {
    await prisma.paymentGateway.upsert({
      where: { key: gateway.key },
      create: { ...gateway, credentials: { configured: false } },
      update: { name: gateway.name, provider: gateway.provider, status: gateway.status, mode: gateway.mode, settings: gateway.settings }
    });
  }

  const integrations = [
    { key: 'cloudflare-dns', group: 'domain', name: 'Cloudflare DNS', status: 'active', config: { zones: true, ssl: true }, health: { state: 'ok' } },
    { key: 'registrar-reseller', group: 'domain', name: 'Domain Registrar Reseller', status: 'active', config: { tlds: ['com', 'net', 'org', 'io', 'app'] }, health: { state: 'ok' } },
    { key: 'smtp-mail', group: 'notification', name: 'Transactional Email', status: 'active', config: { provider: 'smtp' }, health: { state: 'ok' } },
    { key: 'sms-gateway', group: 'notification', name: 'SMS Gateway', status: 'inactive', config: { provider: 'generic' }, health: { state: 'pending' } },
    { key: 'mikrotik-api', group: 'isp', name: 'MikroTik API', status: 'active', config: { port: 8728, sslPort: 8729 }, health: { state: 'ok' } },
    { key: 'radius-cluster', group: 'isp', name: 'RADIUS Cluster', status: 'active', config: { authPort: 1812, accountingPort: 1813 }, health: { state: 'ok' } },
    { key: 'storefront-cdn', group: 'ecommerce', name: 'Storefront CDN', status: 'active', config: { imageResize: true, cachePurge: true }, health: { state: 'ok' } },
    { key: 'checkout-webhooks', group: 'ecommerce', name: 'Checkout Webhooks', status: 'active', config: { retries: 5 }, health: { state: 'ok' } }
  ];

  for (const integration of integrations) {
    await prisma.integration.upsert({
      where: { key: integration.key },
      create: integration,
      update: { group: integration.group, name: integration.name, status: integration.status, config: integration.config, health: integration.health, lastSyncAt: new Date() }
    });
  }

  await prisma.apiCredential.upsert({
    where: { id: 'api_credential_admin_seed' },
    create: {
      id: 'api_credential_admin_seed',
      ownerId: admin.id,
      name: 'Admin Automation Key',
      keyHash: await bcrypt.hash('seed-demo-key', 10),
      scopes: ['admin:read', 'admin:write', 'billing:write', 'ecommerce:write', 'isp:write']
    },
    update: {
      status: 'active',
      scopes: ['admin:read', 'admin:write', 'billing:write', 'ecommerce:write', 'isp:write']
    }
  });

  const notifications = [
    {
      id: 'notification_platform_1',
      ownerId: admin.id,
      scope: 'platform',
      type: 'success',
      title: 'Backend modules ready',
      message: 'Tiwlo X modular API, database seed, and admin module registry are online.',
      status: 'unread',
      metadata: { module: 'platform' }
    },
    {
      id: 'notification_ecommerce_1',
      ownerId: storeOwner.id,
      scope: 'store',
      scopeId: store.id,
      type: 'info',
      title: 'Store provisioning complete',
      message: 'Blueberry Fashion has domain, theme, plugin, product, order, and checkout data ready.',
      status: 'unread',
      metadata: { storeId: store.id }
    },
    {
      id: 'notification_isp_1',
      ownerId: ispOwner.id,
      scope: 'isp',
      scopeId: ispSite.id,
      type: 'warning',
      title: 'Router sync check required',
      message: 'MikroTik automation is enabled; review credentials before live production sync.',
      status: 'unread',
      metadata: { siteId: ispSite.id }
    }
  ];

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      create: notification,
      update: {
        ownerId: notification.ownerId,
        scope: notification.scope,
        scopeId: notification.scopeId || '',
        type: notification.type,
        title: notification.title,
        message: notification.message,
        status: notification.status,
        metadata: notification.metadata
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'seed_database',
      resource: 'system',
      resourceId: 'tiwlo-x',
      metadata: { message: 'Initial Tiwlo X backend seed completed' }
    }
  });

  console.log('Seed completed: admin/user/store/ISP demo data is ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
