import React from 'react';
import { Link } from 'react-router-dom';
import { TIWLO_SOCIAL_LINKS } from '../Seo';
import { SEO_TOPIC_LINKS } from '../../lib/seoTopicPages';

const footerColumns = [
  {
    title: 'Products',
    links: [
      { label: 'Cloud Hosting', to: '/products' },
      { label: 'tPanel Hosting', to: '/tpanel-hosting' },
      { label: 'Tiwlo Pay', to: '/pricing' },
      { label: 'Cloud Store', to: '/commerce' }
    ]
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Bangladesh Hosting', to: '/bangladesh-hosting' },
      { label: 'Cloud VPS', to: '/cloud-vps-hosting' },
      { label: 'ISP Billing', to: '/broadband' },
      { label: 'WHMCS Alternative', to: '/whmcs-alternative' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Hosting Features', to: '/hosting-features' },
      { label: '$100 Free Credit', to: '/hosting-free-credit' },
      { label: 'Documentation', to: '/documentation' },
      { label: 'Support', to: '/support' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Partners', to: '/partners' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' }
    ]
  }
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black px-4 pb-14 pt-10 text-white md:px-8">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[16px] font-black">{column.title}</h3>
              <div className="mt-4 space-y-2.5">
                {column.links.map((item) => (
                  <Link key={item.label} to={item.to} className="block text-[14px] font-semibold text-white/70 hover:text-[#7cf4ff]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/brand/white-logo-256.png"
              srcSet="/brand/white-logo-256.png 256w, /brand/white-logo-320.png 320w, /brand/white-logo-small.png 512w"
              sizes="120px"
              width={320}
              height={107}
              alt="Tiwlo"
              className="h-9 w-[120px] object-contain object-left"
              loading="lazy"
              decoding="async"
            />
            <p className="text-[13px] font-semibold text-white/62">(c) 2026 Tiwlo. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-5 text-[13px] font-bold text-white/70">
            {SEO_TOPIC_LINKS.slice(0, 3).map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-[#7cf4ff]">{item.label}</Link>
            ))}
            {TIWLO_SOCIAL_LINKS.slice(0, 4).map((item) => (
              <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="hover:text-[#7cf4ff]">{item.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
