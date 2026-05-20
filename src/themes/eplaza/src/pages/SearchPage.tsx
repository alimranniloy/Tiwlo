import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { toEplazaProducts } from '../lib/utils';

export const SearchPage = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchParams, setSearchParams] = useSearchParams();
  const { category } = useParams();
  const { products, categories } = useStorefrontRuntime();
  const query = searchParams.get('q') || '';
  const activeCategory = category ? decodeURIComponent(category) : searchParams.get('category') || '';

  const rows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    const cleanCategory = activeCategory.trim().toLowerCase();
    return toEplazaProducts(products).filter((product) => {
      const matchesQuery = !cleanQuery || [product.name, product.category, product.description, product.sku].join(' ').toLowerCase().includes(cleanQuery);
      const matchesCategory = !cleanCategory || product.category.toLowerCase() === cleanCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, products, query]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const q = String(form.get('q') || '').trim();
    setSearchParams(q ? { q } : {});
  };

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="border-b border-gray-100 bg-[#f8faff] py-4 lg:py-6">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <form onSubmit={handleSearch} className="relative mx-auto max-w-2xl">
            <input
              name="q"
              type="text"
              placeholder="Search products..."
              defaultValue={query}
              className="h-11 w-full rounded-full border-2 border-gray-100 pl-5 pr-12 text-sm font-medium outline-none transition-all focus:border-[#2463d1] md:h-12"
            />
            <button className="absolute bottom-1 right-1 top-1 flex aspect-square items-center justify-center rounded-full bg-[#2463d1] text-white shadow-sm transition-all hover:bg-black active:scale-95">
              <Search size={16} />
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
            {rows.length} results {query ? `for "${query}"` : activeCategory ? `in "${activeCategory}"` : 'from the live catalog'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-4 md:py-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="space-y-6 lg:w-1/4">
            <div className="rounded-sm border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 border-b border-gray-100 pb-3 text-[12px] font-black uppercase tracking-widest text-[#101010]">Categories</h3>
              <div className="space-y-4">
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSearchParams({ category: cat })}
                    className="group flex w-full cursor-pointer items-center justify-between"
                  >
                    <span className="text-[14px] font-bold text-[#101010]/70 transition-colors group-hover:text-[#2463d1]">{cat}</span>
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-black text-[#aaa] transition-colors group-hover:text-[#2463d1]">
                      {products.filter((product) => product.category === cat).length || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 border-b border-gray-100 pb-3 text-[12px] font-black uppercase tracking-widest text-[#101010]">Price Range</h3>
              <div className="space-y-4">
                <div className="relative h-1 rounded-full bg-gray-100">
                  <div className="absolute bottom-0 left-[10%] right-[30%] top-0 rounded-full bg-[#2463d1]">
                    <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full border-2 border-[#2463d1] bg-white shadow-md" />
                    <div className="absolute -right-1.5 -top-1 h-3 w-3 rounded-full border-2 border-[#2463d1] bg-white shadow-md" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-text-muted">
                  <span>$10 - $5000</span>
                  <button className="text-[#2463d1] hover:underline">Filter</button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-3/4">
            <div className="mb-6 flex items-center justify-between gap-4 rounded-sm border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setView('grid')} className={`rounded-sm p-1.5 transition-all ${view === 'grid' ? 'bg-[#2463d1] text-white shadow-sm shadow-blue-200' : 'text-gray-300 hover:text-text-main'}`}>
                    <LayoutGrid size={16} />
                  </button>
                  <button onClick={() => setView('list')} className={`rounded-sm p-1.5 transition-all ${view === 'list' ? 'bg-[#2463d1] text-white shadow-sm shadow-blue-200' : 'text-gray-300 hover:text-text-main'}`}>
                    <List size={16} />
                  </button>
                </div>
                <p className="hidden text-[10px] font-bold uppercase tracking-widest text-[#aaa] sm:block">{rows.length} results</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative hidden cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-widest md:flex">
                  <span className="text-[#aaa]">Sort:</span>
                  <span className="text-[#101010]">Default</span>
                  <ChevronDown size={12} />
                </div>
                <button className="flex items-center gap-2 rounded-sm bg-[#f9f9f9] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest lg:hidden">
                  <SlidersHorizontal size={12} />
                  Filters
                </button>
              </div>
            </div>

            {rows.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
                {rows.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-sm border border-dashed border-gray-200 bg-gray-50 py-20 text-center">
                <h3 className="text-lg font-black text-[#101010]">No products found</h3>
                <p className="mt-2 text-sm text-text-muted">Try a different search or category.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
