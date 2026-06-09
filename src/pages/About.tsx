import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, CalendarDays, Cloud, CreditCard, Globe2, Network, ShieldCheck, Store, UserRound } from 'lucide-react';
import Seo, { TIWLO_SEO, TIWLO_SOCIAL_LINKS, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import SiteHeader from '../components/landing/SiteHeader';
import SiteFooter from '../components/landing/SiteFooter';

const platformPillars = [
  { title: 'Cloud and hosting', detail: 'Droplets, domains, DNS, SSL, tPanel hosting accounts, packages, and operator controls.', icon: Cloud },
  { title: 'Commerce operations', detail: 'Storefronts, themes, products, orders, customers, invoices, and checkout workflows.', icon: Store },
  { title: 'ISP and broadband', detail: 'Router records, subscriber billing, service packages, invoices, and customer support context.', icon: Network },
  { title: 'Payments and support', detail: 'Tiwlo Pay, billing review, ticket routing, Discord alerts, and account activity records.', icon: CreditCard }
];

const milestones = [
  ['2020', 'Tiwlo was founded by Al Imran Niloy with a focus on practical hosting and business automation.'],
  ['Platform', 'The product expanded into cloud hosting, tPanel server operations, ecommerce, ISP billing, payments, DNS, and support.'],
  ['Security', 'tSecurity, identity review, WhatsApp verification, audit logs, and fraud controls were connected to the account lifecycle.'],
  ['Today', 'Tiwlo continues to unify infrastructure, billing, commerce, and support for teams that run live customer operations.']
];

const aboutSchema = [
  tiwloOrganizationSchema,
  tiwloWebsiteSchema,
  {
    '@type': 'AboutPage',
    '@id': 'https://tiwlo.com/about#webpage',
    url: 'https://tiwlo.com/about',
    name: 'About Tiwlo',
    description: 'Learn about Tiwlo, founded in 2020 by Al Imran Niloy, and the cloud hosting, ecommerce, ISP billing, payments, DNS, SSL, and automation platform behind tiwlo.com.',
    isPartOf: { '@id': 'https://tiwlo.com/#website' },
    about: { '@id': 'https://tiwlo.com/#organization' },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: TIWLO_SEO.logo
    }
  },
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
        title="About Tiwlo - Founder, Company, Cloud Hosting, tPanel, Ecommerce, ISP Billing"
        description="Tiwlo was founded in 2020 by Al Imran Niloy. Learn about the company behind tiwlo.com, its cloud hosting, tPanel, ecommerce, ISP billing, payments, DNS, SSL, and automation platform."
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
                The operations cloud for hosting, commerce, ISP billing, and payments.
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] font-semibold leading-8 text-white/76">
                Tiwlo brings cloud infrastructure, tPanel hosting, ecommerce storefronts, ISP billing, domains, DNS, SSL, Tiwlo Pay, support, and security workflows into one connected control panel.
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
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/52">Company profile</p>
                  <h2 className="mt-1 text-2xl font-black">Tiwlo Company</h2>
                </div>
              </div>
              <dl className="mt-5 grid gap-4 text-sm">
                {[
                  ['Website', 'tiwlo.com'],
                  ['Founded', '2020'],
                  ['Founder', 'Al Imran Niloy'],
                  ['Focus', 'Cloud hosting, tPanel, ecommerce, ISP billing, domains, DNS, SSL, payments, and automation']
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 border border-white/10 bg-black/20 p-4">
                    <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7cf4ff]">{label}</dt>
                    <dd className="font-bold leading-6 text-white/88">{value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <article className="border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.07)] sm:p-8">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded bg-slate-950 text-white">
                <UserRound className="h-6 w-6" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Founder</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal">Al Imran Niloy</h2>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">
                Al Imran Niloy founded Tiwlo in 2020 to make hosting operations, customer billing, ecommerce, ISP management, payments, and support easier to run from one practical platform.
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
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Company timeline</p>
                <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">Built for real operators since 2020.</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Tiwlo focuses on the day-to-day control plane that businesses need after launch: accounts, packages, payments, tickets, stores, domains, DNS, SSL, and security review.
                </p>
              </div>
              <div className="grid gap-3">
                {milestones.map(([year, detail]) => (
                  <div key={year} className="grid gap-3 border border-slate-200 bg-[#f8fafc] p-5 sm:grid-cols-[120px_1fr] sm:items-center">
                    <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      {year}
                    </div>
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
              { label: 'Official website', value: 'https://tiwlo.com', icon: Globe2 },
              { label: 'Company founded', value: '2020', icon: BadgeCheck },
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
