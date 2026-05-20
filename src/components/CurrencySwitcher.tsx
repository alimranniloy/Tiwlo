import React from 'react';
import { Check, ChevronDown, Coins } from 'lucide-react';
import {
  chooseCurrencyForStorage,
  getCurrencyInfo,
  isCurrencySelectable,
  normalizeCurrencyCode,
  normalizeCurrencyPolicy,
  persistCurrencySelection,
  selectableCurrencyCodes
} from '../lib/currency';
import type { CurrencyPolicy } from '../lib/currency';

type CurrencySwitcherProps = {
  policy?: CurrencyPolicy | null;
  storageKey: string;
  value?: string;
  onChange?: (currency: string) => void;
  scope?: string;
  scopeId?: string;
  actorId?: string;
  className?: string;
  selectClassName?: string;
  iconClassName?: string;
  compact?: boolean;
  title?: string;
};

export default function CurrencySwitcher({
  policy,
  storageKey,
  value,
  onChange,
  scope,
  scopeId,
  actorId,
  className = '',
  selectClassName = '',
  iconClassName = '',
  compact = false,
  title = 'Switch currency'
}: CurrencySwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const normalizedPolicy = React.useMemo(() => normalizeCurrencyPolicy(policy || undefined), [policy]);
  const options = React.useMemo(() => selectableCurrencyCodes(normalizedPolicy), [normalizedPolicy]);
  const [internalValue, setInternalValue] = React.useState(() => chooseCurrencyForStorage(normalizedPolicy, storageKey));
  const selected = normalizeCurrencyCode(value || internalValue, normalizedPolicy.defaultCurrency);
  const safeSelected = isCurrencySelectable(normalizedPolicy, selected) ? selected : normalizedPolicy.defaultCurrency;
  const selectedInfo = getCurrencyInfo(safeSelected);

  React.useEffect(() => {
    const next = chooseCurrencyForStorage(normalizedPolicy, storageKey);
    setInternalValue((current) => isCurrencySelectable(normalizedPolicy, current) ? current : next);
  }, [normalizedPolicy, storageKey]);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleChange = (currency: string) => {
    const next = normalizeCurrencyCode(currency);
    if (!isCurrencySelectable(normalizedPolicy, next)) return;
    persistCurrencySelection(storageKey, next, { scope, scopeId, actorId });
    setInternalValue(next);
    setOpen(false);
    onChange?.(next);
    window.dispatchEvent(new CustomEvent('tiwlo:currency-change', {
      detail: { currency: next, scope, scopeId, actorId }
    }));
  };

  return (
    <div ref={ref} className={`relative inline-flex h-8 shrink-0 items-center ${className}`} title={title}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d8dee9] bg-white px-2.5 text-[#2e3d49] transition-colors hover:border-[#0069ff] hover:bg-[#f8fbff] ${compact ? 'w-[78px]' : 'w-[150px]'} ${selectClassName}`}
        aria-label={title}
        aria-expanded={open}
      >
        <Coins className={`h-3.5 w-3.5 text-[#0069ff] ${iconClassName}`} />
        <span className="min-w-0 flex-1 truncate text-left text-[11px] font-black uppercase leading-none">
          {compact ? safeSelected : `${safeSelected} · ${selectedInfo.symbol}`}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[90] mt-1 w-44 overflow-hidden rounded-md border border-[#d8dee9] bg-white">
          {options.map((code) => {
            const currency = getCurrencyInfo(code);
            const active = code === safeSelected;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleChange(code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                  active ? 'bg-blue-50 text-[#0069ff]' : 'text-[#2e3d49] hover:bg-[#f8f9fa]'
                }`}
              >
                <span className="w-10 text-[12px] font-black uppercase">{code}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-gray-500">{currency.name}</span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
