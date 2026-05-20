import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AdminLoader from '../../../cloudstore/shared/AdminLoader';
import IspDashboardOverview from './pages/IspDashboardOverview';
import IspSubscribersPage from './pages/IspSubscribersPage';
import IspRoutersPage from './pages/IspRoutersPage';
import IspDevicesPage from './pages/IspDevicesPage';
import IspRadiusPage from './pages/IspRadiusPage';
import IspInvoicesPage from './pages/IspInvoicesPage';
import IspPlansPage from './pages/IspPlansPage';
import IspReportsPage from './pages/IspReportsPage';
import IspRecordsPage, { IspRecordField } from './pages/IspRecordsPage';
import { fetchIspSiteByIdWithApi, fetchPrimaryIspSite } from '../../../lib/tiwloApi';

type SectionConfig = {
  title: string;
  section: string;
  description: string;
  primaryField?: string;
  statuses?: string[];
  fields: IspRecordField[];
};

const baseStatuses = ['active', 'draft', 'paused'];

const sectionConfigs: Record<string, SectionConfig> = {
  'Network Map': {
    title: 'Network & Fiber GIS',
    section: 'network-fiber-gis',
    description: 'Fiber routes, POPs, splitters, and map assets for this ISP site.',
    primaryField: 'asset',
    fields: [
      { key: 'asset', label: 'Asset name' },
      { key: 'type', label: 'Type', type: 'select', options: ['Backbone', 'POP', 'Splitter', 'Closure', 'Cable Route'] },
      { key: 'coordinates', label: 'Coordinates' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  NMS: {
    title: 'NMS (Network Monitor)',
    section: 'nms-monitor',
    description: 'Monitoring checks, probes, and alert policy records.',
    primaryField: 'check',
    statuses: ['online', 'degraded', 'offline'],
    fields: [
      { key: 'check', label: 'Check name' },
      { key: 'target', label: 'Target' },
      { key: 'interval', label: 'Interval' },
      { key: 'threshold', label: 'Threshold' }
    ]
  },
  Bandwidth: {
    title: 'Bandwidth Monitor',
    section: 'bandwidth-monitor',
    description: 'Capacity reservations and bandwidth policy records.',
    primaryField: 'link',
    fields: [
      { key: 'link', label: 'Link / Interface' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'peak', label: 'Peak usage' },
      { key: 'policy', label: 'Policy', type: 'textarea' }
    ]
  },
  'Data Usage': {
    title: 'Data Usage Stats',
    section: 'data-usage-stats',
    description: 'Usage buckets, fair-use tracking, and quota records.',
    primaryField: 'bucket',
    fields: [
      { key: 'bucket', label: 'Bucket' },
      { key: 'subscriber', label: 'Subscriber' },
      { key: 'usage', label: 'Usage' },
      { key: 'period', label: 'Period' }
    ]
  },
  Corporate: {
    title: 'Corporate Clients',
    section: 'corporate-clients',
    description: 'Enterprise accounts, SLA, and dedicated bandwidth records.',
    primaryField: 'company',
    statuses: ['active', 'review', 'paused'],
    fields: [
      { key: 'company', label: 'Company' },
      { key: 'contact', label: 'Contact' },
      { key: 'bandwidth', label: 'Bandwidth' },
      { key: 'sla', label: 'SLA', type: 'textarea' }
    ]
  },
  'Hotspot Users': {
    title: 'Hotspot Vouchers',
    section: 'hotspot-vouchers',
    description: 'Voucher batches and hotspot access logic for this ISP site.',
    primaryField: 'batch',
    statuses: ['active', 'redeemed', 'expired'],
    fields: [
      { key: 'batch', label: 'Batch' },
      { key: 'profile', label: 'Profile' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'expiresAt', label: 'Expires at' }
    ]
  },
  'Static IP': {
    title: 'Static IP Clients',
    section: 'static-ip-clients',
    description: 'Static IP assignments bound to site subscribers.',
    primaryField: 'ip',
    statuses: ['active', 'reserved', 'released'],
    fields: [
      { key: 'ip', label: 'IP address' },
      { key: 'client', label: 'Client' },
      { key: 'gateway', label: 'Gateway' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Resellers: {
    title: 'Reseller Portal',
    section: 'reseller-portal',
    description: 'Reseller ledger, limits, and portal access records.',
    primaryField: 'reseller',
    fields: [
      { key: 'reseller', label: 'Reseller' },
      { key: 'area', label: 'Area' },
      { key: 'creditLimit', label: 'Credit limit', type: 'number' },
      { key: 'terms', label: 'Terms', type: 'textarea' }
    ]
  },
  Franchise: {
    title: 'Franchise Tracking',
    section: 'franchise-tracking',
    description: 'Franchise zones, commission, and operational ownership.',
    primaryField: 'franchise',
    fields: [
      { key: 'franchise', label: 'Franchise' },
      { key: 'zone', label: 'Zone' },
      { key: 'commission', label: 'Commission' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Payments: {
    title: 'Payment Gateways',
    section: 'payment-gateways',
    description: 'Payment provider credentials and settlement rules for this ISP site.',
    primaryField: 'provider',
    statuses: ['active', 'testing', 'disabled'],
    fields: [
      { key: 'provider', label: 'Provider' },
      { key: 'mode', label: 'Mode', type: 'select', options: ['live', 'test'] },
      { key: 'account', label: 'Account' },
      { key: 'settlement', label: 'Settlement notes', type: 'textarea' }
    ]
  },
  Wallet: {
    title: 'Top-up & Wallet',
    section: 'topup-wallet',
    description: 'Wallet transactions, top-up channels, and subscriber balance logic.',
    primaryField: 'reference',
    statuses: ['pending', 'posted', 'failed'],
    fields: [
      { key: 'reference', label: 'Reference' },
      { key: 'subscriber', label: 'Subscriber' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'method', label: 'Method' }
    ]
  },
  'Grace Period': {
    title: 'Auto Grace Period',
    section: 'auto-grace-period',
    description: 'Auto suspend/resume grace rules linked to billing status.',
    primaryField: 'rule',
    fields: [
      { key: 'rule', label: 'Rule name' },
      { key: 'days', label: 'Grace days', type: 'number' },
      { key: 'action', label: 'Action', type: 'select', options: ['notify', 'shape speed', 'suspend'] },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Tax: {
    title: 'Tax & VAT Settings',
    section: 'tax-vat-settings',
    description: 'Tax/VAT rates and invoice policy records.',
    primaryField: 'region',
    fields: [
      { key: 'region', label: 'Region' },
      { key: 'rate', label: 'Rate', type: 'number' },
      { key: 'registration', label: 'Registration' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Expenses: {
    title: 'Expense Manager',
    section: 'expense-manager',
    description: 'Operational expenses for this ISP site.',
    primaryField: 'expense',
    statuses: ['open', 'approved', 'paid'],
    fields: [
      { key: 'expense', label: 'Expense' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'vendor', label: 'Vendor' }
    ]
  },
  Payroll: {
    title: 'Salary & Payroll',
    section: 'salary-payroll',
    description: 'Payroll batches, deductions, and staff payout records.',
    primaryField: 'employee',
    statuses: ['pending', 'approved', 'paid'],
    fields: [
      { key: 'employee', label: 'Employee' },
      { key: 'role', label: 'Role' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'period', label: 'Period' }
    ]
  },
  'MAC Binding': {
    title: 'Device Binding',
    section: 'device-binding',
    description: 'MAC/IP/user binding rules pushed to network devices.',
    primaryField: 'mac',
    statuses: ['active', 'pending', 'blocked'],
    fields: [
      { key: 'mac', label: 'MAC address' },
      { key: 'ip', label: 'IP address' },
      { key: 'subscriber', label: 'Subscriber' },
      { key: 'device', label: 'Device' }
    ]
  },
  'IP Pool': {
    title: 'IP Pool Range',
    section: 'ip-pool-range',
    description: 'IPv4/IPv6 pools assigned to MikroTik and RADIUS profiles.',
    primaryField: 'pool',
    fields: [
      { key: 'pool', label: 'Pool name' },
      { key: 'range', label: 'Range' },
      { key: 'gateway', label: 'Gateway' },
      { key: 'router', label: 'Router' }
    ]
  },
  IPTV: {
    title: 'IPTV Management',
    section: 'iptv-management',
    description: 'IPTV packages, STB assignments, and channel policies.',
    primaryField: 'package',
    fields: [
      { key: 'package', label: 'Package' },
      { key: 'channels', label: 'Channels', type: 'number' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  CATV: {
    title: 'Cable TV Billing',
    section: 'cable-tv-billing',
    description: 'Cable TV billing plans and collection records.',
    primaryField: 'account',
    fields: [
      { key: 'account', label: 'Account' },
      { key: 'plan', label: 'Plan' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'cycle', label: 'Cycle' }
    ]
  },
  OTT: {
    title: 'VOD & OTT Subscriptions',
    section: 'vod-ott-subscriptions',
    description: 'OTT subscription bundles and entitlement records.',
    primaryField: 'service',
    fields: [
      { key: 'service', label: 'Service' },
      { key: 'subscriber', label: 'Subscriber' },
      { key: 'expiresAt', label: 'Expires at' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Stock: {
    title: 'Item Stock',
    section: 'item-stock',
    description: 'Inventory items, stock level, and reorder policy.',
    primaryField: 'item',
    fields: [
      { key: 'item', label: 'Item' },
      { key: 'category', label: 'Category' },
      { key: 'stock', label: 'Stock', type: 'number' },
      { key: 'reorder', label: 'Reorder level', type: 'number' }
    ]
  },
  Vendors: {
    title: 'Vendor Directory',
    section: 'vendor-directory',
    description: 'Vendors for network hardware, fiber, and support services.',
    primaryField: 'vendor',
    fields: [
      { key: 'vendor', label: 'Vendor' },
      { key: 'contact', label: 'Contact' },
      { key: 'phone', label: 'Phone' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Purchases: {
    title: 'Purchase Orders',
    section: 'purchase-orders',
    description: 'Purchase requests and supplier order tracking.',
    primaryField: 'po',
    statuses: ['draft', 'ordered', 'received'],
    fields: [
      { key: 'po', label: 'PO number' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'items', label: 'Items', type: 'textarea' }
    ]
  },
  Fleet: {
    title: 'Fleet & Vehicles',
    section: 'fleet-vehicles',
    description: 'Field vehicle assignment and maintenance tracking.',
    primaryField: 'vehicle',
    fields: [
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'driver', label: 'Driver' },
      { key: 'zone', label: 'Zone' },
      { key: 'maintenance', label: 'Maintenance notes', type: 'textarea' }
    ]
  },
  Tickets: {
    title: 'Helpdesk Tickets',
    section: 'helpdesk-tickets',
    description: 'Site-level support issues and assignment workflow.',
    primaryField: 'subject',
    statuses: ['open', 'pending', 'resolved'],
    fields: [
      { key: 'subject', label: 'Subject' },
      { key: 'subscriber', label: 'Subscriber' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
      { key: 'message', label: 'Message', type: 'textarea' }
    ]
  },
  'Live Chat': {
    title: 'Live Chat Center',
    section: 'live-chat-center',
    description: 'Live chat queues and conversation ownership.',
    primaryField: 'conversation',
    statuses: ['open', 'assigned', 'closed'],
    fields: [
      { key: 'conversation', label: 'Conversation' },
      { key: 'subscriber', label: 'Subscriber' },
      { key: 'agent', label: 'Agent' },
      { key: 'lastMessage', label: 'Last message', type: 'textarea' }
    ]
  },
  'SMS Server': {
    title: 'SMS & WhatsApp',
    section: 'sms-whatsapp',
    description: 'Messaging gateway and template records.',
    primaryField: 'template',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'template', label: 'Template' },
      { key: 'channel', label: 'Channel', type: 'select', options: ['SMS', 'WhatsApp'] },
      { key: 'provider', label: 'Provider' },
      { key: 'body', label: 'Body', type: 'textarea' }
    ]
  },
  Emails: {
    title: 'Email Automations',
    section: 'email-automations',
    description: 'Lifecycle email templates and triggers.',
    primaryField: 'automation',
    fields: [
      { key: 'automation', label: 'Automation' },
      { key: 'trigger', label: 'Trigger' },
      { key: 'subject', label: 'Subject' },
      { key: 'body', label: 'Body', type: 'textarea' }
    ]
  },
  Referrals: {
    title: 'Referral Program',
    section: 'referral-program',
    description: 'Referral rules, rewards, and campaign tracking.',
    primaryField: 'campaign',
    fields: [
      { key: 'campaign', label: 'Campaign' },
      { key: 'reward', label: 'Reward' },
      { key: 'referrer', label: 'Referrer' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Complaints: {
    title: 'SLA Complaints',
    section: 'sla-complaints',
    description: 'SLA breach, complaint, and escalation records.',
    primaryField: 'caseNo',
    statuses: ['open', 'investigating', 'closed'],
    fields: [
      { key: 'caseNo', label: 'Case no' },
      { key: 'subscriber', label: 'Subscriber' },
      { key: 'sla', label: 'SLA' },
      { key: 'resolution', label: 'Resolution', type: 'textarea' }
    ]
  },
  Permissions: {
    title: 'Staff Roles',
    section: 'staff-roles',
    description: 'Role assignments and site-level permissions.',
    primaryField: 'staff',
    fields: [
      { key: 'staff', label: 'Staff' },
      { key: 'role', label: 'Role' },
      { key: 'permissions', label: 'Permissions', type: 'textarea' },
      { key: 'scope', label: 'Scope' }
    ]
  },
  Attendance: {
    title: 'Staff Attendance',
    section: 'staff-attendance',
    description: 'Attendance, shift, and field team records.',
    primaryField: 'staff',
    statuses: ['present', 'absent', 'leave'],
    fields: [
      { key: 'staff', label: 'Staff' },
      { key: 'shift', label: 'Shift' },
      { key: 'date', label: 'Date' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Logs: {
    title: 'Audit Trail Logs',
    section: 'audit-trail-logs',
    description: 'Manual audit notes and site operational events.',
    primaryField: 'event',
    statuses: ['info', 'warning', 'critical'],
    fields: [
      { key: 'event', label: 'Event' },
      { key: 'actor', label: 'Actor' },
      { key: 'resource', label: 'Resource' },
      { key: 'details', label: 'Details', type: 'textarea' }
    ]
  },
  Backups: {
    title: 'Cloud Backups',
    section: 'cloud-backups',
    description: 'Backup policies and restore point records.',
    primaryField: 'backup',
    statuses: ['active', 'queued', 'failed'],
    fields: [
      { key: 'backup', label: 'Backup' },
      { key: 'frequency', label: 'Frequency' },
      { key: 'retention', label: 'Retention' },
      { key: 'target', label: 'Target' }
    ]
  },
  API: {
    title: 'Webhooks & API',
    section: 'webhooks-api',
    description: 'Webhook endpoints and API integration records.',
    primaryField: 'endpoint',
    statuses: ['active', 'testing', 'disabled'],
    fields: [
      { key: 'endpoint', label: 'Endpoint' },
      { key: 'event', label: 'Event' },
      { key: 'secret', label: 'Secret label' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Settings: {
    title: 'App Settings',
    section: 'app-settings',
    description: 'Site-level configuration values for the ISP admin app.',
    primaryField: 'setting',
    fields: [
      { key: 'setting', label: 'Setting' },
      { key: 'value', label: 'Value' },
      { key: 'group', label: 'Group' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  }
};

export default function ISPAdminRoot() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [site, setSite] = useState<any>(null);
  const [activeNav, setActiveNav] = useState('Home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const siteId = params.get('siteId');
    setLoading(true);
    setError('');
    (siteId ? fetchIspSiteByIdWithApi(siteId) : fetchPrimaryIspSite())
      .then(setSite)
      .catch((err) => {
        setSite(null);
        setError(err instanceof Error ? err.message : 'Unable to load ISP site');
      })
      .finally(() => setLoading(false));
  }, [location.search]);

  if (loading) {
    return <AdminLoader />;
  }

  if (!site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-6">
        <div className="max-w-md border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-gray-900">No ISP Site Connected</h1>
          <p className="mt-2 text-sm text-gray-500">{error || 'Create an ISP site first, then open the admin with its siteId.'}</p>
          <Link to="/isp-billing/add-router" className="mt-5 inline-flex bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Create ISP Site</Link>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (sectionConfigs[activeNav]) {
      return <IspRecordsPage site={site} {...sectionConfigs[activeNav]} statuses={sectionConfigs[activeNav].statuses || baseStatuses} />;
    }

    switch (activeNav) {
      case 'Home':
        return <IspDashboardOverview site={site} />;
      case 'Customers':
        return <IspSubscribersPage site={site} />;
      case 'PPPoE Users':
        return <IspSubscribersPage site={site} mode="sessions" />;
      case 'Billing':
        return <IspInvoicesPage site={site} />;
      case 'Packages':
        return <IspPlansPage site={site} />;
      case 'MikroTik':
        return <IspRoutersPage site={site} />;
      case 'OLT':
        return <IspDevicesPage site={site} type="olt" title="OLT Management" />;
      case 'ONU':
        return <IspDevicesPage site={site} type="onu" title="ONU/ONT Devices" />;
      case 'Radius':
        return <IspRadiusPage site={site} />;
      case 'Reports':
        return <IspReportsPage site={site} />;
      default:
        return <IspDashboardOverview site={site} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans selection:bg-blue-100 selection:text-blue-700">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} site={site} />

      <main className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <Header activeNav={activeNav} onMenuClick={() => setIsMobileMenuOpen(true)} site={site} />

        <div className="mx-auto w-full max-w-7xl p-4 sm:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
