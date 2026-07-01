export type WorkspaceOperation = {
  key: string;
  label: string;
  intent: 'primary' | 'success' | 'danger' | 'neutral';
  description: string;
  targetPrefix?: string;
};

export type WorkspaceZoneKind =
  | 'metrics'
  | 'chart'
  | 'entityGrid'
  | 'kanban'
  | 'ledger'
  | 'settings'
  | 'timeline'
  | 'danger'
  | 'automation'
  | 'matrix'
  | 'functionCatalog';

export type WorkspaceZone = {
  kind: WorkspaceZoneKind;
  title: string;
  description: string;
  span?: 'full' | 'wide' | 'side';
};

export type ModuleWorkspaceConfig = {
  title: string;
  mode: string;
  primaryNoun: string;
  operations: WorkspaceOperation[];
  zones: WorkspaceZone[];
};

const sectionOp = (key: string, label: string, intent: WorkspaceOperation['intent'], description: string): WorkspaceOperation => ({
  key,
  label,
  intent,
  description
});

const targetOp = (targetPrefix: string, key: string, label: string, intent: WorkspaceOperation['intent'], description: string): WorkspaceOperation => ({
  key,
  label,
  intent,
  description,
  targetPrefix
});

const manualOps = (noun: string) => [
  sectionOp('create_record', `Add ${noun}`, 'primary', `Create a manual ${noun.toLowerCase()} record for this module.`),
  sectionOp('clear_manual_records', 'Clear Manual', 'danger', 'Delete all manual operator records on this page.')
];

const commonOps = (noun: string) => [
  sectionOp('sync_section', 'Sync Now', 'primary', `Refresh ${noun.toLowerCase()} metrics and registry health.`),
  ...manualOps(noun)
];

const zones = (...items: WorkspaceZone[]) => items;

const zone = (kind: WorkspaceZoneKind, title: string, description: string, span: WorkspaceZone['span'] = 'wide'): WorkspaceZone => ({
  kind,
  title,
  description,
  span
});

const workspace = (
  title: string,
  mode: string,
  primaryNoun: string,
  operations: WorkspaceOperation[],
  workspaceZones: WorkspaceZone[]
): ModuleWorkspaceConfig => ({
  title,
  mode,
  primaryNoun,
  operations,
  zones: workspaceZones
});

const functionCatalogZone = zone(
  'functionCatalog',
  'Function and Settings Catalog',
  'Tiwlo Team actions, settings, policy controls, and tenant-safe operations exposed by GraphQL.',
  'full'
);

const withFunctionCatalog = (config: ModuleWorkspaceConfig): ModuleWorkspaceConfig => {
  if (config.zones.some((item) => item.kind === 'functionCatalog')) return config;
  return {
    ...config,
    zones: [...config.zones, functionCatalogZone]
  };
};

