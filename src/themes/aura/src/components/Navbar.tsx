import { ArrowLeftRight, ShoppingCart, Search, User } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";
import CurrencySwitcher from "../../../../components/CurrencySwitcher";
import { currencySelectionStorageKey } from "../../../../lib/currency";

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { cartCount, compareCount, categories, store, settings, themePath, currencyPolicy, selectedCurrency, setSelectedCurrency } = useStorefrontRuntime();
  const brandName = settings.logoText || store.name;
  const currencyStorageKey = currencySelectionStorageKey("storefront", store.id || store.slug || "aura");
  const customerPath = (mode = "login") => {
    const params = new URLSearchParams();
    if (store.id) params.set("storeId", store.id);
    else if (store.slug) params.set("slug", store.slug);
    params.set("theme", "aura");
    params.set("mode", mode);
    return `/store/user/${mode}?${params.toString()}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(themePath(`search?q=${encodeURIComponent(searchQuery)}`));
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 font-sans">
      {/* Top Bar - Desktop Only */}
      <div className="bg-[var(--aura-accent)] text-white text-[10px] py-1.5 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between uppercase font-bold tracking-tight">
          <div className="flex gap-4">
            <Link to={themePath('track-order')} className="cursor-pointer hover:underline">Track Order</Link>
            <Link to={themePath('compare')} className="cursor-pointer hover:underline">Compare</Link>
            <span className="cursor-pointer hover:underline">Mart Affiliate Program</span>
            <span className="cursor-pointer hover:underline">Help & Support</span>
          </div>
          <div className="flex gap-4 uppercase">
            <span className="cursor-pointer hover:underline">Save more on app</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 md:h-20 gap-3 md:gap-8">
            {/* Logo */}
            <Link to={themePath()} className="flex items-center shrink-0">
              <span className="text-[var(--aura-accent)] font-bold text-lg md:text-2xl tracking-tight uppercase">{brandName}</span>
            </Link>

            {/* Search Bar - Responsive */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative w-full flex">
                <input
                  type="text"
                  placeholder={`Search in ${brandName}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f0f1f4] border-none py-2 md:py-2.5 px-4 rounded-sm text-[11px] md:text-sm focus:ring-0 focus:outline-none placeholder:text-gray-400"
                />
                <button type="submit" className="absolute right-0 top-0 h-full px-3 md:px-5 flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 md:w-5 md:h-5 text-gray-400" />
                </button>
              </div>
            </form>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-[#212121]">
              <CurrencySwitcher
                policy={currencyPolicy}
                storageKey={currencyStorageKey}
                value={selectedCurrency}
                onChange={setSelectedCurrency}
                scope="storefront"
                scopeId={store.id || store.slug}
                compact
                className="h-8 rounded-sm shadow-none"
              />
              <Link to={customerPath("login")} className="flex items-center gap-2 cursor-pointer group">
                <User className="w-5 h-5 text-gray-400 group-hover:text-[var(--aura-accent)]" />
                <span className="text-xs font-medium group-hover:text-[var(--aura-accent)]">Login</span>
              </Link>
              <Link to={customerPath("register")} className="flex items-center gap-2 cursor-pointer group">
                <span className="text-xs font-medium group-hover:text-[var(--aura-accent)]">Sign Up</span>
              </Link>
              <Link to={themePath('compare')} className="relative cursor-pointer group p-1">
                <ArrowLeftRight className="w-5 h-5 text-[#212121] group-hover:text-[var(--aura-accent)]" />
                {compareCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--aura-accent)] text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                    {compareCount}
                  </span>
                )}
              </Link>
              <Link to={themePath('cart')} className="relative cursor-pointer group p-1">
                <ShoppingCart className="w-6 h-6 text-[#212121] group-hover:text-[var(--aura-accent)]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--aura-accent)] text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Actions - Simplified Header */}
            <div className="md:hidden flex items-center gap-2">
              <CurrencySwitcher
                policy={currencyPolicy}
                storageKey={currencyStorageKey}
                value={selectedCurrency}
                onChange={setSelectedCurrency}
                scope="storefront"
                scopeId={store.id || store.slug}
                compact
                className="h-8 w-[72px] rounded-sm px-2 shadow-none"
              />
              <Link to={customerPath("login")} className="p-1.5">
                <User className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Nav Categories - Desktop */}
      <div className="hidden md:block bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex py-2 gap-8 text-xs text-[#757575] font-medium overflow-hidden whitespace-nowrap">
           <span className="text-[var(--aura-accent)] border-b-2 border-[var(--aura-accent)] pb-1 cursor-pointer">Categories</span>
           {categories.slice(0, 7).map((category) => (
             <Link key={category} to={themePath(`category/${encodeURIComponent(category)}`)} className="cursor-pointer hover:text-[var(--aura-accent)]">{category}</Link>
           ))}
        </div>
      </div>

      {/* Mobile Menu Removed for cleaner App style - Bottom Nav takes over */}
    </nav>
  );
}
