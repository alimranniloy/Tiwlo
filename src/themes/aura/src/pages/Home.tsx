import React, { useEffect, useState, useRef } from "react";
import ProductCard from "../components/ProductCard";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ArrowRight, Zap, ShieldCheck, Truck, Heart, Star, CreditCard, RefreshCcw, Tag, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../lib/utils";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";
import { auraBannerSlots, auraBrandImages, auraCategoryImages, auraFallbackCategories, auraHeroImages } from "../themeData";

function imageList(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  const text = String(value || "").trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return fallback ? [String(fallback)] : [];
    }
  }
  const rows = text ? text.split(/\n|,/).map((item) => item.trim()).filter(Boolean) : [];
  return rows.length ? rows : (fallback ? [String(fallback)] : []);
}

export default function Home() {
  const { allowFallbackData, products, categories: runtimeCategories, getRecords, store, themePath } = useStorefrontRuntime();
  const loading = false;
  const [displayCount, setDisplayCount] = useState(12);
  const observerTarget = useRef(null);
  const emptyImage = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setDisplayCount(prev => prev + 6);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loading]);

  const categoryRecords = getRecords("categories");
  const categoryImage = (name: string, index: number) => {
    const record = categoryRecords.find((item) => String(item.data?.name || item.title || "").toLowerCase() === name.toLowerCase());
    return record?.data?.image || (allowFallbackData ? auraCategoryImages[index % auraCategoryImages.length] : emptyImage);
  };
  const visibleCategories = runtimeCategories.length ? runtimeCategories : (allowFallbackData ? auraFallbackCategories : []);
  const categories = visibleCategories.map((name, index) => ({
    name,
    image: categoryImage(name, index),
    active: name === "Beauty" || index === 0
  }));

  const sliderImages = getRecords("homepage-sliders").flatMap((record) => imageList(record.data?.images, record.data?.image)).filter(Boolean);
  const heroImages = sliderImages.length ? sliderImages : (allowFallbackData ? auraHeroImages : [emptyImage]);
  const bannerRecords = getRecords("homepage-banners");
  const bannerBySlot = (slot: string, fallback: string) => bannerRecords.find((record) => record.data?.slot === slot)?.data?.image || (allowFallbackData ? fallback : emptyImage);
  const brandImages = bannerRecords
    .filter((record) => String(record.data?.slot || "").startsWith("brand-") && record.data?.image)
    .map((record) => record.data.image);
  const displayBrandImages = brandImages.length >= 6 ? brandImages.slice(0, 6) : (allowFallbackData ? auraBrandImages : []);
  const homeProducts = products.length >= 12 || !allowFallbackData ? products : [
    ...products,
    ...products
  ];
  const [currentSlide, setCurrentSlide] = useState(0);
  const hasManagedHomepageData = sliderImages.length > 0 || bannerRecords.length > 0 || runtimeCategories.length > 0;

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-[var(--aura-accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!allowFallbackData && !products.length && !hasManagedHomepageData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-sm border border-gray-100 bg-white p-12 text-center">
          <h1 className="text-2xl font-black text-gray-900">{store.name}</h1>
          <p className="mt-3 text-sm font-bold text-gray-400">No live catalog data has been added yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-6 lg:px-8 py-2 md:py-6 space-y-4 md:space-y-6">
      {/* Top Section with Sidebar and Hero Slider */}
      <div className="flex gap-4 lg:h-[384px]">
        {/* Sidebar - Desktop Only */}
        <aside className="w-56 bg-white rounded-sm border border-gray-100 overflow-hidden hidden lg:flex flex-col py-2 shrink-0">
          {categories.map((cat, i) => (
            <div 
              key={i} 
              className={`px-3 py-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer text-[11px] font-bold transition-colors ${cat.active ? 'text-[var(--aura-accent)] bg-orange-50/20' : 'text-gray-600'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                  <img src={cat.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span>{cat.name}</span>
              </div>
              <ChevronRight className={`w-3 h-3 ${cat.active ? 'text-[var(--aura-accent)]' : 'text-gray-300'}`} />
            </div>
          ))}
        </aside>

        {/* Enhanced Hero Slider - Responsive */}
        <section className="flex-1 relative aspect-[16/7] md:aspect-[21/9] lg:aspect-auto rounded-sm overflow-hidden border border-gray-100 group bg-gray-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <img 
                src={heroImages[currentSlide]} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-4 md:bottom-6 left-4 md:left-10 flex gap-1 transition-opacity group-hover:opacity-100 opacity-60">
             {heroImages.map((_, i) => (
                <div 
                  key={i} 
                  onClick={() => setCurrentSlide(i)}
                  className={`h-0.5 md:h-1 cursor-pointer transition-all ${i === currentSlide ? 'w-6 md:w-10 bg-[var(--aura-accent)]' : 'w-2 md:w-4 bg-white/40 hover:bg-white'}`} 
                />
             ))}
          </div>
        </section>
      </div>

      {/* Category Section - Premium Scroller */}
      <section className="bg-white p-3 md:p-6 rounded-sm border border-gray-100 overflow-hidden">
         <div className="flex items-center justify-between mb-4 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3">
               <div className="w-1 md:w-1.5 h-4 md:h-6 bg-[var(--aura-accent)]" />
               <h2 className="text-[11px] md:text-sm font-black text-gray-900 uppercase tracking-[0.1em]">Featured Categories</h2>
            </div>
            <button className="text-[10px] md:text-xs font-bold text-[var(--aura-accent)] hover:underline uppercase tracking-tighter cursor-pointer">View All</button>
         </div>
         <div className="flex overflow-x-auto gap-4 md:gap-6 pb-2 scrollbar-hide md:grid md:grid-cols-6 lg:grid-cols-8">
            {categories.map((cat, i) => (
               <div key={i} className="flex flex-col items-center gap-3 group cursor-pointer min-w-[76px] md:min-w-0 shrink-0">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border border-gray-100 group-hover:border-[var(--aura-accent)] transition-all bg-white shadow-sm flex items-center justify-center p-1">
                       <img 
                          src={cat.image} 
                          className="w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110" 
                          referrerPolicy="no-referrer"
                       />
                    </div>
                    {cat.active && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-[var(--aura-accent)] rounded-full border-2 border-white shadow-sm" />
                    )}
                  </div>
                  <span className="text-[9px] md:text-[10px] font-black text-gray-700 text-center leading-tight uppercase tracking-widest group-hover:text-[var(--aura-accent)] transition-colors max-w-[80px]">{cat.name}</span>
               </div>
            ))}
         </div>
      </section>

      {/* Banner Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
         {[
           { label: "Safe payments", icon: <CreditCard className="w-3.5 h-3.5 md:w-5 md:h-5 text-blue-500" />, bg: "bg-white" },
           { label: "100% Authentic", icon: <Award className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500" />, bg: "bg-white" },
           { label: "Easy Returns", icon: <RefreshCcw className="w-3.5 h-3.5 md:w-5 md:h-5 text-green-500" />, bg: "bg-white" },
           { label: "Lowest Price", icon: <Tag className="w-3.5 h-3.5 md:w-5 md:h-5 text-red-500" />, bg: "bg-white" }
         ].map((item, i) => (
            <div key={i} className={`${item.bg} p-2 md:p-4 rounded-sm border border-gray-100 flex items-center justify-center gap-1.5 md:gap-3 transition-all cursor-pointer hover:bg-gray-50`}>
               {item.icon}
               <span className="text-[8px] md:text-[11px] font-bold text-[#212121] uppercase tracking-tighter">{item.label}</span>
            </div>
         ))}
      </div>

      {/* Flash Sale Section */}
      <section className="space-y-1.5 md:space-y-2">
         <div className="bg-white px-3 md:px-5 py-3 md:py-5 rounded-t-sm border border-gray-100 flex items-center justify-between border-b border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--aura-accent)]/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-[var(--aura-accent)]" />
            <div className="flex items-center gap-3 md:gap-12 relative z-10">
               <div className="flex items-center gap-2">
                  <span className="text-[var(--aura-accent)] font-bold text-sm md:text-xl uppercase tracking-tighter md:tracking-tight">Flash Sale</span>
               </div>
               
               <div className="flex items-center gap-1 md:gap-2">
                  <div className="bg-[#212121] text-white text-[9px] md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm font-bold">04</div>
                  <span className="text-gray-300 font-bold text-[9px]">:</span>
                  <div className="bg-[#212121] text-white text-[9px] md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm font-bold">22</div>
                  <span className="text-gray-300 font-bold text-[9px]">:</span>
                  <div className="bg-[#212121] text-white text-[9px] md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm font-bold">18</div>
               </div>
            </div>
            <button className="text-[var(--aura-accent)] font-bold text-[9px] md:text-xs uppercase hover:bg-orange-50 px-2 md:px-4 py-1.5 md:py-2 rounded-sm transition-all flex items-center gap-1">
               More <ChevronRight className="w-3 md:w-4 h-3 md:h-4" />
            </button>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {homeProducts.slice(0, 6).map((product) => (
               <ProductCard key={product.id} product={product} />
            ))}
         </div>
      </section>

      {/* NEW SECTION 1: Daily Value (Bento Style) */}
      <section className="grid md:grid-cols-4 gap-3">
         <div className="md:col-span-2 rounded-sm overflow-hidden h-48 border border-gray-100 cursor-pointer group">
            <img 
               src={bannerBySlot("daily-wide", auraBannerSlots.dailyWide)} 
               className="w-full h-full object-cover transition-transform group-hover:scale-105" 
               referrerPolicy="no-referrer"
            />
         </div>
         <div className="rounded-sm overflow-hidden h-48 border border-gray-100 cursor-pointer group">
            <img 
               src={bannerBySlot("daily-small-1", auraBannerSlots.dailySmallOne)} 
               className="w-full h-full object-cover transition-transform group-hover:scale-105" 
               referrerPolicy="no-referrer"
            />
         </div>
         <div className="rounded-sm overflow-hidden h-48 border border-gray-100 cursor-pointer group">
            <img 
               src={bannerBySlot("daily-small-2", auraBannerSlots.dailySmallTwo)} 
               className="w-full h-full object-cover transition-transform group-hover:scale-105" 
               referrerPolicy="no-referrer"
            />
         </div>
      </section>

      {/* NEW SECTION: Top Deals */}
      <section className="bg-white p-6 rounded-sm border border-gray-100">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-blue-500" />
               <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Top Deals For You</h2>
            </div>
            <button className="text-xs font-bold text-gray-500 hover:text-blue-500 uppercase flex items-center gap-1 group">
               Explore More <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {homeProducts.slice(6, 12).map((product) => (
               <div key={product.id} className="group cursor-pointer">
                  <div className="aspect-square bg-gray-50 rounded-sm overflow-hidden mb-3 border border-transparent group-hover:border-blue-100 transition-all">
                     <img src={product.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-blue-500 transition-colors uppercase tracking-tighter">{product.name}</h4>
                  <p className="text-[11px] font-bold text-[var(--aura-accent)] mt-1">{formatCurrency(product.price, store.currency)}</p>
               </div>
            ))}
         </div>
      </section>

      {/* Official Brands Section */}
      <section className="bg-white p-6 rounded-sm border border-gray-100">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-[#212121] uppercase tracking-wide">Official Brands</h2>
            <button className="text-[12px] font-bold text-[var(--aura-accent)] hover:underline uppercase tracking-tighter">View All</button>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {displayBrandImages.map((img, i) => (
               <div key={i} className="aspect-[4/3] bg-gray-50 rounded-sm overflow-hidden group cursor-pointer border border-gray-100 hover:border-[var(--aura-accent)] transition-all relative">
                  <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
               </div>
            ))}
         </div>
      </section>

      {/* NEW SECTION 2: Trending Rankings */}
      <section className="grid md:grid-cols-2 gap-6">
         <div className="bg-white p-5 rounded-sm border border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#212121] mb-4 border-b border-gray-100 pb-2">Most Popular</h3>
            <div className="space-y-4">
               {homeProducts.slice(0, 3).map((p, i) => (
                  <Link to={themePath(`product/${p.id}`)} key={i} className="flex gap-4 group cursor-pointer">
                     <div className="w-12 h-12 rounded bg-gray-50 shrink-0 overflow-hidden">
                        <img src={p.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     </div>
                     <div>
                        <p className="text-[11px] font-medium text-[#212121] line-clamp-1 group-hover:text-[var(--aura-accent)] transition-colors">{p.name}</p>
                        <p className="text-[10px] text-[var(--aura-accent)] font-bold mt-0.5">{formatCurrency(p.price, store.currency)}</p>
                     </div>
                  </Link>
               ))}
            </div>
         </div>
         <div className="bg-white p-5 rounded-sm border border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#212121] mb-4 border-b border-gray-100 pb-2">New Arrivals</h3>
            <div className="space-y-4">
               {homeProducts.slice(3, 6).map((p, i) => (
                  <Link to={themePath(`product/${p.id}`)} key={i} className="flex gap-4 group cursor-pointer">
                     <div className="w-12 h-12 rounded bg-gray-50 shrink-0 overflow-hidden">
                        <img src={p.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     </div>
                     <div>
                        <p className="text-[11px] font-medium text-[#212121] line-clamp-1 group-hover:text-[var(--aura-accent)] transition-colors">{p.name}</p>
                        <p className="text-[10px] text-[#212121] font-bold mt-0.5">{formatCurrency(p.price, store.currency)}</p>
                     </div>
                  </Link>
               ))}
            </div>
         </div>
      </section>

      {/* NEW SECTION 3: Featured Banner (Image Only) */}
      <section className="relative rounded-sm overflow-hidden h-[340px] border border-gray-100">
         <img 
            src={bannerBySlot("featured", auraBannerSlots.featured)} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
      </section>

      {/* Just For You (Main Product Feed) */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-base font-bold text-[#212121] uppercase tracking-tight">Just For You</h2>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {homeProducts.slice(0, displayCount).map((product, idx) => (
            <ProductCard key={`${product.id}-${idx}`} product={product} />
          ))}
        </div>
        
        {/* Infinite Scroll Trigger */}
        <div ref={observerTarget} className="h-20 flex items-center justify-center mt-10">
           {displayCount < 50 && (
             <div className="w-6 h-6 border-2 border-[var(--aura-accent)] border-t-transparent rounded-full animate-spin"></div>
           )}
        </div>
      </section>

      {/* Bottom Stripe Banner (Image Only) */}
      <section className="rounded-sm overflow-hidden border border-gray-100 h-56">
         <img 
           src={bannerBySlot("bottom", auraBannerSlots.bottom)} 
           className="w-full h-full object-cover"
           referrerPolicy="no-referrer"
         />
      </section>

      {/* Bottom Service Banner */}
      <section className="bg-white p-10 rounded-sm border border-gray-100">
         <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center space-y-3">
               <div className="w-12 h-12 bg-[#f0f1f4] rounded-full flex items-center justify-center text-[var(--aura-accent)]"><Truck className="w-6 h-6" /></div>
               <h3 className="font-bold text-xs uppercase text-[#212121]">Express Delivery</h3>
               <p className="text-[10px] text-gray-500">Fastest delivery to your doorstep within 48 hours in major cities.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 border-x border-gray-100 px-12">
               <div className="w-12 h-12 bg-[#f0f1f4] rounded-full flex items-center justify-center text-[var(--aura-accent)]"><Heart className="w-6 h-6" /></div>
               <h3 className="font-bold text-xs uppercase text-[#212121]">Best Service</h3>
               <p className="text-[10px] text-gray-500">24/7 dedicated customer support for all your queries and concerns.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
               <div className="w-12 h-12 bg-[#f0f1f4] rounded-full flex items-center justify-center text-[var(--aura-accent)]"><ShieldCheck className="w-6 h-6" /></div>
               <h3 className="font-bold text-xs uppercase text-[#212121]">Genuine Products</h3>
               <p className="text-[10px] text-gray-500">We guarantee 100% authentic products from official distributors.</p>
            </div>
         </div>
      </section>
    </div>
  );
}
