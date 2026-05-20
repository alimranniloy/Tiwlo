import React from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { Filter, ChevronDown, LayoutGrid, List } from "lucide-react";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

export default function Search() {
  const [searchParams] = useSearchParams();
  const { category } = useParams();
  const query = searchParams.get("q") || "";
  const { products, categories, themePath } = useStorefrontRuntime();
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");

  const filteredProducts = React.useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    const cleanCategory = category ? decodeURIComponent(category).toLowerCase() : "";
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Number.POSITIVE_INFINITY;
    return products.filter((product) => {
      const matchesQuery = !cleanQuery || [product.name, product.category, product.description, product.sku].join(" ").toLowerCase().includes(cleanQuery);
      const matchesCategory = !cleanCategory || product.category.toLowerCase() === cleanCategory;
      const matchesPrice = product.price >= min && product.price <= max;
      return matchesQuery && matchesCategory && matchesPrice;
    });
  }, [category, maxPrice, minPrice, products, query]);

  return (
    <div className="max-w-7xl mx-auto px-1.5 md:px-6 lg:px-8 py-2 md:py-6 font-sans pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row gap-3 md:gap-6">
        <aside className="w-full md:w-64 space-y-6 shrink-0 hidden md:block">
           <div className="bg-white p-4 rounded-sm border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4 flex items-center justify-between">
                Category
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </h3>
              <div className="space-y-2">
                 {categories.slice(0, 8).map((cat) => (
                    <Link key={cat} to={themePath(`category/${encodeURIComponent(cat)}`)} className="flex items-center gap-2 cursor-pointer group">
                       <input readOnly checked={decodeURIComponent(category || "") === cat} type="checkbox" className="w-3.5 h-3.5 rounded-sm border-gray-300 text-[var(--aura-accent)] focus:ring-0" />
                       <span className="text-xs font-medium text-[#757575] group-hover:text-[var(--aura-accent)] transition-colors">{cat}</span>
                    </Link>
                 ))}
              </div>
           </div>

           <div className="bg-white p-4 rounded-sm border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4 flex items-center justify-between">
                Price Range
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </h3>
              <div className="flex items-center gap-2">
                 <input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} type="number" placeholder="Min" className="w-full bg-[#f0f1f4] border-none text-xs p-2 rounded-sm" />
                 <span className="text-gray-300">-</span>
                 <input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} type="number" placeholder="Max" className="w-full bg-[#f0f1f4] border-none text-xs p-2 rounded-sm" />
              </div>
              <button className="w-full mt-3 bg-[var(--aura-accent)] text-white py-1.5 rounded-sm font-bold text-[10px] uppercase">Apply</button>
           </div>
        </aside>

        <div className="flex-1 space-y-3 md:space-y-4">
           <div className="bg-white p-2 md:p-3 rounded-sm border border-gray-100 flex items-center justify-between">
              <div className="text-[9px] md:text-xs font-bold text-gray-500 uppercase tracking-tighter">
                <span>{filteredProducts.length} Items found</span>
              </div>
              <div className="flex items-center gap-2 md:gap-6">
                 <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-500">
                    <span className="hidden sm:inline">Sort By:</span>
                    <button className="font-bold text-[#212121] flex items-center gap-1 uppercase tracking-tighter">Best Match <ChevronDown className="w-2 md:w-3 h-2 md:h-3" /></button>
                 </div>
                 <div className="hidden sm:block h-4 w-px bg-gray-200" />
                 <div className="hidden sm:flex items-center gap-3 text-gray-400">
                    <button className="hover:text-[var(--aura-accent)] transition-colors"><LayoutGrid className="w-4 h-4" /></button>
                    <button className="hover:text-[var(--aura-accent)] transition-colors"><List className="w-4 h-4" /></button>
                 </div>
              </div>
           </div>

           {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-3">
                 {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                 ))}
              </div>
           ) : (
              <div className="bg-white p-12 rounded-sm border border-gray-100 text-center space-y-4">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Filter className="w-10 h-10 text-gray-200" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-[#212121]">No matching products found</h3>
                    <p className="text-sm text-gray-500 mt-1">Try different keywords or check for spelling errors.</p>
                 </div>
                 <Link to={themePath()} className="inline-block bg-[var(--aura-accent)] text-white px-8 py-2 rounded-sm text-xs font-bold uppercase transition-transform active:scale-95">
                    Return to home
                 </Link>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
