export type ControlFieldType = 'text' | 'number' | 'select' | 'textarea';

export type ControlRecordField = {
  key: string;
  label: string;
  type?: ControlFieldType;
  placeholder?: string;
  options?: string[];
  span?: 'half' | 'full';
};

export type ControlRecordTemplate = {
  title: string;
  description: string;
  noun: string;
  titleField: string;
  ownerField: string;
  summaryFields: string[];
  statusOptions: string[];
  fields: ControlRecordField[];
};

const status = {
  ops: ['active', 'review', 'queued', 'pending', 'resolved', 'disabled', 'blocked'],
  risk: ['review', 'approved', 'rejected', 'blocked', 'escalated'],
  billing: ['active', 'pending', 'paid', 'overdue', 'void', 'review'],
  infra: ['active', 'standby', 'degraded', 'maintenance', 'disabled'],
  content: ['draft', 'review', 'active', 'paused', 'archived']
};

const field = (key: string, label: string, placeholder: string, type: ControlFieldType = 'text', options?: string[], span?: ControlRecordField['span']): ControlRecordField => ({
  key,
  label,
  placeholder,
  type,
  options,
  span
});

const template = (
  noun: string,
  title: string,
  description: string,
  fields: ControlRecordField[],
  titleField = 'name',
  ownerField = 'owner',
  summaryFields = ['scope', 'region'],
  statusOptions = status.ops
): ControlRecordTemplate => ({
  noun,
  title,
  description,
  titleField,
  ownerField,
  summaryFields,
  statusOptions,
  fields
});

const storeScope = field('storeScope', 'Store scope', 'All stores, selected tenant, region, or segment');
const owner = field('owner', 'Owner / team', 'ops@tiwlo.test or Platform Ops');
const region = field('region', 'Region', 'Global, APAC, EU, US-East');
const priority = field('priority', 'Priority', 'low', 'select', ['low', 'normal', 'high', 'urgent']);
const notes = field('notes', 'Tiwlo Team notes', 'Internal note for this control record', 'textarea', undefined, 'full');

