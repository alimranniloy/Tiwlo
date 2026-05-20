import React from 'react';
import { Plus } from 'lucide-react';

interface ProductGridProps {
  products: any[];
  onAdd: (product: any) => void;
}

export default function POSProductGrid({ products, onAdd }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
        <p>No products found in this category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {products.map(product => (
        <button 
          key={product.id}
          onClick={() => onAdd(product)}
          className="bg-white p-2.5 rounded-sm border border-gray-200 hover:border-blue-500 transition-all text-left group flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 bg-gray-100/90 text-[10px] font-bold px-1.5 py-0.5 rounded-sm text-gray-600 z-10 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors backdrop-blur-sm border border-black/5">
            {product.stock} left
          </div>
          
          <div className="aspect-square rounded-sm bg-gray-50 mb-2.5 overflow-hidden flex items-center justify-center">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform" />
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">No image</span>
            )}
          </div>
          
          <h3 className="text-[13px] font-medium text-gray-800 line-clamp-2 mb-1 flex-1 leading-snug">{product.name}</h3>
          
          <div className="flex items-center justify-between mt-2">
             <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
             <div className="w-6 h-6 rounded-sm bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
             </div>
          </div>
        </button>
      ))}
    </div>
  );
}
