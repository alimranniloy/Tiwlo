import { Star, ShoppingCart, Heart, Search, Repeat } from 'lucide-react';
import React from 'react';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { formatMoney } from '../lib/utils';

export interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { isCompared, store, themePath, toggleCompare } = useStorefrontRuntime();
  const compared = isCompared(product.id);
  
  return (
    <div className="group relative flex flex-col bg-white transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[4px] border border-gray-100/50 h-full overflow-hidden">
      {/* Labels */}
      {product.tag && (
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 pointer-events-none">
          <span className={`rounded-sm px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm tracking-wider ${
            product.tag.type === 'hot' ? 'bg-[#f44336]' : 
            product.tag.type === 'new' ? 'bg-[#49c5f1]' : 'bg-[#6ba331]'
          }`}>
            {product.tag.label}
          </span>
        </div>
      )}
      
      {/* Product Image Section */}
      <div className="relative aspect-square w-full overflow-hidden flex items-center justify-center p-6 bg-[#fcfcfc] dark:bg-gray-50/50">
        <Link to={themePath(`product/${product.id}`)} className="w-full h-full flex items-center justify-center">
            <img 
              src={product.image} 
              alt={product.name} 
              className="max-h-full max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-110"
            />
        </Link>
        
        {/* Hover Tools - Woodmart Style Side Buttons */}
        <div className="absolute right-[-45px] top-4 flex flex-col gap-1.5 transition-all duration-300 group-hover:right-3 opacity-0 group-hover:opacity-100">
          <button title="Add to Wishlist" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-main shadow-md hover:bg-[#2463d1] hover:text-white transition-all transform hover:scale-110">
            <Heart size={15} />
          </button>
          <button
            title={compared ? 'Remove from compare' : 'Compare'}
            onClick={(e) => {
              e.preventDefault();
              toggleCompare(product);
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition-all transform hover:scale-110 ${compared ? 'text-[#2463d1]' : 'text-text-main hover:bg-[#2463d1] hover:text-white'}`}
          >
            <Repeat size={15} />
          </button>
          <button title="Quick View" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-main shadow-md hover:bg-[#2463d1] hover:text-white transition-all transform hover:scale-110">
            <Search size={15} />
          </button>
        </div>

        {/* Quick Add To Cart - Slide from bottom */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
          className="absolute bottom-0 left-0 right-0 py-3 bg-[#2463d1] text-white text-[10px] font-black uppercase tracking-[0.2em] translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2"
        >
          <ShoppingCart size={14} />
          Add to Cart
        </button>
      </div>

      {/* Product Info Section */}
      <div className="flex flex-col p-3 md:p-4 flex-1">
        <div className="mb-1 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] text-[#aaa] hover:text-[#2463d1] transition-colors cursor-pointer">
          {product.category}
        </div>
        <Link to={themePath(`product/${product.id}`)} className="block mb-1 md:mb-2 text-left">
          <h3 className="line-clamp-2 text-[12px] md:text-[14px] font-bold text-[#101010] group-hover:text-[#2463d1] transition-colors cursor-pointer leading-tight h-[32px] md:h-[40px] overflow-hidden">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center gap-0.5 mb-2 md:mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star 
              key={i} 
              size={8} 
              className={i < product.rating ? "fill-[#EABE12] text-[#EABE12]" : "fill-gray-200 text-gray-200"} 
            />
          ))}
          {product.reviews !== undefined && (
            <span className="ml-1 text-[8px] md:text-[10px] text-text-muted">({product.reviews})</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 mt-auto pt-2 border-t border-gray-50 flex-wrap">
          <div className="flex items-center gap-1.5">
            {product.oldPrice && (
              <span className="text-[10px] md:text-[12px] text-text-muted line-through font-medium">{formatMoney(product.oldPrice, store.currency)}</span>
            )}
            <span className="text-[13px] md:text-[15px] font-black text-[#2463d1]">{formatMoney(product.price, store.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
