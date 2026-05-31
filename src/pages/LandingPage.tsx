import React from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Stats from '../components/landing/Stats';
import Features from '../components/landing/Features';
import ISPSection from '../components/landing/ISPSection';
import EcommerceSection from '../components/landing/EcommerceSection';
import EdgeSection from '../components/landing/EdgeSection';
import BentoSection from '../components/landing/BentoSection';
import IntegrationsSection from '../components/landing/IntegrationsSection';
import SecuritySection from '../components/landing/SecuritySection';
import EnterpriseSection from '../components/landing/EnterpriseSection';
import ComplianceSection from '../components/landing/ComplianceSection';
import SupportSection from '../components/landing/SupportSection';
import FAQSection from '../components/landing/FAQSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import ProcessSection from '../components/landing/ProcessSection';
import InfrastructureSection from '../components/landing/InfrastructureSection';
import MigrationSection from '../components/landing/MigrationSection';
import DeveloperSection from '../components/landing/DeveloperSection';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';

const CONSENT_KEY = 'tiwlo_cookie_consent_v1';

type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

function readConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    return saved ? JSON.parse(saved) as CookieConsent : null;
  } catch {
    return null;
  }
}

function CookieConsentBanner() {
  const [consent, setConsent] = React.useState<CookieConsent | null>(() => readConsent());
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [choices, setChoices] = React.useState({ analytics: true, marketing: false });

  const saveConsent = (next: { analytics: boolean; marketing: boolean }) => {
    const payload: CookieConsent = {
      necessary: true,
      analytics: next.analytics,
      marketing: next.marketing,
      savedAt: new Date().toISOString()
    };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    setConsent(payload);
    setIsSettingsOpen(false);
  };

  if (consent) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-5xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#0069ff]" />
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Privacy preferences</p>
            </div>
            <h2 className="text-base font-black text-slate-950 sm:text-lg">We use cookies to keep Tiwlo reliable and improve your experience.</h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-600">
              Necessary cookies keep sign-in, security, and checkout working. Optional cookies help us understand product usage and improve campaigns.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <button onClick={() => setIsSettingsOpen(true)} className="border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-black text-slate-700 hover:border-slate-400 hover:bg-slate-50">
              Manage
            </button>
            <button onClick={() => saveConsent({ analytics: false, marketing: false })} className="border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-black text-slate-700 hover:border-slate-400 hover:bg-slate-50">
              Decline optional
            </button>
            <button onClick={() => saveConsent({ analytics: true, marketing: true })} className="bg-[#0069ff] px-5 py-2.5 text-[13px] font-black text-white hover:bg-[#0056cc]">
              Accept all
            </button>
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-black text-slate-950">Cookie settings</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">Choose which optional cookies Tiwlo can use on this browser.</p>
            </div>
            <div className="space-y-3 p-5">
              {[
                { key: 'necessary', title: 'Necessary', detail: 'Required for security, authentication, and core service flows.', locked: true, value: true },
                { key: 'analytics', title: 'Analytics', detail: 'Helps us measure performance and improve product paths.', locked: false, value: choices.analytics },
                { key: 'marketing', title: 'Marketing', detail: 'Helps us personalize campaign measurement and offers.', locked: false, value: choices.marketing }
              ].map((item) => (
                <label key={item.key} className="flex items-start justify-between gap-4 border border-slate-200 p-4">
                  <span>
                    <span className="block text-sm font-black text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-slate-500">{item.detail}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={item.value}
                    disabled={item.locked}
                    onChange={(event) => setChoices((current) => ({ ...current, [item.key]: event.target.checked }))}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-[#0069ff]"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
              <button onClick={() => setIsSettingsOpen(false)} className="border border-slate-300 px-4 py-2.5 text-[13px] font-black text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button onClick={() => saveConsent(choices)} className="bg-[#0069ff] px-5 py-2.5 text-[13px] font-black text-white hover:bg-[#0056cc]">
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 scroll-smooth">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <IntegrationsSection />
        <Features />
        <ProcessSection />
        <ISPSection />
        <InfrastructureSection />
        <SecuritySection />
        <EdgeSection />
        <DeveloperSection />
        <EcommerceSection />
        <MigrationSection />
        <EnterpriseSection />
        <BentoSection />
        <TestimonialsSection />
        <ComplianceSection />
        <FAQSection />
        <CTA />
        <SupportSection />
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
}
