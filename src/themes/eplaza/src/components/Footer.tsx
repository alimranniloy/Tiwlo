import { Facebook, Twitter, Instagram, Youtube, ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { eplazaBanners } from '../themeData';

export const StoreLinks = () => {
  const { allowFallbackData, store } = useStorefrontRuntime();
  const stores = [
    { name: `${store.name} Main Store`, address: store.address || '1260 Broadway, San Francisco, CA 94109' },
    ...(allowFallbackData ? [
      { name: 'Valencia Store', address: '1501 Valencia St, San Francisco, CA 94110' },
      { name: 'Emeryville Store', address: '1034 36th St, Emeryville, CA 94608' },
      { name: 'Alameda Store', address: '1433 High St, Alameda, CA 94501' }
    ] : [])
  ];

  return (
    <div className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12 lg:px-8">
        {stores.map((store) => (
          <div key={store.name} className="group flex flex-col items-start">
            <div className="mb-2 flex w-full items-center justify-between">
              <h4 className="cursor-pointer text-[18px] font-bold text-[#101010]/90 transition-colors group-hover:text-primary">{store.name}</h4>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-primary transition-all group-hover:bg-primary group-hover:text-white">
                <ChevronRight size={14} />
              </div>
            </div>
            <p className="text-[14px] leading-relaxed text-text-muted">{store.address}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BottomPromos = () => {
  const { allowFallbackData, getRecords, themePath } = useStorefrontRuntime();
  const bannerRecords = getRecords('homepage-banners');
  const promo = (slot: string, fallback: { title: string; text: string; image: string }) => {
    const record = bannerRecords.find((item) => item.data?.slot === slot);
    return {
      title: record?.data?.headline || (allowFallbackData ? fallback.title : ''),
      text: record?.data?.text || (allowFallbackData ? fallback.text : ''),
      image: record?.data?.image || (allowFallbackData ? fallback.image : ''),
      actionLink: record?.data?.actionLink || 'search'
    };
  };
  const promos = [
    promo('bottom-xiaomi', { title: 'Xiaomi Mi 11', text: 'Discount up to 30%', image: eplazaBanners.xiaomi }),
    promo('bottom-hp', { title: 'HP Laser Jet', text: 'Personal printer', image: eplazaBanners.hp }),
    promo('bottom-joycons', { title: 'White Joy Cons', text: 'Novelty items', image: eplazaBanners.joyCons })
  ];

  const visiblePromos = promos.filter((item) => item.title && item.image);

  if (!visiblePromos.length) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {visiblePromos.map((item) => (
          <div key={item.title} className="group relative flex h-44 items-center overflow-hidden rounded-[10px] border border-gray-100 bg-white p-8 transition-all hover:shadow-lg">
            <div className="relative z-10 space-y-1 text-left">
              <h3 className="text-xl font-bold tracking-tight text-[#101010]/90">{item.title}</h3>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">{item.text}</p>
              <Link to={themePath(item.actionLink)} className="mt-4 inline-flex text-[10px] font-bold uppercase tracking-widest text-text-main underline decoration-gray-100 underline-offset-4 transition-all hover:text-primary group-hover:decoration-primary">VIEW DETAILS</Link>
            </div>
            <img
              src={item.image}
              className="absolute bottom-0 right-0 h-full w-1/2 object-cover transition-transform duration-500 group-hover:scale-105"
              alt={item.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const Footer = () => {
  const { store, categories, themePath } = useStorefrontRuntime();

  return (
    <footer className="mt-12 bg-white">
      <StoreLinks />

      <div className="mx-auto max-w-[1400px] border-t border-gray-100/50 px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-3">
            <div className="flex items-center">
              <span className="text-xl font-black tracking-tight text-[#101010]">{store.name || 'Eplaza'}</span>
            </div>
            <p className="pr-8 text-[14px] leading-relaxed text-text-muted">
              Electronics, appliances, and daily tech picks from {store.name || 'Eplaza'}.
            </p>
            <div className="space-y-4 pt-2">
              <h4 className="font-display text-[16px] font-bold uppercase tracking-wider text-[#101010]/90">Subscribe us</h4>
              <div className="flex gap-4">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, index) => (
                  <a key={index} href="#" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 text-text-main transition-all hover:border-[#2463d1] hover:bg-[#2463d1] hover:text-white">
                    <Icon size={14} fill="currentColor" strokeWidth={0} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-display mb-8 text-[16px] font-bold uppercase tracking-wider text-[#101010]/90">Categories</h4>
            <ul className="space-y-3 text-[14px] font-medium text-text-muted">
              {categories.slice(0, 6).map((item) => (
                <li key={item}>
                  <Link to={themePath(`category/${encodeURIComponent(item)}`)} className="transition-colors hover:text-[#2463d1]">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-display mb-8 text-[16px] font-bold uppercase tracking-wider text-[#101010]/90">Useful Links</h4>
            <ul className="space-y-3 text-[14px] font-medium text-text-muted">
              <li><Link to={themePath('track-order')} className="transition-colors hover:text-[#2463d1]">Track Order</Link></li>
              {['Promotions', 'Stores', 'Our contacts', 'Delivery & Return'].map((item) => (
                <li key={item}><Link to={themePath('search')} className="transition-colors hover:text-[#2463d1]">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-display mb-8 text-[16px] font-bold uppercase tracking-wider text-[#101010]/90">Useful Links</h4>
            <ul className="space-y-3 text-[14px] font-medium text-text-muted">
              {['Blog', 'Our contacts', 'Promotions', 'Stores', 'Delivery & Return'].map((item) => (
                <li key={item}><Link to={themePath('search')} className="transition-colors hover:text-primary">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="font-display mb-8 text-[16px] font-bold uppercase tracking-wider text-[#101010]/90">Download App</h4>
            <p className="mb-6 text-[14px] text-text-muted">15% discount on your first purchase</p>
            <div className="flex items-center gap-3">
              <a href="#" className="transition-transform hover:scale-105 active:scale-95"><img src={eplazaBanners.playStore} className="h-10 w-auto" alt="Play Store" /></a>
              <a href="#" className="transition-transform hover:scale-105 active:scale-95"><img src={eplazaBanners.appStore} className="h-10 w-auto" alt="App Store" /></a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-4 md:flex-row lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#aaa]">
            <span className="font-extrabold tracking-tighter text-text-main">{(store.name || 'EPLAZA').toUpperCase()}</span> &copy; 2026. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-1 opacity-80">
            <img src={eplazaBanners.payments} className="h-5 w-auto" alt="Payments" />
          </div>
        </div>
      </div>
    </footer>
  );
};
