import React from 'react';
import { ChevronDown } from 'lucide-react';
import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom';
import { StorefrontRuntimeProvider, useStorefrontRuntime } from '../../shared/storefrontRuntime';
import { CartDrawer } from './components/CartDrawer';
import { PopularCategories } from './components/CategoryGrid';
import { BottomPromos, Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroSection } from './components/Hero';
import { MobileNav } from './components/MobileNav';
import { ProductCard } from './components/ProductCard';
import { ProductSection } from './components/ProductSection';
import { ApplePromotion, BlogSection } from './components/Promotions';
import { SideNav } from './components/SideNav';
import { CartProvider } from './context/CartContext';
import { Checkout } from './pages/Checkout';
import { Compare } from './pages/Compare';
import { ProductDetail } from './pages/ProductDetail';
import { SearchPage } from './pages/SearchPage';
import { TrackOrder } from './pages/TrackOrder';
import { eplazaBanners, eplazaFallbackCategories, eplazaFallbackProducts } from './themeData';
import { formatMoney, toEplazaProducts } from './lib/utils';

const products = toEplazaProducts(eplazaFallbackProducts);
const bestOffers = products.slice(0, 5);
const newGoods = products.slice(5, 13);
const homeAppliances = products
  .filter((product) => /oven|blender|washing|appliance|fridge/i.test(product.category))
  .slice(0, 5);

const HomePage = () => {
  const { store, themePath } = useStorefrontRuntime();
  const featured = products[5] || products[0];

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
              <h3 className="text-3xl font-bold leading-tight">Nothing <br /> Phone 1</h3>
              <Link to={themePath('search')} className="mt-8 inline-flex rounded-full bg-[#2463d1] px-8 py-3 text-xs font-bold uppercase shadow-lg transition-all hover:bg-black">
                Buy Now
              </Link>
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
              <Link to={themePath('search')} className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-widest text-[#2463d1]">
                More Products
              </Link>
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
              <p className="max-w-xl text-lg font-medium text-text-muted">
                Personalize your setup with premium accessories connected to {store.name}'s storefront catalog.
              </p>
              <div className="flex flex-wrap gap-3 pt-4">
                {['Keyboards', 'Surface Pen', 'Mice', 'Headphones'].map((item) => (
                  <Link
                    key={item}
                    to={themePath(`search?q=${encodeURIComponent(item)}`)}
                    className="rounded-full border-[1.5px] border-gray-100 bg-white px-6 py-2.5 text-[11px] font-bold uppercase text-text-main shadow-sm transition-all hover:border-[#2463d1] hover:text-[#2463d1] active:scale-95"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center lg:col-span-5 xl:col-span-4">
              <img src={eplazaBanners.microsoft} className="w-full max-w-md object-contain drop-shadow-2xl" alt="Microsoft accessories" />
              <div className="mt-12 w-full max-w-sm rounded-[12px] border border-white/50 bg-[#2463d1]/5 p-8 text-center shadow-sm backdrop-blur-sm transition-transform hover:scale-105">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">{featured.category}</p>
                <h4 className="mt-1 text-lg font-bold text-[#101010]">{featured.name}</h4>
                <p className="mt-2 text-xl font-black text-[#2463d1]">{formatMoney(featured.price, store.currency)}</p>
                <Link to={themePath(`product/${featured.id}`)} className="mt-8 inline-flex w-full justify-center rounded-full bg-[#2463d1] py-3.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg hover:bg-black">
                  View Product
                </Link>
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
          {bestOffers.slice(0, 4).map((product) => (
            <Link key={product.id} to={themePath(`product/${product.id}`)} className="group flex min-w-[300px] cursor-pointer items-center gap-5 rounded-[4px] border border-gray-100 bg-white p-5 transition-all hover:shadow-xl">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden">
                <img src={product.image} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110" alt={product.name} />
              </div>
              <div className="space-y-1 text-left">
                <h4 className="line-clamp-1 text-[13px] font-bold text-[#101010] transition-colors group-hover:text-[#2463d1]">{product.name}</h4>
                <p className="text-[14px] font-bold text-[#2463d1]">{formatMoney(product.price, store.currency)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="py-2">
        <BlogSection />
      </div>
    </main>
  );
};

export default function App() {
  return (
    <Router>
      <StorefrontRuntimeProvider
        runtime={null}
        themeKey="eplaza"
        basePath=""
        fallbackProductList={eplazaFallbackProducts}
        fallbackCategoryList={eplazaFallbackCategories}
      >
        <CartProvider>
          <div className="min-h-screen bg-page-bg">
            <SideNav />
            <div className="xl:pl-[60px]">
              <Header />
              <CartDrawer />
              <MobileNav />

              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/category/:category" element={<SearchPage />} />
                <Route path="/track-order" element={<TrackOrder />} />
              </Routes>

              <Footer />
              <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
                <button className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-text-main shadow-2xl transition-all hover:border-primary hover:bg-primary hover:text-white">
                  <ChevronDown size={20} className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </CartProvider>
      </StorefrontRuntimeProvider>
    </Router>
  );
}
