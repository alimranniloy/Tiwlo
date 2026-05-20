import React from "react";
import { ArrowLeftRight, Check, Minus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { formatCurrency } from "../lib/utils";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

export default function Compare() {
  const {
    compareItems,
    products,
    removeCompare,
    clearCompare,
    store,
    themePath
  } = useStorefrontRuntime();
  const suggestions = products
    .filter((product) => !compareItems.some((item) => item.id === product.id))
    .slice(0, 4);
  const rows = [
    ["Price", (item: typeof compareItems[number]) => formatCurrency(item.price, store.currency)],
    ["SKU", (item: typeof compareItems[number]) => item.sku],
    ["Category", (item: typeof compareItems[number]) => item.category],
    ["Stock", (item: typeof compareItems[number]) => `${item.stock} available`],
    ["Rating", (item: typeof compareItems[number]) => `${item.rating.toFixed(1)} / 5`],
    ["Reviews", (item: typeof compareItems[number]) => `${item.reviews}`]
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 pb-24 font-sans md:px-6 md:py-8 md:pb-8 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--aura-accent)]">
            <ArrowLeftRight className="h-4 w-4" />
            Product Compare
          </div>
          <h1 className="mt-2 text-xl font-bold uppercase tracking-tighter text-gray-900 md:text-2xl">
            Compare Products
          </h1>
        </div>
        {compareItems.length > 0 && (
          <button
            onClick={clearCompare}
            className="rounded-sm border border-gray-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 transition-colors hover:border-gray-900 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>

      {compareItems.length > 0 ? (
        <section className="overflow-hidden rounded-sm border border-gray-100 bg-white">
          <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `180px repeat(${compareItems.length}, minmax(180px, 1fr))` }}>
            <div className="border-b border-r border-gray-100 bg-gray-50 p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Product
            </div>
            {compareItems.map((item) => (
              <div key={item.id} className="relative border-b border-r border-gray-100 p-4 last:border-r-0">
                <button
                  onClick={() => removeCompare(item.id)}
                  className="absolute right-3 top-3 rounded-full bg-gray-50 p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Remove from compare"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <Link to={themePath(`product/${item.id}`)} className="block pr-8">
                  <div className="aspect-square overflow-hidden rounded-sm bg-gray-50">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-xs font-bold uppercase tracking-tight text-gray-900">{item.name}</h3>
                </Link>
              </div>
            ))}

            {rows.map(([label, value]) => (
              <React.Fragment key={String(label)}>
                <div className="border-b border-r border-gray-100 bg-gray-50 p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {String(label)}
                </div>
                {compareItems.map((item) => (
                  <div key={`${label}-${item.id}`} className="border-b border-r border-gray-100 p-4 text-xs font-bold text-gray-700 last:border-r-0">
                    {(value as (item: typeof compareItems[number]) => string)(item)}
                  </div>
                ))}
              </React.Fragment>
            ))}

            <div className="border-r border-gray-100 bg-gray-50 p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
              Ready
            </div>
            {compareItems.map((item) => (
              <div key={`ready-${item.id}`} className="flex items-center gap-2 border-r border-gray-100 p-4 text-xs font-bold text-green-600 last:border-r-0">
                {item.stock > 0 ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4 text-gray-300" />}
                {item.stock > 0 ? "Available" : "Out of stock"}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-sm border border-dashed border-gray-200 bg-white p-10 text-center">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-gray-200" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">No products selected</h2>
          <p className="mt-2 text-sm text-gray-500">Add products from cards or product pages to compare price, SKU, stock, and reviews.</p>
          <Link to={themePath("search")} className="mt-6 inline-flex rounded-sm bg-[var(--aura-accent)] px-8 py-3 text-xs font-bold uppercase tracking-widest text-white">
            Browse Products
          </Link>
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Add More Products</h2>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
            {suggestions.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
