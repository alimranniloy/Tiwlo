import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardHome from './pages/DashboardHome';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import SettingsPage from './pages/SettingsPage';
import ThemesPage from './pages/ThemesPage';
import PluginsPage from './pages/PluginsPage';
import POSPage from './pages/pos/POSPage';
import StoreRecordsPage, { StoreRecordField } from './pages/StoreRecordsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import InventoryPage from './pages/InventoryPage';
import CurrenciesPage from './pages/CurrenciesPage';
import { fetchPrimaryStore, fetchStoreByIdWithApi } from '../../lib/tiwloApi';

type SectionConfig = {
  title: string;
  section: string;
  description: string;
  fields: StoreRecordField[];
  primaryField?: string;
  statuses?: string[];
};

const themeOptions = ['Aura', 'Eplaza', 'All themes'];
const sliderSlotOptions = ['hero-1', 'hero-2', 'hero-3'];
const bannerSlotOptions = [
  'daily-wide',
  'daily-small-1',
  'daily-small-2',
  'featured',
  'bottom',
  'brand-1',
  'brand-2',
  'brand-3',
  'brand-4',
  'brand-5',
  'brand-6',
  'aurora-headset',
  'dual-sense',
  'instant-cameras',
  'apple-event',
  'bottom-xiaomi',
  'bottom-hp',
  'bottom-joycons',
  'flash-sale'
];

