import React, { useState } from 'react';
import { ArrowLeft, Grid, List, MoreVertical, Power, ScanLine, Search, Tag, Wifi } from 'lucide-react';
import POSProductGrid from './POSProductGrid';
import POSCart from './POSCart';
import { createStoreOrderWithApi, fetchStoreProductsForAdmin } from '../../../../lib/tiwloApi';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  category: string;
}

export default function POSPage({ store, onExit }: { store?: any; onExit?: () => void }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  React.useEffect(() => {
    if (!store?.id) return;
    setLoadingProducts(true);
    fetchStoreProductsForAdmin(store.id)
      .then((items) => {
        setProducts(items.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          category: String(item.category || 'General'),
          categoryKey: String(item.category || 'General').toLowerCase(),
          stock: Number(item.stock || 0),
          image: item.image || ''
        })));
      })
      .catch((err) => {
        setProducts([]);
        setError(err instanceof Error ? err.message : 'Unable to load POS products');
      })
      .finally(() => setLoadingProducts(false));
  }, [store?.id]);

  const categories = React.useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
    return [{ id: 'all', name: 'All Products' }, ...unique.map((name) => ({ id: String(name).toLowerCase(), name: String(name) }))];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'all' || product.categoryKey === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: any) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }).filter((item) => item.qty > 0));
  };

  const clearCart = () => setCart([]);

  const checkout = async (method: string, total: number) => {
    if (!store?.id || cart.length === 0) return;
    setCheckingOut(true);
    setError('');
    try {
      await createStoreOrderWithApi({
        storeId: store.id,
        status: method === 'cash' || method === 'card' ? 'paid' : 'pending',
        total,
        currency: store.currency || 'USD',
        items: cart.map((item) => ({ productId: item.id, name: item.name, qty: item.qty, price: item.price })),
        payment: { provider: method, status: 'paid', source: 'pos' },
        shipping: { method: 'pos_pickup' }
      });
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create POS order');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen flex-col bg-[#f3f4f6] font-sans">
      <header className="flex shrink-0 items-center justify-between bg-gray-900 px-4 py-3 text-white">
        <div className="flex items-center gap-4">
          {onExit && (
            <button onClick={onExit} className="rounded-sm p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight tracking-tight text-blue-400">{store?.name || 'Store'} POS</h1>
            <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Store ID {store?.id || 'none'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-300">
            <span className="flex items-center gap-1.5"><Wifi className="h-4 w-4 text-green-400" /> Online</span>
            <span className="flex items-center gap-1.5"><Power className="h-4 w-4 text-yellow-400" /> API</span>
          </div>
          <button className="rounded-sm p-2 text-gray-300 transition-colors hover:bg-white/10">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">{error}</div>}

      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        <div className="flex flex-1 flex-col overflow-hidden border border-gray-200 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-3">
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Scan barcode or search by name / SKU..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-sm border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-gray-500 hover:bg-gray-100">
                <ScanLine className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-sm p-2 text-gray-500 hover:bg-gray-200"><List className="h-5 w-5" /></button>
              <button className="rounded-sm border border-blue-200 bg-blue-50 p-2 text-blue-600"><Grid className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-48 overflow-y-auto border-r border-gray-200 bg-gray-50">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex w-full items-center gap-3 border-l-4 px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeCategory === category.id ? 'border-blue-600 bg-white text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Tag className={`h-4 w-4 ${activeCategory === category.id ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="truncate">{category.name}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-3">
              {loadingProducts ? (
                <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">Loading products from API...</div>
              ) : (
                <POSProductGrid products={filteredProducts} onAdd={addToCart} />
              )}
            </div>
          </div>
        </div>

        <div className="w-[420px] shrink-0 overflow-hidden border border-gray-200 bg-white">
          <POSCart cart={cart} updateQty={updateQty} clearCart={clearCart} checkout={checkout} checkingOut={checkingOut} currency={store?.currency || 'USD'} />
        </div>
      </div>
    </div>
  );
}
