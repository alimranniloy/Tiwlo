export type SeoTopicKey =
  | 'bangladeshHosting'
  | 'cloudVps'
  | 'tpanelHosting'
  | 'whmcsAlternative'
  | 'freeCredit'
  | 'hostingFeatures';

export type SeoTopicPageData = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  heroMetric: string;
  tags: string[];
  sections: {
    title: string;
    body: string;
  }[];
  featureCards: {
    title: string;
    body: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
};

export const SEO_TOPIC_PAGES: Record<SeoTopicKey, SeoTopicPageData> = {
  bangladeshHosting: {
    slug: '/bangladesh-hosting',
    label: 'Bangladesh Hosting',
    eyebrow: 'Bangladesh and global hosting',
    title: 'Bangladesh web hosting with Tiwlo cloud, BDIX-ready planning, and tPanel operations',
    description:
      'Tiwlo helps customers compare Bangladesh web hosting, BDIX hosting needs, cloud hosting, VPS hosting, domains, SSL, support, and tPanel control workflows from one official platform.',
    intro:
      'Tiwlo helps teams plan reliable Bangladesh hosting, BDIX-ready network strategy, India-facing traffic, global cloud hosting, domains, SSL, billing, and support from one clean portal.',
    heroMetric: 'BD + global coverage',
    tags: [
      'best hosting in BD',
      'Bangladesh web hosting',
      'hosting BD',
      'BDIX hosting',
      'BDIX web hosting',
      'Bangladesh cloud hosting',
      'web hosting Bangladesh',
      'Bangladesh VPS hosting',
      'domain hosting Bangladesh',
      'SSL hosting Bangladesh',
      'Indian web hosting for Bangladesh traffic',
      'low latency hosting BD',
      'Tiwlo hosting BD',
      'Tiwlo Bangladesh hosting',
      'cloud server Bangladesh',
      'business hosting Bangladesh'
    ],
    sections: [
      {
        title: 'What Bangladesh hosting buyers usually need',
        body:
          'Most buyers are not only looking for disk space. They need fast page delivery for Bangladesh visitors, clear domain and DNS control, SSL, billing, support, and a panel that staff can actually operate every day.'
      },
      {
        title: 'Where Tiwlo fits',
        body:
          'Tiwlo connects hosting accounts, cloud resources, domains, DNS, SSL, invoices, payments, support tickets, and account security into one workflow so operators do not have to manage hosting in disconnected tools.'
      },
      {
        title: 'BDIX-ready planning without fake claims',
        body:
          'Tiwlo content describes BDIX and Bangladesh hosting as an operational requirement: network placement, routing, caching, DNS, SSL, and support should be planned together before a production service is sold.'
      }
    ],
    featureCards: [
      { title: 'One portal', body: 'Customers and staff can work from Tiwlo instead of jumping between a billing portal, hosting panel, DNS screen, and support inbox.' },
      { title: 'tPanel hosting', body: 'Tiwlo can present hosting as tPanel-powered workflows with package limits, account creation, SSO, DNS, SSL, and service controls.' },
      { title: 'Support context', body: 'Tickets, payments, account status, and service records can stay connected for faster customer help.' }
    ],
    faqs: [
      {
        question: 'Is Tiwlo only for Bangladesh hosting?',
        answer:
          'No. Tiwlo is positioned for Bangladesh, South Asia, and global hosting operations with hosting, VPS, domain, DNS, SSL, billing, and support workflows.'
      },
      {
        question: 'Does Tiwlo mention BDIX hosting?',
        answer:
          'Yes. Tiwlo explains BDIX-ready hosting as a network and operations topic, while avoiding fake guarantees that depend on the actual server provider and routing.'
      },
      {
        question: 'Can new users get $100 free credit?',
        answer:
          'Tiwlo can show a $100 free credit offer for eligible new users when the platform credit system is enabled by administrators.'
      }
    ]
  },
  cloudVps: {
    slug: '/cloud-vps-hosting',
    label: 'Cloud VPS Hosting',
    eyebrow: 'Cloud, VPS, and server hosting',
    title: 'Cloud VPS hosting for Bangladesh, India, and global infrastructure teams',
    description:
      'Explore Tiwlo cloud VPS hosting for server deployment, packages, DNS, SSL, payments, and customer operations across Bangladesh, India, and global use cases.',
    intro:
      'Tiwlo helps hosting operators present VPS and cloud hosting as a complete customer journey: choose a package, deploy service, connect domain, issue SSL, manage billing, and keep support in the same account.',
    heroMetric: 'Cloud + VPS operations',
    tags: [
      'cloud VPS hosting',
      'Bangladesh VPS',
      'BD VPS hosting',
      'VPS hosting BD',
      'Indian VPS hosting',
      'South Asia VPS hosting',
      'cloud server hosting',
      'cheap VPS hosting BD',
      'business VPS hosting',
      'managed VPS portal',
      'Tiwlo VPS',
      'Tiwlo cloud',
      'cloud hosting panel',
      'server hosting Bangladesh',
      'Linux VPS hosting',
      'hosting control portal'
    ],
    sections: [
      {
        title: 'VPS hosting needs more than a server',
        body:
          'A VPS product becomes easier to sell and support when provisioning, invoices, domain records, SSL state, support tickets, and account status are connected.'
      },
      {
        title: 'Tiwlo for cloud operations',
        body:
          'Tiwlo is designed as an operations cloud where server resources, hosting packages, customer dashboards, payments, and support can be handled from one product surface.'
      },
      {
        title: 'Built for repeatable hosting workflows',
        body:
          'Operators can explain packages, credits, service limits, and account reviews with clear public pages instead of relying on generic VPS marketing.'
      }
    ],
    featureCards: [
      { title: 'Server packages', body: 'Create clear offers for CPU, RAM, disk, bandwidth, domains, and service rules.' },
      { title: 'Billing context', body: 'Keep invoices, payment reviews, promo credit status, and account state visible to staff.' },
      { title: 'Security review', body: 'Connect tSecurity, verification, audit logs, and unusual activity handling to the account lifecycle.' }
    ],
    faqs: [
      {
        question: 'Is Tiwlo a VPS provider or a hosting operations platform?',
        answer:
          'Tiwlo is a hosting and business operations platform that can manage cloud, VPS, tPanel hosting, billing, support, and security workflows.'
      },
      {
        question: 'Can Tiwlo support Bangladesh and Indian hosting use cases?',
        answer:
          'Yes. Tiwlo can explain Bangladesh hosting, Indian traffic planning, BDIX-ready planning, VPS hosting, cloud hosting, and global infrastructure operations naturally.'
      },
      {
        question: 'Does Tiwlo use the Tiwlo portal?',
        answer:
          'Yes. Tiwlo focuses on the Tiwlo customer and operator portal, with tPanel workflows for hosting operations.'
      }
    ]
  },
  tpanelHosting: {
    slug: '/tpanel-hosting',
    label: 'tPanel Hosting',
    eyebrow: 'Tiwlo-owned hosting panel',
    title: 'tPanel hosting from Tiwlo: a custom hosting control experience for real operations',
    description:
      'Tiwlo uses tPanel-focused hosting workflows for packages, accounts, DNS, SSL, files, databases, support, and billing from the Tiwlo platform.',
    intro:
      'Tiwlo presents a tPanel-centered workflow for hosting accounts, packages, DNS, SSL, files, databases, billing, support, and customer operations.',
    heroMetric: 'tPanel hosting workflow',
    tags: [
      'tPanel hosting',
      'Tiwlo tPanel',
      'Tiwlo hosting panel',
      'custom hosting panel',
      'cPanel alternative Bangladesh',
      'hosting control panel BD',
      'web hosting panel',
      'tPanel server management',
      'hosting account portal',
      'DNS SSL hosting panel',
      'file manager hosting panel',
      'Node hosting panel',
      'PHP hosting panel',
      'business hosting portal',
      'Tiwlo portal',
      'Tiwlo cloud panel'
    ],
    sections: [
      {
        title: 'tPanel is part of the Tiwlo platform story',
        body:
          'Tiwlo does not need to look like a generic hosting reseller page. It can explain tPanel as the practical hosting workflow for accounts, package limits, DNS, SSL, files, databases, and support.'
      },
      {
        title: 'Why this matters for customers',
        body:
          'Clear platform information helps customers understand that Tiwlo is connected to tPanel hosting, custom hosting portal, cloud operations, payments, and Bangladesh hosting needs.'
      },
      {
        title: 'Operator-first hosting language',
        body:
          'The page describes how administrators can manage hosting services, customers, billing, support, security, and service status without needing a separate marketing claim on the home page.'
      }
    ],
    featureCards: [
      { title: 'Account workflows', body: 'Package rules, user accounts, SSO, and service limits can be connected inside Tiwlo.' },
      { title: 'DNS and SSL', body: 'Domain, DNS, and SSL messaging is included so buyers understand the full hosting lifecycle.' },
      { title: 'Support ready', body: 'Support and billing context can be attached to the same customer account.' }
    ],
    faqs: [
      {
        question: 'Is tPanel the same as WHMCS?',
        answer:
          'No. tPanel is Tiwlo hosting control workflow, while WHMCS is a separate billing platform used by many hosting companies.'
      },
      {
        question: 'Does Tiwlo use a custom portal?',
        answer:
          'Yes. Tiwlo describes its customer and operator portal, with tPanel hosting operations connected to cloud, support, payments, DNS, and SSL.'
      },
      {
        question: 'Can tPanel content help customers understand Tiwlo?',
        answer:
          'Yes. Clear tPanel content explains how hosting accounts, domains, SSL, support, and billing fit inside the Tiwlo workflow.'
      }
    ]
  },
  whmcsAlternative: {
    slug: '/whmcs-alternative',
    label: 'WHMCS Alternative',
    eyebrow: 'Hosting billing and portal',
    title: 'Tiwlo as a WHMCS alternative: tPanel workflow, credits, payments, and support',
    description:
      'Tiwlo explains its Tiwlo portal and tPanel hosting workflow as an alternative to WHMCS-style hosting operations for billing, support, services, and automation.',
    intro:
      'Tiwlo explains hosting billing, client portal, support automation, payment review, and service provisioning through Tiwlo product language instead of presenting itself as WHMCS.',
    heroMetric: 'Hosting billing workflow',
    tags: [
      'WHMCS alternative',
      'hosting billing software',
      'hosting client portal',
      'Tiwlo portal',
      'WHMCS alternative BD',
      'WHMCS alternative Bangladesh',
      'hosting automation platform',
      'hosting support portal',
      'hosting invoice system',
      'hosting payment review',
      'tPanel billing',
      'cloud hosting billing',
      'client dashboard hosting',
      'hosting CRM portal',
      'Tiwlo vs WHMCS',
      'custom hosting portal'
    ],
    sections: [
      {
        title: 'Tiwlo is not presented as a WHMCS clone',
        body:
          'The public content explains that Tiwlo uses a Tiwlo customer portal and tPanel-centered workflows, while still covering the comparison points buyers care about when they look for WHMCS alternatives.'
      },
      {
        title: 'Billing is connected to operations',
        body:
          'Invoices, promo credits, payment proof review, service creation, customer state, support, and security review can be discussed as one connected workflow.'
      },
      {
        title: 'Clear difference for customers',
        body:
          'Tiwlo focuses on tPanel workflows and can cover hosting billing, support, payments, and automation without relying on WHMCS branding.'
      }
    ],
    featureCards: [
      { title: 'Tiwlo portal', body: 'Tiwlo can present customer portal and admin workflows without depending on WHMCS pages.' },
      { title: 'Credit system', body: 'The $100 free credit message can be connected to signup, verification, payment rules, and admin settings.' },
      { title: 'Unified support', body: 'Tickets, Discord alerts, live chat, payment proof events, and verification review can stay connected.' }
    ],
    faqs: [
      {
        question: 'Does Tiwlo use WHMCS?',
        answer:
          'No. Tiwlo content states that it uses the Tiwlo portal and tPanel workflows rather than presenting the platform as WHMCS.'
      },
      {
        question: 'Why mention WHMCS at all?',
        answer:
          'Because many buyers compare WHMCS alternatives when they need hosting billing, client portal, automation, and support workflows.'
      },
      {
        question: 'Can Tiwlo handle hosting billing and support?',
        answer:
          'Tiwlo is positioned around hosting billing, support tickets, payments, credits, verification, and service operations in one platform.'
      }
    ]
  },
  freeCredit: {
    slug: '/hosting-free-credit',
    label: '$100 Free Credit',
    eyebrow: 'Signup credit and trial',
    title: 'Get $100 free credit for eligible new users on Tiwlo hosting and cloud workflows',
    description:
      'Tiwlo can offer $100 free credit for eligible new users, with admin-controlled verification, payment, credit, and account review settings.',
    intro:
      'Users who want free hosting credit, cloud hosting trial credit, VPS credit, hosting credit BD, or Tiwlo free credit get a clear explanation of the offer without crowding the home page.',
    heroMetric: '$100 new-user credit',
    tags: [
      '100 free credit hosting',
      '$100 free credit',
      'Tiwlo free credit',
      'free hosting credit',
      'cloud hosting trial',
      'VPS free credit',
      'hosting credit Bangladesh',
      'BD hosting free credit',
      'new user hosting credit',
      'cloud server credit',
      'tPanel free credit',
      'Tiwlo signup credit',
      'free credit for new users',
      'hosting trial credit',
      'no upfront hosting credit',
      'Tiwlo promo credit'
    ],
    sections: [
      {
        title: 'What the $100 free credit means',
        body:
          'Tiwlo can show a $100 free credit message for eligible new users. The actual credit rules, verification, payment hold, and availability are controlled by platform settings.'
      },
      {
        title: 'Why the credit offer is explained clearly',
        body:
          'The offer is explained separately so users can understand eligibility, verification, payment rules, and admin-controlled credit behavior before signup.'
      },
      {
        title: 'Credit and security can work together',
        body:
          'Promotional credits can be connected to account verification, payment settings, tSecurity checks, support review, and admin controls to reduce abuse.'
      }
    ],
    featureCards: [
      { title: 'Signup clarity', body: 'The offer is explained in plain language before users create an account.' },
      { title: 'Admin controlled', body: 'Credit amount, payment verification, hold rules, and on/off behavior can be controlled from settings.' },
      { title: 'Abuse aware', body: 'Credit workflows can respect fraud checks and verification without showing sensitive block details to users.' }
    ],
    faqs: [
      {
        question: 'Do all Tiwlo users get $100 free credit?',
        answer:
          'The page describes the public offer, but eligibility depends on current Tiwlo settings, verification rules, region, account status, and admin configuration.'
      },
      {
        question: 'Will users need payment verification?',
        answer:
          'Payment verification can be required or skipped depending on the credit system settings configured by administrators.'
      },
      {
        question: 'Does the credit page replace the signup page?',
        answer:
          'No. It is a public offer explanation page linked from the footer and sitemap, while signup remains the account creation path.'
      }
    ]
  },
  hostingFeatures: {
    slug: '/hosting-features',
    label: 'Hosting Features',
    eyebrow: 'Feature and comparison',
    title: 'Tiwlo hosting features: cloud, tPanel, DNS, SSL, payments, support, and security',
    description:
      'Compare Tiwlo hosting features across cloud hosting, tPanel, domains, DNS, SSL, payments, customer portal, support, and tSecurity workflows.',
    intro:
      'This page gives customers a single feature summary for Tiwlo hosting, cloud, portal, support, payments, credits, domains, DNS, SSL, and security workflows.',
    heroMetric: 'Operations summary',
    tags: [
      'Tiwlo hosting features',
      'cloud hosting features',
      'hosting panel features',
      'tPanel features',
      'DNS hosting features',
      'SSL hosting features',
      'hosting payment features',
      'hosting support features',
      'tSecurity hosting',
      'hosting automation',
      'hosting dashboard',
      'domain hosting panel',
      'customer portal hosting',
      'hosting operations cloud',
      'Bangladesh hosting features',
      'global hosting features'
    ],
    sections: [
      {
        title: 'Feature coverage for buyers',
        body:
          'Tiwlo explains cloud hosting, tPanel accounts, DNS, SSL, payments, credits, invoices, support, security, and customer dashboards in one place.'
      },
      {
        title: 'Designed for operations, not only marketing',
        body:
          'The platform language focuses on real workflows: packages, account status, service creation, payment proof review, ticket routing, verification, and admin control.'
      },
      {
        title: 'Useful for product understanding',
        body:
          'The page gives a stable summary of what Tiwlo is, what it offers, and how it differs from generic hosting tools.'
      }
    ],
    featureCards: [
      { title: 'Cloud and tPanel', body: 'Cloud hosting and tPanel service workflows can be explained together.' },
      { title: 'Billing and credit', body: 'Invoices, Tiwlo Pay, signup credit, and payment verification can be connected.' },
      { title: 'Security and support', body: 'tSecurity, WhatsApp verification, audit logs, tickets, and Discord notifications can support operations.' }
    ],
    faqs: [
      {
        question: 'What is Tiwlo used for?',
        answer:
          'Tiwlo is used for cloud hosting, tPanel hosting operations, ecommerce, ISP billing, domains, DNS, SSL, payments, support, and security workflows.'
      },
      {
        question: 'Is Tiwlo useful for Bangladesh hosting needs?',
        answer:
          'Yes. Tiwlo covers Bangladesh hosting, hosting BD, BDIX planning, VPS hosting, cloud hosting, and tPanel-related operations in a natural way.'
      },
      {
        question: 'Does Tiwlo provide public product pages?',
        answer:
          'Yes. These pages are public, linked from the footer, included in the sitemap, and described with structured data.'
      }
    ]
  }
};

export const SEO_TOPIC_LINKS = Object.values(SEO_TOPIC_PAGES).map(({ label, slug }) => ({ label, to: slug }));
