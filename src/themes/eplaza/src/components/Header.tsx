import { Search, User, Heart, ShoppingBag, Menu, Phone, Globe, ChevronDown, Repeat } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { formatMoney } from '../lib/utils';
import CurrencySwitcher from '../../../../components/CurrencySwitcher';
import { currencySelectionStorageKey } from '../../../../lib/currency';

const GeneralHeader = () => {
  const { store, themePath } = useStorefrontRuntime();
  const navigate = useNavigate();

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get('q') || '').trim();
    navigate(`${themePath('search')}${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <div className="bg-white border-b border-gray-100/50 py-4 lg:py-5">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 lg:px-8 gap-5 lg:gap-10">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link to={themePath()} className="flex items-center">
            <span className="text-2xl font-black tracking-tight text-[#101010]">{store.name || 'Eplaza'}</span>
          </Link>
        </div>

        {/* Search */}
        <div className="hidden lg:block flex-1 max-w-2xl px-5">
          <form onSubmit={handleSearch} className="relative flex">
            <input
              name="q"
              type="text"
              placeholder="Search for products"
              className="w-full h-11 rounded-full border-[1.5px] border-gray-200 bg-white px-6 text-sm focus:border-primary outline-none transition-colors"
            />
            <button className="absolute right-0 top-0 bottom-0 px-7 rounded-full bg-primary text-white text-xs font-bold uppercase transition-opacity hover:opacity-90">
              Search
            </button>
          </form>
        </div>

        {/* Support Info */}
        <div className="hidden xl:flex items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center"><Phone size={30} strokeWidth={1.5} className="text-[#1c61e7]" /></div>
              <div className="leading-tight">
                 <p className="text-[14px] font-semibold text-[#101010]/90">24 Support</p>
                 <p className="text-[14px] font-semibold text-primary">{store.phone}</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center"><Globe size={30} strokeWidth={1.5} className="text-[#1c61e7]" /></div>
              <div className="leading-tight">
                 <p className="text-[14px] font-semibold text-[#101010]/90">Worldwide</p>
                 <p className="text-[14px] font-semibold text-primary">Free Shipping</p>
              </div>
           </div>
        </div>

        {/* Mobile Toggle */}
        <div className="lg:hidden">
           <Menu size={24} className="text-text-main" />
        </div>
      </div>
    </div>
  );
};

const BottomHeader = ({ isSticky }: { isSticky: boolean }) => {
  const navItems = ['Promotions', 'Stores', 'Our Contacts', 'Delivery & Return', 'Outlet'];
  const { cartCount, cartTotal, setIsCartOpen } = useCart();
  const { compareCount, store, themePath, currencyPolicy, selectedCurrency, setSelectedCurrency } = useStorefrontRuntime();
  const currencyStorageKey = currencySelectionStorageKey('storefront', store.id || store.slug || 'eplaza');
  const customerParams = new URLSearchParams();
  if (store.id) customerParams.set('storeId', store.id);
  else if (store.slug) customerParams.set('slug', store.slug);
  customerParams.set('theme', 'eplaza');
  customerParams.set('mode', 'login');
  const customerPath = `/store/user/login?${customerParams.toString()}`;
  
  return (
    <div className={`bg-[#f8faff] border-b border-gray-100 hidden lg:block transition-all duration-300 ${isSticky ? 'fixed top-0 left-0 right-0 z-[100] shadow-md bg-white' : ''}`}>
      <div className="mx-auto flex max-w-[1400px] items-center px-4 lg:px-8 h-12 lg:h-[60px]">
        {/* All Categories Trigger */}
        <div className={`flex items-center gap-3 bg-[#2463d1] text-white px-7 h-10 rounded-full cursor-pointer hover:bg-black transition-all ${isSticky ? 'scale-90' : ''}`}>
          <Menu size={18} />
          <span className="text-[13px] font-bold uppercase tracking-wider">All Categories</span>
        </div>

        {/* Main Nav */}
        <nav className="hidden lg:flex items-center gap-8 ml-8">
          {navItems.map((item) => (
            <Link
              key={item}
              to={themePath('search')}
              className="text-[13px] font-bold text-[#101010]/80 hover:text-[#2463d1] transition-colors py-1 relative group"
            >
              <span className="uppercase tracking-widest">{item}</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#2463d1] transition-all group-hover:w-full"></span>
            </Link>
          ))}
        </nav>

        {/* Right Tools - Only show when sticky if desired, or always show */}
        <div className="ml-auto flex items-center lg:gap-5 h-full">
           {!isSticky && (
             <>
                <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-text-main cursor-pointer uppercase border-r border-gray-200 pr-5 h-5 leading-none">
                    USA <ChevronDown size={14} />
                </div>
                <div className="hidden lg:flex items-center border-r border-gray-200 pr-5 h-6 leading-none">
                    <CurrencySwitcher
                      policy={currencyPolicy}
                      storageKey={currencyStorageKey}
                      value={selectedCurrency}
                      onChange={setSelectedCurrency}
                      scope="storefront"
                      scopeId={store.id || store.slug}
                      compact
                      className="h-6 rounded-none border-0 bg-transparent px-0 shadow-none hover:bg-transparent"
                      selectClassName="w-14 text-xs text-text-main"
                      iconClassName="hidden"
                    />
                </div>
             </>
           )}
           
           <div className="flex items-center gap-6 lg:pl-2">
              <Link to={customerPath} className="flex items-center text-[#101010]/80 hover:text-[#2463d1] transition-colors"><User size={20} strokeWidth={1.5} /></Link>
              <Link to={themePath('compare')} className="hidden lg:flex items-center text-[#101010]/80 hover:text-[#2463d1] transition-colors relative">
                 <Repeat size={19} strokeWidth={1.5} />
                 <span className="absolute -top-2.5 -right-2.5 h-4 w-4 bg-[#2463d1] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{compareCount}</span>
              </Link>
              <a href="#" className="hidden lg:flex items-center text-[#101010]/80 hover:text-[#2463d1] transition-colors relative">
                 <Heart size={20} strokeWidth={1.5} />
                 <span className="absolute -top-2.5 -right-2.5 h-4 w-4 bg-[#2463d1] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">0</span>
              </a>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2 text-[#101010]/80 hover:text-[#2463d1] transition-colors group"
              >
                 <div className="relative">
                    <ShoppingBag size={20} strokeWidth={1.5} />
                    <span className="absolute -top-2.5 -right-2.5 h-4 w-4 bg-[#2463d1] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>
                 </div>
                 <div className="hidden xl:block leading-none text-left">
                    <p className="text-[12px] font-bold uppercase">{formatMoney(cartTotal, store.currency)}</p>
                 </div>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export const Header = () => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="z-[100] w-full">
      {!isSticky && <GeneralHeader />}
      <BottomHeader isSticky={isSticky} />
      {/* Spacer to prevent content jump when header becomes fixed */}
      {isSticky && <div className="h-12 lg:h-[60px]"></div>}
    </header>
  );
};