const sectionConfigs: Record<string, SectionConfig> = {
  Categories: {
    title: 'Categories',
    section: 'categories',
    description: 'Manage main and sub categories, storefront images, and category SEO saved for this store only.',
    primaryField: 'name',
    statuses: ['active', 'draft', 'hidden'],
    fields: [
      { key: 'name', label: 'Category name' },
      { key: 'slug', label: 'Slug' },
      { key: 'type', label: 'Category type', type: 'select', options: ['main', 'sub-category'] },
      { key: 'parent', label: 'Parent category', placeholder: 'Leave empty for main category' },
      { key: 'image', label: 'Category image', type: 'file' },
      { key: 'placeholderColor', label: 'Placeholder color', placeholder: '#f3f4f6' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'seoTitle', label: 'SEO title' }
    ]
  },
  Brands: {
    title: 'Brands',
    section: 'brands',
    description: 'Brand records used by product upload, storefront filters, and brand banners.',
    primaryField: 'name',
    statuses: ['active', 'draft', 'hidden'],
    fields: [
      { key: 'name', label: 'Brand name' },
      { key: 'slug', label: 'Slug' },
      { key: 'logo', label: 'Brand logo', type: 'file' },
      { key: 'banner', label: 'Brand banner', type: 'file' },
      { key: 'website', label: 'Website' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  Tags: {
    title: 'Tags',
    section: 'tags',
    description: 'Reusable product tags scoped by storeId.',
    primaryField: 'name',
    fields: [
      { key: 'name', label: 'Tag name' },
      { key: 'color', label: 'Color' },
      { key: 'rule', label: 'Automation rule' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Invoices: {
    title: 'Store Invoices',
    section: 'invoices',
    description: 'Store invoice records, separated from platform billing.',
    primaryField: 'number',
    statuses: ['open', 'paid', 'void'],
    fields: [
      { key: 'number', label: 'Invoice number' },
      { key: 'customerEmail', label: 'Customer email' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'dueDate', label: 'Due date' }
    ]
  },
  'Abandoned Carts': {
    title: 'Abandoned Carts',
    section: 'abandoned-carts',
    description: 'Recoverable carts written to this store record set.',
    primaryField: 'customerEmail',
    statuses: ['open', 'recovered', 'expired'],
    fields: [
      { key: 'customerEmail', label: 'Customer email' },
      { key: 'cartValue', label: 'Cart value', type: 'number' },
      { key: 'items', label: 'Items' },
      { key: 'recoveryNote', label: 'Recovery note', type: 'textarea' }
    ]
  },
  'B2B Wholesale': {
    title: 'B2B Wholesale',
    section: 'b2b-wholesale',
    description: 'Wholesale customer terms and trade account controls.',
    primaryField: 'company',
    statuses: ['active', 'review', 'paused'],
    fields: [
      { key: 'company', label: 'Company' },
      { key: 'contactEmail', label: 'Contact email' },
      { key: 'creditLimit', label: 'Credit limit', type: 'number' },
      { key: 'terms', label: 'Terms', type: 'textarea' }
    ]
  },
  Marketing: {
    title: 'Marketing',
    section: 'marketing',
    description: 'Campaigns and marketing work saved for this store.',
    primaryField: 'campaign',
    statuses: ['draft', 'active', 'paused'],
    fields: [
      { key: 'campaign', label: 'Campaign' },
      { key: 'channel', label: 'Channel', type: 'select', options: ['Email', 'SMS', 'Social', 'Search', 'Affiliate'] },
      { key: 'budget', label: 'Budget', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Discounts: {
    title: 'Discounts',
    section: 'discounts',
    description: 'Discount codes and automatic promotions for this store.',
    primaryField: 'code',
    statuses: ['active', 'scheduled', 'expired'],
    fields: [
      { key: 'code', label: 'Code' },
      { key: 'type', label: 'Type', type: 'select', options: ['percentage', 'fixed', 'free shipping'] },
      { key: 'value', label: 'Value', type: 'number' },
      { key: 'endsAt', label: 'Ends at' }
    ]
  },
  Shipping: {
    title: 'Shipping & Delivery',
    section: 'shipping',
    description: 'Fulfillment zones, carriers, and delivery rules.',
    primaryField: 'zone',
    statuses: ['active', 'draft', 'paused'],
    fields: [
      { key: 'zone', label: 'Zone' },
      { key: 'carrier', label: 'Carrier' },
      { key: 'rate', label: 'Rate', type: 'number' },
      { key: 'eta', label: 'ETA' }
    ]
  },
  'Payment Gateways': {
    title: 'Payment Gateways',
    section: 'payment-gateways',
    description: 'Store-level payment providers and settlement settings.',
    primaryField: 'provider',
    statuses: ['active', 'testing', 'disabled'],
    fields: [
      { key: 'provider', label: 'Provider' },
      { key: 'mode', label: 'Mode', type: 'select', options: ['live', 'test'] },
      { key: 'publicKey', label: 'Public key' },
      { key: 'settlement', label: 'Settlement notes', type: 'textarea' }
    ]
  },
  'My Wallet': {
    title: 'My Wallet',
    section: 'wallet',
    description: 'Payout methods, wallet transactions, and settlement notes.',
    primaryField: 'reference',
    statuses: ['pending', 'paid', 'failed'],
    fields: [
      { key: 'reference', label: 'Reference' },
      { key: 'method', label: 'Method' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Taxes: {
    title: 'Taxes & Duties',
    section: 'taxes',
    description: 'Tax regions and duties applied by this store.',
    primaryField: 'region',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'region', label: 'Region' },
      { key: 'rate', label: 'Rate', type: 'number' },
      { key: 'type', label: 'Type', type: 'select', options: ['VAT', 'GST', 'Sales tax', 'Duty'] },
      { key: 'registration', label: 'Registration' }
    ]
  },
  'Online Store': {
    title: 'Online Store',
    section: 'online-store',
    description: 'Storefront settings that belong to this store.',
    primaryField: 'setting',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'setting', label: 'Setting' },
      { key: 'value', label: 'Value' },
      { key: 'channel', label: 'Channel' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'Homepage Sections': {
    title: 'Homepage Sections',
    section: 'homepage-sections',
    description: 'Manage enabled storefront homepage sections, section order, and section data.',
    primaryField: 'title',
    statuses: ['active', 'disabled', 'draft'],
    fields: [
      { key: 'title', label: 'Section title' },
      { key: 'type', label: 'Section type', type: 'select', options: ['hero-slider', 'ad-grid', 'product-tabs', 'deal-product', 'product-carousel', 'category-carousel', 'wide-banner', 'brand-strip', 'blog-strip'] },
      { key: 'priority', label: 'Priority', type: 'number' },
      { key: 'settings', label: 'Settings JSON', type: 'textarea' }
    ]
  },
  Sliders: {
    title: 'Sliders',
    section: 'homepage-sliders',
    description: 'Hero slides for Aura and Eplaza. One image stays as a single banner; multiple images rotate as a slider.',
    primaryField: 'headline',
    statuses: ['active', 'scheduled', 'disabled'],
    fields: [
      { key: 'theme', label: 'Theme', type: 'select', options: themeOptions },
      { key: 'slot', label: 'Slot', type: 'select', options: sliderSlotOptions },
      { key: 'headline', label: 'Headline' },
      { key: 'eyebrow', label: 'Eyebrow' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'image', label: 'Single image', type: 'file' },
      { key: 'images', label: 'Slider images', type: 'files' },
      { key: 'actionText', label: 'Action text' },
      { key: 'actionLink', label: 'Action link' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' }
    ]
  },
  Banners: {
    title: 'Banners',
    section: 'homepage-banners',
    description: 'All Aura and Eplaza promotional banner blocks. Upload one image for a static banner or multiple images for a rotating banner.',
    primaryField: 'headline',
    statuses: ['active', 'scheduled', 'disabled'],
    fields: [
      { key: 'theme', label: 'Theme', type: 'select', options: themeOptions },
      { key: 'slot', label: 'Banner slot', type: 'select', options: bannerSlotOptions },
      { key: 'headline', label: 'Headline' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'image', label: 'Single image', type: 'file' },
      { key: 'images', label: 'Rotating images', type: 'files' },
      { key: 'actionText', label: 'Action text' },
      { key: 'actionLink', label: 'Action link' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' }
    ]
  },
  Navigation: {
    title: 'Navigation',
    section: 'navigation',
    description: 'Menus, department lists, mega menu groups, and storefront navigation links.',
    primaryField: 'name',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'name', label: 'Menu name' },
      { key: 'location', label: 'Location', type: 'select', options: ['main', 'departments', 'topbar', 'footer', 'mobile'] },
      { key: 'items', label: 'Menu items JSON', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Header: {
    title: 'Header',
    section: 'header',
    description: 'Header style, logo, search behavior, top bar, and cart/account controls.',
    primaryField: 'setting',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'setting', label: 'Setting' },
      { key: 'value', label: 'Value' },
      { key: 'desktopValue', label: 'Desktop value' },
      { key: 'mobileValue', label: 'Mobile value' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Footer: {
    title: 'Footer',
    section: 'footer',
    description: 'Footer columns, contact block, newsletter, payment icons, and mobile footer.',
    primaryField: 'block',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'block', label: 'Footer block' },
      { key: 'title', label: 'Title' },
      { key: 'items', label: 'Items JSON', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Widgets: {
    title: 'Widgets',
    section: 'widgets',
    description: 'Sidebar, footer, filter, product, and blog widget placements.',
    primaryField: 'widget',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'widget', label: 'Widget' },
      { key: 'area', label: 'Area', type: 'select', options: ['home-sidebar', 'shop-sidebar', 'product-filters', 'blog-sidebar', 'footer', 'mobile-footer'] },
      { key: 'config', label: 'Config JSON', type: 'textarea' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' }
    ]
  },
  SEO: {
    title: 'SEO',
    section: 'seo',
    description: 'Meta titles, descriptions, redirects, indexing rules, and social previews.',
    primaryField: 'page',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'page', label: 'Page' },
      { key: 'metaTitle', label: 'Meta title' },
      { key: 'metaDescription', label: 'Meta description', type: 'textarea' },
      { key: 'canonicalUrl', label: 'Canonical URL' }
    ]
  },
  Media: {
    title: 'Media Library',
    section: 'media',
    description: 'Store images, brand assets, banners, icons, and secure media records.',
    primaryField: 'name',
    statuses: ['active', 'draft', 'archived'],
    fields: [
      { key: 'name', label: 'Asset name' },
      { key: 'url', label: 'Image file or URL', type: 'file' },
      { key: 'fileName', label: 'File name' },
      { key: 'type', label: 'Type', type: 'select', options: ['image', 'icon', 'banner', 'document'] },
      { key: 'alt', label: 'Alt text' },
      { key: 'securityNote', label: 'Security note', type: 'textarea', placeholder: 'Who can use this file and where it should appear.' }
    ]
  },
  Files: {
    title: 'Files & Images',
    section: 'media',
    description: 'Uploaded store images and media records. Images are store-scoped and scripts/executables are not accepted.',
    primaryField: 'name',
    statuses: ['active', 'draft', 'archived'],
    fields: [
      { key: 'name', label: 'Asset name' },
      { key: 'url', label: 'Image file or URL', type: 'file' },
      { key: 'fileName', label: 'File name' },
      { key: 'type', label: 'Type', type: 'select', options: ['image', 'icon', 'banner', 'document'] },
      { key: 'alt', label: 'Alt text' },
      { key: 'securityNote', label: 'Security note', type: 'textarea', placeholder: 'Describe who can reuse this asset.' }
    ]
  },
  'Theme Settings': {
    title: 'Theme Settings',
    section: 'theme-settings',
    description: 'Theme-level toggles, storefront behavior, preview defaults, and visual settings.',
    primaryField: 'setting',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'setting', label: 'Setting' },
      { key: 'value', label: 'Value' },
      { key: 'scope', label: 'Scope', type: 'select', options: ['global', 'desktop', 'tablet', 'mobile'] },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Reviews: {
    title: 'Reviews',
    section: 'reviews',
    description: 'Product reviews, moderation state, ratings, and customer feedback.',
    primaryField: 'product',
    statuses: ['active', 'pending', 'rejected'],
    fields: [
      { key: 'product', label: 'Product' },
      { key: 'customer', label: 'Customer' },
      { key: 'rating', label: 'Rating', type: 'number' },
      { key: 'review', label: 'Review', type: 'textarea' }
    ]
  },
  Blogs: {
    title: 'Blogs',
    section: 'blog-posts',
    description: 'Store blog posts, category content, and storefront editorial sections.',
    primaryField: 'title',
    statuses: ['published', 'draft', 'archived'],
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'slug', label: 'Slug' },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
      { key: 'image', label: 'Image URL' }
    ]
  },
  Domains: {
    title: 'Domains',
    section: 'domains',
    description: 'Storefront domain records saved against this store.',
    primaryField: 'domain',
    statuses: ['active', 'pending', 'disabled'],
    fields: [
      { key: 'domain', label: 'Domain' },
      { key: 'type', label: 'Type', type: 'select', options: ['primary', 'redirect', 'subdomain'] },
      { key: 'target', label: 'Target' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  Google: {
    title: 'Google Sales',
    section: 'google-sales',
    description: 'Google Merchant, feed, and sales channel settings.',
    primaryField: 'merchantId',
    statuses: ['active', 'syncing', 'paused'],
    fields: [
      { key: 'merchantId', label: 'Merchant ID' },
      { key: 'feedUrl', label: 'Feed URL' },
      { key: 'country', label: 'Country' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'Staff Accounts': {
    title: 'Staff Accounts',
    section: 'staff-accounts',
    description: 'Store staff access records isolated by storeId.',
    primaryField: 'email',
    statuses: ['active', 'invited', 'disabled'],
    fields: [
      { key: 'email', label: 'Email' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role', type: 'select', options: ['owner', 'manager', 'staff', 'viewer'] },
      { key: 'permissions', label: 'Permissions', type: 'textarea' }
    ]
  },
  Languages: {
    title: 'Languages',
    section: 'languages',
    description: 'Store language and locale records.',
    primaryField: 'language',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'language', label: 'Language' },
      { key: 'locale', label: 'Locale' },
      { key: 'market', label: 'Market' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'Email Templates': {
    title: 'Email Templates',
    section: 'email-templates',
    description: 'Transactional email templates for this store.',
    primaryField: 'name',
    statuses: ['active', 'draft', 'disabled'],
    fields: [
      { key: 'name', label: 'Template name' },
      { key: 'subject', label: 'Subject' },
      { key: 'trigger', label: 'Trigger' },
      { key: 'body', label: 'Body', type: 'textarea' }
    ]
  },
  Backups: {
    title: 'Backups',
    section: 'backups',
    description: 'Backup policies and restore points tracked for this store.',
    primaryField: 'name',
    statuses: ['active', 'queued', 'failed'],
    fields: [
      { key: 'name', label: 'Backup name' },
      { key: 'frequency', label: 'Frequency' },
      { key: 'retention', label: 'Retention' },
      { key: 'storage', label: 'Storage target' }
    ]
  }
};

const baseNavRoutes: Record<string, string> = {
  Home: '',
  POS: 'pos',
  Orders: 'orders',
  Products: 'products',
  Inventory: 'inventory',
  Customers: 'customers',
  Analytics: 'analytics',
  Settings: 'settings',
  Themes: 'themes',
  Plugins: 'plugins',
  Currencies: 'currencies'
};

const navLabels = Array.from(new Set([
  ...Object.keys(baseNavRoutes),
  ...Object.keys(sectionConfigs)
]));

const slugFromNav = (label: string) => (
  baseNavRoutes[label] ?? label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
);

const navFromPath = (pathname: string) => {
  const segment = pathname.replace(/^\/store\/admin\/?/, '').split('/')[0];
  if (!segment) return 'Home';
  return navLabels.find((label) => slugFromNav(label) === segment) || 'Home';
};

export default function StoreAdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [store, setStore] = useState<any>(null);
  const [activeNav, setActiveNav] = useState(() => navFromPath(location.pathname));

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') || document.createElement('meta');
    meta.name = 'theme-color';
    if (!meta.parentNode) document.head.appendChild(meta);
    meta.setAttribute('content', '#f6f6f7');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const storeId = params.get('storeId');
    setLoading(true);
    setError('');
    (storeId ? fetchStoreByIdWithApi(storeId) : fetchPrimaryStore())
      .then(setStore)
      .catch((err) => {
        setStore(null);
        setError(err instanceof Error ? err.message : 'Unable to load store admin');
      })
      .finally(() => setLoading(false));
  }, [location.search]);

  useEffect(() => {
    setActiveNav(navFromPath(location.pathname));
  }, [location.pathname]);

  const selectNav = (label: string) => {
    setActiveNav(label);
    const slug = slugFromNav(label);
    navigate(`/store/admin${slug ? `/${slug}` : ''}${location.search}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f6f6f7]" />;
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f7] p-6">
        <div className="max-w-md border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-gray-900">No Store Connected</h1>
          <p className="mt-2 text-sm text-gray-500">{error || 'Create a store first, then open the store admin with its storeId.'}</p>
          <Link to="/store/create" className="mt-5 inline-flex rounded-sm bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Create Store</Link>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (sectionConfigs[activeNav]) {
      return <StoreRecordsPage store={store} {...sectionConfigs[activeNav]} />;
    }

    switch (activeNav) {
      case 'Home':
        return <DashboardHome store={store} />;
      case 'Orders':
        return <OrdersPage store={store} />;
      case 'Products':
        return <ProductsPage store={store} />;
      case 'Inventory':
        return <InventoryPage store={store} />;
      case 'Customers':
        return <CustomersPage store={store} />;
      case 'Analytics':
        return <AnalyticsPage store={store} />;
      case 'Settings':
        return <SettingsPage store={store} onStoreUpdated={setStore} onStoreDeleted={() => setStore(null)} />;
      case 'Currencies':
        return <CurrenciesPage store={store} onStoreUpdated={setStore} />;
      case 'Themes':
        return <ThemesPage store={store} />;
      case 'Plugins':
        return <PluginsPage store={store} />;
      default:
        return <DashboardHome store={store} />;
    }
  };

  if (activeNav === 'POS') {
    return <POSPage store={store} onExit={() => selectNav('Home')} />;
  }

  return (
    <div className="flex min-h-screen bg-[#f6f6f7] font-sans selection:bg-blue-100 selection:text-blue-700">
      <Sidebar activeNav={activeNav} setActiveNav={selectNav} store={store} />

      <main className="ml-64 min-w-0 flex-1">
        <Header store={store} />

        <div className="mx-auto max-w-7xl p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
