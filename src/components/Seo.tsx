import React from 'react';

export const TIWLO_SOCIAL_LINKS = [
  { label: 'X', url: 'https://x.com/tiwlopx' },
  { label: 'Facebook', url: 'https://www.facebook.com/tiwlopx' },
  { label: 'Instagram', url: 'https://www.instagram.com/tiwlopx' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/company/tiwlopx' },
  { label: 'YouTube', url: 'https://www.youtube.com/@tiwlopx' },
  { label: 'GitHub', url: 'https://github.com/tiwlopx' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@tiwlopx' }
];

export const TIWLO_SEO = {
  name: 'Tiwlo',
  legalName: 'Tiwlo Company',
  url: 'https://tiwlo.com/',
  domain: 'tiwlo.com',
  logo: 'https://tiwlo.com/brand/logo.png',
  icon: 'https://tiwlo.com/brand/icon.png',
  foundingDate: '2020',
  founderName: 'Al Imran Niloy',
  email: 'support@tiwlo.com',
  telephone: '+8801410014060',
  addressLocality: 'Dhaka',
  addressRegion: 'Dhaka',
  addressCountry: 'BD',
  description:
    'Tiwlo is a technology company for cloud hosting, web hosting, VPS, tPanel software, AI tools, business automation, ecommerce services, digital payments, tFiber internet infrastructure, domains, DNS, SSL, client dashboards, and infrastructure management.'
};

export const tiwloPostalAddressSchema = {
  '@type': 'PostalAddress',
  addressLocality: TIWLO_SEO.addressLocality,
  addressRegion: TIWLO_SEO.addressRegion,
  addressCountry: TIWLO_SEO.addressCountry
};

const tiwloServiceOffers = [
  {
    name: 'Cloud hosting and VPS',
    description: 'Cloud hosting, VPS hosting, web hosting, DNS, SSL, and infrastructure management.',
    url: 'https://tiwlo.com/products'
  },
  {
    name: 'tPanel hosting operations',
    description: 'Hosting account provisioning, package limits, file management, databases, domains, and support workflows.',
    url: 'https://tiwlo.com/tpanel-hosting'
  },
  {
    name: 'tFiber internet infrastructure',
    description: 'Broadband-style service records, subscriber billing, router context, and connectivity support workflows.',
    url: 'https://tiwlo.com/broadband'
  },
  {
    name: 'Ecommerce and Cloud Store',
    description: 'Storefronts, products, orders, customers, checkout, and business automation.',
    url: 'https://tiwlo.com/commerce'
  },
  {
    name: 'Tiwlo Pay and billing',
    description: 'Digital payment workflows, invoices, merchant verification, credits, and payment review.',
    url: 'https://tiwlo.com/pricing'
  },
  {
    name: 'ISP billing and support',
    description: 'Subscriber management, packages, invoices, tickets, and account support for service providers.',
    url: 'https://tiwlo.com/services'
  }
];

export const tiwloOrganizationSchema = {
  '@type': 'Organization',
  '@id': 'https://tiwlo.com/#organization',
  name: TIWLO_SEO.name,
  legalName: TIWLO_SEO.legalName,
  alternateName: ['Tiwlo Cloud', 'Tiwlo Platform', 'Tiwlo Operations Cloud', 'Tiwlo Hosting', 'Tiwlo tPanel', 'Tiwlo tFiber', 'tFiber', 'Tiwlo Pay', 'tMail'],
  url: TIWLO_SEO.url,
  logo: {
    '@type': 'ImageObject',
    '@id': 'https://tiwlo.com/#logo',
    url: TIWLO_SEO.logo,
    contentUrl: TIWLO_SEO.logo,
    width: 4688,
    height: 1563,
    caption: 'Tiwlo logo'
  },
  image: TIWLO_SEO.logo,
  foundingDate: TIWLO_SEO.foundingDate,
  foundingLocation: {
    '@type': 'Place',
    name: 'Dhaka, Bangladesh',
    address: tiwloPostalAddressSchema
  },
  address: tiwloPostalAddressSchema,
  telephone: TIWLO_SEO.telephone,
  email: TIWLO_SEO.email,
  founder: {
    '@type': 'Person',
    '@id': 'https://tiwlo.com/#founder',
    name: TIWLO_SEO.founderName,
    url: 'https://tiwlo.com/about',
    sameAs: TIWLO_SOCIAL_LINKS.map((item) => item.url)
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: TIWLO_SEO.telephone,
      email: TIWLO_SEO.email,
      url: 'https://tiwlo.com/support',
      areaServed: ['BD', 'GB', 'Worldwide'],
      availableLanguage: ['English', 'Bengali']
    }
  ],
  location: [
    {
      '@type': 'Place',
      name: 'Dhaka, Bangladesh',
      address: tiwloPostalAddressSchema
    },
    {
      '@type': 'Place',
      name: 'United Kingdom'
    }
  ],
  areaServed: ['Bangladesh', 'United Kingdom', 'Worldwide'],
  knowsAbout: [
    'Cloud hosting',
    'Web hosting',
    'Bangladesh web hosting',
    'BDIX hosting planning',
    'Cloud VPS hosting',
    'tPanel hosting control panel',
    'WHMCS alternative',
    'Hosting client portal',
    'Ecommerce automation',
    'Digital payments',
    'AI tools',
    'tFiber internet infrastructure',
    'ISP billing',
    'Domain management',
    'DNS automation',
    'SSL automation',
    'Payment operations',
    'Business automation'
  ],
  brand: [
    { '@type': 'Brand', name: 'Tiwlo' },
    { '@type': 'Brand', name: 'tPanel' },
    { '@type': 'Brand', name: 'tFiber' },
    { '@type': 'Brand', name: 'Tiwlo Pay' },
    { '@type': 'Brand', name: 'tMail' }
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    '@id': 'https://tiwlo.com/#service-catalog',
    name: 'Tiwlo service catalog',
    itemListElement: tiwloServiceOffers.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Offer',
        '@id': `${service.url}#offer`,
        name: service.name,
        url: service.url,
        itemOffered: {
          '@type': 'Service',
          '@id': `${service.url}#service`,
          name: service.name,
          description: service.description,
          provider: { '@id': 'https://tiwlo.com/#organization' },
          serviceType: service.name,
          areaServed: ['Bangladesh', 'United Kingdom', 'Worldwide']
        }
      }
    }))
  },
  sameAs: TIWLO_SOCIAL_LINKS.map((item) => item.url)
};

