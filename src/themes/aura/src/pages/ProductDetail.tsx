import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "../lib/utils";
import { ArrowLeftRight, Star, ShoppingCart, ShieldCheck, Truck, RefreshCw, Heart, Share2, ChevronRight, MessageSquare, ThumbsUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ProductCard from "../components/ProductCard";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, productById, addItem, store, themePath, reviewsForProduct, toggleCompare, isCompared } = useStorefrontRuntime();
  const product = productById(id) || null;
  const relatedProducts = products.filter((item) => item.id !== product?.id).slice(0, 6);
  const productReviews = reviewsForProduct(product);
  const loading = false;
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("Black");
  const [selectedSize, setSelectedSize] = useState("M");
  const [activeTab, setActiveTab] = useState("description");

  React.useEffect(() => {
    setQuantity(1);
    setActiveTab("description");
  }, [id]);

  const colors = [
    { name: "Black", code: "#000000" },
    { name: "Silver", code: "#C0C0C0" },
    { name: "Blue", code: "#0000FF" },
    { name: "Red", code: "#FF0000" }
  ];

  const sizes = ["S", "M", "L", "XL"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-[var(--aura-accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-xl font-bold text-gray-900">Product not found</h2>
        <Link to={themePath()} className="mt-4 text-[var(--aura-accent)] font-bold">Return Home</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity);
  };
  const handleBuyNow = () => {
    addItem(product, quantity);
    navigate(themePath("checkout"));
  };
  const compared = isCompared(product.id);

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-6 lg:px-8 py-0 md:py-8 font-sans pb-24 md:pb-8">
      {/* Breadcrumbs - Desktop Only */}
      <nav className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-500 mb-6">
        <Link to={themePath()} className="hover:text-[var(--aura-accent)]">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={themePath(`category/${encodeURIComponent(product.category)}`)} className="hover:text-[var(--aura-accent)] cursor-pointer">{product.category}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#212121] truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-12 gap-0 md:gap-8 bg-white p-0 md:p-6 rounded-sm border-0 md:border md:border-gray-100">
        {/* Gallery */}
        <div className="lg:col-span-5 space-y-4">
          <div className="aspect-square md:rounded-sm overflow-hidden bg-gray-50 border-b md:border border-gray-100 group relative">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="bg-white p-2 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors"><Heart className="w-4 h-4 text-gray-600" /></button>
               <button className="bg-white p-2 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors"><Share2 className="w-4 h-4 text-gray-600" /></button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`aspect-square rounded-sm bg-gray-50 border ${i === 0 ? 'border-[var(--aura-accent)]' : 'border-gray-100'} cursor-pointer overflow-hidden group`}>
                <img src={product.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 p-4 md:p-0 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
               <span className="bg-[var(--aura-accent)]/10 text-[var(--aura-accent)] text-[10px] font-bold px-2 py-0.5 rounded-sm">Bestseller</span>
               <span className="text-xs text-gray-400 font-medium">{product.category}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#1a9cb7] hover:underline cursor-pointer">{product.reviews} Ratings</span>
              </div>
              <div className="h-3 w-px bg-gray-200" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Sold: </span>
                <span className="text-xs font-semibold text-gray-900">2.4k+</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-[var(--aura-accent)]">{formatCurrency(product.price, store.currency)}</span>
              <div className="flex flex-col">
                <span className="text-sm text-gray-400 line-through font-medium">{formatCurrency(product.compareAtPrice || product.price * 1.25, store.currency)}</span>
                <span className="text-[10px] text-white bg-[var(--aura-accent)] px-1.5 py-0.5 rounded-sm font-bold w-fit mt-0.5">-25% OFF</span>
              </div>
            </div>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
               <Zap className="w-3 h-3 fill-green-600" /> Flash Sale price ends in 04:22:18
            </p>
          </div>

          <div className="space-y-5">
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <h3 className="text-xs font-semibold text-gray-500">Color: <span className="text-gray-900">{selectedColor}</span></h3>
                </div>
                <div className="flex gap-3">
                   {colors.map((color) => (
                      <button 
                         key={color.name}
                         onClick={() => setSelectedColor(color.name)}
                         className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === color.name ? 'border-[var(--aura-accent)]' : 'border-transparent'}`}
                      >
                         <div 
                            className="w-6 h-6 rounded-full border border-black/5" 
                            style={{ backgroundColor: color.code }} 
                         />
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <h3 className="text-xs font-semibold text-gray-500">Size: <span className="text-gray-900">{selectedSize}</span></h3>
                   <button className="text-[10px] font-bold text-[#1a9cb7] underline">Size Chart</button>
                </div>
                <div className="flex gap-2">
                   {sizes.map((size) => (
                      <button 
                         key={size}
                         onClick={() => setSelectedSize(size)}
                         className={`w-10 h-10 flex items-center justify-center font-bold text-xs border rounded-sm transition-all ${selectedSize === size ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                      >
                         {size}
                      </button>
                   ))}
                </div>
             </div>

             <div className="h-px bg-gray-100" />

            <div className="flex items-center gap-4">
               <span className="text-xs text-gray-500 font-semibold w-20">Quantity</span>
               <div className="flex items-center border border-gray-200 rounded-sm">
                 <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-900 hover:bg-gray-100 transition-colors border-r border-gray-200"
                 >
                   -
                 </button>
                 <input 
                  type="text" 
                  value={quantity} 
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-12 h-10 text-center text-sm font-bold border-none bg-white focus:ring-0" 
                 />
                 <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-900 hover:bg-gray-100 transition-colors border-l border-gray-200"
                 >
                   +
                 </button>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <button
                onClick={() => toggleCompare(product)}
                className={`flex items-center justify-center gap-2 border py-3 text-xs font-bold uppercase tracking-wider transition-all ${compared ? 'border-[var(--aura-accent)] bg-orange-50/30 text-[var(--aura-accent)]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-900 hover:text-gray-900'}`}
               >
                 <ArrowLeftRight className="h-4 w-4" />
                 {compared ? 'Compared' : 'Compare'}
               </button>
               <button className="flex items-center justify-center gap-2 border border-gray-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-gray-600 transition-all hover:border-gray-900 hover:text-gray-900">
                 <Heart className="h-4 w-4" />
                 Wishlist
               </button>
             </div>

          <div className="hidden md:grid grid-cols-2 gap-3 pt-4">
            <button onClick={handleBuyNow} className="bg-[#26abd4] text-white py-4 font-bold text-sm hover:bg-[#1a9cb7] transition-all transform active:scale-95">
              Buy Now
            </button>
            <button 
             onClick={handleAddToCart}
             className="bg-[var(--aura-accent)] text-white py-4 font-bold text-sm hover:bg-[var(--aura-accent-dark)] transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </button>
          </div>
       </div>
     </div>

     {/* Sticky Mobile Actions */}
     <div className="md:hidden fixed bottom-[56px] left-0 right-0 z-40 bg-white border-t border-gray-100 p-2.5 flex gap-2">
        <button 
           onClick={handleAddToCart}
           className="flex-1 bg-white border border-[var(--aura-accent)] text-[var(--aura-accent)] py-3 rounded-sm font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-transform"
        >
           Add to Cart
        </button>
        <button onClick={handleBuyNow} className="flex-1 bg-[var(--aura-accent)] text-white py-3 rounded-sm font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-transform">
           Buy Now
        </button>
     </div>

        {/* Shipping & Seller */}
        <div className="lg:col-span-3 bg-[#fafafa] p-4 md:p-5 space-y-6 md:space-y-8 border-t md:border-t-0 md:border-l border-gray-100">
           <div className="space-y-4 md:space-y-5">
             <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Delivery Details</h4>
             <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-blue-500" />
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-900">Standard Delivery</p>
                  <p className="text-[11px] text-gray-500 mt-1">Get it by Thursday, 21 May</p>
               </div>
               <span className="ml-auto text-xs font-bold text-green-600">FREE</span>
             </div>
             <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-green-500" />
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-900">14 Day Return</p>
                  <p className="text-[11px] text-gray-500 mt-1">Easy return policy for all users</p>
               </div>
             </div>
             <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-orange-500" />
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-900">1 Year Warranty</p>
                  <p className="text-[11px] text-gray-500 mt-1">Official brand warranty included</p>
               </div>
             </div>
           </div>

           <div className="h-px bg-gray-200" />

           <div className="space-y-5">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sold By</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{store.name}</p>
                  <button className="text-[10px] text-[#1a9cb7] font-bold mt-1 uppercase hover:underline">Chat Seller</button>
                </div>
                <div className="w-12 h-12 bg-white rounded border border-gray-100 flex items-center justify-center font-bold text-xl text-[var(--aura-accent)]">{store.name.slice(0, 2).toUpperCase()}</div>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1">
                 <div className="text-center">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Score</p>
                    <p className="text-xs font-bold text-gray-900">98%</p>
                 </div>
                 <div className="text-center border-x border-gray-200 px-1">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">On Time</p>
                    <p className="text-xs font-bold text-gray-900">100%</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Response</p>
                    <p className="text-xs font-bold text-gray-900">99%</p>
                 </div>
              </div>
              <button className="w-full bg-gray-900 text-white py-2.5 rounded-sm text-xs font-bold hover:bg-black transition-colors uppercase">Visit Official Store</button>
           </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-4 md:mt-8 bg-white border-t md:border border-gray-100 md:rounded-sm overflow-hidden min-h-[500px]">
         <div className="flex border-b border-gray-100 bg-[#fafafa] overflow-x-auto scrollbar-hide">
            {[
               { id: "description", label: "Description" },
               { id: "reviews", label: `Reviews` },
               { id: "shipping", label: "Shipping" }
            ].map((tab) => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase transition-all relative shrink-0 ${activeTab === tab.id ? 'text-[var(--aura-accent)] bg-white border-b-2 border-[var(--aura-accent)]' : 'text-gray-400 hover:text-gray-600'}`}
               >
                  {tab.label}
               </button>
            ))}
         </div>

         <div className="p-4 md:p-10">
            <AnimatePresence mode="wait">
               {activeTab === "description" && (
                  <motion.div 
                     key="description"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="max-w-4xl space-y-10"
                  >
                     <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                        <p className="text-base text-gray-700 leading-7 border-l-4 border-[var(--aura-accent)] pl-6 py-4 bg-orange-50/20">
                           {product.description}
                        </p>
                        <div className="mt-12 grid md:grid-cols-2 gap-12 items-center">
                           <div className="aspect-[4/3] rounded-sm overflow-hidden bg-gray-50 border border-gray-100">
                              <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           </div>
                           <div className="space-y-6">
                              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Key Highlighting Features</h3>
                              <ul className="space-y-4">
                                 {[
                                    "Cutting-edge performance with next-gen technology stack.",
                                    "Premium build quality with aerospace-grade materials.",
                                    "Designed for maximum ergonomics and comfort during use.",
                                    "Eco-friendly packaging and energy-efficient operation."
                                 ].map((feature, i) => (
                                    <li key={i} className="flex gap-4 items-start">
                                       <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                                          <ShieldCheck className="w-3 h-3" />
                                       </div>
                                       <span className="text-sm font-medium text-gray-600">{feature}</span>
                                    </li>
                                 ))}
                              </ul>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               )}

               {activeTab === "reviews" && (
                  <motion.div 
                     key="reviews"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="space-y-10"
                  >
                     <div className="flex flex-col md:flex-row gap-12 border-b border-gray-100 pb-10">
                        <div className="text-center md:text-left space-y-2">
                           <h3 className="text-5xl font-bold text-gray-900 tracking-tight">{product.rating.toFixed(1)}<span className="text-2xl text-gray-300">/5</span></h3>
                           <div className="flex items-center justify-center md:justify-start gap-1">
                              {[...Array(5)].map((_, i) => (
                                 <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                              ))}
                           </div>
                           <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{product.reviews} Total Reviews</p>
                        </div>
                        <div className="flex-1 max-w-md space-y-3">
                           {[5,4,3,2,1].map((star) => (
                              <div key={star} className="flex items-center gap-4">
                                 <span className="text-xs font-bold text-gray-500 w-4">{star}</span>
                                 <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-400" style={{ width: `${star === 5 ? 85 : star === 4 ? 10 : 5}%` }} />
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-400 w-8">{star === 5 ? '85%' : star === 4 ? '10%' : '5%'}</span>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-8">
                        {productReviews.map((review) => (
                           <div key={review.id} className="border-b border-gray-100 pb-8 last:border-0">
                              <div className="flex justify-between items-start mb-4">
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                       <span className="text-sm font-bold text-gray-900">{review.user}</span>
                                       <div className="flex items-center gap-0.5">
                                          {[...Array(5)].map((_, i) => (
                                             <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                                          ))}
                                       </div>
                                       <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-bold uppercase border border-green-100">Verified Purchase</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{review.date}</p>
                                 </div>
                                 <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">{review.likes}</span>
                                 </button>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">{review.comment}</p>
                              <div className="flex gap-2 mt-4">
                                 <div className="w-16 h-16 rounded-sm bg-gray-50 border border-gray-100 shrink-0 overflow-hidden cursor-zoom-in">
                                    <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="flex justify-center pt-6">
                        <button className="bg-white border border-gray-200 text-gray-500 px-12 py-3 rounded-sm text-xs font-bold hover:border-gray-900 hover:text-gray-900 transition-all uppercase">Load More Reviews</button>
                     </div>
                  </motion.div>
               )}

               {activeTab === "shipping" && (
                  <motion.div 
                     key="shipping"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="grid md:grid-cols-2 gap-12"
                  >
                     <div className="space-y-8">
                        <section className="space-y-4">
                           <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <Truck className="w-5 h-5 text-[var(--aura-accent)]" /> Shipping Policy
                           </h3>
                           <div className="bg-gray-50 p-6 rounded-sm border border-gray-100 space-y-4">
                              <p className="text-sm text-gray-600 leading-relaxed">
                                 We offer Worldwide Standard Shipping on all orders. Please allow 1-2 business days for processing before your order is dispatched.
                              </p>
                              <ul className="text-xs font-bold text-gray-500 space-y-3 uppercase tracking-wider">
                                 <li>• Domestic: 3-5 Business Days (Free)</li>
                                 <li>• International: 7-14 Business Days ($15.00)</li>
                                 <li>• Express: 24-48 Hours ($25.00)</li>
                              </ul>
                           </div>
                        </section>
                     </div>
                     <div className="space-y-8">
                        <section className="space-y-4">
                           <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <RefreshCw className="w-5 h-5 text-[var(--aura-accent)]" /> Returns & Refunds
                           </h3>
                           <div className="bg-gray-50 p-6 rounded-sm border border-gray-100 space-y-4">
                              <p className="text-sm text-gray-600 leading-relaxed">
                                 Not satisfied with your purchase? No problem. We accept returns within 14 days of delivery for all unworn or unused items.
                              </p>
                              <div className="flex gap-4 pt-2">
                                 <button className="flex-1 bg-white border border-gray-200 text-[10px] font-bold uppercase p-3 hover:border-gray-900 transition-all">Request Return</button>
                                 <button className="flex-1 bg-white border border-gray-200 text-[10px] font-bold uppercase p-3 hover:border-gray-900 transition-all flex items-center justify-center gap-2">
                                    <MessageSquare className="w-3.5 h-3.5" /> Support
                                 </button>
                              </div>
                           </div>
                        </section>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>

      {/* Recommended Section */}
      <section className="mt-16 space-y-8">
         <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">You May Also Like</h2>
            <div className="h-px flex-1 bg-gray-100" />
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {relatedProducts.map((p) => (
               <ProductCard key={p.id} product={p} />
            ))}
         </div>
      </section>
    </div>
  );
}
