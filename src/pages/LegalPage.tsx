import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const content = {
  terms: {
    label: 'Terms of Service',
    eyebrow: 'Tiwlo legal',
    intro: 'These terms govern access to Tiwlo cloud, billing, support, automation, Discord bot, and related platform services.',
    sections: [
      ['Use of services', 'You are responsible for account activity, accurate billing information, lawful use, and protecting credentials, API keys, and bot tokens.'],
      ['Automation and integrations', 'Discord and other integrations may create support tickets, live chat records, invoice review actions, verification review actions, and audit logs according to your configured settings.'],
      ['Payments and support', 'Invoices, payment proofs, refunds, and support actions are subject to review. Tiwlo may suspend abusive, fraudulent, or unsafe activity.'],
      ['Contact', 'For legal or support questions, contact support@tiwlo.com.']
    ]
  },
  privacy: {
    label: 'Privacy Policy',
    eyebrow: 'Tiwlo privacy',
    intro: 'This policy explains how Tiwlo handles account, support, billing, identity verification, Discord integration, and service telemetry data.',
    sections: [
      ['Data we process', 'We may process names, emails, account status, support messages, live chat messages, invoice data, payment proof metadata, identity review evidence, audit logs, and integration configuration.'],
      ['Discord bot data', 'When enabled, the Discord bot may receive ticket events, live chat events, invoice proof events, verification review events, staff actions, channel IDs, role IDs, and message metadata needed to run automation.'],
      ['Security and retention', 'Access controls, audit logs, masking, retention settings, and administrator approvals help protect sensitive records. Retention depends on your configured policies and legal requirements.'],
      ['Contact', 'For privacy questions, contact support@tiwlo.com.']
    ]
  }
};

export default function LegalPage() {
  const location = useLocation();
  const page = location.pathname.includes('privacy') ? content.privacy : content.terms;

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <main className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex">
            <BrandLogo className="h-10 w-32" />
          </Link>
          <Link to="/" className="border border-slate-300 bg-white px-4 py-2 text-[13px] font-black text-slate-700 hover:bg-slate-50">
            Back home
          </Link>
        </div>
        <article className="border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#0069ff]">{page.eyebrow}</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{page.label}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{page.intro}</p>
          <div className="mt-8 space-y-7">
            {page.sections.map(([title, detail]) => (
              <section key={title}>
                <h2 className="text-base font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{detail}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}
