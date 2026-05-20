import React, { useEffect, useState } from "react";
import { Package, Search, Truck, CheckCircle2, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "react-router-dom";
import { useStorefrontRuntime } from "../../../shared/storefrontRuntime";

type TrackStatus = "idle" | "searching" | "found" | "missing";

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const { findOrder, store } = useStorefrontRuntime();
  const [orderId, setOrderId] = useState(searchParams.get("order") || "");
  const [status, setStatus] = useState<TrackStatus>("idle");
  const [order, setOrder] = useState<any | null>(null);

  const runTrack = (value: string) => {
    if (!value.trim()) return;
    setStatus("searching");
    const found = findOrder(value);
    window.setTimeout(() => {
      setOrder(found);
      setStatus(found ? "found" : "missing");
    }, 350);
  };

  useEffect(() => {
    const fromQuery = searchParams.get("order");
    if (fromQuery) runTrack(fromQuery);
  }, [searchParams]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    runTrack(orderId);
  };

  const normalizedStatus = String(order?.status || "processing").toLowerCase();
  const placed = true;
  const processing = ["processing", "paid", "fulfilled", "shipped", "delivered", "completed"].includes(normalizedStatus);
  const shipped = ["shipped", "in_transit", "delivered", "completed", "fulfilled"].includes(normalizedStatus);
  const delivered = ["delivered", "completed", "fulfilled"].includes(normalizedStatus);
  const steps = [
    { title: "Order Placed", date: order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Just now", icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, completed: placed },
    { title: "Processing", date: processing ? "Confirmed" : "Pending", icon: <Clock className="w-5 h-5 text-[var(--aura-accent)]" />, completed: processing },
    { title: "Shipped", date: shipped ? "On the way" : "Waiting dispatch", icon: <Truck className="w-5 h-5 text-gray-300" />, completed: shipped },
    { title: "Delivered", date: delivered ? "Delivered" : "Estimated soon", icon: <Package className="w-5 h-5 text-gray-300" />, completed: delivered },
  ];

  return (
    <div className="max-w-3xl mx-auto px-2 md:px-4 py-4 md:py-12 font-sans pb-24 md:pb-12">
      <div className="bg-white p-5 md:p-8 rounded-sm border border-gray-100 space-y-6 md:space-y-8">
        <div className="text-center space-y-1.5 md:space-y-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tighter uppercase">Track Order</h1>
          <p className="text-[10px] md:text-sm text-gray-500 uppercase font-bold tracking-tight">Enter your order ID below</p>
        </div>

        <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. TW123456"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-sm text-xs outline-none focus:border-[var(--aura-accent)] transition-all"
            />
          </div>
          <button className="bg-[var(--aura-accent)] text-white px-8 py-3 rounded-sm font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-[var(--aura-accent-dark)] transition-all">
            Track Now
          </button>
        </form>

        {status === "searching" && (
          <div className="flex flex-col items-center py-12 space-y-4">
             <div className="w-8 h-8 border-2 border-[var(--aura-accent)] border-t-transparent rounded-full animate-spin" />
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Searching database...</p>
          </div>
        )}

        {status === "missing" && (
          <div className="rounded-sm border border-amber-100 bg-amber-50 p-5 text-center text-xs font-bold uppercase tracking-wider text-amber-700">
            No matching order was found for this store.
          </div>
        )}

        {status === "found" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pt-6 border-t border-gray-50"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Courier</p>
                <p className="text-sm font-bold text-gray-900">{store.name} Logistics</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status</p>
                <p className="text-sm font-bold text-orange-500">{order?.status || "Processing"}</p>
              </div>
            </div>

            <div className="relative space-y-6 md:space-y-8">
              <div className="absolute left-[9px] md:left-2.5 top-2 bottom-2 w-[1px] bg-gray-100" />

              {steps.map((step, i) => (
                <div key={i} className="relative flex items-center gap-4 md:gap-6">
                  <div className={`relative z-10 w-[19px] h-[19px] md:w-5 md:h-5 rounded-full flex items-center justify-center bg-white border-2 ${step.completed ? 'border-green-500' : 'border-gray-100'}`}>
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-100'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-[11px] md:text-sm font-bold uppercase tracking-tight ${step.completed ? 'text-gray-900' : 'text-gray-300'}`}>{step.title}</h3>
                    <p className={`text-[9px] md:text-[10px] uppercase font-bold mt-0.5 ${step.completed ? 'text-gray-400' : 'text-gray-200'}`}>{step.date}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-sm border border-blue-100 flex gap-3 text-blue-800">
               <Truck className="w-5 h-5 shrink-0" />
               <p className="text-[10px] font-bold uppercase leading-relaxed">Order {order?.number || order?.id} is connected to the live store order database for {store.name}.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
