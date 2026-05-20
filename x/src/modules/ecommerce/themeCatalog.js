export const AURA_THEME_KEY = 'aura';
export const AURA_THEME_NAME = 'Aura';
export const EPLAZA_THEME_KEY = 'eplaza';
export const EPLAZA_THEME_NAME = 'Eplaza';
export const DEFAULT_STOREFRONT_THEME_KEY = 'aura';

const auraTemplate = {
  key: 'aura',
  name: 'Aura Marketplace',
  layout: 'aura-homepage',
  header: 'aura-header',
  previewImage: '',
  sections: [
    {
      id: 'aura-homepage',
      key: 'homepage',
      type: 'marketplace-homepage',
      title: 'Aura Homepage',
      priority: 10,
      enabled: true,
      settings: {
        source: 'src/themes/aura/src/pages/Home.tsx'
      }
    },
    {
      id: 'aura-product-detail',
      key: 'product-page',
      type: 'product-detail',
      title: 'Aura Product Detail',
      priority: 20,
      enabled: true,
      settings: {
        source: 'src/themes/aura/src/pages/ProductDetail.tsx'
      }
    },
    {
      id: 'aura-checkout',
      key: 'checkout-flow',
      type: 'checkout',
      title: 'Aura Checkout',
      priority: 30,
      enabled: true,
      settings: {
        source: 'src/themes/aura/src/pages/Checkout.tsx'
      }
    }
  ]
};

export const AURA_PLUGIN_MODULES = [
  {
    key: 'aura-reviews',
    name: 'Aura Reviews',
    status: 'active',
    settings: { section: 'reviews', moderation: true }
  },
  {
    key: 'aura-flash-sale',
    name: 'Aura Flash Sale',
    status: 'active',
    settings: { section: 'homepage-banners', timer: true }
  }
];

