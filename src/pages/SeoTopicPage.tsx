import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenText, CheckCircle2, Cloud, FileQuestion, Globe2 } from 'lucide-react';
import Seo, { TIWLO_SEO, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import SiteHeader from '../components/landing/SiteHeader';
import SiteFooter from '../components/landing/SiteFooter';
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
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tiwlo.com/' },
        { '@type': 'ListItem', position: 2, name: page.label, item: canonical }
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

export default function SeoTopicPage({ topicKey }: SeoTopicPageProps) {
  const page = SEO_TOPIC_PAGES[topicKey];
  const schema = React.useMemo(() => createSchema(page), [page]);

  return (
    <div className="min-h-screen bg-[#020707] font-sans text-white selection:bg-[#7cf4ff] selection:text-black">
      <Seo
        title={`${page.label} - Tiwlo`}
        description={page.description}
        canonicalPath={page.slug}
        keywords={page.tags}
        schema={schema}
      />
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-[#020707]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.54)_52%,rgba(0,0,0,0.82)),radial-gradient(circle_at_78%_24%,rgba(124,244,255,0.24),transparent_34%),radial-gradient(circle_at_16%_86%,rgba(98,77,255,0.18),transparent_34%)]" />
          <div className="relative mx-auto grid max-w-[1220px] gap-7 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:py-24">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7cf4ff]">{page.eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-[34px] font-black leading-tight tracking-normal sm:text-[52px]">
                {page.title}
              </h1>
              <p className="mt-5 max-w-3xl text-[16px] font-semibold leading-8 text-white/76">{page.intro}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-[#7cf4ff] px-5 py-3 text-[13px] font-black text-black hover:bg-white">
                  Start with Tiwlo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-black/20 px-5 py-3 text-[13px] font-black text-white backdrop-blur hover:border-[#7cf4ff] hover:text-[#7cf4ff]">
                  About Tiwlo
                </Link>
              </div>
            </div>

            <aside className="relative overflow-hidden border border-white/10 bg-[#071918] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.34)] sm:p-7">
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(124,244,255,0.12),transparent_42%)]" />
              <div className="relative flex items-center gap-4 border-b border-white/10 pb-5">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#7cf4ff] text-black">
                  <Globe2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/52">Tiwlo profile</p>
                  <h2 className="mt-1 text-2xl font-black">{page.label}</h2>
                </div>
              </div>
              <div className="relative mt-5 grid gap-3">
                {[
                  ['Official brand', 'Tiwlo'],
                  ['Founder', 'Al Imran Niloy'],
                  ['Founded', '2020'],
                  ['Product', 'Cloud hosting + tPanel workflow']
                ].map(([label, value]) => (
                  <div key={label} className="border border-white/10 bg-black/25 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7cf4ff]">{label}</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-white/88">{value}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-[#020707] py-14">
          <div className="mx-auto grid max-w-[1220px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.76fr_1.24fr] lg:px-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7cf4ff]">Platform detail</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">What Tiwlo gives customers here</h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/62">
                Clear hosting, billing, support, payment, and tPanel information for teams that want one practical operations portal.
              </p>
            </div>
            <div className="grid gap-3">
              {page.sections.map((section) => (
                <article key={section.title} className="border border-white/10 bg-[#071918] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <BookOpenText className="h-5 w-5 text-[#7cf4ff]" />
                    <h3 className="text-lg font-black">{section.title}</h3>
                  </div>
                  <p className="text-sm font-semibold leading-7 text-white/68">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#020707,#071414)] py-14">
          <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7cf4ff]">Tiwlo workflow</p>
                <h2 className="mt-3 text-3xl font-black tracking-normal">How the platform supports this need</h2>
              </div>
              <Cloud className="hidden h-10 w-10 text-[#7cf4ff] sm:block" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {page.featureCards.map((feature) => (
                <article key={feature.title} className="border border-white/10 bg-white/[0.04] p-6">
                  <CheckCircle2 className="h-6 w-6 text-[#7cf4ff]" />
                  <h3 className="mt-5 text-lg font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-white/68">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#020707] py-14">
          <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-center gap-3">
              <FileQuestion className="h-6 w-6 text-[#7cf4ff]" />
              <h2 className="text-3xl font-black tracking-normal">FAQ</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {page.faqs.map((faq) => (
                <article key={faq.question} className="border border-white/10 bg-[#071918] p-5">
                  <h3 className="text-base font-black">{faq.question}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-white/68">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#020707] px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1220px] border-y border-white/10 bg-[#0a1c1b] p-6 sm:border sm:p-8">
            <h2 className="text-xl font-black">More Tiwlo pages</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {SEO_TOPIC_LINKS.filter((item) => item.to !== page.slug).map((item) => (
                <Link key={item.to} to={item.to} className="rounded-full border border-white/20 px-3 py-2 text-[12px] font-black text-white/72 hover:border-[#7cf4ff] hover:text-[#7cf4ff]">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
