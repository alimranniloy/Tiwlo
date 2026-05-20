import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { formatMoney } from '../lib/utils';

export const CartDrawer = () => {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { store, themePath } = useStorefrontRuntime();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-[400px] bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary" />
                <h2 className="text-lg font-bold uppercase tracking-widest text-[#101010]/90">Shopping Cart</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <ShoppingBag size={60} strokeWidth={1} />
                  <p className="text-sm font-medium uppercase tracking-widest">Your cart is empty</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs font-bold text-primary underline underline-offset-4"
                  >
                    RETURN TO SHOP
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    <div className="h-20 w-20 flex-shrink-0 bg-[#f9f9f9] rounded-sm p-2 flex items-center justify-center">
                      <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <Link
                          to={themePath(`product/${item.id}`)}
                          onClick={() => setIsCartOpen(false)}
                          className="text-[13px] font-bold text-[#101010]/80 hover:text-primary transition-colors line-clamp-2"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-sm h-7 px-1 gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary transition-colors font-bold"
                          >
                            -
                          </button>
                          <span className="text-[11px] font-bold min-w-[12px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary transition-colors font-bold"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-[13px] font-black text-primary">{formatMoney(item.price * item.quantity, store.currency)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 bg-[#f9f9f9] space-y-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold uppercase tracking-widest text-text-muted">Subtotal:</span>
                  <span className="text-xl font-black text-primary">{formatMoney(cartTotal, store.currency)}</span>
                </div>
                <div className="space-y-3">
                  <Link
                    to={themePath('checkout')}
                    onClick={() => setIsCartOpen(false)}
                    className="block w-full text-center bg-primary text-white py-4 rounded-sm font-bold uppercase text-[12px] tracking-widest shadow-lg hover:bg-black transition-all"
                  >
                    Checkout
                  </Link>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="block w-full text-center bg-white border border-gray-200 text-text-main py-3 rounded-sm font-bold uppercase text-[11px] tracking-widest hover:bg-gray-50 transition-all"
                  >
                    View Cart
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
