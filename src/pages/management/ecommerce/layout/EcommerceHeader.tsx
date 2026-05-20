import React from 'react';
import { Bell, Menu, Search, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../../../types';
import { ecommerceMenuItems } from './ecommerceMenu';

interface EcommerceHeaderProps {
  user: User;
  onToggleSidebar: () => void;
}

export default function EcommerceHeader({ user, onToggleSidebar }: EcommerceHeaderProps) {
  const [query, setQuery] = React.useState('');
  const navigate = useNavigate();

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    if (!value) return;
    const match = ecommerceMenuItems.find((item) => item.name.toLowerCase().includes(value));
    if (match) navigate(match.path);
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button onClick={onToggleSidebar} className="flex h-10 w-10 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100">
          <Menu className="h-4 w-4" />
        </button>
        <form onSubmit={submitSearch} className="relative hidden w-full max-w-md lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search merchants, partners, settings..."
            className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>
      </div>

      <div className="flex items-center gap-3">
        <div className="mr-1 hidden flex-col text-right leading-tight sm:flex">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cluster A-1</span>
          <span className="text-[11px] font-medium text-emerald-600">Service: Online</span>
        </div>
        <button onClick={() => navigate('/management/ecommerce/settings')} className="flex h-10 w-10 items-center justify-center rounded-sm border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-indigo-600" title="Platform settings">
          <Settings className="h-4 w-4" />
        </button>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-sm border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-indigo-600" title="Alerts">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full border border-white bg-indigo-600" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600">
          {user.email?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
