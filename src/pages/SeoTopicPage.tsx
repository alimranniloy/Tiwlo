import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, BookOpenText, CheckCircle2, Cloud, FileQuestion, Globe2, Tags } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import Seo, { TIWLO_SEO, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import { SEO_TOPIC_LINKS, SEO_TOPIC_PAGES, type SeoTopicKey, type SeoTopicPageData } from '../lib/seoTopicPages';

type SeoTopicPageProps = {
  topicKey: SeoTopicKey;
};

function createSchema(page: SeoTopicPageData) {
  const canonical = `https://tiwlo.com${page.slug}`;
  return [
    tiwloOrganizationSchema,
    tiwloWebsiteSchema,
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: `${page.label} - Tiwlo`,
      headline: page.title,
      description: page.description,
      keywords: page.tags.join(', '),
      dateModified: '2026-06-09',
      inLanguage: 'en',
      isPartOf: { '@id': 'https://tiwlo.com/#website' },
      about: { '@id': 'https://tiwlo.com/#organization' },
      publisher: { '@id': 'https://tiwlo.com/#organization' },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: TIWLO_SEO.logo
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://tiwlo.com/'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.label,
          item: canonical
        }
      ]
    },
    {
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: page.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    },
    {
      '@type': 'ItemList',
      '@id': `${canonical}#features`,
      name: `${page.label} features`,
      itemListElement: page.featureCards.map((feature, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: feature.title,
        description: feature.body
      }))
    }
  ];
}

function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center">
          <BrandLogo className="h-8 w-28" />
        </Link>
        <nav className="hidden items-center gap-6 text-[13px] font-bold text-slate-600 md:flex">
          <Link to="/bangladesh-hosting" className="hover:text-slate-950">Bangladesh Hosting</Link>
          <Link to="/tpanel-hosting" className="hover:text-slate-950">tPanel</Link>
          <Link to="/whmcs-alternative" className="hover:text-slate-950">WHMCS Alternative</Link>
          <Link to="/hosting-free-credit" className="hover:text-slate-950">$100 Credit</Link>
        </nav>
        <Link to="/signup" className="rounded bg-slate-950 px-4 py-2 text-[12px] font-black text-white hover:bg-slate-800">
          Sign up
        </Link>
      </div>
    </header>
  );
}

export default function SeoTopicPage({ topicKey }: SeoTopicPageProps) {
  const page = SEO_TOPIC_PAGES[topicKey];
  const schema = React.useMemo(() => createSchema(page), [page]);

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Seo
        title={`${page.label} - Tiwlo`}
        description={page.description}
        canonicalPath={page.slug}
        keywords={page.tags}
        schema={schema}
      />
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-[#061514] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(124,244,255,0.20),transparent_38%),radial-gradient(circle_at_78%_22%,rgba(37,99,235,0.26),transparent_32%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-9 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7cf4ff]">{page.eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-[34px] font-black leading-tight tracking-normal sm:text-[52px]">
                {page.title}
              </h1>
              <p className="mt-5 max-w-3xl text-[16px] font-semibold leading-8 text-white/76">{page.intro}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded bg-[#7cf4ff] px-5 py-3 text-[13px] font-black text-black hover:bg-white">
                  Start with Tiwlo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/about" className="inline-flex items-center gap-2 rounded border border-white/35 px-5 py-3 text-[13px] font-black text-white hover:border-[#7cf4ff] hover:text-[#7cf4ff]">
                  About Tiwlo
                </Link>
              </div>
            </div>

            <aside className="border border-white/10 bg-white/[0.06] p-5 backdrop-blur sm:p-7">
              <div className="flex items-center gap-4 border-b border-white/10 pb-5">
                <div className="grid h-14 w-14 place-items-center rounded bg-[#7cf4ff] text-black">
                  <Globe2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/52">Search focus</p>
                  <h2 className="mt-1 text-2xl font-black">{page.heroMetric}</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ['Official brand', 'Tiwlo'],
                  ['Founder', 'Al Imran Niloy'],
                  ['Founded', '2020'],
                  ['Panel', 'Own portal + tPanel workflow']
                ].map(([label, value]) => (
                  <div key={label} className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7cf4ff]">{label}</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-white/88">{value}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <div className="mb-5 grid h-12 w-12 place-items-center rounded bg-slate-950 text-white">
                <Tags className="h-6 w-6" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Topic tags</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal">Search terms covered naturally.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                These are page-level tags and phrases for search context. They are shown as helpful topic signals, not hidden keyword stuffing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {page.tags.map((tag) => (
                <span key={tag} className="rounded border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-slate-600 shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.76fr_1.24fr] lg:px-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Content answers</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">What this page explains</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The goal is to make Tiwlo understandable for users, Google, Bing, and AI answer engines with consistent public facts.
              </p>
            </div>
            <div className="grid gap-3">
              {page.sections.map((section) => (
                <article key={section.title} className="border border-slate-200 bg-[#f8fafc] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <BookOpenText className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-black">{section.title}</h3>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Tiwlo signals</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal">Why Tiwlo appears in this search topic</h2>
            </div>
            <Cloud className="hidden h-10 w-10 text-blue-600 sm:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {page.featureCards.map((feature) => (
              <article key={feature.title} className="border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
                <h3 className="mt-5 text-lg font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-slate-950 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-center gap-3">
              <FileQuestion className="h-6 w-6 text-[#7cf4ff]" />
              <h2 className="text-3xl font-black tracking-normal">FAQ</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {page.faqs.map((faq) => (
                <article key={faq.question} className="border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-base font-black">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/68">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="border border-slate-200 bg-white p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <BadgeCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-black">Related Tiwlo SEO pages</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEO_TOPIC_LINKS.filter((item) => item.to !== page.slug).map((item) => (
                <Link key={item.to} to={item.to} className="rounded border border-slate-200 px-3 py-2 text-[12px] font-black text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
