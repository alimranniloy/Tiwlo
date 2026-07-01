import AdminRecordsPage from './AdminRecordsPage';

const configs = {
  contactGroups: {
    section: 'contact-groups',
    title: 'Contact Groups',
    description: 'Group customers, staff, vendors, and notification audiences with database-backed records.',
    recordLabel: 'Group',
    fields: [
      { key: 'audience', label: 'Audience', type: 'select' as const, options: ['customers', 'staff', 'vendors', 'tiwlo_team', 'partners'] },
      { key: 'channel', label: 'Channel', type: 'select' as const, options: ['email', 'sms', 'whatsapp', 'push', 'internal'] },
      { key: 'owner', label: 'Owner', placeholder: 'Team owner' },
      { key: 'rules', label: 'Rules', type: 'textarea' as const, placeholder: 'Segment rules or sync notes' }
    ],
    statusOptions: ['active', 'pending', 'disabled', 'archived']
  },
  taxes: {
    section: 'tax-configuration',
    title: 'Tax Configuration',
    description: 'Manage VAT, GST, sales tax, and duty rules used by billing operations.',
    recordLabel: 'Tax Rule',
    fields: [
      { key: 'region', label: 'Region', placeholder: 'US, EU, BD, SG' },
      { key: 'rate', label: 'Rate %', type: 'number' as const },
      { key: 'taxCode', label: 'Tax Code', placeholder: 'VAT-15' },
      { key: 'notes', label: 'Notes', type: 'textarea' as const }
    ],
    statusOptions: ['active', 'draft', 'review', 'disabled']
  },
  cloudTemplates: {
    section: 'cloud-templates',
    title: 'Cloud Templates',
    description: 'Store reusable compute, database, container, and deployment templates for platform provisioning.',
    recordLabel: 'Template',
    fields: [
      { key: 'product', label: 'Product', type: 'select' as const, options: ['compute', 'database', 'network', 'firewall', 'app', 'function'] },
      { key: 'region', label: 'Region', placeholder: 'Global or region name' },
      { key: 'monthlyCost', label: 'Base Cost', type: 'number' as const },
      { key: 'specification', label: 'Specification', type: 'textarea' as const }
    ],
    statusOptions: ['active', 'draft', 'disabled', 'archived']
  },
  storeProducts: {
    section: 'store-products',
    title: 'Store Product Templates',
    description: 'Platform-level commerce product templates and approval policies for merchant stores.',
    recordLabel: 'Product Template',
    fields: [
      { key: 'category', label: 'Category', placeholder: 'Retail, digital, food' },
      { key: 'skuPrefix', label: 'SKU Prefix', placeholder: 'SKU-' },
      { key: 'defaultMargin', label: 'Margin %', type: 'number' as const },
      { key: 'policy', label: 'Policy', type: 'textarea' as const }
    ],
    statusOptions: ['active', 'review', 'disabled', 'archived']
  }
};

type SectionKey = keyof typeof configs;

export default function AdminSectionRecords({ sectionKey }: { sectionKey: SectionKey }) {
  return <AdminRecordsPage {...configs[sectionKey]} />;
}
