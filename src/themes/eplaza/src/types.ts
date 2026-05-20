import type { StorefrontCartItem, StorefrontProduct } from '../../shared/storefrontRuntime';

export type ProductTag = {
  type: 'hot' | 'new' | 'discount';
  label: string;
};

export type Product = StorefrontProduct & {
  oldPrice?: number;
  tag?: ProductTag;
  colors?: string[];
  inStock?: boolean;
  images?: string[];
};

export type CartItem = StorefrontCartItem & Product;

export interface Category {
  id: string;
  name: string;
  itemCount: number;
  image: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  image: string;
}
