import React from 'react';
import { Bell, Search } from 'lucide-react';
import { fetchStoreOrdersForAdmin } from '../../../lib/tiwloApi';
import CurrencySwitcher from '../../../components/CurrencySwitcher';
import {
  chooseCurrencyForStorage,
  currencySelectionStorageKey,
  DEFAULT_CURRENCY_POLICY,
  normalizeCurrencyPolicy,
  readStoredCurrencySelection
} from '../../../lib/currency';

export default function Header({ store }: { store?: any }) {
  const [newOrders, setNewOrders] = React.useState(0);
  const currencyPolicy = React.useMemo(
    () => normalizeCurrencyPolicy(store?.settings?.currencyPolicy || DEFAULT_CURRENCY_POLICY),
    [store?.settings?.currencyPolicy]
  );
  const currencyStorageKey = currencySelectionStorageKey('store-admin', store?.id || 'primary');
  const [selectedCurrency, setSelectedCurrency] = React.useState(() => chooseCurrencyForStorage(currencyPolicy, currencyStorageKey));

  React.useEffect(() => {
    let mounted = true;
    if (!store?.id) return;
    fetchStoreOrdersForAdmin(store.id)
      .then((orders) => {
        if (!mounted) return;
        setNewOrders(orders.filter((order) => ['pending', 'paid', 'processing'].includes(String(order.status || '').toLowerCase())).length);
      })
      .catch(() => mounted && setNewOrders(0));
    return () => {
      mounted = false;
    };
  }, [store?.id]);

  React.useEffect(() => {
    const next = chooseCurrencyForStorage(currencyPolicy, currencyStorageKey);
    setSelectedCurrency(readStoredCurrencySelection(currencyStorageKey, currencyPolicy) || next);
  }, [currencyPolicy, currencyStorageKey, store?.id]);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
         <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-300 rounded text-sm transition-all outline-none"
            />
         </div>
      </div>
      
      <div className="flex items-center gap-4">
         <CurrencySwitcher
           policy={currencyPolicy}
           storageKey={currencyStorageKey}
           value={selectedCurrency}
           onChange={setSelectedCurrency}
           scope="store-admin"
           scopeId={store?.id}
           compact
           className="h-8 rounded-sm shadow-none"
         />
         <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-sm border border-gray-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store?.status || 'active'}</span>
         </div>
         <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-sm transition-colors relative">
            <Bell className="h-4.5 w-4.5" />
            {newOrders > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white ring-2 ring-white">
                {newOrders > 9 ? '9+' : newOrders}
              </span>
            )}
         </button>
         <div className="h-8 w-8 bg-black rounded-sm flex items-center justify-center text-white text-[10px] font-black">{String(store?.name || 'S').slice(0, 2).toUpperCase()}</div>
      </div>
    </header>
  );
}
