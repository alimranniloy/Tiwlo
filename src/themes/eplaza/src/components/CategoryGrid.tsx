import React from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { eplazaCategoryImages } from '../themeData';
import type { Category } from '../types';

export const PopularCategories = () => {
  const { categories, getRecords, products, themePath } = useStorefrontRuntime();
  const categoryRecords = getRecords('categories');
  const categoryRows: Category[] = categories.slice(0, 7).map((name, index) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    itemCount: products.filter((product) => product.category === name).length || 8,
    image: categoryRecords.find((record) => String(record.data?.name || record.title || '').toLowerCase() === name.toLowerCase())?.data?.image ||
      eplazaCategoryImages[index % eplazaCategoryImages.length]
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-tight text-[#101010]/90 lg:text-2xl">Popular Categories</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 lg:gap-8">
        {categoryRows.map((category) => (
          <Link key={category.id} to={themePath(`category/${encodeURIComponent(category.name)}`)} className="group flex cursor-pointer flex-col items-center text-center">
            <div className="mb-4 aspect-square w-full max-w-[140px] overflow-hidden rounded-full border-[1.5px] border-gray-100 bg-white transition-all group-hover:border-primary group-hover:shadow-lg">
              <img
                src={category.image}
                alt={category.name}
                className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <h3 className="text-[14px] font-bold text-[#101010]/90 transition-colors group-hover:text-primary">{category.name}</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-text-muted">{category.itemCount} products</p>
          </Link>
        ))}
      </div>
    </div>
  );
};
