import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { eplazaBanners, eplazaHeroSlides } from '../themeData';

function imageList(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  const text = String(value || '').trim();
  if (text.startsWith('[')) {
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

export const HeroSection = () => {
  const { allowFallbackData, getRecords, store, themePath } = useStorefrontRuntime();
  const sliderRecords = getRecords('homepage-sliders');
  const bannerRecords = getRecords('homepage-banners');
  const slides = (sliderRecords.length
    ? sliderRecords.flatMap((record, index) => imageList(record.data?.images, record.data?.image).map((image, imageIndex) => ({
      id: `${record.data?.slot || record.id}-${imageIndex}`,
      title: record.data?.headline || record.title,
      subtitle: record.data?.text || '',
      cta: record.data?.actionText || 'Shop Now',
      image,
      actionLink: record.data?.actionLink || '/search',
      color: eplazaHeroSlides[index % eplazaHeroSlides.length]?.color || 'bg-primary'
    })))
    : (allowFallbackData ? eplazaHeroSlides.map((fallback, index) => {
    const record = sliderRecords.find((item) => item.data?.slot === fallback.slot) || sliderRecords[index];
    return {
      ...fallback,
      id: fallback.slot,
      title: record?.data?.headline || fallback.title,
      subtitle: record?.data?.text || fallback.subtitle,
      cta: record?.data?.actionText || fallback.cta,
      image: record?.data?.image || fallback.image,
      actionLink: record?.data?.actionLink || '/search'
    };
  }) : []));
  const bannerBySlot = (slot: string, fallback: string) => bannerRecords.find((item) => item.data?.slot === slot)?.data?.image || (allowFallbackData ? fallback : '');
  const auroraImage = bannerBySlot('aurora-headset', eplazaBanners.aurora);
  const dualSenseImage = bannerBySlot('dual-sense', eplazaBanners.dualSense);
  const instantCamerasImage = bannerBySlot('instant-cameras', eplazaBanners.instantCameras);
  const showSideBanners = Boolean(auroraImage || dualSenseImage || instantCamerasImage);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
        <div className="rounded-[10px] border border-gray-100 bg-white p-12 text-center">
          <h1 className="text-2xl font-bold text-[#101010]/90">{store.name}</h1>
          <p className="mt-3 text-sm font-bold text-text-muted">No live homepage content has been added yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Slider */}
        <div className={`relative h-[460px] overflow-hidden rounded-[10px] ${showSideBanners ? 'lg:col-span-6 xl:col-span-6' : 'lg:col-span-12'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute inset-0 flex items-center ${slides[current].color} p-10 lg:p-14`}
            >
              <div className="relative z-10 max-w-xs space-y-4">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]"
                >
                  {slides[current].title}
                </motion.h2>
                <motion.p 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.1 }}
                  className="text-sm lg:text-base text-white/80"
                >
                  {slides[current].subtitle}
                </motion.p>
                <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2 }}
                >
                  <Link
                    to={themePath(slides[current].actionLink)}
                    className="inline-flex rounded-full bg-primary px-8 py-3 text-[13px] font-bold uppercase text-white shadow-md transition-all hover:bg-opacity-90 active:scale-95"
                  >
                    {slides[current].cta}
                  </Link>
                </motion.div>
              </div>
              <div className="absolute inset-y-0 right-0 w-3/4 flex items-center justify-end overflow-hidden">
                <img 
                  src={slides[current].image}
                  alt={slides[current].title} 
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all border border-black/20 ${current === i ? "w-6 bg-white" : "w-1.5 bg-black/30"}`}
              />
            ))}
          </div>
        </div>

        {/* Right Banners Column */}
        {showSideBanners && <div className="flex flex-col gap-6 lg:col-span-6 xl:col-span-6">
          {/* Aurora Headset Banner */}
          {auroraImage && <div className="group relative h-[277px] overflow-hidden rounded-[10px] bg-[#f2f2f5]">
             <img 
               src={auroraImage}
               className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
               alt="Aurora Headset"
             />
             <div className="relative z-10 p-10 space-y-4">
               <h3 className="text-2xl font-bold tracking-tight text-[#101010]/90">Aurora Headset</h3>
               <div className="flex gap-4">
                 <div className="flex flex-col items-center justify-center h-16 w-16 bg-white rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xl font-bold leading-none text-primary">0</p>
                    <p className="text-[9px] uppercase font-bold text-text-muted mt-1">Days</p>
                 </div>
                 <div className="flex flex-col items-center justify-center h-16 w-16 bg-white rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xl font-bold leading-none text-primary">00</p>
                    <p className="text-[9px] uppercase font-bold text-text-muted mt-1">Hr</p>
                 </div>
                 <div className="flex flex-col items-center justify-center h-16 w-16 bg-white rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xl font-bold leading-none text-primary">00</p>
                    <p className="text-[9px] uppercase font-bold text-text-muted mt-1">Min</p>
                 </div>
               </div>
               <Link to={themePath('search')} className="inline-flex bg-primary text-white px-7 py-2.5 rounded-full text-xs font-bold uppercase transition-all hover:bg-opacity-90">
               Buy Now
               </Link>
             </div>
          </div>}
          
          {(dualSenseImage || instantCamerasImage) && <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
            {dualSenseImage && <div className="group relative h-full min-h-[163px] overflow-hidden rounded-[10px] bg-[#f8f8f8]">
              <img src={dualSenseImage} className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt="New Dual Sense" />
              <div className="relative z-10 p-6 flex flex-col justify-center h-full max-w-[150px]">
                <h4 className="text-lg font-bold text-[#101010]/90 leading-tight">New Dual <br/> Sense</h4>
                <p className="text-xs text-text-muted mt-1">For PlayStation 5</p>
                <Link to={themePath('search')} className="mt-4 text-left text-[11px] font-bold text-text-main underline underline-offset-4 decoration-primary-light transition-all hover:text-primary">VIEW DETAILS</Link>
              </div>
            </div>}
            {instantCamerasImage && <div className="group relative h-full min-h-[163px] overflow-hidden rounded-[10px] bg-[#f8f8f8]">
              <img src={instantCamerasImage} className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Instant Cameras" />
              <div className="relative z-10 p-6 flex flex-col justify-center h-full max-w-[150px]">
                <h4 className="text-lg font-bold text-[#101010]/90 leading-tight">Instant <br/> Cameras</h4>
                <p className="text-xs text-text-muted mt-1">Get 20% off</p>
                <Link to={themePath('search')} className="mt-4 text-left text-[11px] font-bold text-text-main underline underline-offset-4 decoration-primary-light transition-all hover:text-primary">VIEW DETAILS</Link>
              </div>
            </div>}
          </div>}
        </div>}
      </div>
    </div>
  );
};
