import React from 'react';
import {
  createStoreOrderWithApi,
  fetchStoreOrdersForAdmin
} from '../../lib/tiwloApi';
import type { StoreThemeRuntime } from '../../lib/tiwloApi';
import {
  chooseCurrencyForStorage,
  convertCurrencyAmount,
  currencySelectionStorageKey,
  DEFAULT_CURRENCY_POLICY,
  formatCurrencyAmount,
  isCurrencySelectable,
  normalizeCurrencyCode,
  normalizeCurrencyPolicy,
  persistCurrencySelection,
  readStoredCurrencySelection
} from '../../lib/currency';
import type { CurrencyPolicy } from '../../lib/currency';

export type StorefrontProduct = {
  id: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice: number;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  stock: number;
  description: string;
  metadata: Record<string, any>;
};

export type StorefrontCartItem = StorefrontProduct & {
  quantity: number;
};

export type StorefrontRecord = {
  id: string;
  title: string;
  status: string;
  data: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

export type StorefrontReview = {
  id: string;
  product?: string;
  productId?: string;
  sku?: string;
  user: string;
  rating: number;
  date: string;
  comment: string;
  likes: number;
};

export type StorefrontStoreInfo = {
  id?: string;
  name: string;
  slug?: string;
  region: string;
  currency: string;
  baseCurrency?: string;
  currencyPolicy?: CurrencyPolicy;
  phone: string;
  email: string;
  address: string;
};

export type StorefrontThemeSettings = {
  accentColor: string;
  accentDark: string;
  brandInitial: string;
  logoText?: string;
  [key: string]: any;
};

type CreateOrderInput = {
  shipping?: Record<string, unknown>;
  payment?: Record<string, unknown>;
};

type StorefrontRuntimeContextValue = {
  runtime: StoreThemeRuntime | null;
  allowFallbackData: boolean;
  products: StorefrontProduct[];
  categories: string[];
  store: StorefrontStoreInfo;
  records: Record<string, StorefrontRecord[]>;
  settings: StorefrontThemeSettings;
  currencyPolicy: CurrencyPolicy;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  reviews: StorefrontReview[];
  orders: any[];
  cartItems: StorefrontCartItem[];
  compareItems: StorefrontProduct[];
  cartTotal: number;
  cartCount: number;
  compareCount: number;
  themePath: (path?: string) => string;
  getRecords: (section: string) => StorefrontRecord[];
  productById: (id?: string) => StorefrontProduct | undefined;
  reviewsForProduct: (product?: StorefrontProduct | null) => StorefrontReview[];
  addItem: (product: StorefrontProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCompare: (product: StorefrontProduct) => void;
  removeCompare: (productId: string) => void;
  clearCompare: () => void;
  isCompared: (productId?: string) => boolean;
  createOrder: (input?: CreateOrderInput) => Promise<any>;
  findOrder: (query: string) => any | null;
};

const fallbackImages = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80',
  'https://images.unsplash.com/photo-1583394838336-acd977730f90?w=800&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
];

const fallbackProducts: StorefrontProduct[] = [
  ['Wireless headset with noise control', 'Electronic Devices', 99.5, 125, 42],
  ['Smart watch pro series', 'Electronic Devices', 129, 159, 35],
  ['Portable creator camera kit', 'Electronic Accessories', 195, 240, 18],
  ['Daily beauty care bundle', 'Health & Beauty', 28, 40, 70],
  ['Home appliance starter pack', 'Home & Lifestyle', 60, 82, 27],
  ['Fashion essentials bundle', "Men's Fashion", 19, 29, 120]
].map(([name, category, price, oldPrice, stock], index) => ({
  id: `aura-demo-${index + 1}`,
  sku: `AURA-${String(index + 1).padStart(3, '0')}`,
  name: String(name),
  category: String(category),
  price: Number(price),
  compareAtPrice: Number(oldPrice),
  stock: Number(stock),
  image: fallbackImages[index % fallbackImages.length],
  rating: 4.4 + (index % 4) * 0.1,
  reviews: 24 + index * 8,
  description: 'Store-ready marketplace product connected through the shared theme runtime.',
  metadata: { demo: true }
}));

const defaultCategories = [
  'Electronic Devices',
  'Electronic Accessories',
  'Health & Beauty',
  "Men's Fashion",
  "Women's Fashion",
  'Home & Lifestyle',
  'Sports & Outdoor',
  'Groceries'
];

const defaultReviews: StorefrontReview[] = [
  {
    id: 'review-1',
    user: 'Al Imran',
    rating: 5,
    date: '2 days ago',
    comment: 'Excellent product quality and very fast delivery.',
    likes: 12
  },
  {
    id: 'review-2',
    user: 'Niloy B.',
    rating: 4,
    date: '1 week ago',
    comment: 'Good value for the price and the storefront checkout was smooth.',
    likes: 4
  },
  {
    id: 'review-3',
    user: 'Sarah K.',
    rating: 5,
    date: '2 weeks ago',
    comment: 'The item matched the description and support was responsive.',
    likes: 8
  }
];

const StorefrontRuntimeContext = React.createContext<StorefrontRuntimeContextValue | null>(null);

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeRecords(runtime?: StoreThemeRuntime | null) {
  const source = runtime?.records || {};
  return Object.entries(source).reduce<Record<string, StorefrontRecord[]>>((acc, [section, records]) => {
    acc[section] = (Array.isArray(records) ? records : []).map((record: any) => ({
      id: String(record.id || `${section}-${acc[section]?.length || 0}`),
      title: String(record.title || record.data?.headline || record.data?.name || record.data?.setting || section),
      status: String(record.status || 'active'),
      data: record.data || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));
    return acc;
  }, {});
}

function activeRecords(records: Record<string, StorefrontRecord[]>, section: string) {
  return (records[section] || []).filter((record) => !['disabled', 'deleted', 'rejected'].includes(String(record.status || '').toLowerCase()));
}

function settingRecords(records: Record<string, StorefrontRecord[]>) {
  return activeRecords(records, 'theme-settings').reduce<Record<string, any>>((acc, record) => {
    const key = String(record.data?.setting || record.title || '').trim();
    if (!key) return acc;
    acc[key] = record.data?.value ?? record.data;
    return acc;
  }, {});
}

function normalizeStore(runtime?: StoreThemeRuntime | null): StorefrontStoreInfo {
  const store = runtime?.store || {};
  return {
    id: store.id,
    name: store.name || 'NovaMart',
    slug: store.slug,
    region: store.region || store.address || 'Global',
    currency: store.currency || 'USD',
    phone: store.phone || '+1 000 000 0000',
    email: store.contactEmail || 'support@example.com',
    address: store.address || ''
  };
}

function normalizeProducts(runtime?: StoreThemeRuntime | null, includeFallback = true): StorefrontProduct[] {
  const products = runtime?.products?.length ? runtime.products : (includeFallback ? fallbackProducts : []);
  const normalized = products.map((product: any, index: number) => {
    const price = normalizeNumber(product.price, fallbackProducts[index % fallbackProducts.length]?.price || 0);
    const compareAtPrice = normalizeNumber(
      product.metadata?.compareAtPrice ?? product.metadata?.oldPrice,
      price > 0 ? Math.ceil(price * 1.2) : price
    );
    return {
      id: String(product.id || product.sku || `product-${index + 1}`),
      sku: product.sku || `SKU-${index + 1}`,
      name: product.name || `Product ${index + 1}`,
      price,
      compareAtPrice,
      category: product.category || defaultCategories[index % defaultCategories.length],
      image: product.image || product.metadata?.image || fallbackImages[index % fallbackImages.length],
      rating: normalizeNumber(product.metadata?.rating, 4.4 + (index % 5) * 0.1),
      reviews: normalizeNumber(product.metadata?.reviews ?? product.metadata?.reviewCount, 18 + index * 7),
      stock: normalizeNumber(product.stock, 0),
      description: product.description || 'Product data connected from Store Admin catalog.',
      metadata: product.metadata || {}
    };
  });

  if (normalized.every((product) => product.sku.startsWith('AURA-') && product.metadata?.demo)) {
    return [...normalized].sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }));
  }

  return normalized;
}

