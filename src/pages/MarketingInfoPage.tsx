import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'material-icons/iconfont/filled.css';
import { ArrowRight, ChevronDown } from 'lucide-react';

type MarketingVariant = 'products' | 'solutions' | 'developers' | 'partners' | 'pricing' | 'support';

type MarketingInfoPageProps = {
  variant: MarketingVariant;
};

const pageData: Record<MarketingVariant, {
  eyebrow: string;
  title: string;
  copy: string;
  icon: string;
  cards: Array<{ title: string; body: string; icon: string }>;
}> = {
  products: {
    eyebrow: 'Products',
    title: 'Cloud, hosting, commerce, payment, and ISP tools in one platform.',
    copy: 'Pick the Tiwlo modules you need, connect real infrastructure, and keep every user workflow tied to one account.',
    icon: 'cloud_upload',
    cards: [
      { title: 'Droplets and tPanel', body: 'Create hosting accounts from connected regions with package limits, domains, and SSO.', icon: 'dns' },
      { title: 'Tiwlo Pay', body: 'Verify merchants, send invoices, and route OTP or recovery messages through WhatsApp.', icon: 'payments' },
      { title: 'Cloud Store', body: 'Launch storefronts, products, orders, themes, and customer dashboards.', icon: 'store' },
      { title: 'ISP Billing', body: 'Manage routers, subscribers, packages, invoices, and support requests.', icon: 'router' }
    ]
  },
  solutions: {
    eyebrow: 'Solutions',
    title: 'Operational workflows for teams that sell and support infrastructure.',
    copy: 'Tiwlo keeps billing, hosting, identity review, support, and admin controls connected from signup to renewal.',
    icon: 'device_hub',
    cards: [
      { title: 'Website hosting', body: 'Provision domains, SSL, PHP, Node, databases, and file manager access per account.', icon: 'language' },
      { title: 'Security review', body: 'Handle disabled users, ID verification, WhatsApp verification, and support tickets.', icon: 'verified_user' },
      { title: 'Commerce operations', body: 'Run products, checkout, invoices, stores, and payment verification in one console.', icon: 'shopping_basket' },
      { title: 'ISP operations', body: 'Give operators a cleaner workflow for broadband billing and customer management.', icon: 'settings_input_antenna' }
    ]
  },
  developers: {
    eyebrow: 'Developers',
    title: 'APIs and runtime tools for building on top of Tiwlo.',
    copy: 'Use API credentials, webhooks, runtime selectors, package metadata, and provisioning records to automate operations.',
    icon: 'code',
    cards: [
      { title: 'Provisioning API', body: 'Create and manage cloud resources with deployment metadata and package limits.', icon: 'http' },
      { title: 'Runtime selectors', body: 'Map PHP and Node versions to hosting accounts and domains.', icon: 'code' },
      { title: 'Automation logs', body: 'Trace order, account, support, verification, and system events.', icon: 'search' },
      { title: 'Integrations', body: 'Connect WhatsApp, Discord, email, tPanel, and billing flows.', icon: 'extension' }
    ]
  },
  partners: {
    eyebrow: 'Partners',
    title: 'Bring hosting, ISP, store, or payment operations into Tiwlo.',
    copy: 'Partner flows are built for operators who need modules, support routing, verified users, and clean billing in one place.',
    icon: 'people',
    cards: [
      { title: 'Hosting partners', body: 'Connect tPanel servers and publish customer-ready regions.', icon: 'public' },
      { title: 'ISP partners', body: 'Operate broadband billing and subscriber support through Tiwlo.', icon: 'wifi' },
      { title: 'Commerce partners', body: 'Launch stores and payment workflows for merchants.', icon: 'store' },
      { title: 'Support partners', body: 'Route live chat and Discord tickets with account context.', icon: 'support_agent' }
    ]
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Transparent package-based pricing for each module.',
    copy: 'Admins define real package limits and users see clean monthly/hourly billing before creating a resource.',
    icon: 'attach_money',
    cards: [
      { title: 'Cloud packages', body: 'CPU, RAM, disk, bandwidth, storage, domain, and auth rules are package-driven.', icon: 'cloud' },
      { title: 'Credit billing', body: 'Hourly and monthly cost stays visible before deployment.', icon: 'account_balance_wallet' },
      { title: 'Module options', body: 'tPanel, store, ISP, and payment modules can be priced separately.', icon: 'category' },
      { title: 'Upgrade path', body: 'Limits can expand with admin-created packages and future add-ons.', icon: 'trending_up' }
    ]
  },
  support: {
    eyebrow: 'Support',
    title: 'Support that understands the account, resource, and module.',
    copy: 'Live chat, ticketing, Discord routing, identity review, and billing context work together for faster resolution.',
    icon: 'support_agent',
    cards: [
      { title: 'Live chat', body: 'Open support with account context and route it to the right staff workflow.', icon: 'chat' },
      { title: 'Discord tickets', body: 'Send disabled account, billing, and verification events to dedicated channels.', icon: 'confirmation_number' },
      { title: 'Identity review', body: 'Review documents and verification results from admin queues.', icon: 'badge' },
      { title: 'Billing help', body: 'Keep invoices, credits, payments, and resource status in view.', icon: 'receipt_long' }
    ]
  }
};

