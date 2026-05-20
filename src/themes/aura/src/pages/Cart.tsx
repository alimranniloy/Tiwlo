import { formatCurrency } from "../lib/utils";
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

export default function Cart() {
  const { cartItems: items, removeItem, updateQuantity, cartTotal: total, store, themePath } = useStorefrontRuntime();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 border border-gray-100">
          <ShoppingBag className="w-10 h-10 text-gray-200" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">Your cart is empty</h2>
        <p className="text-gray-500 text-sm mb-8 max-w-xs leading-relaxed">Add some items from our collections to get started!</p>
        <Link to={themePath()} className="bg-[var(--aura-accent)] text-white px-8 py-3 rounded-sm text-xs font-bold uppercase hover:bg-[var(--aura-accent-dark)] transition-all tracking-wider">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto md:px-6 lg:px-8 pb-32 md:pb-6">
      <div className="flex items-center gap-3 mb-6 p-4 md:p-0 md:pt-6">
        <Link to={themePath()} className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-100 transition-colors bg-white/50">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight uppercase tracking-widest">Cart</h1>
        <span className="text-gray-400 font-bold text-[10px] uppercase tracking-tighter">({items.length} items)</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-2 px-4 md:px-0">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex gap-4 p-3 md:p-4 bg-white rounded-sm border border-gray-100"
              >
                <div className="w-20 h-20 md:w-28 md:h-28 bg-gray-50 rounded-sm overflow-hidden shrink-0 border border-gray-50">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-[11px] md:text-[13px] text-gray-800 leading-tight line-clamp-2 uppercase tracking-tighter">
                      {item.name}
                    </h3>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <p className="text-[9px] text-gray-400 mt-1 font-bold uppercase tracking-[0.2em]">{item.category}</p>

                  <div className="mt-auto flex items-end justify-between">
                    <div className="flex flex-col gap-2">
                      <p className="text-[var(--aura-accent)] font-bold text-base md:text-xl tracking-tight">{formatCurrency(item.price, store.currency)}</p>
                    </div>
                    
                    <div className="flex items-center gap-0.5 md:gap-1 bg-gray-50 p-0.5 rounded border border-gray-50">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white text-gray-400 hover:text-[var(--aura-accent)] border border-gray-100 rounded-sm"
                      >
                        <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </button>
                      <span className="w-8 md:w-10 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white text-gray-400 hover:text-[var(--aura-accent)] border border-gray-100 rounded-sm"
                      >
                        <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary Card - Fixed on Mobile Bottom, Regular on Desktop */}
        <div className="lg:col-span-1">
          <div className="md:sticky md:top-40 bg-white md:rounded-sm p-4 md:p-6 space-y-4 md:space-y-6 md:border md:border-gray-100 fixed bottom-[56px] left-0 right-0 z-40 border-t border-gray-100 md:shadow-none">
            <h2 className="hidden md:block text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-50 pb-4">Summary</h2>
            
            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-tight">
                <span>Subtotal</span>
                <span>{formatCurrency(total, store.currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] md:text-sm font-bold text-gray-900 uppercase">Total</span>
                <span className="text-xl md:text-2xl font-bold text-[var(--aura-accent)] tracking-tighter">{formatCurrency(total, store.currency)}</span>
              </div>
            </div>

            <Link 
              to={themePath("checkout")}
              className="block w-full bg-[var(--aura-accent)] text-white py-3.5 md:py-4 rounded-sm font-bold text-[11px] md:text-sm uppercase text-center hover:bg-[var(--aura-accent-dark)] active:scale-[0.98] tracking-[0.2em] shadow-none"
            >
              Checkout Now
            </Link>
          </div>
        </div>
      </div>
    </div>

  );
}
