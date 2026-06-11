import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BadgeCheck, FileText, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import Seo, { TIWLO_SEO, createTiwloBreadcrumbSchema, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import SiteHeader from '../components/landing/SiteHeader';
import SiteFooter from '../components/landing/SiteFooter';

type LegalSection = {
  title: string;
  body: string[];
};

type LegalContent = {
  label: string;
  eyebrow: string;
  intro: string;
  canonicalPath: string;
  updated: string;
  icon: typeof FileText;
  highlights: string[];
  sections: LegalSection[];
};

const legalContent: Record<'terms' | 'privacy', LegalContent> = {
  terms: {
    label: 'Terms of Service',
    eyebrow: 'Tiwlo legal agreement',
    intro:
      'These terms explain how customers, administrators, staff members, and integrations may use Tiwlo cloud hosting, tPanel, ecommerce, ISP billing, domains, DNS, SSL, payment, support, and automation services.',
    canonicalPath: '/terms',
    updated: 'June 9, 2026',
    icon: FileText,
    highlights: [
      'Use Tiwlo services only for lawful cloud, hosting, commerce, billing, and support operations.',
      'Protect account credentials, API keys, webhook secrets, bot tokens, and administrator access.',
      'Fraud, abuse, payment manipulation, spam, malware, or unsafe automation can lead to review, suspension, or blocking.'
    ],
    sections: [
      {
        title: '1. Platform access and account responsibility',
        body: [
          'You are responsible for the activity that happens under your Tiwlo account, workspace, team members, API keys, support sessions, payment proofs, and connected integrations.',
          'Account information, billing details, domain records, service usage, and verification details must be accurate enough for Tiwlo to operate the service, prevent abuse, and contact the account owner when needed.'
        ]
      },
      {
        title: '2. Cloud, hosting, ecommerce, ISP, and payment services',
        body: [
          'Tiwlo may provide cloud server management, tPanel hosting accounts, domains, DNS, SSL automation, ecommerce storefronts, ISP billing tools, Tiwlo Pay workflows, invoices, support tickets, and related operational modules.',
          'Some services depend on third-party providers, payment processors, DNS networks, messaging platforms, verification services, or server infrastructure. Availability can vary because of provider maintenance, regional network issues, abuse reviews, or security events.'
        ]
      },
      {
        title: '3. Security review, fraud controls, and service enforcement',
        body: [
          'Tiwlo may review account activity, signup signals, device and network signals, payment proof metadata, verification records, support behavior, and system logs to protect the platform and customers.',
          'When unusual or unsafe activity is detected, Tiwlo may require verification, restrict service creation, hold credits, suspend an account, block abusive traffic, or contact the account owner for review.'
        ]
      },
      {
        title: '4. Acceptable use',
        body: [
          'You may not use Tiwlo to host malware, phishing pages, spam systems, credential theft pages, illegal content, copyright-infringing content, network attacks, crypto abuse, deceptive payment flows, or services designed to bypass another platform.',
          'You may not attempt to bypass rate limits, security checks, fraud checks, identity verification, payment review, module permissions, or administrator access controls.'
        ]
      },
      {
        title: '5. Billing, credits, holds, refunds, and verification',
        body: [
          'Promotional credits, account credits, payment verification, balance holds, refund decisions, and invoice status may depend on the account settings and risk controls configured by Tiwlo administrators.',
          'Credits have no cash value unless Tiwlo explicitly states otherwise. Suspicious payments, chargebacks, duplicate proof uploads, or mismatched account information may be reviewed before service activation.'
        ]
      },
      {
        title: '6. Administrators, staff, and integrations',
        body: [
          'Admin actions, support staff actions, Discord bot actions, webhook activity, email events, WhatsApp verification events, and service provisioning events may be logged for security, audit, and support purposes.',
          'You are responsible for choosing safe staff permissions and protecting connected third-party accounts used with Tiwlo.'
        ]
      },
      {
        title: '7. Changes and contact',
        body: [
          'Tiwlo may update these terms as the platform, modules, legal requirements, or security requirements change. The latest version will be published on tiwlo.com.',
          'For questions about these terms, contact support@tiwlo.com.'
        ]
      }
    ]
  },
  privacy: {
    label: 'Privacy Policy',
    eyebrow: 'Tiwlo privacy notice',
    intro:
      'This policy explains how Tiwlo handles account, cloud, hosting, billing, ecommerce, ISP, payment, identity verification, support, Discord, WhatsApp, security, and service telemetry data.',
    canonicalPath: '/privacy',
    updated: 'June 9, 2026',
    icon: LockKeyhole,
    highlights: [
      'Tiwlo processes data needed to run accounts, services, billing, support, verification, and security.',
      'Security logs and fraud signals help protect customers and the platform from abuse.',
      'Administrators can use retention, access control, and audit workflows to manage sensitive operational records.'
    ],
    sections: [
      {
        title: '1. Data Tiwlo may process',
        body: [
          'Tiwlo may process names, email addresses, phone numbers, account status, role and permission data, billing details, invoices, payment proof metadata, verification records, support messages, live chat records, Discord event metadata, WhatsApp verification status, service usage, API activity, and audit logs.',
          'For infrastructure services, Tiwlo may process server package settings, region selection, domain names, DNS records, SSL status, resource usage, provisioning events, and error logs required to operate the service.'
        ]
      },
      {
        title: '2. Security, fraud, and abuse prevention data',
        body: [
          'Tiwlo may process IP address, country, device signals, browser signals, request timing, session metadata, rate-limit events, login events, signup events, block events, verification attempts, and other operational signals to detect abuse.',
          'These records help identify unusual activity, account takeover attempts, fake signups, payment abuse, support spam, bot traffic, and unsafe automation.'
        ]
      },
      {
        title: '3. Discord, WhatsApp, email, and support integrations',
        body: [
          'When enabled, integrations may receive or store ticket events, live chat events, invoice proof events, verification review events, staff actions, channel IDs, role IDs, message IDs, webhook events, email delivery status, and message metadata needed to run automation.',
          'Tiwlo only needs these integration details to operate configured workflows, route support, notify administrators, and keep audit context.'
        ]
      },
      {
        title: '4. Cookies and browser storage',
        body: [
          'Tiwlo uses necessary cookies and browser storage for login, secure sessions, fraud prevention, checkout, support, and user preferences.',
          'Optional analytics or marketing storage may be controlled through the cookie preference banner when it is available on the website.'
        ]
      },
      {
        title: '5. Sharing and subprocessors',
        body: [
          'Tiwlo may share limited operational data with hosting providers, payment processors, DNS providers, email providers, messaging platforms, verification services, analytics providers, or security tools when needed to provide the service.',
          'Tiwlo does not sell customer account data as a standalone product.'
        ]
      },
      {
        title: '6. Retention, access, and deletion',
        body: [
          'Retention depends on account settings, billing needs, security needs, support records, audit requirements, fraud prevention, and legal obligations.',
          'Some security, billing, or audit records may be retained after deletion requests when needed to prevent abuse, resolve disputes, comply with law, or protect the platform.'
        ]
      },
      {
        title: '7. Contact',
        body: [
          'For privacy questions, security questions, or data requests, contact support@tiwlo.com.',
          'Tiwlo may need to verify account ownership before changing, exporting, or deleting sensitive account records.'
        ]
      }
    ]
  }
};

function createLegalSchema(page: LegalContent) {
  const canonical = `https://tiwlo.com${page.canonicalPath}`;
  return [
    tiwloOrganizationSchema,
    tiwloWebsiteSchema,
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: `${page.label} - Tiwlo`,
      description: page.intro,
      dateModified: '2026-06-09',
      inLanguage: 'en',
      isPartOf: { '@id': 'https://tiwlo.com/#website' },
      publisher: { '@id': 'https://tiwlo.com/#organization' },
      about: { '@id': 'https://tiwlo.com/#organization' },
      breadcrumb: { '@id': `${canonical}#breadcrumb` },
      mainEntity: {
        '@type': 'Organization',
        '@id': 'https://tiwlo.com/#organization'
      }
    },
    createTiwloBreadcrumbSchema(
      [
        { name: 'Home', item: '/' },
        { name: page.label, item: page.canonicalPath }
      ],
      `${canonical}#breadcrumb`
    )
  ];
}

