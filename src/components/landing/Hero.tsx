import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardMockup from './DashboardMockup';

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="pt-16 pb-6 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 text-left">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-4 text-balance">
              Professional Solution for <br />
              <span className="text-blue-600">Hosting & Network Ops.</span>
            </h1>
            <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed mb-8 max-w-lg">
              Deployment made simple. Infrastructure scaled instantly. 
              The ultimate platform for regional merchants and broadband service providers.
            </p>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => navigate('/signup')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 transition-all font-sans"
              >
                Start free trial
              </button>
              <button 
                onClick={() => navigate('/services')}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-md font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Read Documentation
              </button>
            </div>
          </div>

          <div className="lg:w-1/2 w-full">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
