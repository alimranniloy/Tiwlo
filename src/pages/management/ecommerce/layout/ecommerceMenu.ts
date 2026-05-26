import {
  Activity,
  BarChart3,
  Bell,
  Box,
  CreditCard,
  Database,
  FileText,
  Globe,
  HardDrive,
  LayoutGrid,
  Layers,
  LifeBuoy,
  Lock,
  Network,
  Puzzle,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type EcommerceMenuItem = {
  name: string;
  icon: LucideIcon;
  path: string;
};

export type EcommerceMenuSection = {
  label: string;
  items: EcommerceMenuItem[];
};

export const ecommerceMenuSections: EcommerceMenuSection[] = [
  {
    label: 'PLATFORM CORE',
    items: [
      { name: 'Global Insight', icon: BarChart3, path: '/management/ecommerce' },
      { name: 'Live Traffic Hub', icon: Globe, path: '/management/ecommerce/live-traffic' },
      { name: 'System Health', icon: Activity, path: '/management/ecommerce/health' },
      { name: 'Performance Metrics', icon: Zap, path: '/management/ecommerce/performance' },
      { name: 'Cluster Analytics', icon: Database, path: '/management/ecommerce/clusters' }
    ]
  },
  {
    label: 'MERCHANT HUB',
    items: [
      { name: 'Merchant Directory', icon: Users, path: '/management/ecommerce/merchants' },
      { name: 'Store Deployments', icon: ShoppingBag, path: '/management/ecommerce/stores' },
      { name: 'Identity KYC', icon: ShieldCheck, path: '/management/ecommerce/kyc' },
      { name: 'Client Segments', icon: Layers, path: '/management/ecommerce/segments' },
      { name: 'Merchant Groups', icon: Users, path: '/management/ecommerce/groups' },
      { name: 'Partner Portals', icon: Globe, path: '/management/ecommerce/partners' }
    ]
  },
  {
    label: 'SAAS SUBSCRIPTIONS',
    items: [
      { name: 'Revenue Streams', icon: CreditCard, path: '/management/ecommerce/revenue' },
      { name: 'Subscription Plans', icon: Settings, path: '/management/ecommerce/plans' },
      { name: 'Invoicing Core', icon: FileText, path: '/management/ecommerce/invoices' },
      { name: 'Usage Meters', icon: Zap, path: '/management/ecommerce/usage' },
      { name: 'Billing Cycles', icon: BarChart3, path: '/management/ecommerce/cycles' },
      { name: 'Tax Engine', icon: ShieldCheck, path: '/management/ecommerce/taxes' }
    ]
  },
  {
    label: 'MARKETING & GROWTH',
    items: [
      { name: 'Campaign Manager', icon: Globe, path: '/management/ecommerce/campaigns' },
      { name: 'SEO Platform', icon: Search, path: '/management/ecommerce/seo' },
      { name: 'Affiliate Engine', icon: Users, path: '/management/ecommerce/affiliates' },
      { name: 'Email Automation', icon: Bell, path: '/management/ecommerce/email' },
      { name: 'Social Connect', icon: Globe, path: '/management/ecommerce/social' }
    ]
  },
  {
    label: 'INFRASTRUCTURE',
    items: [
      { name: 'DB Clusters', icon: Database, path: '/management/ecommerce/databases' },
      { name: 'Storage Pools', icon: HardDrive, path: '/management/ecommerce/storage' },
      { name: 'Asset CDN', icon: Network, path: '/management/ecommerce/cdn' },
      { name: 'Store Domains', icon: Globe, path: '/management/ecommerce/domains' },
      { name: 'Edge Nodes', icon: Network, path: '/management/ecommerce/nodes' },
      { name: 'SSL Manager', icon: Lock, path: '/management/ecommerce/ssl' }
    ]
  },
  {
    label: 'SAAS MARKETPLACE',
    items: [
      { name: 'Theme Directory', icon: LayoutGrid, path: '/management/ecommerce/themes' },
      { name: 'Extension Hub', icon: Puzzle, path: '/management/ecommerce/apps' },
      { name: 'Revenue Shares', icon: TrendingUp, path: '/management/ecommerce/shares' },
      { name: 'Developer Portal', icon: FileText, path: '/management/ecommerce/dev-portal' }
    ]
  },
  {
    label: 'GOVERNANCE & RISK',
    items: [
      { name: 'Merchant Support', icon: LifeBuoy, path: '/management/ecommerce/support' },
      { name: 'Global Alerts', icon: Bell, path: '/management/ecommerce/alerts' },
      { name: 'Security Policy', icon: Lock, path: '/management/ecommerce/security' },
      { name: 'Compliance Hub', icon: ShieldCheck, path: '/management/ecommerce/compliance' },
      { name: 'Audit Logs', icon: FileText, path: '/management/ecommerce/audits' }
    ]
  },
  {
    label: 'SYSTEM ADVANCED',
    items: [
      { name: 'API & Webhooks', icon: Settings, path: '/management/ecommerce/api' },
      { name: 'Translation Hub', icon: Globe, path: '/management/ecommerce/translations' },
      { name: 'Custom Fields', icon: LayoutGrid, path: '/management/ecommerce/fields' },
      { name: 'Mobile Config', icon: Box, path: '/management/ecommerce/mobile' },
      { name: 'Platform Settings', icon: Settings, path: '/management/ecommerce/settings' }
    ]
  }
];

export const ecommerceMenuItems = ecommerceMenuSections.flatMap((section) => section.items);
