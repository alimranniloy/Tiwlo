import React from 'react';
import { ChevronLeft, Search, ShoppingBag, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ecommerceMenuSections } from './ecommerceMenu';

interface EcommerceSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function EcommerceSidebar({ isOpen, onToggle }: EcommerceSidebarProps) {
  const [query, setQuery] = React.useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const filteredSections = React.useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return ecommerceMenuSections;
    return ecommerceMenuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => `${section.label} ${item.name}`.toLowerCase().includes(value))
      }))
      .filter((section) => section.items.length > 0);
  }, [query]);

  return (
    <aside className={`${isOpen ? 'w-full md:w-72' : 'w-20'} fixed z-50 flex h-screen flex-col border-r border-slate-200 bg-white transition-[width] md:relative`}>
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-indigo-600 text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            {isOpen && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold leading-none text-slate-800">Commerce Suite</span>
                <span className="mt-1 text-[11px] font-medium text-indigo-600">Tiwlo Team Management</span>
              </div>
            )}
          </div>
          <button onClick={onToggle} className="flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 text-slate-400 hover:bg-slate-50 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isOpen && (
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search modules..."
              className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        )}
      </div>

      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 pb-8 pt-4">
        {filteredSections.map((section) => (
          <div key={section.label} className="space-y-1">
            {isOpen && (
              <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{section.label}</h4>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex min-h-10 items-center gap-3 rounded-sm border px-3 py-2 transition-colors ${
                    isActive
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={isOpen ? undefined : item.name}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                  {isOpen && <span className="truncate text-[12px] font-semibold">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <button
          onClick={() => navigate('/')}
          className="flex min-h-10 w-full items-center gap-3 rounded-sm border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
          {isOpen && <span className="text-xs font-bold uppercase tracking-wider">Main Console</span>}
        </button>
      </div>
    </aside>
  );
}
