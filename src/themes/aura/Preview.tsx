import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { fetchPrimaryStore, fetchStoreThemeRuntime } from '../../lib/tiwloApi';
import type { StoreThemeRuntime } from '../../lib/tiwloApi';
import {
  StorefrontRuntimeProvider,
  useStorefrontRuntime
} from '../shared/storefrontRuntime';
import MobileBottomNav from './src/components/MobileBottomNav';
import Navbar from './src/components/Navbar';
import Cart from './src/pages/Cart';
import Checkout from './src/pages/Checkout';
import Compare from './src/pages/Compare';
import Home from './src/pages/Home';
import ProductDetail from './src/pages/ProductDetail';
import Search from './src/pages/Search';
import TrackOrder from './src/pages/TrackOrder';
import { auraFallbackCategories, auraFallbackProducts } from './src/themeData';

function AuraFooter() {
  const { store, settings, getRecords } = useStorefrontRuntime();
  const footerRecords = getRecords('footer');
  const columns = footerRecords.length ? footerRecords : [
    {
      id: 'care',
      title: 'Customer Care',
      status: 'active',
      data: { title: 'Customer Care', items: 'Help Center, How to Buy, Returns & Refunds, Contact Us' }
    },
    {
      id: 'brand',
      title: store.name,
      status: 'active',
      data: { title: store.name, items: `About ${store.name}, Careers, Terms, Privacy Policy` }
    }
  ];

  return (
    <footer className="mt-auto bg-[#2e2e2e] py-8 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 pb-8 md:grid-cols-4">
          {columns.slice(0, 2).map((column) => (
            <div key={column.id}>
              <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-[var(--aura-accent)]">{column.data?.title || column.title}</h4>
              <ul className="space-y-2 p-0 text-[10px] font-medium text-gray-400">
                {String(column.data?.items || '')
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((item) => (
                    <li key={item}><button className="transition-colors hover:text-white">{item}</button></li>
                  ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 flex flex-col justify-between md:items-end">
            <div className="flex items-start gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--aura-accent)]">Happy Shopping!</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-gray-500">{store.name}, your market your way.</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--aura-accent)] text-xl font-bold">{settings.brandInitial}</div>
            </div>
            <div className="mt-6 flex flex-col gap-2 text-[10px] text-gray-500 md:mt-0 md:items-end">
              <div className="flex gap-4">
                <button className="transition-colors hover:text-white">App Store</button>
                <button className="transition-colors hover:text-white">Google Play</button>
                <button className="transition-colors hover:text-white">AppGallery</button>
              </div>
              <p>Copyright {store.name} 2026. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AuraShell({ error }: { error: string }) {
  const { settings } = useStorefrontRuntime();
  return (
    <div
      className="flex min-h-screen flex-col bg-[#f7f8fa] font-sans selection:bg-orange-100 selection:text-orange-900"
      style={{
        '--aura-accent': settings.accentColor,
        '--aura-accent-dark': settings.accentDark
      } as React.CSSProperties}
    >
      {error && (
        <div className="bg-orange-50 px-4 py-2 text-center text-xs font-bold text-orange-700">
          {error}. Showing local preview data.
        </div>
      )}
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="" element={<Home />} />
          <Route path="cart" element={<Cart />} />
          <Route path="compare" element={<Compare />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="track-order" element={<TrackOrder />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="search" element={<Search />} />
          <Route path="category/:category" element={<Search />} />
          <Route path="*" element={<Search />} />
        </Routes>
      </main>
      <MobileBottomNav />
      <AuraFooter />
    </div>
  );
}

export function AuraStorefront({
  runtime,
  error,
  basePath = '/themes/aura',
  allowFallbackData = true
}: {
  runtime: StoreThemeRuntime | null;
  error: string;
  basePath?: string;
  allowFallbackData?: boolean;
}) {
  return (
    <StorefrontRuntimeProvider
      runtime={runtime}
      themeKey="aura"
      basePath={basePath}
      fallbackProductList={auraFallbackProducts}
      fallbackCategoryList={auraFallbackCategories}
      allowFallbackData={allowFallbackData}
    >
      <AuraShell error={error} />
    </StorefrontRuntimeProvider>
  );
}

export default function AuraPreview() {
  const location = useLocation();
  const [runtime, setRuntime] = React.useState<StoreThemeRuntime | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(location.search);
    const storeId = params.get('storeId') || undefined;
    const slug = params.get('slug') || undefined;

    async function loadRuntime() {
      setLoading(true);
      setError('');
      try {
        const primaryStore = storeId || slug ? null : await fetchPrimaryStore();
        const request = {
          storeId: storeId || primaryStore?.id,
          slug,
          themeKey: params.get('theme') || 'aura',
          templateKey: params.get('template') || 'aura',
          preview: params.get('preview') === '1'
        };
        let data: StoreThemeRuntime;
        try {
          data = await fetchStoreThemeRuntime(request);
        } catch (err) {
          const message = err instanceof Error ? err.message : '';
          if (!message.toLowerCase().includes('theme not found')) throw err;
          data = await fetchStoreThemeRuntime({
            storeId: request.storeId,
            slug,
            preview: request.preview
          });
        }
        if (mounted) setRuntime(data);
      } catch (err) {
        if (mounted) {
          setRuntime(null);
          const message = err instanceof Error ? err.message : 'Unable to load Aura store data';
          setError(message.toLowerCase().includes('theme not found') ? '' : message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRuntime();
    return () => {
      mounted = false;
    };
  }, [location.search]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fa] text-[#212121]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--aura-accent,#f85606)]" aria-label="Loading" />
      </div>
    );
  }

  return <AuraStorefront runtime={runtime} error={error} />;
}