export const AURA_DEMO_PRODUCTS = [
  ['AURA-001', 'Premium Wireless Noise Cancelling Headphones', 'Electronic Devices', 299.99, 100, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 'Experience world-class sound with our premium wireless headphones. Featuring active noise cancellation, 40-hour battery life, and crystal-clear microphone for calls. The ergonomic design ensures comfort even during long listening sessions.', 4.8, 1254, 359.99],
  ['AURA-002', 'Minimalist Leather Strap Watch - Silver Edition', 'Watches & Accessories', 150, 100, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', 'A timeless design that fits any occasion. Genuine leather strap, stainless steel casing, and water-resistant up to 50 meters. Perfect for both professional and casual wear.', 4.5, 890, 180],
  ['AURA-003', 'Smart Fitness Tracker with Blood Oxygen Monitoring', 'Electronic Accessories', 79.99, 100, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80', 'Track your health and fitness goals with precision. Heart rate monitor, sleep tracking, GPS, and multi-sport modes. Long battery life and compatible with all major smartphones.', 4.2, 2105, 99.99],
  ['AURA-004', 'Ergonomic Mesh Office Chair with Lumbar Support', 'Home & Lifestyle', 450, 100, 'https://images.unsplash.com/photo-1505843490701-512068307374?w=800&q=80', 'Maximum comfort for long working hours. Breathable mesh, adjustable armrests, and 4D lumbar support. Build with high-quality materials for durability.', 4.9, 562, 540],
  ['AURA-005', 'Ultra-Fast Portable SSD - 2TB NVMe', 'Electronic Accessories', 189.99, 100, 'https://images.unsplash.com/photo-1597333583630-40c802e2b47c?w=800&q=80', 'Transfer files in seconds with speeds up to 2000MB/s. Compact, rugged, and shock-resistant design. Compatible with PC, Mac, Android, and gaming consoles.', 4.7, 320, 229.99],
  ['AURA-006', 'Smart Home Security Camera - 2K Resolution', 'Electronic Devices', 59.99, 100, 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=800&q=80', 'Keep an eye on your home from anywhere. Night vision, motion detection, and two-way audio. Cloud and local storage options available.', 4.4, 1450, 79.99],
  ['AURA-007', 'Professional Chef Knife - Damascas Steel', 'Home & Lifestyle', 120, 100, 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80', 'Handcrafted kitchen knife with a razor-sharp edge. Balanced weight for precision cutting. The beautiful Damascus pattern makes it a centerpiece in any kitchen.', 4.8, 430, 150],
  ['AURA-008', 'Wireless Mechanical Keyboard - RGB Backlit', 'Electronic Accessories', 135, 100, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&q=80', 'Satisfying tactile feedback with customizable RGB lighting. Connect via Bluetooth or 2.4GHz wireless. Compact layout for more desk space.', 4.6, 780, 165]
];

export const AURA_DEMO_RECORDS = {
  header: [
    {
      title: 'Aura header',
      data: {
        setting: 'headerStyle',
        value: 'aura-header',
        desktopValue: 'topbar-search-cart',
        mobileValue: 'compact-search-bottom-nav',
        notes: 'Connected header configuration for Aura.'
      }
    }
  ],
  'theme-settings': [
    { title: 'Accent Color', data: { setting: 'accentColor', value: '#f85606', scope: 'global', notes: 'Primary storefront color.' } },
    { title: 'Accent Dark', data: { setting: 'accentDark', value: '#d44805', scope: 'global', notes: 'Hover/pressed storefront color.' } },
    { title: 'Logo Text', data: { setting: 'logoText', value: 'NovaMart', scope: 'global', notes: 'Header brand label.' } },
    { title: 'Brand Initial', data: { setting: 'brandInitial', value: 'N', scope: 'global', notes: 'Footer/logo mark.' } }
  ],
  navigation: [
    {
      title: 'Main navigation',
      data: {
        name: 'Main navigation',
        location: 'main',
        items: 'Electronics, Accessories, Appliances, Beauty, Toys, Groceries, Lifestyle, Fashion, Menswear, Watches, Sports, Auto',
        notes: 'Original Aura category order. StoreAdmin can edit it.'
      }
    }
  ],
  'homepage-sliders': [
    {
      title: 'Mega sale hero',
      data: {
        slot: 'hero-1',
        headline: 'Mega Sale is Live',
        eyebrow: 'Aura Deals',
        text: 'Featured storefront slider controlled from StoreAdmin.',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
        actionText: 'Shop now',
        actionLink: '/search'
      }
    },
    {
      title: 'Tech week hero',
      data: {
        slot: 'hero-2',
        headline: 'Tech Week Picks',
        eyebrow: 'New arrivals',
        text: 'Hero assets are database records, not hardcoded theme data.',
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80',
        actionText: 'Explore',
        actionLink: '/category/Electronic%20Devices'
      }
    }
  ],
  'homepage-banners': [
    {
      title: 'Flash sale banner',
      data: {
        slot: 'flash-sale',
        headline: 'Flash Sale',
        text: 'Countdown and promoted products for Aura.',
        image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=1200&q=80',
        actionText: 'More',
        actionLink: '/search'
      }
    },
    {
      title: 'Daily wide banner',
      data: {
        slot: 'daily-wide',
        headline: 'Daily Value',
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
        actionLink: '/search'
      }
    },
    {
      title: 'Daily small banner one',
      data: {
        slot: 'daily-small-1',
        headline: 'Marketplace Deals',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
        actionLink: '/search'
      }
    },
    {
      title: 'Daily small banner two',
      data: {
        slot: 'daily-small-2',
        headline: 'Fresh Picks',
        image: 'https://images.unsplash.com/photo-1526733170371-34825902f37c?w=400&q=80',
        actionLink: '/search'
      }
    },
    {
      title: 'Featured banner',
      data: {
        slot: 'featured',
        headline: 'Featured Banner',
        image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=1200&q=80',
        actionLink: '/search'
      }
    },
    {
      title: 'Bottom stripe banner',
      data: {
        slot: 'bottom',
        headline: 'Bottom Banner',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
        actionLink: '/search'
      }
    },
    ...[
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&q=80',
      'https://images.unsplash.com/photo-1583394838336-acd977730f90?w=400&q=80',
      'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400&q=80',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80'
    ].map((image, index) => ({
      title: `Official brand banner ${index + 1}`,
      data: {
        slot: `brand-${index + 1}`,
        headline: `Official brand ${index + 1}`,
        image,
        actionLink: '/search'
      }
    }))
  ],
  footer: [
    {
      title: 'Customer care',
      data: {
        block: 'customer-care',
        title: 'Customer Care',
        items: 'Help Center, How to Buy, Returns & Refunds, Contact Us',
        notes: 'Footer column controlled from StoreAdmin.'
      }
    },
    {
      title: 'Aura links',
      data: {
        block: 'brand-links',
        title: 'NovaMart',
        items: 'About NovaMart, Careers, Terms, Privacy Policy',
        notes: 'Brand footer links.'
      }
    }
  ],
  reviews: [
    { title: 'Headphones review', data: { product: 'Premium Wireless Noise Cancelling Headphones', sku: 'AURA-001', customer: 'Al Imran', rating: 5, review: 'Excellent product! The quality is outstanding and it arrived faster than expected.', likes: 12 } },
    { title: 'Watch review', data: { product: 'Minimalist Leather Strap Watch - Silver Edition', sku: 'AURA-002', customer: 'Niloy B.', rating: 4, review: 'Very good for the price. Works as described, though the packaging was a bit damaged.', likes: 4 } },
    { title: 'Tracker review', data: { product: 'Smart Fitness Tracker with Blood Oxygen Monitoring', sku: 'AURA-003', customer: 'Sarah K.', rating: 5, review: 'In love with this! Definitely recommending it to my friends.', likes: 8 } }
  ],
  'checkout-flow': [
    {
      title: 'Cash on delivery',
      data: {
        setting: 'paymentMethod',
        value: 'cod',
        notes: 'Aura checkout writes orders through the StoreOrder API.'
      }
    }
  ],
  'cart-page': [
    {
      title: 'Cart drawer and page',
      data: {
        setting: 'cart',
        value: 'enabled',
        notes: 'Aura cart uses shared cart items, quantities, totals, and checkout handoff.'
      }
    }
  ],
  'search-page': [
    {
      title: 'Search and category filters',
      data: {
        setting: 'search',
        value: 'enabled',
        notes: 'Aura search matches product name, category, description, and SKU.'
      }
    }
  ],
  'category-page': [
    {
      title: 'Category listing',
      data: {
        setting: 'layout',
        value: 'grid-with-filters',
        notes: 'Aura category pages reuse live product categories.'
      }
    }
  ],
  'track-order': [
    {
      title: 'Order tracking',
      data: {
        setting: 'tracking',
        value: 'enabled',
        notes: 'Aura track-order reads the latest checkout order and store order records.'
      }
    }
  ],
  compare: [
    {
      title: 'Compare table',
      data: {
        setting: 'productCompare',
        value: 'enabled',
        notes: 'Aura compare reads price, SKU, stock, rating, and reviews from shared product data.'
      }
    }
  ],
  'product-page': [
    {
      title: 'Product detail',
      data: {
        setting: 'reviews',
        value: 'enabled',
        notes: 'Reviews are read from StoreAdmin review records.'
      }
    }
  ]
};

const eplazaAsset = (name) => `/uploads/eplaza/${name}`;

const eplazaTemplate = {
  key: EPLAZA_THEME_KEY,
  name: 'Eplaza Electronics',
  layout: 'eplaza-homepage',
  header: 'eplaza-header',
  previewImage: eplazaAsset('apple-shopping-event-min.jpg'),
  sections: [
    {
      id: 'eplaza-homepage',
      key: 'homepage',
      type: 'electronics-homepage',
      title: 'Eplaza Homepage',
      priority: 10,
      enabled: true,
      settings: {
        source: 'src/themes/eplaza/Preview.tsx'
      }
    },
    {
      id: 'eplaza-product-detail',
      key: 'product-page',
      type: 'product-detail',
      title: 'Eplaza Product Detail',
      priority: 20,
      enabled: true,
      settings: {
        source: 'src/themes/eplaza/src/pages/ProductDetail.tsx'
      }
    },
    {
      id: 'eplaza-checkout',
      key: 'checkout-flow',
      type: 'checkout',
      title: 'Eplaza Checkout',
      priority: 30,
      enabled: true,
      settings: {
        source: 'src/themes/eplaza/src/pages/Checkout.tsx'
      }
    }
  ]
};

export const EPLAZA_PLUGIN_MODULES = [
  {
    key: 'eplaza-electronics-banners',
    name: 'Eplaza Electronics Banners',
    status: 'active',
    settings: { section: 'homepage-banners', timer: true }
  },
  {
    key: 'eplaza-product-specs',
    name: 'Eplaza Product Specs',
    status: 'active',
    settings: { section: 'product-page', specs: true }
  }
];

export const EPLAZA_DEMO_PRODUCTS = [
  ['EPLAZA-001', 'Apple MacBook Pro 16 M1 Pro', 'Apple MacBook', 2499, 26, eplazaAsset('apple-macbook-pro-16-silver-1.jpg.webp'), 'Premium MacBook listing connected to the Eplaza electronics storefront.', 5, 12, 2999],
  ['EPLAZA-002', 'Oculus Quest 2', 'VR Headsets', 449, 34, eplazaAsset('oculus-quest-2-1.jpg.webp'), 'Wireless VR headset for immersive games, fitness, and entertainment.', 4.8, 58, 499],
  ['EPLAZA-003', 'Asus GeForce GTX 1660 Ti TUF', 'Graphics Cards', 269, 18, eplazaAsset('asus-geforce-gtx-1660-ti-tuf-1.jpg.webp'), 'Durable graphics card for smooth gaming and creator workflows.', 4.7, 15, 315],
  ['EPLAZA-004', 'Samsung Neo QLED 55QN85A', 'OLED TV', 1600, 11, eplazaAsset('samsung-neo-qled-55qn85a-1.jpg.webp'), 'Large-screen entertainment display with premium picture quality.', 4.5, 20, 1899],
  ['EPLAZA-005', 'LG FH4G1BCS2', 'Washing Machines', 945, 9, eplazaAsset('lg-fh4g1bcs2-1.jpg.webp'), 'High-capacity home appliance with quiet, efficient cleaning cycles.', 4.9, 6, 1110],
  ['EPLAZA-006', 'Acer ConceptD 7 Ezel', 'Business Laptop', 3800, 14, eplazaAsset('acer-conceptd-7-ezel-1.jpg.webp'), 'Creator-grade laptop for design, rendering, and studio work.', 4.6, 31, 4200],
  ['EPLAZA-007', 'ACER ConceptD CT300', 'Office PCs', 2199, 8, eplazaAsset('acer-conceptd-ct300-1.jpg.webp'), 'Compact workstation desktop for professional office teams.', 4.4, 17, 2600],
  ['EPLAZA-008', 'Acer Predator Helios 300', 'Gaming Laptop', 1600, 22, eplazaAsset('acer-predator-helios-300-1.jpg.webp'), 'Gaming laptop with fast display, strong thermals, and dedicated GPU.', 4.7, 29, 1850],
  ['EPLAZA-009', 'Acer ProDesigner PE320QK', '4K Monitors', 750, 16, eplazaAsset('acer-prodesigner-pe320qk-1.jpg.webp'), '4K creative monitor with accurate color for production work.', 4.3, 10, 880],
  ['EPLAZA-010', 'Logitech Pop Keys', 'Keyboards', 99, 50, eplazaAsset('logitech-pop-keys-1.jpg.webp'), 'Wireless mechanical keyboard with playful keys and compact layout.', 5, 44, 129],
  ['EPLAZA-011', 'ARIETE 0979', 'Ovens', 110, 40, eplazaAsset('ariete-0979-1.jpg.webp'), 'Countertop oven for fast daily cooking and compact kitchens.', 4.2, 9, 139],
  ['EPLAZA-012', 'Bamix Deluxe M200', 'Blenders', 230, 20, eplazaAsset('bamix-deluxe-m200-1.jpg.webp'), 'Premium blender for smoothies, sauces, and daily food prep.', 4.1, 12, 280]
];

export const EPLAZA_DEMO_RECORDS = {
  header: [
    {
      title: 'Eplaza header',
      data: {
        setting: 'headerStyle',
        value: 'eplaza-header',
        desktopValue: 'woodmart-search-cart',
        mobileValue: 'floating-bottom-nav',
        notes: 'Connected header configuration for Eplaza.'
      }
    }
  ],
  'theme-settings': [
    { title: 'Accent Color', data: { setting: 'accentColor', value: '#2463d1', scope: 'global' } },
    { title: 'Accent Dark', data: { setting: 'accentDark', value: '#101010', scope: 'global' } },
    { title: 'Logo Text', data: { setting: 'logoText', value: 'Eplaza', scope: 'global' } },
    { title: 'Brand Initial', data: { setting: 'brandInitial', value: 'E', scope: 'global' } }
  ],
  navigation: [
    {
      title: 'Eplaza navigation',
      data: {
        name: 'Main navigation',
        location: 'main',
        items: 'Apple iPhone, Apple MacBook, Motherboards, Mirrorless, Headsets, Drones, Apple iPad, VR Headsets, Graphics Cards, Washing Machines, Ovens, Keyboards',
        notes: 'Original Eplaza category order. StoreAdmin can edit it.'
      }
    }
  ],
  'homepage-sliders': [
    {
      title: 'Apple shopping event',
      data: {
        slot: 'hero-1',
        headline: 'Apple Shopping Event',
        text: 'Shop great deals on MacBook, iPad, iPhone and more.',
        image: eplazaAsset('apple-shopping-event-min.jpg'),
        actionText: 'Shop now',
        actionLink: '/search'
      }
    },
    {
      title: 'Google Pixel preorder',
      data: {
        slot: 'hero-2',
        headline: 'The new Google Pixel 7',
        text: 'Experience the magic of the new Google Pixel 7.',
        image: eplazaAsset('pre-order-g-pixel-7.jpg.webp'),
        actionText: 'Pre-order now',
        actionLink: '/search'
      }
    },
    {
      title: 'Smart appliance discount',
      data: {
        slot: 'hero-3',
        headline: 'Smart Appliances',
        text: 'Discount on all smart appliances up to 25%.',
        image: eplazaAsset('discount-on-all-smart-appliances.jpg.webp'),
        actionText: 'Shop now',
        actionLink: '/category/Washing%20Machines'
      }
    }
  ],
  'homepage-banners': [
    { title: 'Aurora headset', data: { slot: 'aurora-headset', headline: 'Aurora Headset', image: eplazaAsset('logitech-aurora-headset.jpg.webp'), actionLink: '/search' } },
    { title: 'DualSense banner', data: { slot: 'dual-sense', headline: 'New Dual Sense', text: 'For PlayStation 5', image: eplazaAsset('new-dualsense.jpg.webp'), actionLink: '/search' } },
    { title: 'Instant cameras banner', data: { slot: 'instant-cameras', headline: 'Instant Cameras', text: 'Get 20% off', image: eplazaAsset('instant-cameras.jpg.webp'), actionLink: '/search' } },
    { title: 'Apple event wide', data: { slot: 'apple-event', headline: 'Apple Shopping Event', text: 'Hurry and get discounts on all Apple devices up to 20%', image: eplazaAsset('apple-shopping-event-full-img.png.webp'), actionText: 'Go shopping', actionLink: '/search' } },
    { title: 'Bottom Xiaomi', data: { slot: 'bottom-xiaomi', headline: 'Xiaomi Mi 11', text: 'Discount up to 30%', image: eplazaAsset('xiaomi-mi-11-920x560.jpg'), actionLink: '/search' } },
    { title: 'Bottom HP', data: { slot: 'bottom-hp', headline: 'HP Laser Jet', text: 'Personal printer', image: eplazaAsset('hp-laser-jet-920x560.jpg'), actionLink: '/search' } },
    { title: 'Bottom Joy Cons', data: { slot: 'bottom-joycons', headline: 'White Joy Cons', text: 'Novelty items', image: eplazaAsset('white-joy-cons-920x560.jpg'), actionLink: '/search' } }
  ],
  'blog-posts': [
    { title: 'Best Gaming Laptop Models', data: { title: 'Best Gaming Laptop Models', category: 'Gaming, Laptops', excerpt: 'Premium gaming laptops, cooling systems, and GPU choices for modern players.', image: eplazaAsset('best-gaming-laptop-model-entry-header.jpg.webp'), author: 'Store Team', date: '14 Nov 2022' } },
    { title: 'How to choose a HI-FI stereo system', data: { title: 'How to choose a HI-FI stereo system', category: 'HI-FI Sound', excerpt: 'A clear guide to speakers, amplifiers, and room-friendly audio setup decisions.', image: eplazaAsset('how-to-choose-a-hi-fi-stereo-system-entry-header.jpg.webp'), author: 'Store Team', date: '14 Nov 2022' } },
    { title: 'Logitech POP Keys', data: { title: 'Logitech POP Keys', category: 'Keyboards', excerpt: 'Colorful wireless keyboards and the small details that improve daily typing.', image: eplazaAsset('logitech-pop-keys-entry-header.jpg.webp'), author: 'Store Team', date: '11 Nov 2022' } }
  ],
  reviews: [
    { title: 'MacBook review', data: { product: 'Apple MacBook Pro 16 M1 Pro', sku: 'EPLAZA-001', customer: 'Al Imran', rating: 5, review: 'Premium build, fast delivery, and the checkout flow worked perfectly.', likes: 12 } },
    { title: 'Oculus review', data: { product: 'Oculus Quest 2', sku: 'EPLAZA-002', customer: 'Niloy B.', rating: 4, review: 'Very good price for the bundle and the product matched the listing.', likes: 4 } },
    { title: 'Keyboard review', data: { product: 'Logitech Pop Keys', sku: 'EPLAZA-010', customer: 'Sarah K.', rating: 5, review: 'Fun keyboard, quick shipping, and clean package tracking.', likes: 8 } }
  ],
  'checkout-flow': [
    { title: 'Cash on delivery', data: { setting: 'paymentMethod', value: 'cod', notes: 'Eplaza checkout writes orders through the StoreOrder API.' } }
  ],
  'cart-page': [
    { title: 'Cart drawer and checkout handoff', data: { setting: 'cart', value: 'enabled', notes: 'Eplaza cart drawer shares the same cart item, quantity, SKU, and total data as checkout.' } }
  ],
  'search-page': [
    { title: 'Search and category filters', data: { setting: 'search', value: 'enabled', notes: 'Eplaza search matches product name, category, description, and SKU.' } }
  ],
  'category-page': [
    { title: 'Category listing', data: { setting: 'layout', value: 'electronics-grid', notes: 'Eplaza category pages reuse the live electronics catalog categories.' } }
  ],
  'track-order': [
    { title: 'Order tracking', data: { setting: 'tracking', value: 'enabled', notes: 'Eplaza track-order reads checkout orders and saved order numbers.' } }
  ],
  'product-page': [
    { title: 'Product specs', data: { setting: 'specs', value: 'enabled', notes: 'Product detail reads live catalog metadata and reviews.' } }
  ],
  compare: [
    { title: 'Compare table', data: { setting: 'productCompare', value: 'enabled', notes: 'Eplaza compare uses the same catalog, SKU, inventory, and review metadata as product pages.' } }
  ]
};

export const AURA_THEME_CATALOG = {
  key: AURA_THEME_KEY,
  name: AURA_THEME_NAME,
  category: 'marketplace',
  version: '1.0.0',
  defaultTemplate: 'aura',
  previewImage: '',
  templates: [auraTemplate],
  modules: AURA_PLUGIN_MODULES,
  controls: ['homepage-template', 'theme-settings', 'products', 'categories', 'banners', 'reviews', 'search', 'cart', 'compare', 'checkout', 'track-order']
};

export const EPLAZA_THEME_CATALOG = {
  key: EPLAZA_THEME_KEY,
  name: EPLAZA_THEME_NAME,
  category: 'electronics',
  version: '1.0.0',
  defaultTemplate: EPLAZA_THEME_KEY,
  previewImage: eplazaAsset('apple-shopping-event-min.jpg'),
  templates: [eplazaTemplate],
  modules: EPLAZA_PLUGIN_MODULES,
  controls: ['homepage-template', 'theme-settings', 'products', 'categories', 'banners', 'reviews', 'search', 'cart', 'compare', 'checkout', 'track-order', 'blog-posts']
};

export const STOREFRONT_THEME_CATALOG = [AURA_THEME_CATALOG, EPLAZA_THEME_CATALOG];

export const STOREFRONT_PLUGIN_MODULES = [
  ...AURA_PLUGIN_MODULES,
  ...EPLAZA_PLUGIN_MODULES
];

export const DEMO_PRODUCTS_BY_THEME = {
  [AURA_THEME_KEY]: AURA_DEMO_PRODUCTS,
  [EPLAZA_THEME_KEY]: EPLAZA_DEMO_PRODUCTS
};

export const DEMO_RECORDS_BY_THEME = {
  [AURA_THEME_KEY]: AURA_DEMO_RECORDS,
  [EPLAZA_THEME_KEY]: EPLAZA_DEMO_RECORDS
};

export const normalizeStorefrontThemeKey = (key = DEFAULT_STOREFRONT_THEME_KEY) => {
  const normalized = String(key || DEFAULT_STOREFRONT_THEME_KEY).toLowerCase();
  if (normalized === 'era' || normalized === 'aether') return DEFAULT_STOREFRONT_THEME_KEY;
  return normalized;
};

export const findStorefrontTheme = (key = DEFAULT_STOREFRONT_THEME_KEY) => {
  const normalizedKey = normalizeStorefrontThemeKey(key);
  return STOREFRONT_THEME_CATALOG.find((theme) => theme.key === normalizedKey) || null;
};

export const findThemeTemplate = (themeKey = DEFAULT_STOREFRONT_THEME_KEY, templateKey) => {
  const theme = findStorefrontTheme(themeKey) || AURA_THEME_CATALOG;
  return theme.templates.find((template) => template.key === templateKey) ||
    theme.templates.find((template) => template.key === theme.defaultTemplate) ||
    theme.templates[0];
};

export const defaultThemeSettings = (templateKey = DEFAULT_STOREFRONT_THEME_KEY) => {
  const isEplaza = templateKey === EPLAZA_THEME_KEY;
  return {
    homepageTemplate: templateKey || DEFAULT_STOREFRONT_THEME_KEY,
    headerStyle: isEplaza ? 'eplaza-header' : 'aura-header',
    demoMode: false,
    previewTransactions: false,
    accentColor: isEplaza ? '#2463d1' : '#f85606',
    accentDark: isEplaza ? '#101010' : '#d44805',
    logoText: isEplaza ? 'Eplaza' : 'NovaMart',
    brandInitial: isEplaza ? 'E' : 'N',
    controls: {}
  };
};
