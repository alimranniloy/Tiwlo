import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductSectionProps {
  title: string;
  products: Product[];
  showMore?: boolean;
}

export const ProductSection: React.FC<ProductSectionProps> = ({ title, products, showMore = true }) => {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-[#101010]/90 lg:text-2xl uppercase">{title}</h2>
        {showMore && (
          <button className="text-[12px] font-bold text-primary hover:opacity-80 uppercase tracking-widest flex items-center gap-1 transition-opacity">
            More Products <span className="text-lg">›</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
