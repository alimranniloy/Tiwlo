import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ChevronDown,
  CloudUpload,
  FileQuestion,
  Network,
  Server,
  ShieldCheck,
  TerminalSquare,
  type LucideIcon
} from 'lucide-react';
import Seo, { TIWLO_SEO, TIWLO_SOCIAL_LINKS, createTiwloBreadcrumbSchema, tiwloOrganizationSchema, tiwloWebsiteSchema } from '../components/Seo';
import { SEO_TOPIC_LINKS } from '../lib/seoTopicPages';
import SharedSiteHeader from '../components/landing/SiteHeader';
import SharedSiteFooter from '../components/landing/SiteFooter';

const CONSENT_KEY = 'tiwlo_cookie_consent_v1';
const HERO_VIDEO = '/media/computer-room-2.mp4';

type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

type ControlLayer = {
  key: string;
  label: string;
  icon: LucideIcon;
  title: string;
  copy: string;
  metrics: string[];
};

const topLinks = [
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/documentation' },
  { label: 'Docs', to: '/documentation' },
  { label: 'Careers', to: '/partners' },
  { label: 'Get Support', to: '/support' },
  { label: 'Contact Sales', to: '/support' }
];

const navLinks = [
  { label: 'Products', to: '/products', menu: true },
  { label: 'Solutions', to: '/services', menu: true },
  { label: 'Developers', to: '/api', menu: true },
  { label: 'Partners', to: '/partners', menu: true },
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' }
];

const promoMessages = [
  'Get $100 free credit for 1 month on Tiwlo',
  'Student founders can request extra trial credits',
  'Deploy hosting, stores, payments, and ISP billing from one console'
];

const showcaseLogos = [
  {
    src: '/brand/showcase/tmail-logo-white-220.png',
    srcSet: '/brand/showcase/tmail-logo-white-220.png 220w, /brand/showcase/tmail-logo-white-320.png 320w, /brand/showcase/tmail-logo-white-small.png 640w'
  },
  {
    src: '/brand/showcase/tfiber-220.png',
    srcSet: '/brand/showcase/tfiber-220.png 220w, /brand/showcase/tfiber-320.png 320w, /brand/showcase/tfiber-small.png 640w'
  },
  {
    src: '/brand/showcase/tpanel-220.png',
    srcSet: '/brand/showcase/tpanel-220.png 220w, /brand/showcase/tpanel-320.png 320w, /brand/showcase/tpanel-small.png 640w'
  }
];

const controlLayers: ControlLayer[] = [
  {
    key: 'cloud',
    label: 'Cloud',
    icon: Server,
    title: 'Deploy compute and hosting from connected regions',
    copy: 'Create droplets, tPanel hosting accounts, domains, DNS zones, SSL, and region-based packages from one billing-aware flow.',
    metrics: ['Droplets', 'tPanel accounts', 'DNS + SSL']
  },
  {
    key: 'runtime',
    label: 'Runtime',
    icon: TerminalSquare,
    title: 'Every hosting user gets isolated runtime controls',
    copy: 'PHP, Node.js, databases, FTP, file manager, terminal access, one-click apps, and package quotas stay scoped per account.',
    metrics: ['PHP selector', 'Node selector', 'File manager']
  },
  {
    key: 'commerce',
    label: 'Commerce',
    icon: Boxes,
    title: 'Stores, invoices, checkout, and products in one path',
    copy: 'Launch storefronts, manage themes, products, orders, customers, invoices, and Tiwlo Pay verification without leaving the platform.',
    metrics: ['Storefronts', 'Tiwlo Pay', 'Invoices']
  },
  {
    key: 'network',
    label: 'ISP',
    icon: Network,
    title: 'ISP billing and broadband operations stay connected',
    copy: 'Track routers, subscribers, billing packages, payments, and customer service workflows from the same operator dashboard.',
    metrics: ['Routers', 'Subscribers', 'Packages']
  },
  {
    key: 'shield',
    label: 'Shield',
    icon: ShieldCheck,
    title: 'Security controls follow the user lifecycle',
    copy: 'Device checks, country signals, disabled account review, WhatsApp OTP, Discord tickets, maintenance mode, and audit logs work together.',
    metrics: ['tSecurity', 'ID review', 'Audit logs']
  }
];

