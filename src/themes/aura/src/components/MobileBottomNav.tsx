import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeftRight, Home, Search, ShoppingCart, User } from "lucide-react";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

export default function MobileBottomNav() {
  const location = useLocation();
  const { cartCount, compareCount, store, themePath } = useStorefrontRuntime();
  const customerParams = new URLSearchParams();
  if (store.id) customerParams.set("storeId", store.id);
  else if (store.slug) customerParams.set("slug", store.slug);
  customerParams.set("theme", "aura");
  customerParams.set("mode", "login");

  const navItems = [
    { label: "Home", icon: Home, path: themePath() },
    { label: "Search", icon: Search, path: themePath("search") },
    { label: "Compare", icon: ArrowLeftRight, path: themePath("compare"), badge: compareCount },
    { label: "Account", icon: User, path: `/store/user/login?${customerParams.toString()}` },
    { label: "Cart", icon: ShoppingCart, path: themePath("cart"), badge: cartCount },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
              isActive ? "text-[var(--aura-accent)]" : "text-gray-400"
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? "fill-orange-100" : ""}`} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[var(--aura-accent)] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
