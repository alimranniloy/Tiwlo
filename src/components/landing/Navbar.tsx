import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../BrandLogo';

export default function Navbar() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed left-0 right-0 top-0 z-50 flex items-center transition-all duration-300 ${isScrolled ? 'h-14 border-b border-gray-100 bg-white/85 backdrop-blur-md' : 'h-14 bg-transparent sm:h-16'}`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-6">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <BrandLogo className="h-7 w-24 sm:h-8 sm:w-28" />
          </div>

          <div className="hidden md:flex items-center gap-6">
            {['Products', 'Commerce', 'Broadband'].map((link) => (
              <button
                key={link}
                onClick={() => navigate(`/${link.toLowerCase()}`)}
                className="text-[13px] font-medium text-gray-500 hover:text-blue-600 transition-colors relative group"
              >
                {link}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/login')}
            className="rounded border border-transparent px-2.5 py-2 text-[12px] font-semibold text-gray-600 transition-colors hover:border-gray-100 hover:text-gray-950 sm:px-3 sm:text-[13px]"
          >
            Login
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="rounded bg-gray-950 px-3 py-2 text-[12px] font-semibold text-white transition-all hover:bg-black sm:px-4 sm:text-[13px]"
          >
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}
