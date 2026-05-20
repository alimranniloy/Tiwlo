import React, { useState } from "react";
import { formatCurrency } from "../lib/utils";
import { ArrowLeft, ShieldCheck, Truck, CreditCard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

export default function Checkout() {
  const { cartItems: items, cartTotal: total, createOrder, store, themePath } = useStorefrontRuntime();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <Link to={themePath()} className="text-[var(--aura-accent)] font-semibold hover:underline">Return to shopping</Link>
      </div>
    );
  }

  const handlePlaceOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsProcessing(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const order = await createOrder({
        shipping: {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          address: form.get("address"),
          city: form.get("city"),
          phone: form.get("phone")
        },
        payment: {
          method: form.get("payment") || "cod",
          status: "pending"
        }
      });
      navigate(`${themePath("track-order")}?order=${encodeURIComponent(order.number || order.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-4 md:py-8 font-sans pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-6 md:mb-8 p-1 md:p-0">
        <Link to={themePath("cart")} className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-100 transition-colors bg-white/50">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tighter uppercase">Checkout</h1>
      </div>

      {error && <div className="mb-4 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</div>}

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handlePlaceOrder} className="space-y-6">
            <section className="bg-white p-4 md:p-6 rounded-sm border border-gray-100 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 pb-3 md:pb-4 border-b border-gray-50">
                <Truck className="w-4 h-4 md:w-5 md:h-5 text-[var(--aura-accent)]" />
                <h2 className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-widest">Delivery Info</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[11px] font-black text-gray-400 uppercase tracking-wider">First Name</label>
                  <input required name="firstName" type="text" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-sm text-xs md:text-sm focus:border-[var(--aura-accent)] outline-none transition-all placeholder:text-gray-300" placeholder="John" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[11px] font-black text-gray-400 uppercase tracking-wider">Last Name</label>
                  <input required name="lastName" type="text" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-sm text-xs md:text-sm focus:border-[var(--aura-accent)] outline-none transition-all placeholder:text-gray-300" placeholder="Doe" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] md:text-[11px] font-black text-gray-400 uppercase tracking-wider">Shipping Address</label>
                  <input required name="address" type="text" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-sm text-xs md:text-sm focus:border-[var(--aura-accent)] outline-none transition-all placeholder:text-gray-300" placeholder="House 12, Road 4, Sector 7" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[11px] font-black text-gray-400 uppercase tracking-wider">City</label>
                  <input required name="city" type="text" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-sm text-xs md:text-sm focus:border-[var(--aura-accent)] outline-none transition-all placeholder:text-gray-300" placeholder="Dhaka" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[11px] font-black text-gray-400 uppercase tracking-wider">Phone Number</label>
                  <input required name="phone" type="tel" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-sm text-xs md:text-sm focus:border-[var(--aura-accent)] outline-none transition-all placeholder:text-gray-300" placeholder="017xxxxxxxx" />
                </div>
              </div>
            </section>

            <section className="bg-white p-4 md:p-6 rounded-sm border border-gray-100 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 pb-3 md:pb-4 border-b border-gray-50">
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-[var(--aura-accent)]" />
                <h2 className="text-[10px] md:text-sm font-bold text-gray-900 uppercase tracking-widest">Payment</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <label className="relative flex items-center gap-2 md:gap-3 p-3.5 md:p-4 border border-[var(--aura-accent)] bg-orange-50/20 rounded-sm cursor-pointer group transition-all">
                  <input type="radio" name="payment" value="cod" defaultChecked className="w-4 h-4 text-[var(--aura-accent)] focus:ring-[var(--aura-accent)]" />
                  <span className="text-[11px] md:text-sm font-bold text-gray-900 uppercase tracking-tighter">Cash on Delivery</span>
                </label>
                <label className="relative flex items-center gap-2 md:gap-3 p-3.5 md:p-4 border border-gray-50 bg-gray-50/30 rounded-sm cursor-not-allowed opacity-60">
                  <input disabled type="radio" name="payment" className="w-4 h-4 text-gray-300" />
                  <span className="text-[11px] md:text-sm font-bold text-gray-400 uppercase tracking-tighter">Online Payment</span>
                </label>
              </div>
            </section>

            <button
              disabled={isProcessing}
              type="submit"
              className="w-full bg-[var(--aura-accent)] text-white py-4 md:py-5 rounded-sm font-bold text-[11px] md:text-sm uppercase tracking-[0.2em] hover:bg-[var(--aura-accent-dark)] transition-all disabled:opacity-70 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/10"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-40 space-y-6">
            <section className="bg-white p-4 md:p-6 rounded-sm border border-gray-100 space-y-4 md:space-y-6">
              <h2 className="text-[11px] md:text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-50 pb-3 md:pb-4">Order Summary</h2>

              <div className="space-y-4 max-h-[300px] overflow-auto pr-2 scrollbar-hide md:custom-scrollbar">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 border border-gray-100 rounded-sm overflow-hidden shrink-0">
                      <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] md:text-xs font-bold text-gray-800 truncate uppercase tracking-tighter">{item.name}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 md:mt-1 font-bold uppercase">Qty: {item.quantity} x {formatCurrency(item.price, store.currency)}</p>
                    </div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-900 shrink-0">{formatCurrency(item.price * item.quantity, store.currency)}</p>
                  </div>
                ))}
              </div>

              <div className="h-px bg-gray-50" />

              <div className="space-y-2.5 md:space-y-3">
                <div className="flex justify-between text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-tight">
                  <span>Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(total, store.currency)}</span>
                </div>
                <div className="flex justify-between text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-tight">
                  <span>Shipping Fee</span>
                  <span className="text-green-600">FREE</span>
                </div>
                <div className="flex justify-between items-center pt-1 md:pt-2">
                  <span className="text-[11px] md:text-sm font-bold text-gray-900 uppercase">Total Amount</span>
                  <span className="text-lg md:text-xl font-bold text-[var(--aura-accent)] tracking-tighter">{formatCurrency(total, store.currency)}</span>
                </div>
              </div>
            </section>

            <div className="bg-green-50 p-4 rounded-sm border border-green-100 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-[10px] text-green-800 font-medium leading-relaxed uppercase">
                Your data is protected by {store.name} secure 256-bit encryption. Safe and reliable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
