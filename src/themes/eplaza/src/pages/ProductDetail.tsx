import React from 'react';
import { Star, Heart, Repeat, Share2, Info, Truck, ShieldCheck, ArrowRightLeft, ShoppingCart, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { eplazaBanners } from '../themeData';
import { formatMoney, toEplazaProduct, toEplazaProducts } from '../lib/utils';

export const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isCompared, productById, products, reviewsForProduct, store, themePath, toggleCompare } = useStorefrontRuntime();
  const [quantity, setQuantity] = React.useState(1);
  const baseProduct = productById(id) || products[0];

  if (!baseProduct) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-white px-4 text-center">
        <div>
          <h1 className="text-2xl font-black uppercase text-[#101010]">Product not found</h1>
          <Link to={themePath('search')} className="mt-4 inline-flex text-sm font-bold text-primary underline">Back to catalog</Link>
        </div>
      </div>
    );
  }

  const product = toEplazaProduct(baseProduct);
  const images = [product.image, ...(product.images || [])].filter(Boolean).filter((image, index, rows) => rows.indexOf(image) === index);
  const relatedProducts = toEplazaProducts(products.filter((item) => item.id !== product.id)).slice(0, 5);
  const productReviews = reviewsForProduct(baseProduct).slice(0, 3);
  const reviewAverage = productReviews.length
    ? productReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / productReviews.length
    : product.rating;

  const addQuantityToCart = () => {
    for (let i = 0; i < quantity; i += 1) addToCart(product);
  };
  const buyNow = () => {
    addQuantityToCart();
    navigate(themePath('checkout'));
  };
  const compared = isCompared(product.id);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 bg-[#f9f9f9] py-3">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <div className="flex items-center gap-2 text-[12px] font-medium text-text-muted">
            <Link to={themePath()} className="transition-colors hover:text-primary">Home</Link>
            <ChevronRight size={12} />
            <Link to={themePath(`category/${encodeURIComponent(product.category)}`)} className="transition-colors hover:text-primary">{product.category}</Link>
            <ChevronRight size={12} />
            <span className="truncate text-text-main">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 md:flex-row lg:col-span-7">
            <div className="order-2 flex max-h-[500px] gap-4 overflow-x-auto custom-scrollbar md:order-1 md:flex-col md:overflow-y-auto">
              {images.slice(0, 4).map((image, index) => (
                <button key={image} className={`flex h-24 w-24 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 p-2 transition-all ${index === 0 ? 'border-primary' : 'border-gray-100 hover:border-gray-200'}`}>
                  <img src={image} className="max-h-full max-w-full object-contain" alt={`${product.name} view ${index + 1}`} />
                </button>
              ))}
            </div>

            <div className="group relative order-1 flex flex-1 items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 md:order-2">
              <img src={product.image} className="max-h-[500px] w-auto object-contain transition-transform duration-500 group-hover:scale-105" alt={product.name} />
              {product.oldPrice && <div className="absolute right-6 top-6 rounded-full bg-[#f44336] px-3 py-1 text-[11px] font-bold text-white">{product.tag?.label || 'SALE'}</div>}
              <div className="absolute bottom-6 right-6 cursor-pointer text-text-muted transition-colors hover:text-primary">
                <Repeat size={20} />
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-[#101010]/90">{product.name}</h1>
              <div className="mt-4 flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={14} className={index < Math.round(product.rating) ? 'fill-[#EABE12] text-[#EABE12]' : 'text-gray-200'} />
                    ))}
                  </div>
                  <span className="text-[13px] font-medium text-text-muted">({product.reviews} customer reviews)</span>
                </div>
                <div className="text-[13px] text-text-muted">
                  <span className="font-bold uppercase tracking-tight text-[#101010]/70">SKU:</span> {product.sku}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#ceddf5] bg-[#f0f5ff] p-5">
              <div>
                <h4 className="text-[14px] font-bold text-[#101010]/90">Connected Store Offer</h4>
                <p className="text-[12px] text-text-muted">Pricing and stock are loaded from {store.name}'s product API.</p>
              </div>
              <span className="rounded bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-main shadow-sm">Live</span>
            </div>

            <div className="flex items-baseline gap-4">
              {product.oldPrice && <span className="text-2xl font-medium text-text-muted line-through">{formatMoney(product.oldPrice, store.currency)}</span>}
              <span className="text-4xl font-black text-primary">{formatMoney(product.price, store.currency)}</span>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex h-11 items-center gap-6 rounded-full border-2 border-gray-100 px-6">
                <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="text-lg font-bold text-text-muted transition-colors hover:text-[#2463d1]">-</button>
                <span className="min-w-[1ch] text-center text-sm font-bold">{quantity}</span>
                <button onClick={() => setQuantity((value) => value + 1)} className="text-lg font-bold text-text-muted transition-colors hover:text-[#2463d1]">+</button>
              </div>
              <button onClick={addQuantityToCart} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#2463d1] text-[12px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:opacity-90">
                Add to Cart
              </button>
              <button onClick={buyNow} className="flex h-11 flex-1 items-center justify-center rounded-full bg-[#6ba331] text-[12px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:opacity-90">
                Buy Now
              </button>
            </div>

            <div className="flex items-center gap-6 border-b border-gray-100 pb-6 pt-2 text-[12px] font-bold uppercase tracking-wider text-[#101010]/70">
              <button onClick={() => toggleCompare(product)} className={`flex items-center gap-2 transition-colors hover:text-primary ${compared ? 'text-primary' : ''}`}>
                <ArrowRightLeft size={16} /> {compared ? 'Compared' : 'Compare'}
              </button>
              <button className="flex items-center gap-2 transition-colors hover:text-primary"><Heart size={16} /> Add to wishlist</button>
              <div className="ml-auto flex items-center gap-2">
                <span className="font-medium lowercase text-text-muted">Share:</span>
                <Share2 size={14} className="cursor-pointer hover:text-primary" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 text-[13px]">
              <div className="flex items-center justify-between border-b border-gray-50 bg-[#fbfbfb] p-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart size={16} className="text-primary" />
                  <span className="font-bold text-[#101010]/80">Pick up from {store.name}</span>
                </div>
                <span className="font-bold text-[#6ba331]">Free</span>
              </div>
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <Truck size={16} className="mt-1 text-primary" />
                    <div>
                      <p className="font-bold text-[#101010]/80">Courier delivery</p>
                      <p className="text-[12px] text-text-muted">Our courier will deliver to the specified address</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-text-muted">2-3 Days</p>
                    <p className="font-bold text-[#6ba331]">Free</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-y border-gray-100 px-2 py-4 text-[13px] font-bold italic text-[#101010]/80">
              <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-primary" /> Warranty 1 year</div>
              <div className="flex items-center gap-3"><Repeat size={18} className="text-primary" /> Free 30-Day returns</div>
            </div>

            <div className="flex items-center justify-center gap-2 opacity-80">
              <img src={eplazaBanners.payments} className="h-5" alt="Payment methods" />
            </div>
          </div>
        </div>

        <div className="mt-20">
          <div className="flex items-center justify-center gap-12 border-t border-gray-100 text-[13px] font-bold uppercase tracking-[0.2em] text-text-muted">
            <button className="border-t-2 border-primary py-6 text-text-main">Description</button>
            <button className="border-t-2 border-transparent py-6 transition-colors hover:text-text-main">Specification</button>
            <button className="border-t-2 border-transparent py-6 transition-colors hover:text-text-main">Reviews ({productReviews.length || product.reviews})</button>
          </div>

          <div className="grid grid-cols-1 gap-12 pt-16 lg:grid-cols-12">
            <div className="space-y-10 lg:col-span-8">
              <div className="space-y-6 text-center">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.3em] text-text-muted">Description</h2>
                <h3 className="text-5xl font-bold text-[#101010]/90">{product.name}</h3>
                <p className="mx-auto max-w-3xl text-lg leading-relaxed text-text-muted">{product.description}</p>
                <img src={product.image} className="mx-auto max-h-[380px] rounded-3xl object-contain" alt={product.name} />
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-8 rounded-2xl border border-gray-100 bg-white p-8">
                <h3 className="border-b border-gray-100 pb-4 text-xl font-bold uppercase tracking-wider">Specification</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Category', product.category],
                      ['Stock', `${product.stock} available`],
                      ['Rating', product.rating.toFixed(1)],
                      ['Currency', store.currency]
                    ].map(([label, value]) => (
                      <tr key={label} className="border-b border-gray-100">
                        <td className="py-3 text-text-muted">{label}</td>
                        <td className="py-3 text-right font-bold">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Info size={18} /> Storefront product record
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 border-t border-gray-100 pt-20">
          <h2 className="mb-12 text-3xl font-bold">Customer Reviews</h2>
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            <div className="flex flex-col items-center text-center lg:col-span-4">
              <div className="text-6xl font-black text-[#101010]/90">{reviewAverage.toFixed(1)}</div>
              <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={20} className={index < Math.round(reviewAverage) ? 'fill-[#EABE12] text-[#EABE12]' : 'text-gray-200'} />)}
              </div>
              <p className="mt-2 font-bold text-text-muted">{productReviews.length || product.reviews} reviews</p>
            </div>

            <div className="space-y-6 lg:col-span-8">
              {productReviews.map((review) => (
                <div key={review.id} className="rounded-3xl bg-[#f9f9f9] p-8 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-[15px] font-bold">{review.user}</h5>
                      <p className="text-[12px] text-text-muted">{review.date}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={12} className={index < review.rating ? 'fill-[#EABE12] text-[#EABE12]' : 'text-gray-200'} />)}
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] italic leading-relaxed text-text-muted">"{review.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-32">
          <h2 className="mb-10 text-3xl font-bold">Related Products</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {relatedProducts.map((product) => (
              <Link key={product.id} to={themePath(`product/${product.id}`)} className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:shadow-xl">
                <div className="relative mb-4 flex aspect-square items-center justify-center p-4">
                  <img src={product.image} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110" alt={product.name} />
                </div>
                <div className="space-y-1 text-center">
                  <h4 className="line-clamp-1 text-[14px] font-bold">{product.name}</h4>
                  <p className="text-[12px] text-text-muted">{product.category}</p>
                  <p className="mt-2 text-[15px] font-black text-primary">{formatMoney(product.price, store.currency)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