function convertProductsForCurrency(products: StorefrontProduct[], policy: CurrencyPolicy, currency: string) {
  const selected = normalizeCurrencyCode(currency, policy.defaultCurrency);
  return products.map((product) => {
    const convert = (value: unknown) => Number(convertCurrencyAmount(normalizeNumber(value, 0), policy, selected).toFixed(2));
    const metadata = { ...(product.metadata || {}) };
    if (metadata.compareAtPrice !== undefined) metadata.compareAtPrice = convert(metadata.compareAtPrice);
    if (metadata.oldPrice !== undefined) metadata.oldPrice = convert(metadata.oldPrice);
    return {
      ...product,
      price: convert(product.price),
      compareAtPrice: convert(product.compareAtPrice),
      metadata
    };
  });
}

function normalizeCategories(runtime: StoreThemeRuntime | null | undefined, products: StorefrontProduct[], includeFallback = true) {
  const runtimeCategories = runtime?.categories?.map((category: any) => category.name).filter(Boolean) || [];
  const productCategories = products.map((product) => product.category).filter(Boolean);
  return Array.from(new Set([
    ...runtimeCategories,
    ...productCategories,
    ...(includeFallback ? defaultCategories : [])
  ])).slice(0, 12);
}

function normalizeSettings(runtime: StoreThemeRuntime | null | undefined, records: Record<string, StorefrontRecord[]>): StorefrontThemeSettings {
  const recordSettings = settingRecords(records);
  const settings = {
    ...(runtime?.settings || {}),
    ...(runtime?.activeTheme?.settings || {}),
    ...recordSettings
  };
  const accentColor = settings.accentColor || settings.primaryColor || '#f85606';
  return {
    ...settings,
    accentColor,
    accentDark: settings.accentDark || settings.primaryDark || '#d44805',
    brandInitial: String(settings.brandInitial || 'N').slice(0, 1).toUpperCase(),
    logoText: settings.logoText || 'NovaMart'
  };
}

