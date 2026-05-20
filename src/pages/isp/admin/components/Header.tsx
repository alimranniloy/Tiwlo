import React from 'react';
import { Search, Bell, HelpCircle, Menu } from 'lucide-react';

export default function Header({ activeNav, onMenuClick, site }: { activeNav: string, onMenuClick: () => void, site?: any }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10 shrink-0 font-sans">
      <div className="flex items-center gap-3">
        <button className="p-2 -ml-2 text-gray-500 hover:text-gray-900 lg:hidden outline-none" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold uppercase tracking-wide text-gray-900">{activeNav}</h2>
          <p className="truncate font-mono text-[10px] text-gray-400">{site?.id || 'no-site'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search MAC, IP, User..."
            className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-500 focus:bg-white transition-colors w-64 text-gray-800 placeholder:text-gray-400 font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-none transition-colors relative outline-none">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-none transition-colors outline-none">
            <HelpCircle className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-none bg-gray-900 text-white flex items-center justify-center font-bold text-xs ml-2 cursor-pointer border border-gray-900 overflow-hidden">
            {String(site?.name || 'I').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