export default function LegalPage() {
  const location = useLocation();
  const pageKey = location.pathname.includes('privacy') ? 'privacy' : 'terms';
  const page = legalContent[pageKey];
  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <Seo
        title={`${page.label} - Tiwlo`}
        description={page.intro}
        canonicalPath={page.canonicalPath}
        schema={createLegalSchema(page)}
      />

      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <div className="mb-5 grid h-14 w-14 place-items-center rounded bg-[#0069ff] text-white">
              <Icon className="h-7 w-7" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0069ff]">{page.eyebrow}</p>
            <h1 className="mt-4 text-[36px] font-black leading-tight tracking-normal text-slate-950 sm:text-[52px]">
              {page.label}
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-600">{page.intro}</p>
          </div>
          <aside className="border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.07)] sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Document profile</p>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-3 border border-slate-200 bg-[#f8fafc] p-4">
                <BadgeCheck className="h-5 w-5 text-[#0069ff]" />
                <div>
                  <p className="text-[12px] font-black text-slate-950">Publisher</p>
                  <p className="text-[12px] font-semibold text-slate-500">{TIWLO_SEO.legalName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border border-slate-200 bg-[#f8fafc] p-4">
                <ShieldCheck className="h-5 w-5 text-[#0069ff]" />
                <div>
                  <p className="text-[12px] font-black text-slate-950">Last updated</p>
                  <p className="text-[12px] font-semibold text-slate-500">{page.updated}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border border-slate-200 bg-[#f8fafc] p-4">
                <Mail className="h-5 w-5 text-[#0069ff]" />
                <div>
                  <p className="text-[12px] font-black text-slate-950">Contact</p>
                  <p className="text-[12px] font-semibold text-slate-500">{TIWLO_SEO.email}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-9 grid gap-3 md:grid-cols-3">
          {page.highlights.map((item) => (
            <div key={item} className="border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold leading-7 text-slate-700">{item}</p>
            </div>
          ))}
        </section>

        <article className="mt-8 border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.07)] sm:p-8">
          <div className="grid gap-8">
            {page.sections.map((section) => (
              <section key={section.title} className="border-b border-slate-100 pb-7 last:border-b-0 last:pb-0">
                <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-600">{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <section className="mt-8 flex flex-col gap-3 border border-slate-200 bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7cf4ff]">Need help?</p>
            <h2 className="mt-2 text-xl font-black">Contact Tiwlo support for legal, billing, or privacy questions.</h2>
          </div>
          <Link to="/support" className="inline-flex items-center justify-center gap-2 rounded bg-[#7cf4ff] px-5 py-3 text-[13px] font-black text-black hover:bg-white">
            Support <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