export const CONTROL_RECORD_TEMPLATES: Record<string, ControlRecordTemplate> = {
  'ecommerce.global-insight': template('Insight', 'Add Insight Signal', 'Executive platform signal for merchant SaaS decisions.', [
    field('name', 'Signal name', 'Revenue drop in APAC'),
    storeScope,
    field('metric', 'Metric watched', 'GMV, churn, conversion, uptime'),
    field('threshold', 'Threshold', 'Alert at -12%'),
    owner,
    priority,
    notes
  ], 'name', 'owner', ['metric', 'threshold']),
  'ecommerce.live-traffic': template('Traffic Event', 'Add Traffic Watch', 'Realtime storefront traffic watch or mitigation task.', [
    field('name', 'Watch name', 'Checkout spike monitor'),
    storeScope,
    region,
    field('eventType', 'Event type', 'checkout_started', 'select', ['page_view', 'cart_update', 'checkout_started', 'payment_failed', 'bot_spike']),
    field('limit', 'Action limit', 'Throttle above 500 rpm'),
    owner,
    notes
  ], 'name', 'owner', ['eventType', 'limit']),
  'ecommerce.health': template('Health Check', 'Add Health Check', 'Service readiness check for stores, jobs, and integrations.', [
    field('name', 'Check name', 'Checkout worker health'),
    field('service', 'Service', 'checkout-worker'),
    region,
    field('sla', 'SLA target', '99.95%'),
    owner,
    priority,
    notes
  ], 'name', 'owner', ['service', 'sla'], status.infra),
  'ecommerce.performance': template('Performance Sample', 'Add Performance Rule', 'Speed, cache, and checkout performance control.', [
    field('name', 'Rule name', 'Image CDN optimization'),
    storeScope,
    field('metric', 'Metric', 'LCP, TTFB, checkout latency'),
    field('target', 'Target', '< 1.8s'),
    owner,
    priority,
    notes
  ], 'name', 'owner', ['metric', 'target'], status.infra),
  'ecommerce.clusters': template('Cluster', 'Add Cluster Task', 'Database, worker, queue, or storefront cluster control.', [
    field('name', 'Cluster name', 'commerce-db-apac-1'),
    region,
    field('capacity', 'Capacity', '8 replicas / 64 GB'),
    field('failover', 'Failover rule', 'Promote replica on 2 failures'),
    owner,
    priority,
    notes
  ], 'name', 'owner', ['region', 'capacity'], status.infra),

  'ecommerce.merchants': template('Merchant', 'Add Merchant Control', 'Merchant account note, restriction, approval, or support control.', [
    field('name', 'Merchant / business', 'Acme Retail Ltd'),
    field('email', 'Owner email', 'owner@example.com'),
    field('plan', 'Plan', 'Starter, Pro, Enterprise'),
    field('creditState', 'Credit state', 'healthy', 'select', ['healthy', 'low_credit', 'empty_credit', 'manual_review']),
    field('risk', 'Risk level', 'low', 'select', ['low', 'medium', 'high', 'critical']),
    owner,
    notes
  ], 'name', 'email', ['plan', 'creditState']),
  'ecommerce.stores': template('Store', 'Add Store Deployment', 'Tenant store provisioning, suspension, DNS, SSL, or ownership control.', [
    field('name', 'Store name', 'acme-online'),
    field('merchantEmail', 'Merchant email', 'owner@example.com'),
    region,
    field('domain', 'Domain', 'shop.example.com'),
    field('plan', 'Plan', 'pro'),
    field('deploymentAction', 'Deployment action', 'provision', 'select', ['provision', 'suspend', 'resume', 'transfer', 'close']),
    notes
  ], 'name', 'merchantEmail', ['domain', 'deploymentAction'], status.infra),
  'ecommerce.kyc': template('KYC Case', 'Add KYC Case', 'Identity review for merchant business verification.', [
    field('name', 'Merchant / business', 'Acme Retail Ltd'),
    field('email', 'Owner email', 'owner@example.com'),
    field('documentType', 'Document type', 'Business registration'),
    field('reviewer', 'Reviewer', 'risk-team'),
    field('risk', 'Risk level', 'medium', 'select', ['low', 'medium', 'high', 'critical']),
    notes
  ], 'name', 'reviewer', ['documentType', 'risk'], status.risk),
  'ecommerce.segments': template('Segment', 'Add Client Segment', 'Merchant cohort, lifecycle segment, or targeting rule.', [
    field('name', 'Segment name', 'High GMV fashion stores'),
    field('criteria', 'Criteria', 'GMV > $10k and category=fashion', 'textarea', undefined, 'full'),
    field('channel', 'Sync channel', 'email', 'select', ['email', 'affiliate', 'ads', 'support', 'none']),
    owner,
    notes
  ], 'name', 'owner', ['channel']),
  'ecommerce.groups': template('Group', 'Add Merchant Group', 'Merchant organization, reseller group, or ownership rule.', [
    field('name', 'Group name', 'Enterprise stores APAC'),
    field('parentMerchant', 'Parent merchant', 'acme@example.com'),
    field('policy', 'Group policy', 'shared billing, isolated users'),
    owner,
    notes
  ], 'name', 'parentMerchant', ['policy']),
  'ecommerce.partners': template('Partner', 'Add Partner Portal Control', 'Partner portal, referral link, reseller payout, or API access control.', [
    field('name', 'Partner name', 'Acme Reseller'),
    field('partnerType', 'Partner type', 'reseller', 'select', ['reseller', 'affiliate', 'developer', 'agency', 'referral']),
    field('commission', 'Commission rule', '20% recurring / 5% setup'),
    field('portalUrl', 'Portal URL', 'partners.example.com/acme'),
    field('webhook', 'Webhook endpoint', 'https://partner.example.com/webhooks'),
    owner,
    notes
  ], 'name', 'owner', ['partnerType', 'commission']),

  'ecommerce.revenue': template('Revenue Stream', 'Add Revenue Control', 'Subscription, transaction fee, app, theme, or settlement control.', [
    field('name', 'Stream name', 'Pro plan monthly MRR'),
    field('source', 'Source', 'subscriptions', 'select', ['subscriptions', 'transactions', 'themes', 'apps', 'partners', 'tax']),
    field('amount', 'Amount / rate', '$2,500 or 3.5%'),
    owner,
    notes
  ], 'name', 'owner', ['source', 'amount'], status.billing),
  'ecommerce.plans': template('Plan', 'Add Subscription Plan', 'Plan pricing, limits, features, or publishing control.', [
    field('name', 'Plan name', 'Commerce Pro'),
    field('price', 'Price', '49', 'number'),
    field('interval', 'Interval', 'month', 'select', ['month', 'year', 'usage']),
    field('limits', 'Limits', 'products: 10000, staff: 20', 'textarea', undefined, 'full'),
    owner,
    notes
  ], 'name', 'owner', ['price', 'interval'], status.billing),
  'ecommerce.invoices': template('Invoice', 'Add Invoice Control', 'Invoice, collection, retry, void, or payment review control.', [
    field('name', 'Invoice number', 'INV-2026-0001'),
    field('merchantEmail', 'Merchant email', 'owner@example.com'),
    field('amount', 'Amount', '149', 'number'),
    field('dueDate', 'Due date', '2026-06-01'),
    field('collectionAction', 'Collection action', 'retry', 'select', ['retry', 'mark_paid', 'void', 'send_notice', 'manual_review']),
    notes
  ], 'name', 'merchantEmail', ['amount', 'collectionAction'], status.billing),
  'ecommerce.usage': template('Meter', 'Add Usage Meter', 'Usage quota, bandwidth, storage, order, or overage rule.', [
    field('name', 'Meter name', 'Storage overage meter'),
    storeScope,
    field('unit', 'Unit', 'GB', 'select', ['orders', 'GB', 'requests', 'products', 'domains']),
    field('limit', 'Limit', '500'),
    owner,
    notes
  ], 'name', 'owner', ['unit', 'limit']),
  'ecommerce.cycles': template('Billing Cycle', 'Add Billing Cycle Rule', 'Renewal, retry, grace, dunning, or collection cycle.', [
    field('name', 'Cycle name', 'Monthly renewal retry'),
    field('cadence', 'Cadence', 'monthly', 'select', ['monthly', 'yearly', 'weekly', 'custom']),
    field('graceDays', 'Grace days', '7', 'number'),
    field('retryRule', 'Retry rule', '3 retries over 5 days'),
    owner,
    notes
  ], 'name', 'owner', ['cadence', 'retryRule'], status.billing),
  'ecommerce.taxes': template('Tax Rule', 'Add Tax Rule', 'VAT/GST region rule, collection mode, or invoice tax control.', [
    field('name', 'Rule name', 'EU VAT digital services'),
    region,
    field('rate', 'Rate', '20%'),
    field('mode', 'Mode', 'inclusive', 'select', ['inclusive', 'exclusive', 'reverse_charge', 'exempt']),
    owner,
    notes
  ], 'name', 'owner', ['region', 'rate'], status.billing),

  'ecommerce.campaigns': template('Campaign', 'Add Campaign Control', 'Merchant growth campaign, offer, or audience workflow.', [
    field('name', 'Campaign name', 'Winback inactive stores'),
    field('audience', 'Audience', 'inactive merchants 30d'),
    field('channel', 'Channel', 'email', 'select', ['email', 'social', 'affiliate', 'in_app', 'sms']),
    field('budget', 'Budget', '500', 'number'),
    owner,
    notes
  ], 'name', 'owner', ['audience', 'channel'], status.content),
  'ecommerce.seo': template('SEO Item', 'Add SEO Control', 'Sitemap, redirect, canonical, or indexing task.', [
    field('name', 'SEO item', 'Store sitemap rebuild'),
    field('targetUrl', 'Target URL', 'https://store.example.com'),
    field('ruleType', 'Rule type', 'sitemap', 'select', ['sitemap', 'redirect', 'canonical', 'meta', 'indexing']),
    owner,
    notes
  ], 'name', 'owner', ['ruleType', 'targetUrl'], status.content),
  'ecommerce.affiliates': template('Affiliate', 'Add Affiliate Control', 'Affiliate partner, payout, fraud, or attribution control.', [
    field('name', 'Affiliate name', 'Top creator program'),
    field('commission', 'Commission', '15%'),
    field('trackingCode', 'Tracking code', 'AFF-ACME'),
    field('fraudRule', 'Fraud rule', 'Hold payout above 30% refund rate'),
    owner,
    notes
  ], 'name', 'owner', ['commission', 'trackingCode']),
  'ecommerce.email': template('Automation', 'Add Email Automation', 'Lifecycle email, merchant notice, template, or sender control.', [
    field('name', 'Automation name', 'Trial ending reminder'),
    field('trigger', 'Trigger', 'trial_ending'),
    field('template', 'Template', 'trial-reminder-v2'),
    field('sender', 'Sender', 'commerce@tiwlo.com'),
    owner,
    notes
  ], 'name', 'owner', ['trigger', 'template'], status.content),
  'ecommerce.social': template('Channel', 'Add Social Channel Control', 'Product feed, shop sync, or social publishing rule.', [
    field('name', 'Channel name', 'Instagram product feed'),
    field('platform', 'Platform', 'instagram', 'select', ['facebook', 'instagram', 'tiktok', 'google', 'pinterest']),
    field('feedRule', 'Feed rule', 'Sync active products every 6h'),
    owner,
    notes
  ], 'name', 'owner', ['platform', 'feedRule'], status.content),

  'ecommerce.databases': template('DB Cluster', 'Add Database Cluster Control', 'Database cluster, replica, backup, or restore task.', [
    field('name', 'Cluster name', 'commerce-primary-us'),
    region,
    field('role', 'Role', 'primary', 'select', ['primary', 'replica', 'analytics', 'archive']),
    field('backupRule', 'Backup rule', 'Hourly PITR, 30d retention'),
    owner,
    notes
  ], 'name', 'owner', ['region', 'role'], status.infra),
  'ecommerce.storage': template('Storage Pool', 'Add Storage Pool Control', 'Media, invoice file, archive, or backup storage rule.', [
    field('name', 'Pool name', 'product-media-apac'),
    region,
    field('quota', 'Quota', '2 TB'),
    field('retention', 'Retention', '365 days'),
    owner,
    notes
  ], 'name', 'owner', ['quota', 'retention'], status.infra),
  'ecommerce.cdn': template('CDN Rule', 'Add CDN Control', 'Cache, image transform, purge, or edge routing rule.', [
    field('name', 'Rule name', 'Product image cache'),
    region,
    field('path', 'Path pattern', '/products/*'),
    field('ttl', 'TTL', '3600'),
    owner,
    notes
  ], 'name', 'owner', ['path', 'ttl'], status.infra),
  'ecommerce.domains': template('Domain', 'Add Domain Control', 'Domain reseller, registrar, DNS, or renewal control.', [
    field('name', 'Domain', 'shop.example.com'),
    field('merchantEmail', 'Merchant email', 'owner@example.com'),
    field('registrar', 'Registrar', 'Tiwlo Reseller'),
    field('dnsState', 'DNS state', 'verified', 'select', ['pending', 'verified', 'failed', 'manual_review']),
    owner,
    notes
  ], 'name', 'merchantEmail', ['registrar', 'dnsState'], status.infra),
  'ecommerce.nodes': template('Edge Node', 'Add Edge Node Control', 'Storefront edge node, route, capacity, and failover control.', [
    field('name', 'Node name', 'edge-sgp-01'),
    region,
    field('routeMode', 'Route mode', 'weighted', 'select', ['weighted', 'geo', 'failover', 'maintenance']),
    field('capacity', 'Capacity', '10k rpm'),
    storeScope,
    owner,
    notes
  ], 'name', 'owner', ['region', 'routeMode'], status.infra),
  'ecommerce.ssl': template('Certificate', 'Add SSL Control', 'Certificate issuance, renewal, validation, or expiry task.', [
    field('name', 'Domain / certificate', 'shop.example.com'),
    field('validation', 'Validation', 'dns', 'select', ['dns', 'http', 'wildcard', 'manual']),
    field('expiry', 'Expiry date', '2026-12-31'),
    owner,
    notes
  ], 'name', 'owner', ['validation', 'expiry'], status.infra),

  'ecommerce.themes': template('Theme', 'Add Theme Control', 'Theme review, publish, install, or default assignment control.', [
    field('name', 'Theme name', 'Minimal Market'),
    field('themeKey', 'Theme key', 'minimal-market'),
    field('storeScope', 'Store scope', 'All new stores'),
    field('reviewer', 'Reviewer', 'marketplace-team'),
    notes
  ], 'name', 'reviewer', ['themeKey', 'storeScope'], status.content),
  'ecommerce.apps': template('Extension', 'Add Extension Control', 'App marketplace extension, permission, install, or review control.', [
    field('name', 'Extension name', 'Reviews Pro'),
    field('pluginKey', 'Plugin key', 'reviews-pro'),
    field('scope', 'Scopes', 'orders:read, products:write'),
    field('billingMode', 'Billing mode', 'recurring', 'select', ['free', 'one_time', 'recurring', 'usage']),
    owner,
    notes
  ], 'name', 'owner', ['pluginKey', 'billingMode'], status.content),
  'ecommerce.shares': template('Share Rule', 'Add Revenue Share Rule', 'Marketplace, app, theme, developer, or partner split control.', [
    field('name', 'Share rule', 'Theme developer split'),
    field('party', 'Party', 'developer@example.com'),
    field('split', 'Split', '70/30'),
    field('settlement', 'Settlement cadence', 'monthly', 'select', ['weekly', 'monthly', 'quarterly', 'manual']),
    owner,
    notes
  ], 'name', 'party', ['split', 'settlement'], status.billing),
  'ecommerce.dev-portal': template('Developer App', 'Add Developer App Review', 'Developer onboarding, app review, sandbox, or API access control.', [
    field('name', 'App name', 'Inventory Sync'),
    field('developerEmail', 'Developer email', 'dev@example.com'),
    field('scopes', 'Scopes', 'products:read, orders:write'),
    field('sandbox', 'Sandbox state', 'enabled', 'select', ['enabled', 'disabled', 'review', 'blocked']),
    notes
  ], 'name', 'developerEmail', ['scopes', 'sandbox'], status.content),

  'ecommerce.support': template('Support Case', 'Add Merchant Support Control', 'Merchant support, escalation, SLA, or broadcast task.', [
    field('name', 'Case title', 'Store checkout issue'),
    field('merchantEmail', 'Merchant email', 'owner@example.com'),
    field('sla', 'SLA', '4h response'),
    priority,
    owner,
    notes
  ], 'name', 'merchantEmail', ['priority', 'sla']),
  'ecommerce.alerts': template('Alert', 'Add Global Alert', 'Platform, merchant, risk, or incident notification control.', [
    field('name', 'Alert title', 'Payment provider degradation'),
    field('scope', 'Scope', 'all stores', 'select', ['all stores', 'selected stores', 'region', 'internal']),
    field('severity', 'Severity', 'medium', 'select', ['low', 'medium', 'high', 'critical']),
    owner,
    notes
  ], 'name', 'owner', ['scope', 'severity']),
  'ecommerce.security': template('Security Policy', 'Add Security Policy', 'Merchant auth, app scopes, session, or checkout security policy.', [
    field('name', 'Policy name', 'Require MFA for payouts'),
    field('scope', 'Scope', 'merchant_admins'),
    field('enforcement', 'Enforcement', 'warn', 'select', ['warn', 'block', 'require_review', 'audit_only']),
    owner,
    notes
  ], 'name', 'owner', ['scope', 'enforcement'], status.risk),
  'ecommerce.compliance': template('Evidence', 'Add Compliance Evidence', 'KYC, PCI, privacy, retention, or audit evidence record.', [
    field('name', 'Evidence title', 'PCI quarterly scan'),
    field('framework', 'Framework', 'PCI', 'select', ['PCI', 'GDPR', 'SOC2', 'KYC', 'Tax']),
    field('owner', 'Evidence owner', 'compliance-team'),
    field('dueDate', 'Due date', '2026-06-15'),
    notes
  ], 'name', 'owner', ['framework', 'dueDate'], status.risk),
  'ecommerce.audits': template('Audit Event', 'Add Audit Review', 'Sensitive action review, audit sweep, or investigation control.', [
    field('name', 'Audit title', 'Review plugin permission changes'),
    field('resource', 'Resource', 'storePlugin'),
    field('actor', 'Actor', 'admin@example.com'),
    field('reviewer', 'Reviewer', 'security-team'),
    notes
  ], 'name', 'reviewer', ['resource', 'actor'], status.risk),

  'ecommerce.api': template('API Credential', 'Add API/Webhook Control', 'API key, webhook, scope, delivery, or secret rotation control.', [
    field('name', 'Credential / webhook', 'Partner webhook key'),
    field('owner', 'Owner', 'developer@example.com'),
    field('scopes', 'Scopes', 'orders:read, webhooks:write'),
    field('endpoint', 'Endpoint', 'https://app.example.com/webhook'),
    field('rotation', 'Rotation policy', '90 days'),
    notes
  ], 'name', 'owner', ['scopes', 'rotation'], status.risk),
  'ecommerce.translations': template('Locale', 'Add Translation Control', 'Locale, currency, fallback, or translation publishing control.', [
    field('name', 'Locale name', 'Bangla storefront copy'),
    field('locale', 'Locale', 'bn-BD'),
    field('coverage', 'Coverage', '85%'),
    field('fallback', 'Fallback locale', 'en-US'),
    owner,
    notes
  ], 'name', 'owner', ['locale', 'coverage'], status.content),
  'ecommerce.fields': template('Field', 'Add Custom Field', 'Custom product, order, customer, or merchant schema field.', [
    field('name', 'Field name', 'delivery_window'),
    field('entity', 'Entity', 'order', 'select', ['product', 'order', 'customer', 'merchant', 'store']),
    field('fieldType', 'Field type', 'text', 'select', ['text', 'number', 'boolean', 'date', 'json']),
    field('validation', 'Validation', 'required for local delivery'),
    owner,
    notes
  ], 'name', 'owner', ['entity', 'fieldType'], status.content),
  'ecommerce.mobile': template('Mobile Flag', 'Add Mobile Config', 'Mobile release channel, feature flag, push, or checkout config.', [
    field('name', 'Config name', 'mobile checkout v2'),
    field('channel', 'Release channel', 'beta', 'select', ['stable', 'beta', 'internal', 'paused']),
    field('flag', 'Feature flag', 'checkout_v2=true'),
    field('pushProvider', 'Push provider', 'FCM'),
    owner,
    notes
  ], 'name', 'owner', ['channel', 'flag'], status.content),
  'ecommerce.settings': template('Setting', 'Add Platform Setting', 'Tenant default, automation policy, limit, or platform flag.', [
    field('name', 'Setting name', 'default_plan'),
    field('scope', 'Scope', 'all tenants'),
    field('value', 'Value', 'pro'),
    field('rollout', 'Rollout', 'gradual', 'select', ['immediate', 'gradual', 'manual_review', 'audit_only']),
    owner,
    notes
  ], 'name', 'owner', ['scope', 'value'])
};

export function getControlRecordTemplate(sectionKey: string, noun: string, sectionLabel: string) {
  return CONTROL_RECORD_TEMPLATES[sectionKey] || template(noun, `Add ${noun}`, `Create a ${sectionLabel.toLowerCase()} control record.`, [
    field('name', `${noun} name`, `${sectionLabel} record`),
    storeScope,
    owner,
    priority,
    notes
  ]);
}
