import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Cloud, Globe2, MapPin, Network, ShieldCheck, Store } from 'lucide-react';
import Seo, { TIWLO_SEO, TIWLO_SOCIAL_LINKS, createTiwloBreadcrumbSchema, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import SiteHeader from '../components/landing/SiteHeader';
import SiteFooter from '../components/landing/SiteFooter';

const platformPillars = [
  { title: 'Cloud and hosting', detail: 'Web hosting, VPS, domains, DNS, SSL, tPanel hosting workflows, packages, and operator controls.', icon: Cloud },
  { title: 'Commerce and payments', detail: 'Ecommerce services, storefront workflows, orders, customers, invoices, Tiwlo Pay, and digital payment review.', icon: Store },
  { title: 'tFiber and connectivity', detail: 'Internet infrastructure, broadband-style service records, subscriber billing, router context, and support workflows.', icon: Network },
  { title: 'Security and automation', detail: 'tSecurity, account review, verification, audit logs, customer support, and business automation controls.', icon: ShieldCheck }
];

const locationCards = [
  {
    title: 'Bangladesh',
    detail: 'Bangladesh is part of Tiwlo\'s operating identity, hosting audience, BDIX-ready planning, support context, and regional service focus.',
    icon: MapPin
  },
  {
    title: 'United Kingdom',
    detail: 'United Kingdom is listed as an international location for Tiwlo\'s broader technology, cloud, commerce, and infrastructure presence.',
    icon: Globe2
  }
];

const operatingNotes = [
  ['Cloud services', 'Hosting, VPS, DNS, SSL, tPanel, service packages, account state, and customer dashboards are connected inside the Tiwlo platform.'],
  ['Business tools', 'Commerce, billing, digital payments, support, verification, and automation workflows are designed to help online businesses operate from one place.'],
  ['Network services', 'tFiber and ISP-style infrastructure workflows cover connectivity records, customer billing, router context, and support visibility.'],
  ['Security layer', 'tSecurity, identity checks, account review, audit records, and fraud controls support signup, login, and sensitive account workflows.']
];

const aboutSchema = [
  tiwloOrganizationSchema,
  tiwloWebsiteSchema,
  {
    '@type': 'AboutPage',
    '@id': 'https://tiwlo.com/about#webpage',
    url: 'https://tiwlo.com/about',
    name: 'About Tiwlo',
    description: 'Learn about Tiwlo, a technology company for cloud hosting, web hosting, VPS, tPanel software, AI tools, business automation, ecommerce services, digital payments, tFiber internet infrastructure, and digital services.',
    isPartOf: { '@id': 'https://tiwlo.com/#website' },
    about: { '@id': 'https://tiwlo.com/#organization' },
    breadcrumb: { '@id': 'https://tiwlo.com/about#breadcrumb' },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: TIWLO_SEO.logo
    }
  },
  createTiwloBreadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'About Tiwlo', item: '/about' }
    ],
    'https://tiwlo.com/about#breadcrumb'
  ),
  {
    '@type': 'Person',
    '@id': 'https://tiwlo.com/#founder',
    name: TIWLO_SEO.founderName,
    jobTitle: 'Founder',
    worksFor: { '@id': 'https://tiwlo.com/#organization' },
    url: 'https://tiwlo.com/about',
    sameAs: TIWLO_SOCIAL_LINKS.map((item) => item.url)
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Seo
        title="About Tiwlo - Cloud Hosting, tPanel, Ecommerce, Payments, tFiber"
        description="Tiwlo is a technology company for cloud hosting, web hosting, VPS, tPanel software, AI tools, business automation, ecommerce services, digital payments, tFiber internet infrastructure, and digital services."
        canonicalPath="/about"
        schema={aboutSchema}
      />
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-[#071514] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(124,244,255,0.18),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.24),transparent_35%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7cf4ff]">About Tiwlo</p>
              <h1 className="mt-4 max-w-3xl text-[38px] font-black leading-tight tracking-normal sm:text-[54px]">
                A technology ecosystem for cloud, commerce, payments, and tFiber.
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] font-semibold leading-8 text-white/76">
                Tiwlo brings cloud hosting, web hosting, VPS, tPanel software, AI tools, business automation, ecommerce services, digital payments, tFiber internet infrastructure, domains, DNS, SSL, support, and security workflows into one connected platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/products" className="inline-flex items-center gap-2 rounded bg-[#7cf4ff] px-5 py-3 text-[13px] font-black text-black hover:bg-white">
                  Explore platform <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/support" className="inline-flex items-center gap-2 rounded border border-white/35 px-5 py-3 text-[13px] font-black text-white hover:border-[#7cf4ff] hover:text-[#7cf4ff]">
                  Contact Tiwlo
                </Link>
              </div>
            </div>
            <aside className="border border-white/10 bg-white/[0.06] p-5 backdrop-blur sm:p-7">
              <div className="flex items-center gap-4 border-b border-white/10 pb-5">
                <div className="grid h-14 w-14 place-items-center rounded bg-[#7cf4ff] text-black">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/52">Technology company</p>
                  <h2 className="mt-1 text-2xl font-black">Cloud, software, and internet infrastructure</h2>
                </div>
              </div>
              <p className="mt-5 text-sm font-semibold leading-7 text-white/72">
                Started in 2020 by Al Imran Niloy, Tiwlo focuses on practical tools for developers, startups, online stores, service providers, and businesses that need hosting, payment, automation, and customer operations in one place.
              </p>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                {locationCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="border border-white/10 bg-black/20 p-4">
                      <Icon className="h-5 w-5 text-[#7cf4ff]" />
                      <p className="mt-3 text-base font-black text-white">{item.title}</p>
                      <p className="mt-2 text-[13px] font-semibold leading-6 text-white/62">{item.detail}</p>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <article className="border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.07)] sm:p-8">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded bg-slate-950 text-white">
                <Globe2 className="h-6 w-6" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Company overview</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal">Built as a broad technology platform.</h2>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">
                Tiwlo is shaped around cloud hosting, web hosting, VPS, tPanel software, AI tools, business automation, ecommerce services, digital payments, tFiber internet infrastructure, and digital services for modern online businesses.
              </p>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">
                The company keeps its public information neutral and reference-friendly so search engines, knowledge platforms, and customers can understand the brand without promotional claims.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {TIWLO_SOCIAL_LINKS.map((item) => (
                  <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="rounded border border-slate-200 px-3 py-2 text-[12px] font-black text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                    {item.label}
                  </a>
                ))}
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2">
              {platformPillars.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                    <div className="mb-5 grid h-11 w-11 place-items-center rounded bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-black">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Platform scope</p>
                <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">Clear areas that explain what Tiwlo does.</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  These public details help customers and knowledge systems understand Tiwlo through accurate service areas: cloud, software, ecommerce, payments, connectivity, and security.
                </p>
              </div>
              <div className="grid gap-3">
                {operatingNotes.map(([label, detail]) => (
                  <div key={label} className="grid gap-3 border border-slate-200 bg-[#f8fafc] p-5 sm:grid-cols-[150px_1fr] sm:items-center">
                    <p className="text-sm font-black text-slate-950">{label}</p>
                    <p className="text-sm leading-7 text-slate-600">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Website', value: 'https://tiwlo.com', icon: Globe2 },
              { label: 'Locations', value: 'Bangladesh and United Kingdom', icon: MapPin },
              { label: 'Security layer', value: 'tSecurity protected workflows', icon: ShieldCheck }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="border border-slate-200 bg-white p-6">
                  <Icon className="h-6 w-6 text-blue-600" />
                  <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-xl font-black">{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
