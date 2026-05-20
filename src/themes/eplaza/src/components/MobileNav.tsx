import React from 'react';
import { ArrowRightLeft, Home, ShoppingBag, User, Search, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';

export const MobileNav = () => {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { compareCount, store, themePath } = useStorefrontRuntime();
  const customerParams = new URLSearchParams();
  if (store.id) customerParams.set('storeId', store.id);
  else if (store.slug) customerParams.set('slug', store.slug);
  customerParams.set('theme', 'eplaza');
  customerParams.set('mode', 'login');
  
  const navItems = [
    { icon: Home, label: 'Home', path: themePath() },
    { icon: Search, label: 'Search', path: themePath('search') },
    { icon: ShoppingBag, label: 'Shop', path: themePath('search') },
    { icon: ArrowRightLeft, label: 'Compare', path: themePath('compare'), badge: compareCount },
    { icon: User, label: 'Login', path: `/store/user/login?${customerParams.toString()}` },
  ];

  return (
    <div className="xl:hidden fixed bottom-6 left-6 right-6 z-[150] pointer-events-none">
      <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-[32px] shadow-[0_15px_40px_rgba(36,99,209,0.15)] flex items-center justify-between px-2 py-2 pointer-events-auto max-w-[340px] mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative ${
                isActive ? 'text-[#2463d1] bg-blue-50/50' : 'text-gray-400 hover:text-[#2463d1]'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-[#2463d1] border border-white" />}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-red-500 px-1 text-[9px] font-black text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        
        {/* Special Cart Trigger */}
        <button 
          onClick={() => setIsCartOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2463d1] text-white shadow-lg shadow-blue-200 active:scale-90 transition-all ml-1"
        >
          <div className="relative">
            <ShoppingCart size={20} strokeWidth={2.5} />
            {cartCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 h-[16px] w-[16px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                {cartCount}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
