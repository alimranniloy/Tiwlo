import {
  Activity,
  BarChart3,
  Bell,
  Blocks,
  CreditCard,
  Database,
  FileCode2,
  FileText,
  Globe,
  Languages,
  Layers,
  LineChart,
  Lock,
  Mail,
  Map,
  Megaphone,
  MonitorSmartphone,
  Network,
  Puzzle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  Users,
  Webhook,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SectionLayout =
  | 'insight'
  | 'traffic'
  | 'health'
  | 'directory'
  | 'billing'
  | 'marketing'
  | 'infrastructure'
  | 'marketplace'
  | 'governance'
  | 'advanced';

export type SectionVisual = 'area' | 'bar' | 'line' | 'pie' | 'radial' | 'composed';

export type EcommerceSectionBlueprint = {
  icon: LucideIcon;
  layout: SectionLayout;
  visual: SectionVisual;
  accent: string;
  focus: string;
  noun: string;
  primaryPanel: string;
  secondaryPanel: string;
  recordTitle: string;
  commandLabel: string;
};

const accents = {
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  zinc: 'border-zinc-200 bg-zinc-50 text-zinc-700'
};

export const DEFAULT_BLUEPRINT: EcommerceSectionBlueprint = {
  icon: Activity,
  layout: 'insight',
  visual: 'area',
  accent: accents.indigo,
  focus: 'Commerce operations',
  noun: 'record',
  primaryPanel: 'Operational Signal',
  secondaryPanel: 'Control Queue',
  recordTitle: 'Operational Records',
  commandLabel: 'Control Actions'
};

export const ECOMMERCE_SECTION_BLUEPRINTS: Record<string, EcommerceSectionBlueprint> = {
  'ecommerce.global-insight': { icon: BarChart3, layout: 'insight', visual: 'area', accent: accents.indigo, focus: 'Platform intelligence', noun: 'signal', primaryPanel: 'Revenue and Tenant Pulse', secondaryPanel: 'Executive Watchlist', recordTitle: 'Insight Records', commandLabel: 'Intelligence Controls' },
  'ecommerce.live-traffic': { icon: Activity, layout: 'traffic', visual: 'bar', accent: accents.cyan, focus: 'Realtime storefront flow', noun: 'event', primaryPanel: 'Traffic Stream', secondaryPanel: 'Checkout Pressure', recordTitle: 'Traffic Events', commandLabel: 'Traffic Controls' },
  'ecommerce.health': { icon: ShieldCheck, layout: 'health', visual: 'radial', accent: accents.emerald, focus: 'Service readiness', noun: 'service', primaryPanel: 'Health Matrix', secondaryPanel: 'Recovery Runbook', recordTitle: 'Health Checks', commandLabel: 'Reliability Controls' },
  'ecommerce.performance': { icon: Zap, layout: 'health', visual: 'line', accent: accents.amber, focus: 'Speed and conversion quality', noun: 'metric', primaryPanel: 'Performance Lab', secondaryPanel: 'Latency Watch', recordTitle: 'Performance Samples', commandLabel: 'Optimization Controls' },
  'ecommerce.clusters': { icon: Database, layout: 'infrastructure', visual: 'radial', accent: accents.slate, focus: 'Cluster capacity', noun: 'cluster', primaryPanel: 'Cluster Topology', secondaryPanel: 'Replica and Worker State', recordTitle: 'Cluster Assets', commandLabel: 'Cluster Controls' },

  'ecommerce.merchants': { icon: Users, layout: 'directory', visual: 'bar', accent: accents.indigo, focus: 'Merchant accounts', noun: 'merchant', primaryPanel: 'Merchant Ledger', secondaryPanel: 'Account Review', recordTitle: 'Merchant Directory', commandLabel: 'Merchant Controls' },
  'ecommerce.stores': { icon: Store, layout: 'directory', visual: 'pie', accent: accents.emerald, focus: 'Tenant deployments', noun: 'store', primaryPanel: 'Deployment Board', secondaryPanel: 'Provisioning State', recordTitle: 'Store Deployments', commandLabel: 'Deployment Controls' },
  'ecommerce.kyc': { icon: ShieldCheck, layout: 'governance', visual: 'pie', accent: accents.amber, focus: 'Identity verification', noun: 'case', primaryPanel: 'KYC Queue', secondaryPanel: 'Risk Notes', recordTitle: 'Verification Cases', commandLabel: 'KYC Controls' },
  'ecommerce.segments': { icon: Tags, layout: 'directory', visual: 'composed', accent: accents.violet, focus: 'Client cohorts', noun: 'segment', primaryPanel: 'Segment Grid', secondaryPanel: 'Cohort Movement', recordTitle: 'Segment Records', commandLabel: 'Segmentation Controls' },
  'ecommerce.groups': { icon: Layers, layout: 'directory', visual: 'bar', accent: accents.slate, focus: 'Merchant hierarchy', noun: 'group', primaryPanel: 'Group Structure', secondaryPanel: 'Ownership Review', recordTitle: 'Merchant Groups', commandLabel: 'Group Controls' },
  'ecommerce.partners': { icon: Globe, layout: 'marketplace', visual: 'pie', accent: accents.sky, focus: 'Partner channels', noun: 'partner', primaryPanel: 'Partner Network', secondaryPanel: 'Commission Surface', recordTitle: 'Partner Records', commandLabel: 'Partner Controls' },

  'ecommerce.revenue': { icon: CreditCard, layout: 'billing', visual: 'area', accent: accents.emerald, focus: 'Revenue movement', noun: 'stream', primaryPanel: 'Revenue Flow', secondaryPanel: 'Collection Queue', recordTitle: 'Revenue Records', commandLabel: 'Revenue Controls' },
  'ecommerce.plans': { icon: Settings, layout: 'billing', visual: 'bar', accent: accents.indigo, focus: 'Plan catalog', noun: 'plan', primaryPanel: 'Plan Matrix', secondaryPanel: 'Feature Limits', recordTitle: 'Subscription Plans', commandLabel: 'Plan Controls' },
  'ecommerce.invoices': { icon: FileText, layout: 'billing', visual: 'composed', accent: accents.amber, focus: 'Invoice operations', noun: 'invoice', primaryPanel: 'Invoice Core', secondaryPanel: 'Payment Risk', recordTitle: 'Invoice Records', commandLabel: 'Invoice Controls' },
  'ecommerce.usage': { icon: LineChart, layout: 'billing', visual: 'line', accent: accents.cyan, focus: 'Usage metering', noun: 'meter', primaryPanel: 'Meter Stream', secondaryPanel: 'Quota Watch', recordTitle: 'Usage Records', commandLabel: 'Meter Controls' },
  'ecommerce.cycles': { icon: Activity, layout: 'billing', visual: 'radial', accent: accents.violet, focus: 'Recurring cycles', noun: 'cycle', primaryPanel: 'Cycle Calendar', secondaryPanel: 'Retry Windows', recordTitle: 'Billing Cycles', commandLabel: 'Cycle Controls' },
  'ecommerce.taxes': { icon: FileText, layout: 'governance', visual: 'bar', accent: accents.rose, focus: 'Tax compliance', noun: 'rule', primaryPanel: 'Tax Rules', secondaryPanel: 'Region Mapping', recordTitle: 'Tax Rules', commandLabel: 'Tax Controls' },

  'ecommerce.campaigns': { icon: Megaphone, layout: 'marketing', visual: 'area', accent: accents.violet, focus: 'Growth campaigns', noun: 'campaign', primaryPanel: 'Campaign Studio', secondaryPanel: 'Audience Queue', recordTitle: 'Campaign Records', commandLabel: 'Campaign Controls' },
  'ecommerce.seo': { icon: Search, layout: 'marketing', visual: 'bar', accent: accents.teal, focus: 'Search visibility', noun: 'index', primaryPanel: 'SEO Console', secondaryPanel: 'Index Health', recordTitle: 'SEO Records', commandLabel: 'SEO Controls' },
  'ecommerce.affiliates': { icon: Users, layout: 'marketing', visual: 'pie', accent: accents.sky, focus: 'Affiliate growth', noun: 'affiliate', primaryPanel: 'Affiliate Engine', secondaryPanel: 'Payout Review', recordTitle: 'Affiliate Records', commandLabel: 'Affiliate Controls' },
  'ecommerce.email': { icon: Mail, layout: 'marketing', visual: 'line', accent: accents.amber, focus: 'Lifecycle messaging', noun: 'automation', primaryPanel: 'Email Automation', secondaryPanel: 'Delivery Health', recordTitle: 'Email Automations', commandLabel: 'Email Controls' },
  'ecommerce.social': { icon: Globe, layout: 'marketing', visual: 'composed', accent: accents.cyan, focus: 'Social channels', noun: 'channel', primaryPanel: 'Social Connect', secondaryPanel: 'Feed Sync', recordTitle: 'Social Records', commandLabel: 'Social Controls' },

  'ecommerce.databases': { icon: Database, layout: 'infrastructure', visual: 'radial', accent: accents.slate, focus: 'Database fleet', noun: 'database', primaryPanel: 'DB Cluster Map', secondaryPanel: 'Backup State', recordTitle: 'Database Clusters', commandLabel: 'Database Controls' },
  'ecommerce.storage': { icon: Blocks, layout: 'infrastructure', visual: 'bar', accent: accents.teal, focus: 'Storage quotas', noun: 'pool', primaryPanel: 'Storage Pools', secondaryPanel: 'Archive Pressure', recordTitle: 'Storage Pools', commandLabel: 'Storage Controls' },
  'ecommerce.cdn': { icon: Network, layout: 'infrastructure', visual: 'line', accent: accents.cyan, focus: 'Asset delivery', noun: 'edge cache', primaryPanel: 'CDN Edge View', secondaryPanel: 'Cache Operations', recordTitle: 'CDN Records', commandLabel: 'CDN Controls' },
  'ecommerce.domains': { icon: Globe, layout: 'infrastructure', visual: 'pie', accent: accents.indigo, focus: 'Domain reseller', noun: 'domain', primaryPanel: 'Domain Control', secondaryPanel: 'DNS Readiness', recordTitle: 'Domain Records', commandLabel: 'Domain Controls' },
  'ecommerce.nodes': { icon: Map, layout: 'infrastructure', visual: 'composed', accent: accents.sky, focus: 'Edge routing', noun: 'node', primaryPanel: 'Edge Node Map', secondaryPanel: 'Route Health', recordTitle: 'Edge Nodes', commandLabel: 'Node Controls' },
  'ecommerce.ssl': { icon: Lock, layout: 'infrastructure', visual: 'radial', accent: accents.emerald, focus: 'Certificate automation', noun: 'certificate', primaryPanel: 'SSL Manager', secondaryPanel: 'Renewal Queue', recordTitle: 'SSL Records', commandLabel: 'SSL Controls' },

  'ecommerce.themes': { icon: Sparkles, layout: 'marketplace', visual: 'bar', accent: accents.violet, focus: 'Theme catalog', noun: 'theme', primaryPanel: 'Theme Directory', secondaryPanel: 'Publishing Queue', recordTitle: 'Theme Records', commandLabel: 'Theme Controls' },
  'ecommerce.apps': { icon: Puzzle, layout: 'marketplace', visual: 'pie', accent: accents.indigo, focus: 'Extension marketplace', noun: 'extension', primaryPanel: 'Extension Hub', secondaryPanel: 'Install Health', recordTitle: 'Extension Records', commandLabel: 'Extension Controls' },
  'ecommerce.shares': { icon: CreditCard, layout: 'marketplace', visual: 'area', accent: accents.emerald, focus: 'Revenue sharing', noun: 'share', primaryPanel: 'Revenue Share Desk', secondaryPanel: 'Settlement Queue', recordTitle: 'Share Records', commandLabel: 'Share Controls' },
  'ecommerce.dev-portal': { icon: FileCode2, layout: 'marketplace', visual: 'line', accent: accents.slate, focus: 'Developer ecosystem', noun: 'developer app', primaryPanel: 'Developer Portal', secondaryPanel: 'App Review', recordTitle: 'Developer Records', commandLabel: 'Developer Controls' },

  'ecommerce.support': { icon: Bell, layout: 'governance', visual: 'bar', accent: accents.amber, focus: 'Merchant support', noun: 'ticket', primaryPanel: 'Support Desk', secondaryPanel: 'SLA Pressure', recordTitle: 'Support Records', commandLabel: 'Support Controls' },
  'ecommerce.alerts': { icon: Bell, layout: 'governance', visual: 'pie', accent: accents.rose, focus: 'Global incidents', noun: 'alert', primaryPanel: 'Alert Center', secondaryPanel: 'Incident Timeline', recordTitle: 'Alert Records', commandLabel: 'Alert Controls' },
  'ecommerce.security': { icon: Lock, layout: 'governance', visual: 'radial', accent: accents.slate, focus: 'Security policy', noun: 'policy', primaryPanel: 'Security Policy', secondaryPanel: 'Scope Review', recordTitle: 'Security Policies', commandLabel: 'Security Controls' },
  'ecommerce.compliance': { icon: ShieldCheck, layout: 'governance', visual: 'composed', accent: accents.teal, focus: 'Compliance evidence', noun: 'evidence', primaryPanel: 'Compliance Hub', secondaryPanel: 'Evidence Gaps', recordTitle: 'Compliance Records', commandLabel: 'Compliance Controls' },
  'ecommerce.audits': { icon: FileText, layout: 'governance', visual: 'line', accent: accents.zinc, focus: 'Audit trail', noun: 'audit event', primaryPanel: 'Audit Timeline', secondaryPanel: 'Sensitive Changes', recordTitle: 'Audit Logs', commandLabel: 'Audit Controls' },

  'ecommerce.api': { icon: Webhook, layout: 'advanced', visual: 'line', accent: accents.indigo, focus: 'API automation', noun: 'webhook', primaryPanel: 'API and Webhooks', secondaryPanel: 'Delivery Review', recordTitle: 'API Records', commandLabel: 'API Controls' },
  'ecommerce.translations': { icon: Languages, layout: 'advanced', visual: 'bar', accent: accents.sky, focus: 'Locale publishing', noun: 'locale', primaryPanel: 'Translation Hub', secondaryPanel: 'Coverage Matrix', recordTitle: 'Translation Records', commandLabel: 'Translation Controls' },
  'ecommerce.fields': { icon: Tags, layout: 'advanced', visual: 'pie', accent: accents.violet, focus: 'Custom schema', noun: 'field', primaryPanel: 'Custom Fields', secondaryPanel: 'Schema Review', recordTitle: 'Custom Field Records', commandLabel: 'Field Controls' },
  'ecommerce.mobile': { icon: MonitorSmartphone, layout: 'advanced', visual: 'radial', accent: accents.emerald, focus: 'Mobile release config', noun: 'mobile flag', primaryPanel: 'Mobile Config', secondaryPanel: 'Release Channels', recordTitle: 'Mobile Config Records', commandLabel: 'Mobile Controls' },
  'ecommerce.settings': { icon: Settings, layout: 'advanced', visual: 'composed', accent: accents.slate, focus: 'Platform defaults', noun: 'setting', primaryPanel: 'Platform Settings', secondaryPanel: 'Tenant Defaults', recordTitle: 'Platform Settings', commandLabel: 'Platform Controls' }
};

export function getSectionBlueprint(sectionKey: string) {
  return ECOMMERCE_SECTION_BLUEPRINTS[sectionKey] || DEFAULT_BLUEPRINT;
}
