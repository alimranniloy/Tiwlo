import React from 'react';
import { Package, ArrowRight, Info, CheckCircle2, Clock, Truck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';

export const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const { findOrder, store } = useStorefrontRuntime();
  const [orderId, setOrderId] = React.useState(searchParams.get('order') || '');
  const [order, setOrder] = React.useState<any | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'found' | 'missing'>('idle');

  const runTrack = React.useCallback((value: string) => {
    if (!value.trim()) return;
    const found = findOrder(value);
    setOrder(found);
    setStatus(found ? 'found' : 'missing');
  }, [findOrder]);

  React.useEffect(() => {
    const fromQuery = searchParams.get('order');
    if (fromQuery) runTrack(fromQuery);
  }, [runTrack, searchParams]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runTrack(orderId);
  };

  const normalizedStatus = String(order?.status || 'processing').toLowerCase();
  const shipped = ['shipped', 'in_transit', 'delivered', 'completed', 'fulfilled'].includes(normalizedStatus);
  const delivered = ['delivered', 'completed', 'fulfilled'].includes(normalizedStatus);

  return (
    <div className="min-h-screen bg-[#f9f9f9] pb-20">
      <div className="mb-10 border-b border-gray-100 bg-white py-12 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-4 text-center lg:px-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#101010] lg:text-4xl">Track Your Order</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
            Enter your Order ID below. Eplaza checks the same store order records created from checkout.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[600px] px-4">
        <form onSubmit={handleSubmit} className="space-y-8 rounded-sm border border-gray-100 bg-white p-8 shadow-sm md:p-12">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-black uppercase tracking-widest text-[#101010]">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="Found in your confirmation email."
                className="h-12 w-full rounded-sm border-2 border-gray-100 px-5 text-[15px] font-medium outline-none transition-all focus:border-[#2463d1]"
              />
            </div>
          </div>

          <button className="flex w-full items-center justify-center gap-3 rounded-sm bg-[#2463d1] py-4 text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-100 transition-all hover:bg-black active:scale-95">
            Track Order
            <ArrowRight size={16} />
          </button>

          {status === 'missing' && (
            <div className="flex items-start gap-4 rounded-sm border border-amber-100 bg-amber-50 p-5 text-[13px] leading-relaxed text-amber-700">
              <Info size={20} className="flex-shrink-0" />
              <p>No matching order was found for {store.name}. Check the ID and try again.</p>
            </div>
          )}

          {status === 'found' && (
            <div className="space-y-6 rounded-sm border border-blue-50 bg-[#f8faff] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Order</p>
                  <p className="text-sm font-black text-[#101010]">{order.number || order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</p>
                  <p className="text-sm font-black uppercase text-primary">{order.status || 'Processing'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Placed', done: true, Icon: CheckCircle2 },
                  { label: 'Processing', done: true, Icon: Clock },
                  { label: delivered ? 'Delivered' : shipped ? 'Shipped' : 'Shipping', done: shipped || delivered, Icon: shipped || delivered ? Truck : Package }
                ].map(({ label, done, Icon }) => (
                  <div key={label} className={`rounded-sm border p-4 text-center ${done ? 'border-blue-100 bg-white text-primary' : 'border-gray-100 bg-white/60 text-gray-300'}`}>
                    <Icon className="mx-auto mb-2 h-5 w-5" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
