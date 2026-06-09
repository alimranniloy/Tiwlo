import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../BrandLogo';
import { TIWLO_SOCIAL_LINKS } from '../Seo';

const footerGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Cloud hosting', to: '/products' },
      { label: 'ISP Hub', to: '/broadband' },
      { label: 'Merchants', to: '/commerce' },
      { label: 'Integrations', to: '/api' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Documentation', to: '/documentation' },
      { label: 'Help Center', to: '/support' },
      { label: 'Pricing', to: '/pricing' }
    ]
  }
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-50 bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-24 grid grid-cols-2 gap-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-6 flex items-center gap-3">
              <BrandLogo className="h-12 w-36" />
            </div>
            <p className="max-w-xs text-sm font-medium leading-relaxed text-gray-500">
              Reliable infrastructure and management tools for modern businesses and ISP owners worldwide.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title} className="col-span-1">
              <h5 className="mb-6 text-sm font-bold text-gray-900">{group.title}</h5>
              <div className="space-y-4">
                {group.links.map((item) => (
                  <Link key={item.label} to={item.to} className="block text-sm font-medium text-gray-500 transition-colors hover:text-blue-600">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-8 border-t border-gray-100 pt-12 md:flex-row">
          <div className="text-sm font-medium text-gray-400">
            (c) 2026 Tiwlo. Founded by Al Imran Niloy.
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {TIWLO_SOCIAL_LINKS.slice(0, 5).map((item) => (
              <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-400 hover:text-gray-900">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
