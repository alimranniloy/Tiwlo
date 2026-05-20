import type { StorefrontProduct } from '../../shared/storefrontRuntime';

export const auraFallbackCategories = [
  'Electronics',
  'Accessories',
  'Appliances',
  'Beauty',
  'Toys',
  'Groceries',
  'Lifestyle',
  'Fashion',
  'Menswear',
  'Watches',
  'Sports',
  'Auto'
];

export const auraCategoryImages = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&q=80',
  'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&q=80',
  'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=200&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&q=80',
  'https://images.unsplash.com/photo-1532330393533-443990a51d10?w=200&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
  'https://images.unsplash.com/photo-1513519245088-0e12902e35a6?w=200&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&q=80',
  'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=200&q=80',
  'https://images.unsplash.com/photo-1522337360788-8b13df772ecb?w=200&q=80',
  'https://images.unsplash.com/photo-1461896756970-1707374dc254?w=200&q=80',
  'https://images.unsplash.com/photo-1558981403-c5f91ebc26ad?w=200&q=80'
];

export const auraHeroImages = [
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80'
];

export const auraBannerSlots = {
  dailyWide: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
  dailySmallOne: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
  dailySmallTwo: 'https://images.unsplash.com/photo-1526733170371-34825902f37c?w=400&q=80',
  featured: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=1200&q=80',
  bottom: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80'
};

export const auraBrandImages = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
  'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&q=80',
  'https://images.unsplash.com/photo-1583394838336-acd977730f90?w=400&q=80',
  'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400&q=80',
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80',
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80'
];

const sourceProducts = [
  {
    id: '1',
    name: 'Premium Wireless Noise Cancelling Headphones',
    price: 299.99,
    category: 'Electronic Devices',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    rating: 4.8,
    reviews: 1254,
    description: 'Experience world-class sound with our premium wireless headphones. Featuring active noise cancellation, 40-hour battery life, and crystal-clear microphone for calls. The ergonomic design ensures comfort even during long listening sessions.'
  },
  {
    id: '2',
    name: 'Minimalist Leather Strap Watch - Silver Edition',
    price: 150,
    category: 'Watches & Accessories',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    rating: 4.5,
    reviews: 890,
    description: 'A timeless design that fits any occasion. Genuine leather strap, stainless steel casing, and water-resistant up to 50 meters. Perfect for both professional and casual wear.'
  },
  {
    id: '3',
    name: 'Smart Fitness Tracker with Blood Oxygen Monitoring',
    price: 79.99,
    category: 'Electronic Accessories',
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80',
    rating: 4.2,
    reviews: 2105,
    description: 'Track your health and fitness goals with precision. Heart rate monitor, sleep tracking, GPS, and multi-sport modes. Long battery life and compatible with all major smartphones.'
  },
  {
    id: '4',
    name: 'Ergonomic Mesh Office Chair with Lumbar Support',
    price: 450,
    category: 'Home & Lifestyle',
    image: 'https://images.unsplash.com/photo-1505843490701-512068307374?w=800&q=80',
    rating: 4.9,
    reviews: 562,
    description: 'Maximum comfort for long working hours. Breathable mesh, adjustable armrests, and 4D lumbar support. Build with high-quality materials for durability.'
  },
  {
    id: '5',
    name: 'Ultra-Fast Portable SSD - 2TB NVMe',
    price: 189.99,
    category: 'Electronic Accessories',
    image: 'https://images.unsplash.com/photo-1597333583630-40c802e2b47c?w=800&q=80',
    rating: 4.7,
    reviews: 320,
    description: 'Transfer files in seconds with speeds up to 2000MB/s. Compact, rugged, and shock-resistant design. Compatible with PC, Mac, Android, and gaming consoles.'
  },
  {
    id: '6',
    name: 'Smart Home Security Camera - 2K Resolution',
    price: 59.99,
    category: 'Electronic Devices',
    image: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=800&q=80',
    rating: 4.4,
    reviews: 1450,
    description: 'Keep an eye on your home from anywhere. Night vision, motion detection, and two-way audio. Cloud and local storage options available.'
  },
  {
    id: '7',
    name: 'Professional Chef Knife - Damascas Steel',
    price: 120,
    category: 'Home & Lifestyle',
    image: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80',
    rating: 4.8,
    reviews: 430,
    description: 'Handcrafted kitchen knife with a razor-sharp edge. Balanced weight for precision cutting. The beautiful Damascus pattern makes it a centerpiece in any kitchen.'
  },
  {
    id: '8',
    name: 'Wireless Mechanical Keyboard - RGB Backlit',
    price: 135,
    category: 'Electronic Accessories',
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&q=80',
    rating: 4.6,
    reviews: 780,
    description: 'Satisfying tactile feedback with customizable RGB lighting. Connect via Bluetooth or 2.4GHz wireless. Compact layout for more desk space.'
  }
];

export const auraFallbackProducts: StorefrontProduct[] = sourceProducts.map((product) => ({
  ...product,
  sku: `AURA-${String(product.id).padStart(3, '0')}`,
  compareAtPrice: Number((product.price * 1.2).toFixed(2)),
  stock: 100,
  metadata: { demo: true, source: 'aura-original' }
}));
