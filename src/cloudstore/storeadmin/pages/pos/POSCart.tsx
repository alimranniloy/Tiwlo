import { Banknote, CreditCard, Minus, Plus, Trash2, User } from 'lucide-react';
import { CartItem } from './POSPage';

interface POSCartProps {
  cart: CartItem[];
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  checkout: (method: string, total: number) => void;
  checkingOut: boolean;
  currency?: string;
}

export default function POSCart({ cart, updateQty, clearCart, checkout, checkingOut, currency = 'USD' }: POSCartProps) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div className="flex h-full flex-col bg-[#fafafa]">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white p-3">
        <button className="flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50/50 px-2.5 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50">
          <User className="h-4 w-4" /> Walk-in customer
        </button>
        <div className="rounded-sm border border-gray-200 bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500">New POS order</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 border border-gray-200 bg-white p-2.5">
                <div className="h-12 w-12 shrink-0 overflow-hidden border border-gray-100 bg-gray-50">
                  {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 truncate text-sm font-medium text-gray-800">{item.name}</h4>
                  <div className="text-sm font-bold text-gray-900">{currency} {item.price.toFixed(2)}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 rounded-sm border border-gray-200 bg-gray-50 p-0.5">
                    <button onClick={() => updateQty(item.id, -1)} className="rounded-sm p-1 text-gray-600 hover:bg-white"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-[13px] font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="rounded-sm p-1 text-gray-600 hover:bg-white"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="z-10 shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="font-medium text-gray-800">{currency} {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Tax (8%)</span>
            <span className="font-medium text-gray-800">{currency} {tax.toFixed(2)}</span>
          </div>
          <div className="my-3 h-px bg-gray-100" />
          <div className="flex items-end justify-between">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-2xl font-black text-gray-900">{currency} {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <button onClick={() => checkout('cash', total)} disabled={cart.length === 0 || checkingOut} className="flex items-center justify-center gap-2 rounded-sm bg-gray-900 py-3 font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
            <Banknote className="h-4 w-4" /> Cash
          </button>
          <button onClick={() => checkout('card', total)} disabled={cart.length === 0 || checkingOut} className="flex items-center justify-center gap-2 rounded-sm bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <CreditCard className="h-4 w-4" /> Card
          </button>
        </div>
        <button onClick={clearCart} disabled={cart.length === 0 || checkingOut} className="flex w-full items-center justify-center gap-2 rounded-sm border border-red-100 bg-red-50/50 py-2.5 font-bold text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 className="h-4 w-4" /> Clear Cart
        </button>
      </div>
    </div>
  );
}
