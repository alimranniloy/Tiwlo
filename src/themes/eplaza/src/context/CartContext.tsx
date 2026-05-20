import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { toEplazaProduct } from '../lib/utils';
import type { CartItem, Product } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    cartItems,
    addItem,
    removeItem,
    updateQuantity: updateRuntimeQuantity,
    cartTotal,
    cartCount
  } = useStorefrontRuntime();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (product: Product) => {
    addItem(product, 1);
    setIsCartOpen(true);
  };

  const cart = cartItems.map((item, index) => ({
    ...toEplazaProduct(item, index),
    quantity: item.quantity
  })) as CartItem[];

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart: removeItem,
        updateQuantity: updateRuntimeQuantity,
        isCartOpen,
        setIsCartOpen,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