const workflowCards = [
  {
    title: 'Package rules actually provision',
    body: 'CPU, RAM, disk, bandwidth, domain, password, and module rules move from admin package setup into the live tPanel account.'
  },
  {
    title: 'No dummy control surfaces',
    body: 'The operator sees real regions, real hosting users, live username checks, SSO login, delete flows, and account-scoped limits.'
  },
  {
    title: 'Support is part of the product',
    body: 'Live chat, Discord tickets, disabled-account verification, and billing context connect support with the user account.'
  }
];

const resourceCards = [
  {
    kind: 'Guide',
    icon: CloudUpload,
    title: 'Deploy a tPanel hosting account with package limits',
    meta: 'Cloud guide - 8 min read'
  },
  {
    kind: 'Tutorial',
    icon: ShieldCheck,
    title: 'Connect WhatsApp OTP for signup and recovery',
    meta: 'Security tutorial - 6 min read'
  },
  {
    kind: 'Blog',
    icon: Network,
    title: 'How Tiwlo connects cloud, ISP, store, and support workflows',
    meta: 'Product notes - 5 min read'
  }
];

const homeFaqs = [
  {
    question: 'What is Tiwlo used for?',
    answer:
      'Tiwlo connects cloud hosting, VPS, tPanel hosting operations, ecommerce, ISP billing, domains, DNS, SSL, payments, support, and account security in one platform.'
  },
  {
    question: 'Does Tiwlo include tFiber workflows?',
    answer:
      'Yes. Tiwlo content includes tFiber and ISP-style infrastructure workflows for broadband service records, subscriber billing, router context, and support visibility.'
  },
  {
    question: 'Where is Tiwlo based?',
    answer:
      'Tiwlo lists Dhaka, Bangladesh as its public business address context and serves Bangladesh, the United Kingdom, and worldwide technology customers.'
  },
  {
    question: 'How can customers contact Tiwlo?',
    answer:
      'Customers can contact Tiwlo through support@tiwlo.com, +8801410014060, or the support page at tiwlo.com/support.'
  }
];

const footerColumns = [
  {
    title: 'Products',
    links: [
      { label: 'Droplets', to: '/products' },
      { label: 'tPanel Hosting', to: '/products' },
      { label: 'tPanel Page', to: '/tpanel-hosting' },
      { label: 'Tiwlo Pay', to: '/pricing' },
      { label: 'Cloud Store', to: '/commerce' }
    ]
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Website Hosting', to: '/services' },
      { label: 'Bangladesh Hosting', to: '/bangladesh-hosting' },
      { label: 'Cloud VPS', to: '/cloud-vps-hosting' },
      { label: 'ISP Billing', to: '/broadband' },
      { label: 'Ecommerce', to: '/commerce' },
      { label: 'Operations', to: '/services' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '/documentation' },
      { label: 'API', to: '/api' },
      { label: '$100 Free Credit', to: '/hosting-free-credit' },
      { label: 'Hosting Features', to: '/hosting-features' },
      { label: 'Support', to: '/support' },
      { label: 'Pricing', to: '/pricing' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Security', to: '/about' },
      { label: 'WHMCS Alternative', to: '/whmcs-alternative' },
      { label: 'Partners', to: '/partners' },
      { label: 'Contact', to: '/support' }
    ]
  }
];

