import React from "react";
import { ArrowLeftRight, Star, ShoppingCart } from "lucide-react";
import { Product } from "../types";
import { formatCurrency } from "../lib/utils";
import { Link } from "react-router-dom";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

export default function ProductCard({ product }: { product: Product; key?: React.Key }) {
  const { addItem, isCompared, store, themePath, toggleCompare } = useStorefrontRuntime();
  const compared = isCompared(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product);
  };

  return (
    <Link to={themePath(`product/${product.id}`)} className="block h-full group">
      <div
        className="bg-white rounded-sm overflow-hidden flex flex-col h-full transition-all border border-gray-100 hover:border-orange-200"
      >
      <div className="relative aspect-square overflow-hidden bg-gray-50 shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* Badge */}
        {product.rating > 4.5 && (
          <div className="absolute top-2 left-0">
            <span className="bg-[var(--aura-accent)] text-white text-[9px] font-bold px-2 py-0.5 rounded-r-sm uppercase tracking-tight">
              Trending
            </span>
          </div>
        )}
      </div>

      <div className="p-2 md:p-3 flex flex-col flex-1">
        <h3 className="text-[11px] md:text-[13px] text-gray-800 line-clamp-2 h-7 md:h-9 leading-tight font-medium group-hover:text-[var(--aura-accent)] transition-colors">
          {product.name}
        </h3>
        
        <div className="mt-1 md:mt-2 space-y-0.5 md:space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[var(--aura-accent)] font-bold text-base md:text-lg">
              {formatCurrency(product.price, store.currency)}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-[9px] md:text-[10px] text-gray-400 line-through">
              {formatCurrency(product.compareAtPrice || product.price * 1.2, store.currency)}
            </span>
            <span className="text-[9px] md:text-[10px] text-gray-900 font-bold">
              -{Math.max(1, Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) || 20)}%
            </span>
          </div>
        </div>

        <div className="mt-auto pt-2 md:pt-3 flex items-center gap-1 md:gap-1.5">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-2.5 h-2.5 md:w-3 md:h-3 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
              />
            ))}
          </div>
          <span className="text-[9px] md:text-[11px] font-bold text-gray-400">({product.reviews})</span>
          <button
            onClick={handleCompare}
            title={compared ? "Remove from compare" : "Compare"}
            className={`ml-auto rounded-sm border p-1 transition-colors ${compared ? "border-[var(--aura-accent)] bg-orange-50 text-[var(--aura-accent)]" : "border-gray-100 text-gray-400 hover:text-[var(--aura-accent)]"}`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
        </div>
        
        <button
          onClick={handleAddToCart}
          className="mt-3 w-full bg-gray-900 text-white py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--aura-accent)] transition-all opacity-0 group-hover:opacity-100 hidden sm:block"
        >
          Add To Cart
        </button>
      </div>
    </div>
    </Link>
  );
}
