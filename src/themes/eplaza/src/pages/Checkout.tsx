import React from 'react';
import { ChevronDown, X, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { formatMoney } from '../lib/utils';

export const Checkout = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { createOrder, store, themePath } = useStorefrontRuntime();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState('');
  const shippingCost = cart.length > 0 ? 20 : 0;
  const totalWithShipping = cartTotal + shippingCost;
  const freeShippingThreshold = 3500;
  const distanceToFree = Math.max(0, freeShippingThreshold - cartTotal);
  const freeShippingProgress = Math.min(100, (cartTotal / freeShippingThreshold) * 100);

  const handlePlaceOrder = async () => {
    if (!cart.length) {
      setError('Your cart is empty.');
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const order = await createOrder({
        shipping: {
          source: 'eplaza-checkout'
        },
        payment: {
          method: 'cod',
          status: 'pending'
        }
      });
      navigate(`${themePath('track-order')}?order=${encodeURIComponent(order.number || order.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen pb-20">
      {/* Header Progress Bar - Exactly as screenshot */}
      <div className="bg-[#2463d1] py-14 mb-10">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-6 text-[22px] font-bold uppercase tracking-[0.1em]">
                <span className="text-white/40 cursor-pointer hover:text-white transition-colors">Shopping Cart</span>
                <span className="text-[18px] text-white/30 font-light translate-y-[-1px]">→</span>
                <span className="text-white border-b-2 border-white pb-1">Checkout</span>
                <span className="text-[18px] text-white/30 font-light translate-y-[-1px]">→</span>
                <span className="text-white/40">Order Complete</span>
            </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        {error && <div className="mb-6 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
        {/* Top Notices - Woodmart Style */}
        <div className="space-y-3 mb-12">
            <div className="flex items-center text-[15px] text-[#101010]/70 py-4 px-6 border-l-2 border-primary bg-white rounded-sm shadow-sm">
                <span>Returning customer? <button className="text-[#2463d1] font-bold hover:underline ml-1">Click here to login</button></span>
            </div>
            <div className="flex items-center text-[15px] text-[#101010]/70 py-4 px-6 border-l-2 border-primary bg-white rounded-sm shadow-sm">
                <span>Have a coupon? <button className="text-[#2463d1] font-bold hover:underline ml-1">Click here to enter your code</button></span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form & Payment */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Billing Details */}
            <div className="bg-white p-6 md:p-10 rounded-sm border border-gray-100 shadow-sm">
                <h2 className="text-[20px] font-extrabold mb-10 text-[#101010]/90 uppercase tracking-wide">Billing Details</h2>
                
                <form className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">First name <span className="text-red-500 font-bold">*</span></label>
                            <input type="text" className="w-full border border-gray-200 rounded-sm h-[50px] px-5 focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd]" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">Last name <span className="text-red-500 font-bold">*</span></label>
                            <input type="text" className="w-full border border-gray-200 rounded-sm h-[50px] px-5 focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">Phone <span className="text-red-500 font-bold">*</span></label>
                            <input type="text" className="w-full border border-gray-200 rounded-sm h-[50px] px-5 focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd]" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">Email address <span className="text-red-500 font-bold">*</span></label>
                            <input type="email" className="w-full border border-gray-200 rounded-sm h-[50px] px-5 focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">Country / Region <span className="text-red-500 font-bold">*</span></label>
                            <div className="relative">
                                <select className="w-full border border-gray-200 rounded-sm h-[50px] px-5 appearance-none focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd] cursor-pointer">
                                    <option>Select a country / region...</option>
                                    <option>United States (US)</option>
                                    <option>United Kingdom (UK)</option>
                                    <option>Bangladesh</option>
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">Town / City <span className="text-red-500 font-bold">*</span></label>
                            <input type="text" className="w-full border border-gray-200 rounded-sm h-[50px] px-5 focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">Street address <span className="text-red-500 font-bold">*</span></label>
                            <input type="text" placeholder="House number and street name" className="w-full border border-gray-200 rounded-sm h-[50px] px-5 focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd]" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[14px] font-bold text-text-main">Postcode / ZIP <span className="text-red-500 font-bold">*</span></label>
                            <input type="text" className="w-full border border-gray-200 rounded-sm h-[50px] px-5 focus:border-[#2463d1] outline-none transition-colors bg-[#fdfdfd]" />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                            <span className="text-[14px] text-[#101010]/70 group-hover:text-text-main transition-colors">Create an account?</span>
                        </label>
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                            <span className="text-[14px] text-[#101010]/70 group-hover:text-text-main transition-colors">Ship to a different address?</span>
                        </label>
                    </div>

                    <div className="space-y-3 pt-6">
                        <label className="text-[14px] font-bold text-text-main">Order notes <span className="text-text-muted font-normal text-[11px] uppercase ml-1 italic tracking-wider">(optional)</span></label>
                        <textarea placeholder="Notes about your order, e.g. special notes for delivery." className="w-full border border-gray-200 rounded-sm p-5 min-h-[160px] focus:border-[#2463d1] outline-none transition-colors text-[15px] bg-[#fdfdfd]"></textarea>
                    </div>
                </form>
            </div>

            {/* Payment Information */}
            <div className="bg-white p-6 md:p-10 rounded-sm border border-gray-100 shadow-sm">
                <h2 className="text-[20px] font-extrabold mb-10 text-[#101010]/90 uppercase tracking-wide">Payment Information</h2>
                
                <div className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-5">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input type="radio" name="payment" defaultChecked className="w-5 h-5 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                                <span className="text-[15px] font-bold text-[#101010]/90 group-hover:text-[#2463d1] transition-colors">Direct bank transfer</span>
                            </label>
                            <div className="bg-[#f9f9f9] p-6 rounded-sm border border-gray-100 text-[14px] text-text-muted leading-relaxed relative ml-0">
                                <div className="absolute -top-2 left-6 w-4 h-4 bg-[#f9f9f9] border-t border-l border-gray-100 rotate-45" />
                                Make your payment directly into our bank account. Please use your Order ID as the payment reference. Your order will not be shipped until the funds have cleared in our account.
                            </div>
                        </div>
                        
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <input type="radio" name="payment" className="w-5 h-5 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                            <span className="text-[15px] font-bold text-[#101010]/90 group-hover:text-[#2463d1] transition-colors">Check payments</span>
                        </label>
                        
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <input type="radio" name="payment" className="w-5 h-5 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                            <span className="text-[15px] font-bold text-[#101010]/90 group-hover:text-[#2463d1] transition-colors">Cash on delivery</span>
                        </label>
                    </div>

                    <div className="pt-10 border-t border-gray-100/80">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input type="checkbox" className="mt-1 w-5 h-5 rounded border-gray-300 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                            <span className="text-[14px] text-[#101010]/70 group-hover:text-text-main transition-colors leading-relaxed">
                                I have read and agree to the website <button className="text-[#2463d1] font-bold hover:underline">terms and conditions</button> <span className="text-red-500 font-bold">*</span>
                            </span>
                        </label>
                        <button disabled={isProcessing} onClick={handlePlaceOrder} className="w-full mt-10 bg-[#2463d1] text-white py-5 rounded-md font-bold uppercase text-[15px] tracking-widest shadow-lg hover:bg-black transition-all duration-300 disabled:opacity-60">
                            {isProcessing ? 'Processing...' : 'Place Order'}
                        </button>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Column: Order Summary & FAQs */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Your Order */}
            <div className="bg-white p-6 md:p-10 rounded-sm border border-gray-100 shadow-sm">
                <h2 className="text-[20px] font-extrabold mb-10 text-[#101010]/90 uppercase tracking-wide">Your Order</h2>
                
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b border-gray-100/80 uppercase text-[12px] font-black text-text-main tracking-widest">
                            <th className="text-left py-4 font-black">Product</th>
                            <th className="text-right py-4 font-black">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="text-[14px]">
                        {cart.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <ShoppingBag size={50} strokeWidth={1} />
                                        <p className="font-bold uppercase tracking-widest text-[12px]">Your cart is empty</p>
                                        <Link to={themePath()} className="text-primary underline font-black text-[11px] uppercase tracking-widest">Return to shop</Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            cart.map((item) => (
                                <tr key={item.id} className="border-b border-gray-100/80">
                                    <td className="py-8 flex items-start gap-4 text-left">
                                        <div className="relative group cursor-pointer flex-shrink-0">
                                           <button 
                                              onClick={() => removeFromCart(item.id)}
                                              className="absolute -left-2 -top-2 h-5 w-5 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100 text-gray-400 hover:text-red-500 z-10"
                                           >
                                              <X size={12} />
                                           </button>
                                           <div className="w-[70px] h-[70px] bg-[#f9f9f9] rounded-md flex items-center justify-center p-2">
                                              <img src={item.image} className="max-h-full max-w-full object-contain" alt={item.name} />
                                           </div>
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            <Link to={themePath(`product/${item.id}`)} className="font-bold text-[#101010]/80 text-[15px] hover:text-primary transition-colors cursor-pointer leading-tight block">
                                                {item.name}
                                            </Link>
                                            <div className="flex items-center border border-gray-200 rounded-sm h-8 px-1 gap-2 w-fit bg-[#f9f9f9]">
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-primary transition-colors hover:bg-white rounded-sm text-[16px] font-medium"
                                                >
                                                    -
                                                </button>
                                                <span className="text-[12px] font-bold min-w-[12px] text-center">{item.quantity}</span>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-primary transition-colors hover:bg-white rounded-sm text-[16px] font-medium"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-8 text-right font-bold text-text-muted text-[15px]">{formatMoney(item.price * item.quantity, store.currency)}</td>
                                </tr>
                            ))
                        )}
                        <tr className="border-b border-gray-100/80">
                            <td className="py-5 font-bold text-[#101010]/80 text-left uppercase text-[12px] tracking-wider">Subtotal</td>
                            <td className="py-5 text-right font-black text-[#2463d1] text-[16px]">{formatMoney(cartTotal, store.currency)}</td>
                        </tr>
                        <tr className="border-b border-gray-100/80">
                            <td className="py-8 text-left">
                                <p className="font-bold text-[#101010]/80 uppercase text-[12px] tracking-wider">Shipment</p>
                            </td>
                            <td className="py-8">
                                <div className="space-y-3 text-right">
                                    <label className="flex items-center justify-end gap-3 cursor-pointer group">
                                        <span className="text-[14px] text-text-muted group-hover:text-text-main transition-colors">Flat rate: <span className="font-bold text-text-main">{formatMoney(shippingCost, store.currency)}</span></span>
                                        <input type="radio" name="shipment" defaultChecked className="w-4 h-4 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                                    </label>
                                    <label className="flex items-center justify-end gap-3 cursor-pointer group">
                                        <span className="text-[14px] text-text-muted group-hover:text-text-main transition-colors">Local pickup: <span className="font-bold text-text-main">{formatMoney(25, store.currency)}</span></span>
                                        <input type="radio" name="shipment" className="w-4 h-4 text-[#2463d1] focus:ring-[#2463d1] cursor-pointer" />
                                    </label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-8 text-left text-[18px] font-bold text-[#101010]/90 uppercase tracking-widest">Total</td>
                            <td className="py-8 text-right text-[24px] font-black text-[#2463d1]">{formatMoney(totalWithShipping, store.currency)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Free shipping bar as screenshot */}
                <div className="space-y-4 pt-4 border-t border-gray-100/60 text-left">
                    <p className="text-[13px] text-text-muted leading-relaxed">
                        {distanceToFree > 0 ? (
                            <>Add <span className="font-black text-[#2463d1]">{formatMoney(distanceToFree, store.currency)}</span> to cart and get free shipping!</>
                        ) : (
                            <span className="font-black text-[#6ba331]">Your order qualifies for free shipping!</span>
                        )}
                    </p>
                    <div className="h-[7px] bg-[#eef1f6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2463d1] rounded-full transition-all duration-1000 relative" style={{ width: `${freeShippingProgress}%` }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Delivery & Return FAQs */}
            <div className="bg-white p-6 md:p-10 rounded-sm border border-gray-100 shadow-sm">
                <h2 className="text-[20px] font-extrabold mb-8 text-[#101010]/90 uppercase tracking-wide">Delivery & Return</h2>
                
                <div className="space-y-0">
                    {[
                        { q: 'My order hasn’t arrived yet. Where is it?', active: true },
                        { q: 'Do you deliver on public holidays?', active: false },
                        { q: 'Do you deliver to my postcode?', active: false },
                        { q: 'Is next-day delivery available on all orders?', active: false },
                        { q: 'Do I need to be there to sign for delivery?', active: false }
                    ].map((item, i) => (
                        <div key={i} className="border-b border-gray-100 last:border-0">
                            <button className={`w-full flex items-center justify-between text-left py-5 text-[15px] font-bold transition-colors ${item.active ? 'text-[#2463d1]' : 'text-[#101010]/80 hover:text-[#2463d1]'}`}>
                                {item.q}
                                <ChevronDown size={18} className={`transition-transform duration-300 ${item.active ? 'rotate-180' : 'text-gray-300'}`} />
                            </button>
                            {item.active && (
                                <div className="pb-8 text-[14px] text-text-muted leading-relaxed pr-6">
                                    How can you evaluate content without design? No typography, no colors, no layout, no styles, all those things that convey the important signals that go beyond the mere textual, hierarchies of information, weight.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