export const tiwloWebsiteSchema = {
  '@type': 'WebSite',
  '@id': 'https://tiwlo.com/#website',
  name: TIWLO_SEO.name,
  alternateName: ['Tiwlo Cloud', 'Tiwlo Hosting', 'Tiwlo Platform'],
  url: TIWLO_SEO.url,
  publisher: { '@id': 'https://tiwlo.com/#organization' },
  inLanguage: 'en'
};

type BreadcrumbInput = {
  name: string;
  item: string;
};

export function createTiwloBreadcrumbSchema(items: BreadcrumbInput[], id?: string) {
  const normalizedItems = items.map((item) => ({
    ...item,
    item: new URL(item.item, TIWLO_SEO.url).toString()
  }));
  const lastItem = normalizedItems[normalizedItems.length - 1];
  return {
    '@type': 'BreadcrumbList',
    '@id': id || `${lastItem?.item || TIWLO_SEO.url}#breadcrumb`,
    itemListElement: normalizedItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };
}

type SeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  keywords?: string[];
  robots?: string;
  schema?: Record<string, unknown> | Record<string, unknown>[];
};

const setMeta = (selector: string, attribute: 'content' | 'href', value: string, create?: () => HTMLElement) => {
  const nodes = Array.from(document.head.querySelectorAll(selector)) as HTMLElement[];
  let node = nodes[0] || null;
  nodes.slice(1).forEach((duplicate) => duplicate.remove());
  if (!node && create) {
    node = create();
    document.head.appendChild(node);
  }
  node?.setAttribute(attribute, value);
};

const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

export default function Seo({ title, description, canonicalPath = '/', image = TIWLO_SEO.logo, keywords, robots = DEFAULT_ROBOTS, schema }: SeoProps) {
  React.useEffect(() => {
    const canonical = new URL(canonicalPath, TIWLO_SEO.url).toString();
    document.title = title;
    setMeta('meta[name="robots"]', 'content', robots, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      return meta;
    });
    setMeta('meta[name="description"]', 'content', description, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      return meta;
    });
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);
    if (keywords?.length) {
      setMeta('meta[name="keywords"]', 'content', keywords.join(', '), () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'keywords');
        return meta;
      });
    }
    setMeta('link[rel="canonical"]', 'href', canonical, () => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      return link;
    });

    const id = 'tiwlo-page-schema';
    document.getElementById(id)?.remove();
    if (schema) {
      const script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      script.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': Array.isArray(schema) ? schema : [schema]
      });
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(id)?.remove();
    };
  }, [canonicalPath, description, image, keywords, robots, schema, title]);

  return null;
}
