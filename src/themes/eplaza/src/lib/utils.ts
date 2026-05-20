import type { StorefrontProduct } from '../../../shared/storefrontRuntime';
import type { Product } from '../types';

const tagTypes = ['hot', 'new', 'discount'] as const;

function asTagType(value: unknown, fallback: typeof tagTypes[number]) {
  return tagTypes.includes(value as typeof tagTypes[number]) ? value as typeof tagTypes[number] : fallback;
}

export function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0));
}

export function toEplazaProduct(product: StorefrontProduct, index = 0): Product {
  const metadata = product.metadata || {};
  const oldPrice = Number(metadata.oldPrice ?? metadata.compareAtPrice ?? product.compareAtPrice);
  const discount = oldPrice > product.price ? Math.round(((oldPrice - product.price) / oldPrice) * 100) : 0;
  const tag = metadata.tag ? {
    type: asTagType(metadata.tag.type, discount > 0 ? 'discount' : 'hot'),
    label: String(metadata.tag.label || (discount > 0 ? `-${discount}%` : 'HOT'))
  } : (discount > 0 ? { type: 'discount' as const, label: `-${discount}%` } : (index % 5 === 0 ? { type: 'hot' as const, label: 'HOT' } : undefined));

  return {
    ...product,
    oldPrice: Number.isFinite(oldPrice) && oldPrice > product.price ? oldPrice : undefined,
    tag,
    colors: Array.isArray(metadata.colors) ? metadata.colors : undefined,
    inStock: product.stock > 0,
    images: Array.isArray(metadata.images) && metadata.images.length ? metadata.images : [product.image]
  };
}

export function toEplazaProducts(products: StorefrontProduct[]) {
  return products.map((product, index) => toEplazaProduct(product, index));
}

export function recordImage(record: any, fallback: string) {
  return record?.data?.image || fallback;
}
