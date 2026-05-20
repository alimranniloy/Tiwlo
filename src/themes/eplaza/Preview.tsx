import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { MessageCircle, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { fetchPrimaryStore, fetchStoreThemeRuntime } from '../../lib/tiwloApi';
import type { StoreThemeRuntime } from '../../lib/tiwloApi';
import { StorefrontRuntimeProvider, useStorefrontRuntime } from '../shared/storefrontRuntime';
import { CartProvider } from './src/context/CartContext';
import { CartDrawer } from './src/components/CartDrawer';
import { Header } from './src/components/Header';
import { HeroSection } from './src/components/Hero';
import { PopularCategories } from './src/components/CategoryGrid';
import { ProductSection } from './src/components/ProductSection';
import { ProductCard } from './src/components/ProductCard';
import { ApplePromotion, BlogSection } from './src/components/Promotions';
import { BottomPromos, Footer } from './src/components/Footer';
import { SideNav } from './src/components/SideNav';
import { MobileNav } from './src/components/MobileNav';
import { ProductDetail } from './src/pages/ProductDetail';
import { Checkout } from './src/pages/Checkout';
import { Compare } from './src/pages/Compare';
import { SearchPage } from './src/pages/SearchPage';
import { TrackOrder } from './src/pages/TrackOrder';
import { eplazaFallbackCategories, eplazaFallbackProducts, eplazaBanners } from './src/themeData';
import { formatMoney, toEplazaProducts } from './src/lib/utils';
import type { Product } from './src/types';

function uniqueProducts(products: Product[]) {
  return Array.from(new Map(products.map((product) => [product.id, product])).values());
}

function EplazaHome() {
  const { products, runtime, store } = useStorefrontRuntime();
  const showPreviewCatalog = !runtime || runtime.preview === true;
  const productPool = React.useMemo(() => uniqueProducts([
    ...toEplazaProducts(products),
    ...(showPreviewCatalog ? toEplazaProducts(eplazaFallbackProducts) : [])
  ]), [products, showPreviewCatalog]);

  const bestOffers = productPool.slice(0, 5);
  const newGoods = productPool.slice(5, 13);
  const appliances = productPool.filter((product) => /oven|blender|washing|appliance|fridge/i.test(product.category)).slice(0, 5);
  const homeAppliances = appliances.length >= 4 ? appliances : productPool.slice(7, 12);
  const featured = productPool[5] || productPool[0];

  if (!productPool.length && !showPreviewCatalog) {
    return (
      <main>
        <HeroSection />
        <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
          <div className="rounded-[10px] border border-gray-100 bg-white p-12 text-center">
            <h2 className="text-2xl font-bold text-[#101010]/90">{store.name}</h2>
            <p className="mt-3 text-sm font-bold text-text-muted">No live catalog data has been added yet.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-0">
      <HeroSection />
      <div className="py-2">
        <PopularCategories />
      </div>

      <div className="py-2">
        <ProductSection title="The Best Offers" products={bestOffers} />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="relative min-h-[400px] overflow-hidden rounded-[10px] bg-black p-10 text-white lg:col-span-3">
            <div className="relative z-10 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">At a good price</p>
              <h3 className="text-3xl font-bold leading-tight text-white">Nothing <br /> Phone 1</h3>
              <button className="mt-8 rounded-full bg-[#2463d1] px-8 py-3 text-xs font-bold uppercase shadow-lg transition-all hover:bg-black">Buy Now</button>
            </div>
            <img
              src={eplazaBanners.phoneFeature}
              className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-screen"
              alt="Nothing Phone"
            />
          </div>
          <div className="text-left lg:col-span-9">
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold uppercase tracking-tight text-[#101010] lg:text-2xl">New Goods</h2>
              <span className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-widest text-[#2463d1]">
                Live Catalog
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {newGoods.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="py-2">
        <ApplePromotion />
      </div>

      <div className="py-2">
        <ProductSection title="Home Appliance" products={homeAppliances} />
      </div>

      {featured && (
        <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-8 lg:py-8">
          <div className="relative grid grid-cols-1 items-center gap-8 overflow-hidden rounded-[10px] border border-gray-100 bg-white p-10 lg:grid-cols-12 lg:gap-12 lg:p-20">
            <div className="relative z-10 space-y-6 text-left lg:col-span-7 xl:col-span-8">
              <h2 className="text-4xl font-bold tracking-tight text-[#101010] lg:text-6xl">Microsoft Accessories</h2>
              <p className="max-w-xl text-lg font-medium text-text-muted">Personalize your setup with premium accessories connected to {store.name}'s live storefront catalog.</p>
              <div className="flex flex-wrap gap-3 pt-4">
                {['Keyboards', 'Surface Pen', 'Mice', 'Headphones'].map((item) => (
                  <button key={item} className="rounded-full border-[1.5px] border-gray-100 bg-white px-6 py-2.5 text-[11px] font-bold uppercase text-text-main shadow-sm transition-all hover:border-[#2463d1] hover:text-[#2463d1] active:scale-95">{item}</button>
                ))}
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center lg:col-span-5 xl:col-span-4">
              <img src={eplazaBanners.microsoft} className="w-full max-w-md object-contain drop-shadow-2xl" alt="Microsoft accessories" />
              <div className="mt-12 w-full max-w-sm rounded-[12px] border border-white/50 bg-[#2463d1]/5 p-8 text-center shadow-sm backdrop-blur-sm transition-transform hover:scale-105">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">{featured.category}</p>
                <h4 className="mt-1 text-lg font-bold text-[#101010]">{featured.name}</h4>
                <p className="mt-2 text-xl font-black text-[#2463d1]">{formatMoney(featured.price, store.currency)}</p>
                <button className="mt-8 w-full rounded-full bg-[#2463d1] py-3.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg hover:bg-black">Add To Cart</button>
              </div>
            </div>
            <div className="absolute right-0 top-0 h-full w-[50%] translate-x-1/4 rounded-l-full bg-[#2463d1]/5" />
          </div>
        </div>
      )}

      <BottomPromos />

      <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
        <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4 text-left">
          <h2 className="text-xl font-bold uppercase tracking-tight text-[#101010] lg:text-2xl">Recently Viewed</h2>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {productPool.slice(0, 4).map((product) => (
            <ProductCard key={`recent-${product.id}`} product={product} />
          ))}
        </div>
      </div>

      <div className="py-2">
        <BlogSection />
      </div>

      <div className="border-y border-gray-100 bg-white py-10">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {[
            { title: 'Free Delivery', desc: 'From all orders over $100', Icon: Truck },
            { title: '90 Days Return', desc: 'If goods have problems', Icon: RotateCcw },
            { title: 'Secure Payment', desc: '100% secure payment', Icon: ShieldCheck },
            { title: '24/7 Support', desc: 'Dedicated support', Icon: MessageCircle }
          ].map(({ title, desc, Icon }) => (
            <div key={title} className="flex cursor-default items-center gap-4 text-left">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f8faff] text-[#2463d1] transition-transform group-hover:scale-110">
                <Icon size={28} strokeWidth={1.7} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold uppercase tracking-wide text-[#101010]">{title}</h4>
                <p className="mt-0.5 text-[13px] text-text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function EplazaShell({ error }: { error: string }) {
  return (
    <CartProvider>
      <div className="eplaza-theme min-h-screen bg-page-bg text-text-main">
        {error && (
          <div className="bg-blue-50 px-4 py-2 text-center text-xs font-bold text-blue-700">
            {error}. Showing local Eplaza preview data.
          </div>
        )}
        <SideNav />
        <div className="xl:pl-[60px]">
          <Header />
          <CartDrawer />
          <MobileNav />
          <Routes>
            <Route path="/" element={<EplazaHome />} />
            <Route path="" element={<EplazaHome />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="compare" element={<Compare />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="category/:category" element={<SearchPage />} />
            <Route path="track-order" element={<TrackOrder />} />
            <Route path="*" element={<SearchPage />} />
          </Routes>
          <Footer />
        </div>
      </div>
    </CartProvider>
  );
}

export function EplazaStorefront({
  runtime,
  error,
  basePath = '/themes/eplaza',
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
      themeKey="eplaza"
      basePath={basePath}
      fallbackProductList={eplazaFallbackProducts}
      fallbackCategoryList={eplazaFallbackCategories}
      allowFallbackData={allowFallbackData}
    >
      <EplazaShell error={error} />
    </StorefrontRuntimeProvider>
  );
}

export default function EplazaPreview() {
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
          themeKey: params.get('theme') || 'eplaza',
          templateKey: params.get('template') || 'eplaza',
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
          const message = err instanceof Error ? err.message : 'Unable to load Eplaza store data';
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
      <div className="grid min-h-screen place-items-center bg-page-bg text-[#101010]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#2463d1]" aria-label="Loading" />
      </div>
    );
  }

  return <EplazaStorefront runtime={runtime} error={error} />;
}
