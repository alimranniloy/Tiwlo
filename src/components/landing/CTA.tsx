import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CTA() {
  const navigate = useNavigate();

  return (
    <section className="py-10 px-6">
      <div className="max-w-5xl mx-auto bg-gray-900 rounded-2xl p-10 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">Ready to grow your network?</h2>
          <p className="text-base text-gray-400 font-medium mb-10 max-w-lg mx-auto leading-relaxed">
            Join thousands of professional merchants and network owners who trust groups Tiwlo every day.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded font-bold text-sm transition-all active:scale-95"
            >
              Get Started for Free
            </button>
            <button className="text-sm font-bold text-white tracking-tight px-6 py-3 border border-white/10 hover:bg-white/5 transition-all rounded active:scale-95">
              Book a Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
