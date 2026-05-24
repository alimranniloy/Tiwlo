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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-gray-100 h-14' : 'bg-transparent h-16'} flex items-center`}>
      <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <BrandLogo className="h-9 w-28" />
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
            className="text-[13px] font-semibold text-gray-600 hover:text-gray-950 px-3 py-2 transition-colors border border-transparent hover:border-gray-100 rounded"
          >
            Sign in
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="text-[13px] font-semibold bg-gray-950 text-white px-4 py-2 rounded hover:bg-black transition-all"
          >
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}
