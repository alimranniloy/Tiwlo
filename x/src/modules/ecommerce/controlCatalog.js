export const ECOMMERCE_CONTROL_SECTIONS = [
  {
    key: 'ecommerce.global-insight',
    group: 'PLATFORM CORE',
    label: 'Global Insight',
    path: '/management/ecommerce',
    description: 'Merchant SaaS overview, revenue intelligence, and platform-wide operating signals.',
    source: 'overview',
    runbook: ['Review revenue movement', 'Check active deployments', 'Open merchant risk queue']
  },
  {
    key: 'ecommerce.live-traffic',
    group: 'PLATFORM CORE',
    label: 'Live Traffic Hub',
    path: '/management/ecommerce/live-traffic',
    description: 'Realtime storefront traffic, cart activity, checkout events, and channel spikes.',
    source: 'traffic',
    runbook: ['Watch checkout spikes', 'Inspect high-volume stores', 'Escalate failed payment bursts']
  },
  {
    key: 'ecommerce.health',
    group: 'PLATFORM CORE',
    label: 'System Health',
    path: '/management/ecommerce/health',
    description: 'Store cluster uptime, queue status, background jobs, and control-plane health.',
    source: 'health',
    runbook: ['Verify integrations', 'Check suspended stores', 'Refresh module health']
  },
  {
    key: 'ecommerce.performance',
    group: 'PLATFORM CORE',
    label: 'Performance Metrics',
    path: '/management/ecommerce/performance',
    description: 'Core web vitals, checkout speed, storefront response time, and CDN cache posture.',
    source: 'performance',
    runbook: ['Review slow stores', 'Purge stale CDN paths', 'Check checkout latency']
  },
  {
    key: 'ecommerce.clusters',
    group: 'PLATFORM CORE',
    label: 'Cluster Analytics',
    path: '/management/ecommerce/clusters',
    description: 'Database, worker, queue, and storefront cluster analytics for commerce SaaS.',
    source: 'infrastructure',
    runbook: ['Check database load', 'Inspect replica health', 'Confirm worker capacity']
  },
  {
    key: 'ecommerce.merchants',
    group: 'MERCHANT HUB',
    label: 'Merchant Directory',
    path: '/management/ecommerce/merchants',
    description: 'Merchant onboarding, account status, store ownership, and SaaS plan visibility.',
    source: 'merchants',
    runbook: ['Review new merchants', 'Check owner credit', 'Audit suspended accounts']
  },
  {
    key: 'ecommerce.stores',
    group: 'MERCHANT HUB',
    label: 'Store Deployments',
    path: '/management/ecommerce/stores',
    description: 'Store provisioning, domains, SSL, theme status, and deployment controls.',
    source: 'stores',
    runbook: ['Verify DNS mapping', 'Check SSL queue', 'Resume or suspend stores']
  },
  {
    key: 'ecommerce.kyc',
    group: 'MERCHANT HUB',
    label: 'Identity KYC',
    path: '/management/ecommerce/kyc',
    description: 'Business verification, merchant risk review, and identity escalation lanes.',
    source: 'merchants',
    runbook: ['Review unverified accounts', 'Escalate high-risk stores', 'Attach reviewer notes']
  },
  {
    key: 'ecommerce.segments',
    group: 'MERCHANT HUB',
    label: 'Client Segments',
    path: '/management/ecommerce/segments',
    description: 'Merchant segmentation, tags, cohorts, retention groups, and lifecycle buckets.',
    source: 'merchants',
    runbook: ['Update cohort rules', 'Review churn-risk stores', 'Sync marketing audiences']
  },
  {
    key: 'ecommerce.groups',
    group: 'MERCHANT HUB',
    label: 'Merchant Groups',
    path: '/management/ecommerce/groups',
    description: 'Organization groups, team ownership, account hierarchy, and grouped controls.',
    source: 'merchants',
    runbook: ['Check grouped stores', 'Review owners', 'Confirm group permissions']
  },
  {
    key: 'ecommerce.partners',
    group: 'MERCHANT HUB',
    label: 'Partner Portals',
    path: '/management/ecommerce/partners',
    description: 'Partner channel portals, reseller links, commission rules, and partner access.',
    source: 'partners',
    runbook: ['Review partner stores', 'Validate commission rules', 'Check portal access']
  },
  {
    key: 'ecommerce.revenue',
    group: 'SAAS SUBSCRIPTIONS',
    label: 'Revenue Streams',
    path: '/management/ecommerce/revenue',
    description: 'Subscription revenue, transaction fees, marketplace income, and revenue share.',
    source: 'billing',
    runbook: ['Review paid orders', 'Inspect open invoices', 'Check subscription mix']
  },
  {
    key: 'ecommerce.plans',
    group: 'SAAS SUBSCRIPTIONS',
    label: 'Subscription Plans',
    path: '/management/ecommerce/plans',
    description: 'Merchant SaaS plans, feature limits, pricing, and plan publishing controls.',
    source: 'plans',
    runbook: ['Review plan limits', 'Check active status', 'Publish pricing changes']
  },
  {
    key: 'ecommerce.invoices',
    group: 'SAAS SUBSCRIPTIONS',
    label: 'Invoicing Core',
    path: '/management/ecommerce/invoices',
    description: 'Merchant invoices, payment status, failed payments, credits, and dunning lanes.',
    source: 'billing',
    runbook: ['Review failed invoices', 'Check due balances', 'Re-run payment reminders']
  },
  {
    key: 'ecommerce.usage',
    group: 'SAAS SUBSCRIPTIONS',
    label: 'Usage Meters',
    path: '/management/ecommerce/usage',
    description: 'Product, order, storage, domain, and bandwidth metering for merchant billing.',
    source: 'usage',
    runbook: ['Check heavy stores', 'Review quota limits', 'Refresh usage rollups']
  },
  {
    key: 'ecommerce.cycles',
    group: 'SAAS SUBSCRIPTIONS',
    label: 'Billing Cycles',
    path: '/management/ecommerce/cycles',
    description: 'Recurring billing calendars, retries, grace periods, and collection windows.',
    source: 'subscriptions',
    runbook: ['Review renewal dates', 'Check grace periods', 'Inspect retry queues']
  },
  {
    key: 'ecommerce.taxes',
    group: 'SAAS SUBSCRIPTIONS',
    label: 'Tax Engine',
    path: '/management/ecommerce/taxes',
    description: 'Tax and VAT rules, invoice tax lines, regions, and collection policies.',
    source: 'settings',
    runbook: ['Review tax regions', 'Validate invoice lines', 'Update collection policy']
  },
  {
    key: 'ecommerce.campaigns',
    group: 'MARKETING & GROWTH',
    label: 'Campaign Manager',
    path: '/management/ecommerce/campaigns',
    description: 'Email, coupon, retargeting, promotion, and merchant growth campaign controls.',
    source: 'marketing',
    runbook: ['Review active campaigns', 'Check conversion signals', 'Queue merchant notices']
  },
  {
    key: 'ecommerce.seo',
    group: 'MARKETING & GROWTH',
    label: 'SEO Platform',
    path: '/management/ecommerce/seo',
    description: 'Sitemap, meta, redirects, search indexing, and storefront discovery tooling.',
    source: 'marketing',
    runbook: ['Audit indexed stores', 'Review redirect rules', 'Sync sitemap jobs']
  },
  {
    key: 'ecommerce.affiliates',
    group: 'MARKETING & GROWTH',
    label: 'Affiliate Engine',
    path: '/management/ecommerce/affiliates',
    description: 'Affiliate tracking, partner payouts, fraud checks, and attribution rules.',
    source: 'partners',
    runbook: ['Review payouts', 'Check fraud flags', 'Sync attribution events']
  },
  {
    key: 'ecommerce.email',
    group: 'MARKETING & GROWTH',
    label: 'Email Automation',
    path: '/management/ecommerce/email',
    description: 'Lifecycle email templates, triggers, sender health, and delivery automation.',
    source: 'messaging',
    runbook: ['Review templates', 'Check sender health', 'Retry failed deliveries']
  },
  {
    key: 'ecommerce.social',
    group: 'MARKETING & GROWTH',
    label: 'Social Connect',
    path: '/management/ecommerce/social',
    description: 'Social sales channels, product feeds, shop sync, and channel publishing state.',
    source: 'integrations',
    runbook: ['Check feed sync', 'Review connected channels', 'Inspect product rejections']
  },
  {
    key: 'ecommerce.databases',
    group: 'INFRASTRUCTURE',
    label: 'DB Clusters',
    path: '/management/ecommerce/databases',
    description: 'Commerce database clusters, replicas, backup jobs, and restore readiness.',
    source: 'infrastructure',
    runbook: ['Check replicas', 'Review backup jobs', 'Validate restore points']
  },
  {
    key: 'ecommerce.storage',
    group: 'INFRASTRUCTURE',
    label: 'Storage Pools',
    path: '/management/ecommerce/storage',
    description: 'Product media, invoice files, backups, storage quotas, and archive policy.',
    source: 'usage',
    runbook: ['Review storage quotas', 'Check heavy stores', 'Inspect archive jobs']
  },
  {
    key: 'ecommerce.cdn',
    group: 'INFRASTRUCTURE',
    label: 'Asset CDN',
    path: '/management/ecommerce/cdn',
    description: 'Media CDN, image transforms, cache purge, regional edge status, and delivery health.',
    source: 'integrations',
    runbook: ['Purge stale assets', 'Check edge health', 'Review transform errors']
  },
  {
    key: 'ecommerce.domains',
    group: 'INFRASTRUCTURE',
    label: 'Domain Reseller',
    path: '/management/ecommerce/domains',
    description: 'Store domain mapping, registrar automation, DNS readiness, and renewal state.',
    source: 'domains',
    runbook: ['Review mapped domains', 'Check DNS records', 'Retry registrar sync']
  },
  {
    key: 'ecommerce.nodes',
    group: 'INFRASTRUCTURE',
    label: 'Edge Nodes',
    path: '/management/ecommerce/nodes',
    description: 'Storefront edge nodes, routing, capacity, regional health, and failover posture.',
    source: 'infrastructure',
    runbook: ['Inspect edge capacity', 'Review routing health', 'Check regional failover']
  },
  {
    key: 'ecommerce.ssl',
    group: 'INFRASTRUCTURE',
    label: 'SSL Manager',
    path: '/management/ecommerce/ssl',
    description: 'Store SSL certificates, renewals, validation status, and TLS automation.',
    source: 'domains',
    runbook: ['Check certificate queue', 'Retry validation', 'Audit expiring domains']
  },
  {
    key: 'ecommerce.themes',
    group: 'SAAS MARKETPLACE',
    label: 'Theme Directory',
    path: '/management/ecommerce/themes',
    description: 'Theme catalog, installations, previews, publishing state, and storefront defaults.',
    source: 'themes',
    runbook: ['Review active themes', 'Publish approved themes', 'Check install failures']
  },
  {
    key: 'ecommerce.apps',
    group: 'SAAS MARKETPLACE',
    label: 'Extension Hub',
    path: '/management/ecommerce/apps',
    description: 'Store app marketplace, plugins, extension installs, and integration controls.',
    source: 'plugins',
    runbook: ['Review app installs', 'Disable risky apps', 'Check extension health']
  },
  {
    key: 'ecommerce.shares',
    group: 'SAAS MARKETPLACE',
    label: 'Revenue Shares',
    path: '/management/ecommerce/shares',
    description: 'Marketplace revenue share, app payouts, theme royalties, and split rules.',
    source: 'billing',
    runbook: ['Review payout rules', 'Check partner shares', 'Inspect settlement status']
  },
  {
    key: 'ecommerce.dev-portal',
    group: 'SAAS MARKETPLACE',
    label: 'Developer Portal',
    path: '/management/ecommerce/dev-portal',
    description: 'App developer onboarding, API documentation, app review, and sandbox access.',
    source: 'api',
    runbook: ['Review developer apps', 'Check API access', 'Inspect webhook failures']
  },
  {
    key: 'ecommerce.support',
    group: 'GOVERNANCE & RISK',
    label: 'Merchant Support',
    path: '/management/ecommerce/support',
    description: 'Merchant support tickets, SLA, escalation lanes, and support workload.',
    source: 'support',
    runbook: ['Review open tickets', 'Escalate urgent cases', 'Check support ownership']
  },
  {
    key: 'ecommerce.alerts',
    group: 'GOVERNANCE & RISK',
    label: 'Global Alerts',
    path: '/management/ecommerce/alerts',
    description: 'Commerce incidents, platform alerts, merchant notices, and notification controls.',
    source: 'alerts',
    runbook: ['Review unread alerts', 'Send merchant notice', 'Mark resolved incidents']
  },
  {
    key: 'ecommerce.security',
    group: 'GOVERNANCE & RISK',
    label: 'Security Policy',
    path: '/management/ecommerce/security',
    description: 'Merchant auth policy, app scopes, checkout security, and risk controls.',
    source: 'security',
    runbook: ['Review app scopes', 'Check suspended stores', 'Validate security settings']
  },
  {
    key: 'ecommerce.compliance',
    group: 'GOVERNANCE & RISK',
    label: 'Compliance Hub',
    path: '/management/ecommerce/compliance',
    description: 'KYC, PCI, privacy, audit readiness, data retention, and compliance evidence.',
    source: 'compliance',
    runbook: ['Review evidence gaps', 'Check KYC queue', 'Export audit package']
  },
  {
    key: 'ecommerce.audits',
    group: 'GOVERNANCE & RISK',
    label: 'Audit Logs',
    path: '/management/ecommerce/audits',
    description: 'Commerce admin actions, app changes, sensitive events, and activity trail.',
    source: 'audits',
    runbook: ['Review recent changes', 'Filter sensitive events', 'Export action trail']
  },
  {
    key: 'ecommerce.api',
    group: 'SYSTEM ADVANCED',
    label: 'API & Webhooks',
    path: '/management/ecommerce/api',
    description: 'Storefront API, webhooks, app credentials, scopes, and partner automation.',
    source: 'api',
    runbook: ['Review credentials', 'Rotate stale keys', 'Check webhook delivery health']
  },
  {
    key: 'ecommerce.translations',
    group: 'SYSTEM ADVANCED',
    label: 'Translation Hub',
    path: '/management/ecommerce/translations',
    description: 'Locale settings, storefront translation, currency copy, and publishing status.',
    source: 'settings',
    runbook: ['Review locale coverage', 'Publish translations', 'Check fallback rules']
  },
  {
    key: 'ecommerce.fields',
    group: 'SYSTEM ADVANCED',
    label: 'Custom Fields',
    path: '/management/ecommerce/fields',
    description: 'Merchant-defined product, order, customer, and storefront custom data fields.',
    source: 'settings',
    runbook: ['Review field schema', 'Check required fields', 'Sync field definitions']
  },
  {
    key: 'ecommerce.mobile',
    group: 'SYSTEM ADVANCED',
    label: 'Mobile Config',
    path: '/management/ecommerce/mobile',
    description: 'Mobile storefront settings, app release channel, feature gates, and push config.',
    source: 'settings',
    runbook: ['Check release channel', 'Review mobile toggles', 'Sync push provider']
  },
  {
    key: 'ecommerce.settings',
    group: 'SYSTEM ADVANCED',
    label: 'Platform Settings',
    path: '/management/ecommerce/settings',
    description: 'SaaS ecommerce defaults, automation policy, merchant limits, and platform flags.',
    source: 'settings',
    runbook: ['Review automation policy', 'Update platform defaults', 'Check tenant limits']
  }
];

export const normalizeControlPath = (path = '') => {
  const value = String(path || '').split('?')[0].replace(/\/+$/, '');
  return value || '/management/ecommerce';
};

export const findEcommerceControlSection = ({ key, path } = {}) => {
  if (key) {
    const section = ECOMMERCE_CONTROL_SECTIONS.find((item) => item.key === key);
    if (section) return section;
  }

  const normalizedPath = normalizeControlPath(path);
  const exact = ECOMMERCE_CONTROL_SECTIONS.find((item) => normalizeControlPath(item.path) === normalizedPath);
  if (exact) return exact;

  const slug = normalizedPath.split('/').filter(Boolean).pop();
  return ECOMMERCE_CONTROL_SECTIONS.find((item) => item.path.endsWith(`/${slug}`)) || ECOMMERCE_CONTROL_SECTIONS[0];
};
