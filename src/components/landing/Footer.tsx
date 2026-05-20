import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-50 py-24 px-6 mt-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                T
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">Tiwlo</span>
            </div>
            <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-xs">
              Reliable infrastructure and management tools for modern businesses and ISP owners worldwide.
            </p>
          </div>
          
          <div className="col-span-1">
            <h5 className="text-sm font-bold text-gray-900 mb-6">Product</h5>
            <div className="space-y-4">
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">ISP Hub</a>
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">Merchants</a>
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">Integrations</a>
            </div>
          </div>

          <div className="col-span-1">
            <h5 className="text-sm font-bold text-gray-900 mb-6">Company</h5>
            <div className="space-y-4">
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">About Us</a>
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">Privacy</a>
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">Terms</a>
            </div>
          </div>

          <div className="col-span-1">
            <h5 className="text-sm font-bold text-gray-900 mb-6">Support</h5>
            <div className="space-y-4">
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">Documentation</a>
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">Help Center</a>
              <a href="#" className="block text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors">Status</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-gray-100 gap-8">
          <div className="text-sm text-gray-400 font-medium">
            © 2026 Tiwlo. All rights reserved.
          </div>
          <div className="flex gap-8">
             <a href="#" className="text-sm font-medium text-gray-400 hover:text-gray-900">Twitter</a>
             <a href="#" className="text-sm font-medium text-gray-400 hover:text-gray-900">GitHub</a>
             <a href="#" className="text-sm font-medium text-gray-400 hover:text-gray-900">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
