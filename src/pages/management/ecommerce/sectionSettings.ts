const settings = (...items: string[]) => items;

const SECTION_SETTINGS: Record<string, string[]> = {
  'ecommerce.global-insight': settings('Show cross-tenant revenue signals', 'Flag stores with falling GMV', 'Include risk and support signals', 'Require Tiwlo Team review before executive export', 'Sync dashboard to merchant health'),
  'ecommerce.live-traffic': settings('Enable live checkout stream', 'Auto-throttle suspicious spikes', 'Alert on payment failure bursts', 'Group traffic by store owner', 'Keep raw event samples for audit'),
  'ecommerce.health': settings('Monitor store jobs and queues', 'Auto-create incident records', 'Escalate degraded integrations', 'Require recovery owner', 'Attach runbook to failed checks'),
  'ecommerce.performance': settings('Track tenant storefront vitals', 'Auto-suggest CDN purges', 'Flag slow checkout routes', 'Apply image optimization defaults', 'Notify owners for repeated slowdowns'),
  'ecommerce.clusters': settings('Track DB and worker capacity', 'Require approval for restores', 'Keep failover audit notes', 'Alert before capacity exhaustion', 'Sync cluster state to store status'),
  'ecommerce.merchants': settings('Allow merchant account suspension', 'Require note for bans', 'Show owner credit status', 'Sync account state to stores', 'Notify support on high-risk merchants'),
  'ecommerce.stores': settings('Allow tenant store suspension', 'Require owner review for transfers', 'Auto-check DNS and SSL', 'Pause checkout on empty credit', 'Keep deployment audit trail'),
  'ecommerce.kyc': settings('Require identity review before payouts', 'Escalate high-risk documents', 'Lock store transfer during review', 'Notify risk team on rejection', 'Keep KYC evidence history'),
  'ecommerce.segments': settings('Sync segments to campaigns', 'Include churn-risk merchants', 'Refresh cohorts daily', 'Allow manual segment overrides', 'Audit audience exports'),
  'ecommerce.groups': settings('Share billing across group stores', 'Restrict owner-level changes', 'Apply group policy to new stores', 'Require Tiwlo Team approval for merges', 'Show group hierarchy in records'),
  'ecommerce.partners': settings('Enable partner portal access', 'Track referral links and webhooks', 'Hold payout until approval', 'Rotate partner keys on demand', 'Audit commission rule changes'),
  'ecommerce.revenue': settings('Show subscription and fee revenue', 'Hold suspicious settlements', 'Group revenue by merchant/store', 'Export finance-ready records', 'Audit payout changes'),
  'ecommerce.plans': settings('Publish plan changes to stores', 'Require approval for price changes', 'Enforce product and staff limits', 'Allow grandfathered plans', 'Audit feature limit edits'),
  'ecommerce.invoices': settings('Retry failed merchant invoices', 'Mark stores at risk on overdue invoices', 'Send dunning notices', 'Allow manual paid override', 'Audit voided invoices'),
  'ecommerce.usage': settings('Meter orders, storage, domains, and bandwidth', 'Warn before quota overage', 'Block over-limit provisioning', 'Recalculate usage nightly', 'Audit manual meter edits'),
  'ecommerce.cycles': settings('Run renewal previews', 'Apply grace periods', 'Pause stores after final retry', 'Notify merchants before renewal', 'Audit cycle rule changes'),
  'ecommerce.taxes': settings('Apply regional tax rules', 'Validate invoice tax lines', 'Allow tax exemptions after review', 'Sync tax settings to checkout', 'Audit tax rule changes'),
  'ecommerce.campaigns': settings('Target merchants by segment', 'Require approval for broadcasts', 'Track conversion by store', 'Pause risky campaigns', 'Audit campaign launches'),
  'ecommerce.seo': settings('Rebuild store sitemaps', 'Validate canonical URLs', 'Track indexing errors', 'Sync redirects to CDN', 'Audit SEO changes'),
  'ecommerce.affiliates': settings('Track affiliate attribution', 'Hold suspicious payouts', 'Apply fraud rules', 'Sync affiliate links to partner portal', 'Audit payout approvals'),
  'ecommerce.email': settings('Enable lifecycle automations', 'Require approval for bulk sends', 'Track sender health', 'Retry failed delivery jobs', 'Audit template changes'),
  'ecommerce.social': settings('Sync product feeds', 'Pause rejected products', 'Track connected channels', 'Require approval for catalog pushes', 'Audit feed changes'),
  'ecommerce.databases': settings('Backup commerce databases', 'Require approval for restore', 'Monitor replica lag', 'Attach store impact notes', 'Audit maintenance windows'),
  'ecommerce.storage': settings('Enforce media storage quotas', 'Archive old invoice files', 'Alert on pool pressure', 'Block uploads on overage', 'Audit retention changes'),
  'ecommerce.cdn': settings('Allow cache purge', 'Prewarm high-traffic stores', 'Apply image transform defaults', 'Alert on edge errors', 'Audit purge requests'),
  'ecommerce.domains': settings('Verify DNS before activation', 'Queue SSL after domain mapping', 'Track registrar sync', 'Block unsafe custom domains', 'Audit domain ownership changes'),
  'ecommerce.nodes': settings('Route only active tenant stores', 'Enable regional failover', 'Drain nodes before maintenance', 'Alert on route pressure', 'Audit edge policy changes'),
  'ecommerce.ssl': settings('Auto-renew certificates', 'Retry failed validation', 'Alert before expiry', 'Require review for wildcard certs', 'Audit certificate changes'),
  'ecommerce.themes': settings('Require review before publishing', 'Allow default theme assignment', 'Track installs per store', 'Disable risky themes', 'Audit theme releases'),
  'ecommerce.apps': settings('Require app scope review', 'Allow extension disable per store', 'Track install health', 'Block risky permissions', 'Audit app marketplace changes'),
  'ecommerce.shares': settings('Apply marketplace split rules', 'Hold settlement on disputes', 'Track developer and partner shares', 'Require approval for split edits', 'Audit payout runs'),
  'ecommerce.dev-portal': settings('Enable sandbox apps', 'Require app review before publish', 'Rotate developer secrets', 'Track webhook delivery', 'Audit developer access changes'),
  'ecommerce.support': settings('Track merchant SLA', 'Auto-escalate urgent cases', 'Show store billing context', 'Allow merchant broadcasts', 'Audit support ownership changes'),
  'ecommerce.alerts': settings('Resolve platform alerts', 'Notify affected merchants', 'Group incidents by store impact', 'Require owner for critical alerts', 'Audit alert resolution'),
  'ecommerce.security': settings('Require MFA for sensitive actions', 'Review API scopes', 'Block suspicious checkout changes', 'Rotate compromised credentials', 'Audit policy updates'),
  'ecommerce.compliance': settings('Track KYC and PCI evidence', 'Alert on evidence gaps', 'Require reviewer approval', 'Export audit package', 'Audit compliance changes'),
  'ecommerce.audits': settings('Log sensitive admin actions', 'Flag store and payout changes', 'Keep immutable audit history', 'Export investigation records', 'Alert on unusual actor patterns'),
  'ecommerce.api': settings('Sign webhook deliveries', 'Retry failed webhooks', 'Rotate API secrets', 'Restrict credential scopes', 'Audit API access changes'),
  'ecommerce.translations': settings('Publish locale changes per store', 'Require fallback locale', 'Track translation coverage', 'Sync currency copy', 'Audit locale publishing'),
  'ecommerce.fields': settings('Validate custom field schema', 'Require review for required fields', 'Sync fields to storefront forms', 'Block unsafe field changes', 'Audit schema publishing'),
  'ecommerce.mobile': settings('Control mobile release channels', 'Sync push provider settings', 'Gate mobile checkout flags', 'Rotate push secrets', 'Audit config publishing'),
  'ecommerce.settings': settings('Apply tenant defaults', 'Require approval for global policy', 'Sync settings to new stores', 'Lock dangerous platform flags', 'Audit platform changes')
};

export function getSectionSettings(sectionKey: string, noun: string) {
  return SECTION_SETTINGS[sectionKey] || settings(
    `Enable ${noun.toLowerCase()} automation`,
    'Require approval before destructive changes',
    'Notify Tiwlo Team on high-risk changes',
    `Keep audit trail for ${noun.toLowerCase()} edits`,
    'Sync changes to tenant modules'
  );
}
