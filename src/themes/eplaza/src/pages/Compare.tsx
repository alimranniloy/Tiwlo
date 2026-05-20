import React from 'react';
import { ArrowRightLeft, CheckCircle2, Trash2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { ProductCard } from '../components/ProductCard';
import { formatMoney, toEplazaProduct, toEplazaProducts } from '../lib/utils';

export const Compare = () => {
  const {
    compareItems,
    products,
    removeCompare,
    clearCompare,
    store,
    themePath
  } = useStorefrontRuntime();
  const rows = compareItems.map((item, index) => toEplazaProduct(item, index));
  const suggestions = toEplazaProducts(products)
    .filter((product) => !compareItems.some((item) => item.id === product.id))
    .slice(0, 4);
  const compareRows = [
    ['Price', (product: typeof rows[number]) => formatMoney(product.price, store.currency)],
    ['SKU', (product: typeof rows[number]) => product.sku],
    ['Category', (product: typeof rows[number]) => product.category],
    ['Stock', (product: typeof rows[number]) => `${product.stock} available`],
    ['Rating', (product: typeof rows[number]) => `${product.rating.toFixed(1)} / 5`],
    ['Reviews', (product: typeof rows[number]) => `${product.reviews}`]
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9] pb-20">
      <div className="border-b border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-[1400px] px-4 text-center lg:px-8">
          <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-primary">
            <ArrowRightLeft size={16} />
            Product Compare
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#101010] lg:text-4xl">Compare Products</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
            Compare SKU, price, stock, ratings, and review data from the same live catalog.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
        {rows.length > 0 ? (
          <>
            <div className="mb-4 flex justify-end">
              <button
                onClick={clearCompare}
                className="rounded-full border border-gray-200 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Clear Compare
              </button>
            </div>
            <section className="overflow-hidden rounded-sm border border-gray-100 bg-white shadow-sm">
              <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `190px repeat(${rows.length}, minmax(190px, 1fr))` }}>
                <div className="border-b border-r border-gray-100 bg-[#fbfbfb] p-5 text-[11px] font-black uppercase tracking-widest text-text-muted">
                  Product
                </div>
                {rows.map((product) => (
                  <div key={product.id} className="relative border-b border-r border-gray-100 p-5 last:border-r-0">
                    <button
                      onClick={() => removeCompare(product.id)}
                      className="absolute right-4 top-4 rounded-full bg-gray-50 p-2 text-text-muted transition-all hover:bg-red-50 hover:text-red-500"
                      title="Remove from compare"
                    >
                      <Trash2 size={14} />
                    </button>
                    <Link to={themePath(`product/${product.id}`)} className="block pr-8">
                      <div className="flex aspect-square items-center justify-center rounded-sm bg-[#fcfcfc] p-4">
                        <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-[13px] font-black uppercase leading-snug text-[#101010]">{product.name}</h3>
                    </Link>
                  </div>
                ))}

                {compareRows.map(([label, value]) => (
                  <React.Fragment key={String(label)}>
                    <div className="border-b border-r border-gray-100 bg-[#fbfbfb] p-5 text-[11px] font-black uppercase tracking-widest text-text-muted">
                      {String(label)}
                    </div>
                    {rows.map((product) => (
                      <div key={`${label}-${product.id}`} className="border-b border-r border-gray-100 p-5 text-sm font-bold text-[#101010]/75 last:border-r-0">
                        {(value as (product: typeof rows[number]) => string)(product)}
                      </div>
                    ))}
                  </React.Fragment>
                ))}

                <div className="border-r border-gray-100 bg-[#fbfbfb] p-5 text-[11px] font-black uppercase tracking-widest text-text-muted">
                  Availability
                </div>
                {rows.map((product) => (
                  <div key={`availability-${product.id}`} className="flex items-center gap-2 border-r border-gray-100 p-5 text-sm font-black last:border-r-0">
                    {product.stock > 0 ? (
                      <>
                        <CheckCircle2 size={16} className="text-[#6ba331]" />
                        <span className="text-[#6ba331]">In stock</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-gray-300" />
                        <span className="text-text-muted">Unavailable</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-sm border border-dashed border-gray-200 bg-white py-20 text-center">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-200" />
            <h2 className="mt-5 text-xl font-black uppercase text-[#101010]">No products selected</h2>
            <p className="mt-2 text-sm text-text-muted">Use Compare on a product card or product page to build this table.</p>
            <Link to={themePath('search')} className="mt-8 inline-flex rounded-full bg-primary px-10 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg">
              Browse Products
            </Link>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="mt-14">
            <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#101010]">Add More Products</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {suggestions.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