const landingSchema = [
  tiwloOrganizationSchema,
  tiwloWebsiteSchema,
  {
    '@type': 'SoftwareApplication',
    '@id': 'https://tiwlo.com/#software',
    name: 'Tiwlo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: TIWLO_SEO.url,
    image: TIWLO_SEO.logo,
    description: TIWLO_SEO.description,
    creator: { '@id': 'https://tiwlo.com/#organization' },
    publisher: { '@id': 'https://tiwlo.com/#organization' },
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'USD',
      url: 'https://tiwlo.com/pricing'
    },
    featureList: [
      'Cloud hosting',
      'tPanel hosting accounts',
      'Ecommerce storefronts',
      'ISP billing',
      'Domain management',
      'DNS automation',
      'SSL automation',
      'Tiwlo Pay',
      'Support automation'
    ]
  },
  {
    '@type': 'WebPage',
    '@id': 'https://tiwlo.com/#webpage',
    url: TIWLO_SEO.url,
    name: 'Tiwlo - Operations Cloud',
    description: TIWLO_SEO.description,
    isPartOf: { '@id': 'https://tiwlo.com/#website' },
    about: { '@id': 'https://tiwlo.com/#organization' },
    breadcrumb: { '@id': 'https://tiwlo.com/#breadcrumb' },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: TIWLO_SEO.logo
    }
  },
  createTiwloBreadcrumbSchema([{ name: 'Home', item: '/' }], 'https://tiwlo.com/#breadcrumb'),
  {
    '@type': 'FAQPage',
    '@id': 'https://tiwlo.com/#faq',
    mainEntity: homeFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
];

function readConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    return saved ? (JSON.parse(saved) as CookieConsent) : null;
  } catch {
    return null;
  }
}

