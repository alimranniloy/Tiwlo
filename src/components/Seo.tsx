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
  description:
    'Tiwlo is a cloud hosting and business automation platform for tPanel servers, ecommerce stores, ISP billing, domains, DNS, SSL, payments, client dashboards, and infrastructure management.'
};

export const tiwloOrganizationSchema = {
  '@type': 'Organization',
  '@id': 'https://tiwlo.com/#organization',
  name: TIWLO_SEO.name,
  legalName: TIWLO_SEO.legalName,
  alternateName: ['Tiwlo Cloud', 'Tiwlo Platform', 'Tiwlo Operations Cloud', 'Tiwlo Hosting', 'Tiwlo tPanel'],
  url: TIWLO_SEO.url,
  logo: {
    '@type': 'ImageObject',
    '@id': 'https://tiwlo.com/#logo',
    url: TIWLO_SEO.logo,
    contentUrl: TIWLO_SEO.logo,
    caption: 'Tiwlo logo'
  },
  image: TIWLO_SEO.logo,
  foundingDate: TIWLO_SEO.foundingDate,
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
      email: TIWLO_SEO.email,
      url: 'https://tiwlo.com/support',
      availableLanguage: ['en', 'bn']
    }
  ],
  areaServed: 'Worldwide',
  knowsAbout: [
    'Cloud hosting',
    'Bangladesh web hosting',
    'BDIX hosting planning',
    'Cloud VPS hosting',
    'tPanel hosting control panel',
    'WHMCS alternative',
    'Hosting client portal',
    'Ecommerce automation',
    'ISP billing',
    'Domain management',
    'DNS automation',
    'SSL automation',
    'Payment operations',
    'Business automation'
  ],
  sameAs: TIWLO_SOCIAL_LINKS.map((item) => item.url)
};

export const tiwloWebsiteSchema = {
  '@type': 'WebSite',
  '@id': 'https://tiwlo.com/#website',
  name: TIWLO_SEO.name,
  url: TIWLO_SEO.url,
  publisher: { '@id': 'https://tiwlo.com/#organization' },
  inLanguage: 'en',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://tiwlo.com/documentation?q={search_term_string}',
    'query-input': 'required name=search_term_string'
  }
};

type SeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  keywords?: string[];
  schema?: Record<string, unknown> | Record<string, unknown>[];
};

const setMeta = (selector: string, attribute: 'content' | 'href', value: string, create?: () => HTMLElement) => {
  let node = document.head.querySelector(selector) as HTMLElement | null;
  if (!node && create) {
    node = create();
    document.head.appendChild(node);
  }
  node?.setAttribute(attribute, value);
};

export default function Seo({ title, description, canonicalPath = '/', image = TIWLO_SEO.logo, keywords, schema }: SeoProps) {
  React.useEffect(() => {
    const canonical = new URL(canonicalPath, TIWLO_SEO.url).toString();
    document.title = title;
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
  }, [canonicalPath, description, image, keywords, schema, title]);

  return null;
}