export const MODULE_WORKSPACES: Record<string, ModuleWorkspaceConfig> = {
  'ecommerce.global-insight': workspace('Executive Commerce Command', 'board', 'Insight', [
    ...commonOps('Insight'),
    sectionOp('run_audit', 'Run Executive Audit', 'neutral', 'Create an audit pass for revenue, stores, and risk signals.')
  ], zones(
    zone('metrics', 'Executive KPI Rail', 'Top-level SaaS ecommerce performance signals.', 'full'),
    zone('chart', 'Revenue and Tenant Pulse', 'Revenue and tenant movement from API-backed metrics.', 'wide'),
    zone('automation', 'Decision Queue', 'Operator decisions generated from current merchant and store state.', 'side'),
    zone('timeline', 'Executive Activity', 'Recent commerce actions and alerts.', 'full')
  )),
  'ecommerce.live-traffic': workspace('Realtime Traffic Operations', 'stream', 'Traffic Event', [
    ...commonOps('Traffic Event'),
    sectionOp('sync_feed', 'Resync Event Feed', 'neutral', 'Record a storefront event-stream resync.'),
    sectionOp('apply_policy', 'Throttle Rules', 'danger', 'Record a traffic throttling policy change.')
  ], zones(
    zone('chart', 'Live Checkout Stream', 'Order and checkout activity grouped from live records.', 'wide'),
    zone('kanban', 'Traffic State Board', 'Traffic events grouped by status for response.', 'side'),
    zone('ledger', 'Event Ledger', 'Inspectable event rows with per-record controls.', 'full')
  )),
  'ecommerce.health': workspace('Reliability Control Room', 'health', 'Health Check', [
    ...commonOps('Health Check'),
    sectionOp('run_audit', 'Run Health Audit', 'neutral', 'Record a service health audit.'),
    sectionOp('apply_policy', 'Apply Recovery Policy', 'success', 'Record a recovery policy update.')
  ], zones(
    zone('matrix', 'Service Health Matrix', 'Module and integration readiness by current state.', 'wide'),
    zone('chart', 'Health Score Rings', 'Readiness distribution generated from API records.', 'side'),
    zone('automation', 'Recovery Playbook', 'Recovery controls for failed or degraded components.', 'full')
  )),
  'ecommerce.performance': workspace('Performance Lab', 'lab', 'Performance Sample', [
    ...commonOps('Performance Sample'),
    sectionOp('purge_cache', 'Purge Slow Paths', 'neutral', 'Record a cache purge for slow storefront assets.'),
    sectionOp('run_audit', 'Run Speed Audit', 'neutral', 'Record a storefront performance audit.')
  ], zones(
    zone('chart', 'Latency and Conversion Curve', 'Performance signals derived from orders and records.', 'wide'),
    zone('settings', 'Optimization Controls', 'Speed, cache, image, and checkout tuning controls.', 'side'),
    zone('ledger', 'Performance Samples', 'Review samples and operator annotations.', 'full')
  )),
  'ecommerce.clusters': workspace('Cluster Analytics Bay', 'topology', 'Cluster', [
    ...commonOps('Cluster'),
    sectionOp('backup_cluster', 'Backup Cluster', 'success', 'Record a database or worker cluster backup.'),
    sectionOp('restore_snapshot', 'Restore Snapshot', 'danger', 'Record a controlled snapshot restore task.')
  ], zones(
    zone('matrix', 'Cluster Capacity Matrix', 'Database, worker, and route controls.', 'full'),
    zone('chart', 'Cluster Load View', 'Capacity chart generated from live module records.', 'wide'),
    zone('automation', 'Failover Tasks', 'Backup, restore, and failover operation queue.', 'side')
  )),

  'ecommerce.merchants': workspace('Merchant Lifecycle Desk', 'directory', 'Merchant', [
    ...commonOps('Merchant'),
    targetOp('merchant:', 'ban_merchant', 'Ban', 'danger', 'Block this merchant account.'),
    targetOp('merchant:', 'activate_merchant', 'Activate', 'success', 'Restore this merchant account.'),
    targetOp('merchant:', 'suspend_merchant', 'Suspend', 'danger', 'Suspend merchant operations.'),
    targetOp('merchant:', 'delete_merchant', 'Delete', 'danger', 'Soft-delete this merchant account.')
  ], zones(
    zone('entityGrid', 'Merchant Cards', 'Merchant accounts with ban, activate, and edit controls.', 'wide'),
    zone('kanban', 'Lifecycle Lanes', 'Merchants grouped by account status.', 'side'),
    zone('ledger', 'Merchant Tiwlo Team Ledger', 'Full merchant record management.', 'full')
  )),
  'ecommerce.stores': workspace('Store Deployment Operations', 'deployment', 'Store', [
    ...commonOps('Store'),
    targetOp('store:', 'transfer_store', 'Transfer', 'neutral', 'Queue or execute ownership transfer.'),
    targetOp('store:', 'close_store', 'Close', 'danger', 'Soft-close this storefront.'),
    targetOp('store:', 'delete_store', 'Delete', 'danger', 'Soft-delete this storefront.'),
    targetOp('store:', 'reopen_store', 'Reopen', 'success', 'Reopen this storefront.'),
    targetOp('store:', 'pause_store', 'Suspend', 'danger', 'Suspend this store.'),
    targetOp('store:', 'resume_store', 'Resume', 'success', 'Resume this store.')
  ], zones(
    zone('matrix', 'Deployment Matrix', 'Store provisioning, region, domain, and owner state.', 'wide'),
    zone('entityGrid', 'Store Control Cards', 'Store cards with transfer, close, suspend, and resume actions.', 'side'),
    zone('ledger', 'Deployment Ledger', 'Detailed store deployment rows.', 'full')
  )),
  'ecommerce.kyc': workspace('Identity Review Queue', 'risk', 'KYC Case', [
    ...commonOps('KYC Case'),
    targetOp('merchant:', 'approve_kyc', 'Approve', 'success', 'Record KYC approval for this merchant.'),
    targetOp('merchant:', 'reject_kyc', 'Reject', 'danger', 'Record KYC rejection for this merchant.'),
    targetOp('merchant:', 'ban_merchant', 'Ban', 'danger', 'Ban a risky merchant.'),
    targetOp('merchant:', 'delete_merchant', 'Delete', 'danger', 'Soft-delete a fraudulent merchant.')
  ], zones(
    zone('kanban', 'Verification Lanes', 'Review, approved, rejected, and risky merchants.', 'wide'),
    zone('settings', 'Risk Rules', 'Identity, document, and payout risk controls.', 'side'),
    zone('ledger', 'KYC Evidence Ledger', 'KYC notes and operator records.', 'full')
  )),
  'ecommerce.segments': workspace('Client Segmentation Studio', 'cohort', 'Segment', [
    ...commonOps('Segment'),
    sectionOp('sync_feed', 'Sync Audiences', 'neutral', 'Record audience sync for lifecycle channels.'),
    sectionOp('apply_policy', 'Apply Cohort Rule', 'success', 'Record a cohort rule change.')
  ], zones(
    zone('chart', 'Cohort Movement', 'Segment distribution from merchant and store records.', 'wide'),
    zone('matrix', 'Segment Rule Matrix', 'Retention, growth, and risk segment definitions.', 'side'),
    zone('entityGrid', 'Segment Members', 'Current entities inside this segment module.', 'full')
  )),
  'ecommerce.groups': workspace('Merchant Group Console', 'org', 'Group', [
    ...commonOps('Group'),
    sectionOp('apply_policy', 'Apply Group Policy', 'success', 'Record organization policy changes.'),
    targetOp('merchant:', 'suspend_merchant', 'Suspend Owner', 'danger', 'Suspend a merchant owner from a group.')
  ], zones(
    zone('matrix', 'Ownership Structure', 'Merchant hierarchy and grouped account state.', 'wide'),
    zone('kanban', 'Group Review Lanes', 'Owners grouped by current status.', 'side'),
    zone('ledger', 'Group Ledger', 'Group records and ownership notes.', 'full')
  )),
  'ecommerce.partners': workspace('Partner Portal Manager', 'partner', 'Partner', [
    ...commonOps('Partner'),
    sectionOp('generate_partner_link', 'Generate Link', 'primary', 'Create a tracked partner portal or referral link.'),
    sectionOp('sync_partner_catalog', 'Sync Catalog', 'neutral', 'Refresh partner products, plans, and eligible tenant offers.'),
    sectionOp('rebuild_partner_portal', 'Rebuild Portal', 'neutral', 'Rebuild public partner pages, assets, and routing manifests.'),
    sectionOp('settle_payout', 'Settle Partner Payout', 'success', 'Record partner settlement.'),
    sectionOp('apply_policy', 'Update Commission Rule', 'neutral', 'Record partner commission rule update.'),
    sectionOp('rotate_partner_key', 'Rotate Partner Key', 'danger', 'Rotate partner API keys and webhook signing secrets.'),
    targetOp('merchant:', 'approve_partner', 'Approve', 'success', 'Approve this merchant as an active partner.'),
    targetOp('merchant:', 'suspend_partner', 'Suspend', 'danger', 'Suspend this partner portal account.')
  ], zones(
    zone('functionCatalog', 'Partner Function Catalog', 'Portal, payout, webhook, link, fraud, and reseller functions.', 'full'),
    zone('entityGrid', 'Partner Accounts', 'Partner and reseller account cards.', 'wide'),
    zone('settings', 'Portal Settings', 'Access, link tracking, webhook, payout, and approval controls.', 'side'),
    zone('matrix', 'Commission and Access Matrix', 'Tier, region, split, key, and routing status.', 'wide'),
    zone('chart', 'Partner Contribution', 'Partner record distribution and activity.', 'side'),
    zone('ledger', 'Partner Ledger', 'Partner operations, edits, and notes.', 'full')
  )),

  'ecommerce.revenue': workspace('Revenue Stream Desk', 'money', 'Revenue Stream', [
    ...commonOps('Revenue Stream'),
    sectionOp('settle_payout', 'Settle Revenue Share', 'success', 'Record a settlement or payout run.'),
    targetOp('invoice:', 'mark_invoice_paid', 'Mark Paid', 'success', 'Mark selected invoice as paid.')
  ], zones(
    zone('chart', 'Revenue Flow Chart', 'Paid order and invoice movement.', 'wide'),
    zone('ledger', 'Revenue Ledger', 'Revenue, invoice, and order rows.', 'side'),
    zone('matrix', 'Stream Allocation', 'Subscription, transaction, app, and theme revenue buckets.', 'full')
  )),
  'ecommerce.plans': workspace('Subscription Plan Builder', 'plans', 'Plan', [
    ...commonOps('Plan'),
    targetOp('plan:', 'activate_plan', 'Activate', 'success', 'Publish selected plan.'),
    targetOp('plan:', 'disable_plan', 'Disable', 'danger', 'Disable selected plan.')
  ], zones(
    zone('entityGrid', 'Plan Cards', 'Plan price, interval, limits, and publish state.', 'wide'),
    zone('settings', 'Feature Limit Editor', 'Plan limit and feature policy controls.', 'side'),
    zone('ledger', 'Plan Ledger', 'Plan edit and delete controls.', 'full')
  )),
  'ecommerce.invoices': workspace('Invoicing Operations Core', 'billing', 'Invoice', [
    ...commonOps('Invoice'),
    targetOp('invoice:', 'retry_invoice', 'Retry', 'neutral', 'Queue collection retry for invoice.'),
    targetOp('invoice:', 'mark_invoice_paid', 'Mark Paid', 'success', 'Mark selected invoice paid.'),
    targetOp('invoice:', 'void_invoice', 'Void', 'danger', 'Void selected invoice.')
  ], zones(
    zone('ledger', 'Invoice Work Queue', 'Invoice rows with retry and payment controls.', 'wide'),
    zone('chart', 'Payment Risk Chart', 'Open, paid, and pending invoice distribution.', 'side'),
    zone('automation', 'Dunning Automation', 'Reminder, retry, tax, and write-off tasks.', 'full')
  )),
  'ecommerce.usage': workspace('Usage Meter Control', 'metering', 'Meter', [
    ...commonOps('Meter'),
    sectionOp('sync_feed', 'Recalculate Usage', 'neutral', 'Record usage rollup recalculation.'),
    sectionOp('apply_policy', 'Apply Quota Policy', 'success', 'Record usage quota policy update.')
  ], zones(
    zone('chart', 'Usage Meter Stream', 'Products, orders, storage, and traffic meters.', 'wide'),
    zone('matrix', 'Quota Controls', 'Quota thresholds and overage settings.', 'side'),
    zone('ledger', 'Usage Ledger', 'Meter records and annotations.', 'full')
  )),
  'ecommerce.cycles': workspace('Billing Cycle Scheduler', 'calendar', 'Billing Cycle', [
    ...commonOps('Billing Cycle'),
    sectionOp('apply_policy', 'Update Grace Rule', 'neutral', 'Record grace-period and retry policy update.'),
    sectionOp('sync_feed', 'Run Cycle Preview', 'primary', 'Record billing cycle preview.')
  ], zones(
    zone('kanban', 'Cycle Lanes', 'Queued, active, retry, and failed billing windows.', 'wide'),
    zone('settings', 'Retry and Grace Settings', 'Cycle retry and grace period controls.', 'side'),
    zone('chart', 'Renewal Pressure', 'Cycle pressure generated from records.', 'full')
  )),
  'ecommerce.taxes': workspace('Tax Engine Console', 'tax', 'Tax Rule', [
    ...commonOps('Tax Rule'),
    sectionOp('apply_policy', 'Apply Tax Rule', 'success', 'Record tax rule publication.'),
    sectionOp('run_audit', 'Audit Tax Lines', 'neutral', 'Record tax-line audit.')
  ], zones(
    zone('settings', 'Tax Rule Builder', 'VAT, GST, inclusive tax, and invoice rule controls.', 'wide'),
    zone('matrix', 'Region Matrix', 'Tax regions and status mapping.', 'side'),
    zone('ledger', 'Tax Rule Ledger', 'Tax records and evidence notes.', 'full')
  )),

  'ecommerce.campaigns': workspace('Campaign Manager Studio', 'growth', 'Campaign', [
    ...commonOps('Campaign'),
    sectionOp('create_campaign', 'Create Campaign', 'primary', 'Record a new campaign launch task.'),
    sectionOp('send_broadcast', 'Send Broadcast', 'neutral', 'Record merchant/customer broadcast task.')
  ], zones(
    zone('chart', 'Campaign Performance', 'Campaign distribution and active records.', 'wide'),
    zone('automation', 'Campaign Automation', 'Audience, offer, schedule, and channel tasks.', 'side'),
    zone('kanban', 'Campaign Pipeline', 'Campaigns grouped by status.', 'full')
  )),
  'ecommerce.seo': workspace('SEO Operations Platform', 'search', 'SEO Item', [
    ...commonOps('SEO Item'),
    sectionOp('rebuild_index', 'Rebuild Index', 'primary', 'Record search index rebuild.'),
    sectionOp('sync_feed', 'Sync Sitemap', 'neutral', 'Record sitemap sync.')
  ], zones(
    zone('matrix', 'SEO Rules', 'Sitemap, redirect, canonical, and meta controls.', 'wide'),
    zone('chart', 'Index Health', 'SEO records grouped from API data.', 'side'),
    zone('ledger', 'SEO Ledger', 'SEO tasks, edits, and delete controls.', 'full')
  )),
  'ecommerce.affiliates': workspace('Affiliate Engine Desk', 'affiliate', 'Affiliate', [
    ...commonOps('Affiliate'),
    sectionOp('settle_payout', 'Settle Affiliate Payouts', 'success', 'Record affiliate payout settlement.'),
    sectionOp('apply_policy', 'Apply Fraud Rule', 'danger', 'Record affiliate fraud control update.')
  ], zones(
    zone('entityGrid', 'Affiliate Cards', 'Affiliate and partner entities.', 'wide'),
    zone('chart', 'Commission Split', 'Affiliate distribution from records.', 'side'),
    zone('ledger', 'Affiliate Ledger', 'Payout, edit, and delete controls.', 'full')
  )),
  'ecommerce.email': workspace('Email Automation Desk', 'mail', 'Automation', [
    ...commonOps('Automation'),
    sectionOp('send_broadcast', 'Send Broadcast', 'primary', 'Record email broadcast.'),
    sectionOp('sync_feed', 'Sync Templates', 'neutral', 'Record template sync.')
  ], zones(
    zone('automation', 'Trigger Builder', 'Lifecycle triggers and delivery workflow.', 'wide'),
    zone('chart', 'Delivery Health', 'Email automation record distribution.', 'side'),
    zone('ledger', 'Email Automation Ledger', 'Templates, edits, and deletes.', 'full')
  )),
  'ecommerce.social': workspace('Social Channel Control', 'social', 'Channel', [
    ...commonOps('Channel'),
    sectionOp('sync_feed', 'Sync Product Feed', 'primary', 'Record social product-feed sync.'),
    sectionOp('apply_policy', 'Apply Channel Rule', 'neutral', 'Record social channel policy update.')
  ], zones(
    zone('matrix', 'Channel Sync Matrix', 'Facebook, Instagram, TikTok, and Google feed controls.', 'wide'),
    zone('kanban', 'Feed Status Lanes', 'Feed records grouped by status.', 'side'),
    zone('ledger', 'Social Channel Ledger', 'Channel records and operator edits.', 'full')
  )),

  'ecommerce.databases': workspace('Database Cluster Manager', 'db', 'DB Cluster', [
    ...commonOps('DB Cluster'),
    sectionOp('backup_cluster', 'Backup Cluster', 'success', 'Record database backup.'),
    sectionOp('restore_snapshot', 'Restore Snapshot', 'danger', 'Record restore workflow.')
  ], zones(
    zone('matrix', 'Database Cluster Grid', 'Primary, replica, backup, and restore state.', 'wide'),
    zone('chart', 'Storage and Load', 'Cluster load from API records.', 'side'),
    zone('automation', 'Backup Automation', 'Backup, restore, retention, and validation tasks.', 'full')
  )),
  'ecommerce.storage': workspace('Storage Pool Manager', 'storage', 'Storage Pool', [
    ...commonOps('Storage Pool'),
    sectionOp('apply_policy', 'Apply Quota Rule', 'success', 'Record storage quota policy.'),
    sectionOp('restore_snapshot', 'Restore Archive', 'neutral', 'Record archive restore.')
  ], zones(
    zone('chart', 'Storage Pressure', 'Storage usage distribution.', 'wide'),
    zone('settings', 'Quota and Retention', 'Media, invoice, backup, and archive settings.', 'side'),
    zone('ledger', 'Storage Pool Ledger', 'Storage records and controls.', 'full')
  )),
  'ecommerce.cdn': workspace('Asset CDN Console', 'cdn', 'CDN Rule', [
    ...commonOps('CDN Rule'),
    sectionOp('purge_cache', 'Purge Cache', 'primary', 'Record cache purge.'),
    sectionOp('apply_policy', 'Apply Edge Rule', 'neutral', 'Record CDN routing rule update.')
  ], zones(
    zone('chart', 'Cache Hit and Edge Health', 'CDN signal chart from records.', 'wide'),
    zone('automation', 'Purge Workbench', 'Purge, prewarm, image transform, and invalidation tasks.', 'side'),
    zone('ledger', 'CDN Operation Ledger', 'CDN records and edits.', 'full')
  )),
  'ecommerce.domains': workspace('Store Domain Console', 'domains', 'Domain', [
    ...commonOps('Domain'),
    sectionOp('sync_feed', 'Sync Registrar', 'neutral', 'Record registrar sync.'),
    sectionOp('renew_ssl', 'Queue SSL Renewal', 'success', 'Record certificate renewal for mapped domains.')
  ], zones(
    zone('entityGrid', 'Domain Cards', 'Mapped store domains and DNS state.', 'wide'),
    zone('matrix', 'DNS Rule Matrix', 'A, CNAME, MX, and validation controls.', 'side'),
    zone('ledger', 'Domain Ledger', 'Domain edit and delete controls.', 'full')
  )),
  'ecommerce.nodes': workspace('Edge Node Router', 'edge', 'Edge Node', [
    ...commonOps('Edge Node'),
    sectionOp('apply_policy', 'Apply Route Policy', 'success', 'Record route policy change.'),
    sectionOp('sync_feed', 'Sync Edge Nodes', 'neutral', 'Record edge-node sync.')
  ], zones(
    zone('matrix', 'Edge Route Map', 'Ingress, regional routing, and failover controls.', 'wide'),
    zone('chart', 'Node Load', 'Edge node load distribution.', 'side'),
    zone('kanban', 'Node State Lanes', 'Nodes grouped by status.', 'full')
  )),
  'ecommerce.ssl': workspace('SSL Certificate Manager', 'ssl', 'Certificate', [
    ...commonOps('Certificate'),
    sectionOp('renew_ssl', 'Renew SSL', 'success', 'Record certificate renewal.'),
    sectionOp('run_audit', 'Audit Expiry', 'neutral', 'Record certificate expiry audit.')
  ], zones(
    zone('kanban', 'Certificate Queue', 'Pending, active, failed, and renewal certificates.', 'wide'),
    zone('settings', 'Validation Controls', 'HTTP, DNS, wildcard, and auto-renew settings.', 'side'),
    zone('ledger', 'SSL Ledger', 'Certificate records and delete controls.', 'full')
  )),

  'ecommerce.themes': workspace('Theme Directory Admin', 'themes', 'Theme', [
    ...commonOps('Theme'),
    targetOp('theme:', 'publish_theme', 'Publish', 'success', 'Publish selected theme.'),
    targetOp('theme:', 'unpublish_theme', 'Unpublish', 'danger', 'Unpublish selected theme.'),
    targetOp('theme:', 'delete_theme', 'Delete', 'danger', 'Soft-delete selected theme.')
  ], zones(
    zone('entityGrid', 'Theme Gallery', 'Installed tenant themes with publish controls.', 'wide'),
    zone('chart', 'Theme Adoption', 'Theme adoption chart from records.', 'side'),
    zone('ledger', 'Theme Review Ledger', 'Theme records and edits.', 'full')
  )),
  'ecommerce.apps': workspace('Extension Hub Admin', 'extensions', 'Extension', [
    ...commonOps('Extension'),
    targetOp('plugin:', 'enable_plugin', 'Enable', 'success', 'Enable selected extension.'),
    targetOp('plugin:', 'disable_plugin', 'Disable', 'danger', 'Disable selected extension.'),
    targetOp('plugin:', 'delete_plugin', 'Delete', 'danger', 'Soft-delete selected extension.'),
    sectionOp('review_app', 'Review App', 'neutral', 'Record app review workflow.')
  ], zones(
    zone('entityGrid', 'Extension Cards', 'Installed apps and plugins with enable controls.', 'wide'),
    zone('settings', 'App Permission Rules', 'Scopes, billing, webhook, and privacy controls.', 'side'),
    zone('ledger', 'Extension Ledger', 'Extension records and actions.', 'full')
  )),
  'ecommerce.shares': workspace('Revenue Share Settlement', 'shares', 'Share Rule', [
    ...commonOps('Share Rule'),
    sectionOp('settle_payout', 'Settle Payouts', 'success', 'Record marketplace payout settlement.'),
    sectionOp('apply_policy', 'Apply Split Rule', 'neutral', 'Record revenue split rule update.')
  ], zones(
    zone('chart', 'Share Allocation', 'Partner, developer, and platform share distribution.', 'wide'),
    zone('ledger', 'Settlement Ledger', 'Payout and split records.', 'side'),
    zone('matrix', 'Split Rule Matrix', 'Theme, app, affiliate, and platform split controls.', 'full')
  )),
  'ecommerce.dev-portal': workspace('Developer Portal Review', 'developer', 'Developer App', [
    ...commonOps('Developer App'),
    sectionOp('review_app', 'Review App', 'primary', 'Record developer app review.'),
    sectionOp('rotate_secret', 'Rotate Sandbox Secret', 'danger', 'Record sandbox credential rotation.')
  ], zones(
    zone('kanban', 'App Review Pipeline', 'Submitted, review, approved, and rejected apps.', 'wide'),
    zone('settings', 'Developer Access Rules', 'Sandbox, scopes, webhooks, and app-store policies.', 'side'),
    zone('ledger', 'Developer Ledger', 'Developer records and API notes.', 'full')
  )),

  'ecommerce.support': workspace('Merchant Support Console', 'support', 'Support Case', [
    ...commonOps('Support Case'),
    sectionOp('apply_policy', 'Apply SLA Policy', 'neutral', 'Record support SLA policy update.'),
    sectionOp('send_broadcast', 'Message Merchants', 'primary', 'Record support broadcast.')
  ], zones(
    zone('kanban', 'Support SLA Lanes', 'Open, pending, and resolved cases.', 'wide'),
    zone('timeline', 'Support Activity', 'Recent support and notification activity.', 'side'),
    zone('ledger', 'Support Case Ledger', 'Support cases with edit/delete controls.', 'full')
  )),
  'ecommerce.alerts': workspace('Global Alert Center', 'alerts', 'Alert', [
    ...commonOps('Alert'),
    sectionOp('mark_alerts_read', 'Resolve All', 'success', 'Mark unread commerce alerts as read.'),
    targetOp('notification:', 'resolve_alert', 'Resolve Alert', 'success', 'Resolve selected alert.')
  ], zones(
    zone('kanban', 'Incident Board', 'Unread, open, and resolved alert lanes.', 'wide'),
    zone('chart', 'Alert Distribution', 'Alert counts grouped by state.', 'side'),
    zone('ledger', 'Alert Ledger', 'Alert records and controls.', 'full')
  )),
  'ecommerce.security': workspace('Security Policy Console', 'security', 'Security Policy', [
    ...commonOps('Security Policy'),
    sectionOp('apply_policy', 'Apply Security Policy', 'success', 'Record security policy publication.'),
    targetOp('credential:', 'revoke_api_credential', 'Revoke Key', 'danger', 'Revoke selected API credential.')
  ], zones(
    zone('settings', 'Auth and Scope Policy', 'MFA, checkout security, app scope, and session controls.', 'wide'),
    zone('matrix', 'Risk Surface Matrix', 'Credentials, merchant status, plugins, and alerts.', 'side'),
    zone('ledger', 'Security Ledger', 'Security records and revoke controls.', 'full')
  )),
  'ecommerce.compliance': workspace('Compliance Evidence Hub', 'compliance', 'Evidence', [
    ...commonOps('Evidence'),
    sectionOp('run_audit', 'Run Compliance Audit', 'primary', 'Record compliance evidence audit.'),
    sectionOp('approve_kyc', 'Approve Evidence', 'success', 'Record evidence approval.')
  ], zones(
    zone('matrix', 'Evidence Matrix', 'KYC, PCI, privacy, retention, and audit evidence.', 'wide'),
    zone('kanban', 'Compliance Gaps', 'Evidence grouped by readiness.', 'side'),
    zone('ledger', 'Compliance Ledger', 'Compliance records and operator edits.', 'full')
  )),
  'ecommerce.audits': workspace('Audit Trail Investigator', 'audit', 'Audit Event', [
    ...commonOps('Audit Event'),
    sectionOp('run_audit', 'Run Audit Sweep', 'primary', 'Record a commerce audit sweep.'),
    sectionOp('apply_policy', 'Flag Sensitive Events', 'neutral', 'Record sensitive event policy update.')
  ], zones(
    zone('timeline', 'Audit Timeline', 'Recent commerce actions and sensitive changes.', 'wide'),
    zone('chart', 'Action Distribution', 'Audit event chart generated from API records.', 'side'),
    zone('ledger', 'Audit Event Ledger', 'Audit event records and exports.', 'full')
  )),

  'ecommerce.api': workspace('API and Webhook Control', 'api', 'API Credential', [
    ...commonOps('API Credential'),
    sectionOp('rotate_secret', 'Rotate Secret', 'danger', 'Record API or webhook secret rotation.'),
    targetOp('credential:', 'revoke_api_credential', 'Revoke Key', 'danger', 'Revoke selected credential.')
  ], zones(
    zone('entityGrid', 'Credential Cards', 'API keys, webhooks, owners, and scopes.', 'wide'),
    zone('settings', 'Webhook Delivery Rules', 'Retry, signing, timeout, and scope controls.', 'side'),
    zone('ledger', 'API Ledger', 'API records and revoke controls.', 'full')
  )),
  'ecommerce.translations': workspace('Translation Hub Manager', 'locale', 'Locale', [
    ...commonOps('Locale'),
    sectionOp('sync_translation', 'Sync Translations', 'primary', 'Record translation sync.'),
    sectionOp('apply_policy', 'Publish Locale Rule', 'success', 'Record locale publication policy.')
  ], zones(
    zone('matrix', 'Locale Coverage Matrix', 'Language, currency, fallback, and publish controls.', 'wide'),
    zone('chart', 'Coverage Chart', 'Locale record distribution.', 'side'),
    zone('ledger', 'Translation Ledger', 'Translation tasks and edits.', 'full')
  )),
  'ecommerce.fields': workspace('Custom Field Schema Studio', 'schema', 'Field', [
    ...commonOps('Field'),
    sectionOp('apply_policy', 'Publish Schema', 'success', 'Record custom-field schema publication.'),
    sectionOp('run_audit', 'Audit Required Fields', 'neutral', 'Record required-field audit.')
  ], zones(
    zone('settings', 'Field Builder', 'Product, order, customer, and merchant custom field controls.', 'wide'),
    zone('matrix', 'Schema Matrix', 'Field type, validation, visibility, and required-state matrix.', 'side'),
    zone('ledger', 'Custom Field Ledger', 'Field records and delete controls.', 'full')
  )),
  'ecommerce.mobile': workspace('Mobile Configuration Desk', 'mobile', 'Mobile Flag', [
    ...commonOps('Mobile Flag'),
    sectionOp('publish_mobile_config', 'Publish Config', 'primary', 'Record mobile config publication.'),
    sectionOp('rotate_secret', 'Rotate Push Secret', 'danger', 'Record push-provider secret rotation.')
  ], zones(
    zone('settings', 'Mobile Release Controls', 'Release channel, push, checkout, and feature flag controls.', 'wide'),
    zone('chart', 'Feature Flag Distribution', 'Mobile flag chart from records.', 'side'),
    zone('ledger', 'Mobile Config Ledger', 'Mobile config records and edits.', 'full')
  )),
  'ecommerce.settings': workspace('Platform Settings Console', 'settings', 'Setting', [
    ...commonOps('Setting'),
    sectionOp('apply_policy', 'Apply Platform Policy', 'success', 'Record platform settings policy update.'),
    sectionOp('run_audit', 'Audit Tenant Defaults', 'neutral', 'Record tenant-default audit.')
  ], zones(
    zone('settings', 'Tenant Default Controls', 'Default plan, region, checkout, credit, and provisioning settings.', 'wide'),
    zone('matrix', 'Policy Matrix', 'Automation, billing, security, and tenant limits.', 'side'),
    zone('ledger', 'Platform Settings Ledger', 'Setting records and edits.', 'full')
  ))
};

export function getModuleWorkspace(sectionKey: string) {
  return withFunctionCatalog(MODULE_WORKSPACES[sectionKey] || MODULE_WORKSPACES['ecommerce.global-insight']);
}