function CookieConsentBanner() {
  const [consent, setConsent] = React.useState<CookieConsent | null>(() => readConsent());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
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
    setSettingsOpen(false);
  };

  if (consent) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-4xl border border-white/15 bg-[#071514]/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7cf4ff]">Privacy preferences</p>
            <p className="mt-1 text-sm font-bold">Tiwlo uses necessary cookies for login, security, checkout, and support flows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSettingsOpen(true)} className="border border-white/25 px-4 py-2 text-[13px] font-bold hover:bg-white/10">Manage</button>
            <button onClick={() => saveConsent({ analytics: false, marketing: false })} className="border border-white/25 px-4 py-2 text-[13px] font-bold hover:bg-white/10">Decline</button>
            <button onClick={() => saveConsent({ analytics: true, marketing: true })} className="bg-[#7cf4ff] px-4 py-2 text-[13px] font-black text-black hover:bg-white">Accept all</button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/60 p-0 sm:place-items-center sm:p-4">
          <div className="w-full max-w-lg border border-white/15 bg-[#020707] text-white shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-black">Cookie settings</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-white/60">Choose optional cookies for this browser.</p>
            </div>
            <div className="space-y-3 p-5">
              {[
                { key: 'necessary', title: 'Necessary', detail: 'Required for authentication and secure service flows.', locked: true, value: true },
                { key: 'analytics', title: 'Analytics', detail: 'Helps improve product paths and page performance.', locked: false, value: choices.analytics },
                { key: 'marketing', title: 'Marketing', detail: 'Helps measure campaigns and offers.', locked: false, value: choices.marketing }
              ].map((item) => (
                <label key={item.key} className="flex items-start justify-between gap-4 border border-white/10 bg-white/[0.03] p-4">
                  <span>
                    <span className="block text-sm font-black">{item.title}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-white/55">{item.detail}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={item.value}
                    disabled={item.locked}
                    onChange={(event) => setChoices((current) => ({ ...current, [item.key]: event.target.checked }))}
                    className="mt-1 h-5 w-5 accent-[#7cf4ff]"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
              <button onClick={() => setSettingsOpen(false)} className="border border-white/20 px-4 py-2.5 text-[13px] font-black text-white hover:bg-white/10">Back</button>
              <button onClick={() => saveConsent(choices)} className="bg-[#7cf4ff] px-5 py-2.5 text-[13px] font-black text-black hover:bg-white">Save preferences</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromoBar() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % promoMessages.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#0b4c53] text-white">
      <div className="mx-auto flex h-7 max-w-[1320px] items-center justify-between px-3 text-[11px] font-bold sm:h-8 sm:px-4 sm:text-[12px] md:px-8">
        <Link to="/signup" className="inline-flex min-w-0 items-center gap-2 truncate hover:text-[#7cf4ff]">
          <span className="truncate">{promoMessages[active]}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
        <div className="hidden items-center gap-6 lg:flex">
          {topLinks.map((item) => (
            <Link key={item.label} to={item.to} className="hover:text-[#7cf4ff]">{item.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SiteHeader() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black text-white">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between px-3 sm:h-16 sm:px-4 md:px-8">
        <button onClick={() => navigate('/')} className="flex items-center">
          <img
            src="/brand/white-logo-256.png"
            srcSet="/brand/white-logo-256.png 256w, /brand/white-logo-320.png 320w, /brand/white-logo-small.png 512w"
            sizes="(min-width: 640px) 128px, 100px"
            width={320}
            height={107}
            alt="Tiwlo"
            className="h-7 w-[100px] object-contain object-left sm:h-8 sm:w-[128px]"
            decoding="async"
          />
        </button>
        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((item) => (
            <Link key={item.label} to={item.to} className="inline-flex items-center gap-1 text-[14px] font-bold text-white/88 hover:text-[#7cf4ff]">
              {item.label}
              {item.menu && <ChevronDown className="h-4 w-4" />}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="hidden px-3 py-2 text-[14px] font-bold text-white hover:text-[#7cf4ff] sm:block">Login</button>
          <button onClick={() => navigate('/signup')} className="rounded-full bg-[#7cf4ff] px-3.5 py-2 text-[12px] font-bold text-black transition hover:bg-white sm:px-5 sm:py-2.5 sm:text-[14px]">Sign up</button>
        </div>
      </div>
    </header>
  );
}

function DeferredBackgroundVideo({ className, priority = false }: { className?: string; priority?: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    if (priority) {
      const requestIdle = (window as any).requestIdleCallback as undefined | ((callback: () => void, options?: { timeout: number }) => number);
      const cancelIdle = (window as any).cancelIdleCallback as undefined | ((id: number) => void);
      if (requestIdle) {
        const id = requestIdle(() => setActive(true), { timeout: 900 });
        return () => cancelIdle?.(id);
      }
      const timer = window.setTimeout(() => setActive(true), 350);
      return () => window.clearTimeout(timer);
    }

    const node = videoRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      setActive(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '700px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [priority]);

  React.useEffect(() => {
    if (!active) return;
    videoRef.current?.play().catch(() => undefined);
  }, [active]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={active ? HERO_VIDEO : undefined}
      autoPlay={active}
      muted
      loop
      playsInline
      preload={priority ? 'metadata' : 'none'}
      aria-label="Tiwlo cloud infrastructure background"
    />
  );
}

function HeroVideo() {
  return (
    <div className="absolute inset-0">
      <DeferredBackgroundVideo
        className="h-full w-full object-cover"
        priority
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.48)_48%,rgba(0,0,0,0.78)),linear-gradient(180deg,rgba(0,0,0,0.4),#020707_92%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_25%,rgba(124,244,255,0.22),transparent_34%),radial-gradient(circle_at_18%_90%,rgba(98,77,255,0.2),transparent_36%)]" />
    </div>
  );
}

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative grid min-h-[560px] overflow-hidden bg-[#020707] text-white sm:min-h-[640px] lg:min-h-[720px]">
      <HeroVideo />
      <div className="relative z-10 mx-auto grid w-full max-w-[1220px] place-items-center px-3 py-10 text-center sm:px-5 md:px-8">
        <div className="mx-auto max-w-[860px]">
          <h1 className="text-[32px] font-black leading-[1.03] tracking-normal text-white sm:text-[48px] lg:text-[58px]">
            Operations Cloud
          </h1>
          <p className="mx-auto mt-4 max-w-[660px] text-[14px] font-semibold leading-6 text-white/84 sm:mt-5 sm:text-[17px] sm:leading-7">
            One workspace for hosting, payments, stores, ISP billing, DNS, and support teams that run live customer operations.
          </p>
          <div className="mt-7 flex flex-row justify-center gap-2 sm:mt-8 sm:gap-3">
            <button onClick={() => navigate('/signup')} className="rounded-full bg-[#7cf4ff] px-5 py-3 text-[13px] font-black text-black transition hover:bg-white sm:px-8 sm:py-3.5 sm:text-[15px]">
              Get started
            </button>
            <button onClick={() => navigate('/products')} className="rounded-full border border-white/70 bg-black/20 px-5 py-3 text-[13px] font-black text-white backdrop-blur transition hover:border-[#7cf4ff] hover:text-[#7cf4ff] sm:px-8 sm:py-3.5 sm:text-[15px]">
              Explore platform
            </button>
          </div>
          <LogoShowcaseRow />
        </div>

      </div>
    </section>
  );
}

function LogoShowcaseRow() {
  return (
    <div className="mx-auto mt-9 flex w-full max-w-[760px] items-center justify-center gap-2 sm:mt-12 sm:gap-8">
      {showcaseLogos.map((logo) => (
        <div key={logo.src} className="min-w-0 flex-1">
          <img
            src={logo.src}
            srcSet={logo.srcSet}
            sizes="(min-width: 640px) 220px, 120px"
            alt=""
            width={320}
            height={107}
            className="mx-auto max-h-7 w-full object-contain opacity-88 sm:max-h-11"
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </div>
        ))}
    </div>
  );
}

function ArchitectureVisual() {
  return (
    <div className="relative min-h-[420px] overflow-hidden border border-white/10 bg-[#071918] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(124,244,255,0.16),transparent_42%),radial-gradient(circle_at_70%_20%,rgba(167,139,250,0.2),transparent_34%)]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative min-h-[380px]">
        <div className="absolute left-6 top-8 h-24 w-24 border border-[#7cf4ff]/60 bg-black/35" />
        <div className="absolute left-20 top-20 h-32 w-32 border border-white/20 bg-white/[0.03]" />
        <div className="absolute right-8 top-14 h-36 w-44 border border-[#7cf4ff]/40 bg-black/30" />
        <div className="absolute bottom-10 left-10 h-28 w-48 border border-white/20 bg-black/35" />
        <div className="absolute bottom-16 right-12 h-32 w-32 rounded-full border border-[#7cf4ff]/60 bg-[#7cf4ff]/10" />
        <div className="absolute left-[46%] top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/45 shadow-[0_0_80px_rgba(124,244,255,0.24)]" />
        <div className="absolute left-14 right-14 top-1/2 h-px bg-[#7cf4ff]/40" />
        <div className="absolute bottom-24 left-1/2 top-20 w-px bg-white/18" />
        <div className="absolute bottom-6 left-6 right-6 flex justify-between">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="h-2 w-2 rounded-full bg-[#7cf4ff]/70" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ControlPlaneMockup() {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#071918] p-4 shadow-[0_30px_110px_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(124,244,255,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
      <div className="relative grid gap-3">
        <div className="flex items-center justify-between border border-white/10 bg-black/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#7cf4ff]" />
            <span className="text-[13px] font-black text-white/88">Tiwlo live operations</span>
          </div>
          <span className="text-[12px] font-bold text-emerald-300">healthy</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Regions', value: '8' },
            { label: 'Accounts', value: '1,248' },
            { label: 'Tickets', value: '32' }
          ].map((item) => (
            <div key={item.label} className="border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[12px] font-bold text-white/50">{item.label}</p>
              <p className="mt-2 text-2xl font-black">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3 border border-white/10 bg-black/25 p-4">
            {['tPanel package applied', 'Domain DNS queued', 'WhatsApp OTP ready', 'Support routed'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#7cf4ff] text-[12px] font-black text-black">✓</span>
                <span className="text-[13px] font-bold text-white/82">{item}</span>
              </div>
            ))}
          </div>
          <div className="border border-white/10 bg-black/25 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] font-black text-white/80">Resource usage</span>
              <span className="text-[12px] font-bold text-[#7cf4ff]">package locked</span>
            </div>
            {[
              ['CPU', '46%'],
              ['RAM', '62%'],
              ['Disk', '28%']
            ].map(([label, value]) => (
              <div key={label} className="mb-4 last:mb-0">
                <div className="mb-2 flex justify-between text-[12px] font-bold text-white/60">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-2 bg-white/10">
                  <div className="h-full bg-[#7cf4ff]" style={{ width: value }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformSection() {
  const [active, setActive] = React.useState(controlLayers[0].key);
  const selected = controlLayers.find((item) => item.key === active) || controlLayers[0];
  const SelectedIcon = selected.icon;

  return (
    <section className="bg-[#020707] py-16 text-white sm:py-24">
      <div className="mx-auto max-w-[1220px] px-0 sm:px-5 md:px-8">
        <div className="px-4 text-center sm:px-0">
          <h2 className="mx-auto max-w-4xl text-[32px] font-black leading-tight tracking-normal sm:text-[44px]">
            One platform, separate modules, real connected work.
          </h2>
          <p className="mx-auto mt-4 max-w-[700px] text-[15px] font-semibold leading-7 text-white/72 sm:text-[17px]">
            Each module has its own flow, but provisioning, billing, users, support, and security share the same operational context.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="grid grid-cols-2 gap-2 px-4 sm:px-0 lg:block lg:space-y-2">
            {controlLayers.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;
              return (
                <button
                  key={item.key}
                  onClick={() => setActive(item.key)}
                  className={`flex items-center gap-3 rounded-full px-4 py-3 text-left text-[14px] font-black transition ${isActive ? 'bg-[#7cf4ff] text-black' : 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/10'}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <article className="border border-white/10 bg-[#071918] p-6 sm:p-8">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full bg-[#7cf4ff] text-black">
                <SelectedIcon className="h-6 w-6" />
              </div>
              <h3 className="text-[28px] font-black leading-tight">{selected.title}</h3>
              <p className="mt-4 text-[16px] font-semibold leading-7 text-white/78">{selected.copy}</p>
              <div className="mt-7 grid gap-2 sm:grid-cols-3">
                {selected.metrics.map((item) => (
                  <span key={item} className="border border-white/10 bg-black/25 px-3 py-3 text-[13px] font-black text-[#7cf4ff]">
                    {item}
                  </span>
                ))}
              </div>
            </article>
            <ArchitectureVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#020707,#071414)] py-16 text-white sm:py-24">
      <div className="mx-auto max-w-[1220px] px-0 sm:px-5 md:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="px-4 sm:px-0">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#7cf4ff]">Built different from a clone</p>
            <h2 className="mt-4 text-[32px] font-black leading-tight tracking-normal sm:text-[46px]">
              Designed around Tiwlo operators, not a generic cloud brochure.
            </h2>
          </div>
          <p className="px-4 text-[16px] font-semibold leading-7 text-white/72 sm:px-0">
            The page now speaks about your actual modules: tPanel servers, package limits, WhatsApp OTP, identity review, store management, ISP billing, live support, and real admin-connected regions.
          </p>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {workflowCards.map((card) => (
            <article key={card.title} className="border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <h3 className="text-[22px] font-black leading-tight">{card.title}</h3>
              <p className="mt-4 text-[15px] font-semibold leading-7 text-white/72">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResourcesSection() {
  return (
    <section className="bg-[#020707] py-16 text-white sm:py-24">
      <div className="mx-auto max-w-[1220px] px-0 sm:px-5 md:px-8">
        <div className="mb-8 flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
          <div className="flex items-center gap-4">
            <h2 className="text-[32px] font-black tracking-normal sm:text-[40px]">Resources</h2>
            <Link to="/documentation" className="rounded-full border border-white/70 px-5 py-2.5 text-[14px] font-black hover:border-[#7cf4ff] hover:text-[#7cf4ff]">View all</Link>
          </div>
          <div className="hidden gap-3 md:flex">
            <button className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-[#7cf4ff]"><ArrowLeft className="h-5 w-5" /></button>
            <button className="grid h-11 w-11 place-items-center rounded-full bg-[#7cf4ff] text-black"><ArrowRight className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {resourceCards.map((card) => (
            <article key={card.title} className="flex min-h-[300px] flex-col border border-white/10 bg-[#071918] p-6 sm:p-8">
              <div className="mb-7 flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-[linear-gradient(135deg,#7cf4ff,#a78bfa)] text-black shadow-[0_20px_60px_rgba(124,244,255,0.18)]">
                  <card.icon className="h-7 w-7" />
                </span>
                <p className="text-[15px] font-black text-white/90">{card.kind}</p>
              </div>
              <h3 className="text-[24px] font-black leading-tight">{card.title}</h3>
              <p className="mt-5 text-[14px] font-bold text-white/68">{card.meta}</p>
              <Link to="/documentation" className="mt-auto inline-flex items-center gap-2 pt-10 text-[16px] font-black hover:text-[#7cf4ff]">
                Read
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeFaqSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#020707,#071414)] py-16 text-white sm:py-24">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-5 md:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#7cf4ff]">FAQ</p>
            <h2 className="mt-3 text-[30px] font-black leading-tight tracking-normal sm:text-[42px]">Tiwlo company and platform basics</h2>
          </div>
          <FileQuestion className="hidden h-10 w-10 text-[#7cf4ff] sm:block" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {homeFaqs.map((faq) => (
            <article key={faq.question} className="border border-white/10 bg-[#071918] p-5 sm:p-6">
              <h3 className="text-[17px] font-black leading-6 text-white">{faq.question}</h3>
              <p className="mt-3 text-[14px] font-semibold leading-7 text-white/68">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  const navigate = useNavigate();
  return (
    <section className="bg-[#020707] pb-14 text-white sm:pb-24">
      <div className="mx-auto max-w-[1220px] px-0 sm:px-5 md:px-8">
        <div className="relative overflow-hidden border-y border-white/10 bg-[#0a1c1b] px-4 py-16 text-center sm:rounded-[24px] sm:border sm:px-10 sm:py-20">
          <DeferredBackgroundVideo className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,7,0.62),rgba(2,7,7,0.92)),radial-gradient(circle_at_50%_20%,rgba(124,244,255,0.24),transparent_48%)]" />
          <div className="relative mx-auto max-w-[720px]">
            <h2 className="text-[34px] font-black leading-tight tracking-normal sm:text-[46px]">Start building on Tiwlo today</h2>
            <p className="mx-auto mt-4 max-w-[620px] text-[16px] font-semibold leading-7 text-white/82">
              Connect a server, create a package, deploy a hosting account, launch a store, and keep support tied to the same customer.
            </p>
            <button onClick={() => navigate('/signup')} className="mt-9 rounded-full bg-white px-8 py-3.5 text-[15px] font-black text-black transition hover:bg-[#7cf4ff]">
              Sign up
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="border-t border-white/10 bg-black px-4 pb-14 pt-10 text-white md:px-8">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[16px] font-black">{column.title}</h3>
              <div className="mt-4 space-y-2.5">
                {column.links.map((item) => (
                  <Link key={item.label} to={item.to} className="block text-[14px] font-semibold text-white/70 hover:text-[#7cf4ff]">{item.label}</Link>
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
            <Link to="/privacy" className="hover:text-[#7cf4ff]">Privacy</Link>
            <Link to="/terms" className="hover:text-[#7cf4ff]">Terms</Link>
            <Link to="/support" className="hover:text-[#7cf4ff]">Support</Link>
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black font-sans text-white selection:bg-[#7cf4ff] selection:text-black">
      <Seo
        title="Tiwlo - Cloud Hosting, tPanel, Ecommerce, ISP Billing, Domains, SSL, and Payments"
        description={TIWLO_SEO.description}
        canonicalPath="/"
        schema={landingSchema}
      />
      <PromoBar />
      <SharedSiteHeader />
      <main>
        <HeroSection />
        <PlatformSection />
        <WorkflowSection />
        <ResourcesSection />
        <HomeFaqSection />
        <CtaSection />
      </main>
      <SharedSiteFooter />
      <CookieConsentBanner />
    </div>
  );
}
