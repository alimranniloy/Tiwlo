import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const navLinks = [
  { label: 'Products', to: '/products', menu: true },
  { label: 'Solutions', to: '/services', menu: true },
  { label: 'Developers', to: '/developers', menu: true },
  { label: 'Partners', to: '/partners', menu: true },
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' }
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black text-white">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between px-3 sm:h-16 sm:px-4 md:px-8">
        <Link to="/" className="flex items-center">
          <img
            src="/brand/white-logo-256.png"
            srcSet="/brand/white-logo-256.png 256w, /brand/white-logo-320.png 320w, /brand/white-logo-small.png 512w"
            sizes="(min-width: 640px) 128px, 100px"
            width={320}
            height={107}
            alt="Tiwlo"
            className="h-7 w-[100px] object-contain object-left sm:h-8 sm:w-[128px]"
            decoding="async"
          />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((item) => (
            <Link key={item.label} to={item.to} className="inline-flex items-center gap-1 text-[14px] font-bold text-white/88 hover:text-[#7cf4ff]">
              {item.label}
              {item.menu && <ChevronDown className="h-4 w-4" />}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden px-3 py-2 text-[14px] font-bold text-white hover:text-[#7cf4ff] sm:block">Login</Link>
          <Link to="/signup" className="rounded-full bg-[#7cf4ff] px-3.5 py-2 text-[12px] font-bold text-black transition hover:bg-white sm:px-5 sm:py-2.5 sm:text-[14px]">Sign up</Link>
        </div>
      </div>
    </header>
  );
}
