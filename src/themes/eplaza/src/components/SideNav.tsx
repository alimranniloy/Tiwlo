import React from 'react';
import { ArrowRightLeft, LayoutGrid, ShoppingBag, User, Search, Settings, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';

export const SideNav = () => {
  const navigate = useNavigate();
  const { themePath } = useStorefrontRuntime();
  const items = [
    { icon: LayoutGrid, label: 'Demos', onClick: () => navigate(themePath()) },
    { icon: ShoppingBag, label: 'Shop', onClick: () => navigate(themePath('search')) },
    { icon: ArrowRightLeft, label: 'Compare', onClick: () => navigate(themePath('compare')) },
    { icon: User, label: 'Account', onClick: () => navigate(themePath('track-order')) },
    { icon: Settings, label: 'Settings', onClick: () => navigate(themePath()) }
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 z-[120] hidden w-[60px] bg-white border-r border-gray-100 xl:flex flex-col items-center py-8 gap-8">
      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8faff] text-[#2463d1] border border-blue-50 cursor-pointer hover:bg-primary hover:text-white transition-all shadow-sm">
         <Menu size={20} strokeWidth={2.5} />
      </button>
      
      <div className="flex flex-col items-center gap-6 flex-1">
        {items.map((item, i) => (
          <button key={i} onClick={item.onClick} className="group relative flex items-center justify-center w-full cursor-pointer py-2">
            <item.icon size={22} strokeWidth={1.5} className="text-text-main group-hover:text-primary transition-colors" />
            <div className="absolute left-[70px] bg-primary text-white text-[10px] font-bold uppercase py-1 px-3 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50">
               {item.label}
               <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rotate-45"></div>
            </div>
          </button>
        ))}
      </div>

      <button onClick={() => navigate(themePath('search'))} className="h-10 w-10 flex items-center justify-center text-text-muted hover:text-primary transition-colors mt-auto">
         <Search size={22} strokeWidth={1.5} />
      </button>
    </div>
  );
};
