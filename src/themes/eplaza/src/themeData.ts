import type { StorefrontProduct } from '../../shared/storefrontRuntime';

const asset = (name: string) => `/uploads/eplaza/${name}`;

export const eplazaFallbackCategories = [
  'Apple iPhone',
  'Apple MacBook',
  'Motherboards',
  'Mirrorless',
  'Headsets',
  'Drones',
  'Apple iPad',
  'VR Headsets',
  'Graphics Cards',
  'Washing Machines',
  'Ovens',
  'Keyboards'
];

export const eplazaCategoryImages = [
  asset('mobile-phones-apple-iphone.jpg.webp'),
  asset('laptops-1.jpg.webp'),
  asset('motherboards.jpg.webp'),
  asset('photo-and-video-cameras-mirrorless-cameras.jpg.webp'),
  asset('headsets.jpg.webp'),
  asset('drones.jpg.webp'),
  asset('apple-ipad.jpg.webp')
];

export const eplazaHeroSlides = [
  {
    slot: 'hero-1',
    title: 'Apple Shopping Event',
    subtitle: 'Shop great deals on MacBook, iPad, iPhone and more.',
    cta: 'Shop Now',
    image: asset('apple-shopping-event-min.jpg'),
    color: 'bg-[#6a2560]'
  },
  {
    slot: 'hero-2',
    title: 'The new Google Pixel 7',
    subtitle: 'Experience the magic of the new Google Pixel 7.',
    cta: 'Pre-Order Now',
    image: asset('pre-order-g-pixel-7.jpg.webp'),
    color: 'bg-[#233647]'
  },
  {
    slot: 'hero-3',
    title: 'Smart Appliances',
    subtitle: 'Discount on all smart appliances up to 25%',
    cta: 'Shop Now',
    image: asset('discount-on-all-smart-appliances.jpg.webp'),
    color: 'bg-[#2e2d2b]'
  }
];

export const eplazaBanners = {
  aurora: asset('logitech-aurora-headset.jpg.webp'),
  dualSense: asset('new-dualsense.jpg.webp'),
  instantCameras: asset('instant-cameras.jpg.webp'),
  phoneFeature: asset('nothing-phone-1-600x720.jpg'),
  microsoft: asset('microsoft-accessories.jpg.webp'),
  appleEvent: asset('apple-shopping-event-full-img.png.webp'),
  xiaomi: asset('xiaomi-mi-11-920x560.jpg'),
  hp: asset('hp-laser-jet-920x560.jpg'),
  joyCons: asset('white-joy-cons-920x560.jpg'),
  payments: asset('payments.png'),
  appStore: asset('download_on_the_app_store_badge.svg'),
  playStore: asset('google_play_store_badge_en.svg')
};

const productRows = [
  ['EPLAZA-001', 'Apple MacBook Pro 16 M1 Pro', 'Apple MacBook', 2499, 2999, 26, asset('apple-macbook-pro-16-silver-1.jpg.webp'), 5, 12],
  ['EPLAZA-002', 'Oculus Quest 2', 'VR Headsets', 449, 499, 34, asset('oculus-quest-2-1.jpg.webp'), 4.8, 58],
  ['EPLAZA-003', 'Asus GeForce GTX 1660 Ti TUF', 'Graphics Cards', 269, 315, 18, asset('asus-geforce-gtx-1660-ti-tuf-1.jpg.webp'), 4.7, 15],
  ['EPLAZA-004', 'Samsung Neo QLED 55QN85A', 'OLED TV', 1600, 1899, 11, asset('samsung-neo-qled-55qn85a-1.jpg.webp'), 4.5, 20],
  ['EPLAZA-005', 'LG FH4G1BCS2', 'Washing Machines', 945, 1110, 9, asset('lg-fh4g1bcs2-1.jpg.webp'), 4.9, 6],
  ['EPLAZA-006', 'Acer ConceptD 7 Ezel', 'Business Laptop', 3800, 4200, 14, asset('acer-conceptd-7-ezel-1.jpg.webp'), 4.6, 31],
  ['EPLAZA-007', 'ACER ConceptD CT300', 'Office PCs', 2199, 2600, 8, asset('acer-conceptd-ct300-1.jpg.webp'), 4.4, 17],
  ['EPLAZA-008', 'Acer Predator Helios 300', 'Gaming Laptop', 1600, 1850, 22, asset('acer-predator-helios-300-1.jpg.webp'), 4.7, 29],
  ['EPLAZA-009', 'Acer ProDesigner PE320QK', '4K Monitors', 750, 880, 16, asset('acer-prodesigner-pe320qk-1.jpg.webp'), 4.3, 10],
  ['EPLAZA-010', 'Logitech Pop Keys', 'Keyboards', 99, 129, 50, asset('logitech-pop-keys-1.jpg.webp'), 5, 44],
  ['EPLAZA-011', 'ARIETE 0979', 'Ovens', 110, 139, 40, asset('ariete-0979-1.jpg.webp'), 4.2, 9],
  ['EPLAZA-012', 'Bamix Deluxe M200', 'Blenders', 230, 280, 20, asset('bamix-deluxe-m200-1.jpg.webp'), 4.1, 12]
] as const;

export const eplazaFallbackProducts: StorefrontProduct[] = productRows.map(([sku, name, category, price, compareAtPrice, stock, image, rating, reviews], index) => ({
  id: sku.toLowerCase(),
  sku,
  name,
  category,
  price,
  compareAtPrice,
  stock,
  image,
  rating,
  reviews,
  description: `${name} from the Eplaza electronics catalog with live storefront pricing, inventory, and checkout support.`,
  metadata: {
    demo: true,
    source: 'eplaza-original',
    oldPrice: compareAtPrice,
    rating,
    reviews,
    tag: index < 2 ? { type: 'hot', label: 'HOT' } : (compareAtPrice > price ? { type: 'discount', label: `-${Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}%` } : undefined)
  }
}));