function setMetaThemeColor(color: string) {
  if (typeof document === 'undefined') return () => undefined;
  const safeColor = /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#0069ff';
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  const previous = meta.getAttribute('content');
  meta.setAttribute('content', safeColor);
  return () => {
    if (previous) meta?.setAttribute('content', previous);
  };
}

function normalizeReviews(records: Record<string, StorefrontRecord[]>, includeFallback = true): StorefrontReview[] {
  const reviews = activeRecords(records, 'reviews').map((record, index) => ({
    id: record.id,
    product: record.data?.product,
    productId: record.data?.productId,
    sku: record.data?.sku,
    user: record.data?.customer || record.data?.user || `Customer ${index + 1}`,
    rating: Math.max(1, Math.min(5, normalizeNumber(record.data?.rating, 5))),
    date: record.data?.date || 'Recently',
    comment: record.data?.review || record.data?.comment || record.title,
    likes: normalizeNumber(record.data?.likes, 3 + index)
  }));
  return reviews.length ? reviews : (includeFallback ? defaultReviews : []);
}

export function StorefrontRuntimeProvider({
  children,
  runtime,
  themeKey,
  basePath,
  fallbackProductList,
  fallbackCategoryList,
  allowFallbackData = true
}: {
  children: React.ReactNode;
  runtime: StoreThemeRuntime | null;
  themeKey: string;
  basePath: string;
  fallbackProductList?: StorefrontProduct[];
  fallbackCategoryList?: string[];
  allowFallbackData?: boolean;
}) {
  const useFallbackData = allowFallbackData && (!runtime || runtime.preview === true);
  const records = React.useMemo(() => normalizeRecords(runtime), [runtime]);
  const baseStore = React.useMemo(() => normalizeStore(runtime), [runtime]);
  const settings = React.useMemo(() => normalizeSettings(runtime, records), [records, runtime]);

  React.useEffect(() => setMetaThemeColor(settings.accentColor), [settings.accentColor]);

  const currencyPolicy = React.useMemo(() => normalizeCurrencyPolicy(
    runtime?.store?.settings?.currencyPolicy || settings.currencyPolicy || DEFAULT_CURRENCY_POLICY,
    baseStore.currency || 'USD'
  ), [baseStore.currency, runtime?.store?.settings?.currencyPolicy, settings.currencyPolicy]);
  const currencyStorageKey = currencySelectionStorageKey('storefront', baseStore.id || baseStore.slug || themeKey);
  const [selectedCurrency, setSelectedCurrencyState] = React.useState(() => chooseCurrencyForStorage(currencyPolicy, currencyStorageKey));

  React.useEffect(() => {
    const next = chooseCurrencyForStorage(currencyPolicy, currencyStorageKey);
    const saved = readStoredCurrencySelection(currencyStorageKey, currencyPolicy);
    setSelectedCurrencyState((current) => saved && isCurrencySelectable(currencyPolicy, current) ? current : next);
    if (!saved) {
      persistCurrencySelection(currencyStorageKey, next, { scope: 'storefront', scopeId: baseStore.id || baseStore.slug || themeKey });
    }
  }, [baseStore.id, baseStore.slug, currencyPolicy, currencyStorageKey, themeKey]);

  const setSelectedCurrency = React.useCallback((currency: string) => {
    const next = normalizeCurrencyCode(currency, currencyPolicy.defaultCurrency);
    if (!isCurrencySelectable(currencyPolicy, next)) return;
    persistCurrencySelection(currencyStorageKey, next, { scope: 'storefront', scopeId: baseStore.id || baseStore.slug || themeKey });
    setSelectedCurrencyState(next);
  }, [baseStore.id, baseStore.slug, currencyPolicy, currencyStorageKey, themeKey]);

  const runtimeProducts = React.useMemo(() => normalizeProducts(runtime, useFallbackData), [runtime, useFallbackData]);
  const rawProducts = useFallbackData && fallbackProductList && !runtime?.products?.length ? fallbackProductList : runtimeProducts;
  const products = React.useMemo(
    () => convertProductsForCurrency(rawProducts, currencyPolicy, selectedCurrency),
    [currencyPolicy, rawProducts, selectedCurrency]
  );
  const categories = React.useMemo(() => {
    const normalized = normalizeCategories(runtime, products, useFallbackData);
    const navigationCategories = activeRecords(records, 'navigation')
      .flatMap((record) => String(record.data?.items || '').split(','))
      .map((item) => item.trim())
      .filter(Boolean);
    return useFallbackData && fallbackCategoryList
      ? Array.from(new Set([...navigationCategories, ...normalized, ...fallbackCategoryList])).slice(0, 12)
      : Array.from(new Set([...navigationCategories, ...normalized])).slice(0, 12);
  }, [fallbackCategoryList, products, records, runtime, useFallbackData]);
  const store = React.useMemo(() => ({
    ...baseStore,
    currency: selectedCurrency,
    baseCurrency: currencyPolicy.baseCurrency,
    currencyPolicy
  }), [baseStore, currencyPolicy, selectedCurrency]);
  const reviews = React.useMemo(() => normalizeReviews(records, useFallbackData), [records, useFallbackData]);
  const [cartItems, setCartItems] = React.useState<StorefrontCartItem[]>([]);
  const [compareItems, setCompareItems] = React.useState<StorefrontProduct[]>([]);
  const [cartHydrated, setCartHydrated] = React.useState(false);
  const [compareHydrated, setCompareHydrated] = React.useState(false);
  const [orders, setOrders] = React.useState<any[]>([]);

  const cartStorageKey = `tiwlo:${themeKey}:${store.id || 'preview'}:cart`;
  const compareStorageKey = `tiwlo:${themeKey}:${store.id || 'preview'}:compare`;
  const lastOrderKey = `tiwlo:${themeKey}:${store.id || 'preview'}:last-order`;

  React.useEffect(() => {
    setCartHydrated(false);
    try {
      const saved = localStorage.getItem(cartStorageKey);
      setCartItems(saved ? JSON.parse(saved) : []);
    } catch {
      setCartItems([]);
    } finally {
      setCartHydrated(true);
    }
  }, [cartStorageKey]);

  React.useEffect(() => {
    if (!cartHydrated) return;
    localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartHydrated, cartItems, cartStorageKey]);

  React.useEffect(() => {
    setCompareHydrated(false);
    try {
      const saved = localStorage.getItem(compareStorageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setCompareItems(Array.isArray(parsed) ? parsed.slice(0, 4) : []);
    } catch {
      setCompareItems([]);
    } finally {
      setCompareHydrated(true);
    }
  }, [compareStorageKey]);

  React.useEffect(() => {
    if (!compareHydrated) return;
    localStorage.setItem(compareStorageKey, JSON.stringify(compareItems));
  }, [compareHydrated, compareItems, compareStorageKey]);

  React.useEffect(() => {
    if (!cartHydrated) return;
    setCartItems((items) => items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.id || candidate.sku === item.sku);
      return product ? { ...product, quantity: item.quantity } : item;
    }));
  }, [cartHydrated, products]);

  React.useEffect(() => {
    if (!compareHydrated) return;
    setCompareItems((items) => items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.id || candidate.sku === item.sku);
      return product || item;
    }));
  }, [compareHydrated, products]);

  React.useEffect(() => {
    let mounted = true;
    if (!store.id) return;
    fetchStoreOrdersForAdmin(store.id)
      .then((data) => {
        if (mounted) setOrders(data);
      })
      .catch(() => {
        if (mounted) setOrders([]);
      });
    return () => {
      mounted = false;
    };
  }, [store.id]);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const compareCount = compareItems.length;

  const themePath = React.useCallback((path = '') => {
    const cleanBase = basePath.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
  }, [basePath]);

  const getRecords = React.useCallback((section: string) => activeRecords(records, section), [records]);
  const productById = React.useCallback((id?: string) => products.find((product) => String(product.id) === String(id) || String(product.sku) === String(id)), [products]);
  const reviewsForProduct = React.useCallback((product?: StorefrontProduct | null) => {
    if (!product) return reviews;
    const filtered = reviews.filter((review) => (
      review.productId === product.id ||
      review.sku === product.sku ||
      review.product === product.name ||
      review.product === product.category
    ));
    return filtered.length ? filtered : reviews;
  }, [reviews]);

  const addItem = React.useCallback((product: StorefrontProduct, quantity = 1) => {
    setCartItems((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...items, { ...product, quantity }];
    });
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setCartItems((items) => items.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = React.useCallback((productId: string, quantity: number) => {
    setCartItems((items) => items
      .map((item) => item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item)
      .filter((item) => item.quantity > 0));
  }, []);

  const clearCart = React.useCallback(() => setCartItems([]), []);

  const toggleCompare = React.useCallback((product: StorefrontProduct) => {
    setCompareItems((items) => {
      if (items.some((item) => item.id === product.id)) {
        return items.filter((item) => item.id !== product.id);
      }
      return [product, ...items].slice(0, 4);
    });
  }, []);

  const removeCompare = React.useCallback((productId: string) => {
    setCompareItems((items) => items.filter((item) => item.id !== productId));
  }, []);

  const clearCompare = React.useCallback(() => setCompareItems([]), []);

  const isCompared = React.useCallback((productId?: string) => {
    if (!productId) return false;
    return compareItems.some((item) => item.id === productId);
  }, [compareItems]);

  const createOrder = React.useCallback(async (input: CreateOrderInput = {}) => {
    if (!store.id) throw new Error('Store is not connected yet');
    if (!cartItems.length) throw new Error('Cart is empty');
    const order = await createStoreOrderWithApi({
      storeId: store.id,
      total: Number(cartTotal.toFixed(2)),
      currency: store.currency,
      items: cartItems.map((item) => ({
        productId: item.id,
        sku: item.sku,
        name: item.name,
        qty: item.quantity,
        price: item.price
      })),
      shipping: input.shipping || {},
      payment: input.payment || { method: 'cod', status: 'pending' }
    });
    setOrders((items) => [order, ...items.filter((item) => item.id !== order.id)]);
    localStorage.setItem(lastOrderKey, JSON.stringify(order));
    clearCart();
    return order;
  }, [cartItems, cartTotal, clearCart, lastOrderKey, store.currency, store.id]);

  const findOrder = React.useCallback((query: string) => {
    const clean = query.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return null;
    let lastOrder: any = null;
    try {
      lastOrder = JSON.parse(localStorage.getItem(lastOrderKey) || 'null');
    } catch {
      lastOrder = null;
    }
    return [lastOrder, ...orders].filter(Boolean).find((order) => (
      String(order.id || '').toLowerCase() === clean ||
      String(order.number || '').toLowerCase() === clean ||
      String(order.number || '').replace(/^#/, '').toLowerCase() === clean
    )) || null;
  }, [lastOrderKey, orders]);

  const value = React.useMemo<StorefrontRuntimeContextValue>(() => ({
    runtime,
    allowFallbackData: useFallbackData,
    products,
    categories,
    store,
    records,
    settings,
    currencyPolicy,
    selectedCurrency,
    setSelectedCurrency,
    reviews,
    orders,
    cartItems,
    compareItems,
    cartTotal,
    cartCount,
    compareCount,
    themePath,
    getRecords,
    productById,
    reviewsForProduct,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCompare,
    removeCompare,
    clearCompare,
    isCompared,
    createOrder,
    findOrder
  }), [
    addItem,
    useFallbackData,
    cartCount,
    cartItems,
    cartTotal,
    clearCompare,
    categories,
    clearCart,
    compareCount,
    compareItems,
    createOrder,
    currencyPolicy,
    findOrder,
    getRecords,
    isCompared,
    orders,
    productById,
    products,
    records,
    removeCompare,
    removeItem,
    reviews,
    reviewsForProduct,
    runtime,
    selectedCurrency,
    setSelectedCurrency,
    settings,
    store,
    themePath,
    toggleCompare,
    updateQuantity
  ]);

  return (
    <StorefrontRuntimeContext.Provider value={value}>
      {children}
    </StorefrontRuntimeContext.Provider>
  );
}

export function useStorefrontRuntime() {
  const context = React.useContext(StorefrontRuntimeContext);
  if (!context) throw new Error('useStorefrontRuntime must be used inside StorefrontRuntimeProvider');
  return context;
}

export function formatStorefrontMoney(value: number, currency = 'USD') {
  return formatCurrencyAmount(value, currency);
}