const navLinks = [
  { label: 'Products', to: '/products', menu: true },
  { label: 'Solutions', to: '/services', menu: true },
  { label: 'Developers', to: '/api', menu: true },
  { label: 'Partners', to: '/partners', menu: true },
  { label: 'Pricing', to: '/pricing' }
];

function Header() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black text-white">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between px-3 sm:h-16 sm:px-4 md:px-8">
        <button onClick={() => navigate('/')} className="flex items-center">
          <img src="/brand/white-logo.png" alt="Tiwlo" className="h-7 w-[100px] object-contain object-left sm:h-8 sm:w-[128px]" />
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

export default function MarketingInfoPage({ variant }: MarketingInfoPageProps) {
  const data = pageData[variant];
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020707] text-white selection:bg-[#7cf4ff] selection:text-black">
      <Header />
      <main>
        <section className="relative overflow-hidden px-4 py-16 md:px-8 md:py-24">
          <video className="absolute inset-0 h-full w-full object-cover opacity-22" src="/media/computer-room-2.mp4" autoPlay muted loop playsInline preload="metadata" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,7,0.65),#020707),radial-gradient(circle_at_70%_20%,rgba(124,244,255,0.22),transparent_38%)]" />
          <div className="relative mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-[#7cf4ff]">
                <span className="material-icons text-[18px]">{data.icon}</span>
                {data.eyebrow}
              </p>
              <h1 className="mt-6 text-[38px] font-black leading-tight tracking-normal sm:text-[54px]">{data.title}</h1>
              <p className="mt-5 max-w-[650px] text-[17px] font-semibold leading-7 text-white/76">{data.copy}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate('/signup')} className="rounded-full bg-[#7cf4ff] px-7 py-3 text-[15px] font-black text-black hover:bg-white">Start now</button>
                <button onClick={() => navigate('/support')} className="rounded-full border border-white/50 px-7 py-3 text-[15px] font-black text-white hover:border-[#7cf4ff] hover:text-[#7cf4ff]">Talk to support</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.cards.map((card) => (
                <article key={card.title} className="border border-white/10 bg-[#071918]/90 p-6 backdrop-blur">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[linear-gradient(135deg,#7cf4ff,#a78bfa)] text-black">
                    <span className="material-icons text-[28px]">{card.icon}</span>
                  </span>
                  <h2 className="mt-5 text-[22px] font-black leading-tight">{card.title}</h2>
                  <p className="mt-3 text-[14px] font-semibold leading-6 text-white/70">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
