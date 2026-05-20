import React from 'react';
import { Coins } from 'lucide-react';
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
  const normalizedPolicy = React.useMemo(() => normalizeCurrencyPolicy(policy || undefined), [policy]);
  const options = React.useMemo(() => selectableCurrencyCodes(normalizedPolicy), [normalizedPolicy]);
  const [internalValue, setInternalValue] = React.useState(() => chooseCurrencyForStorage(normalizedPolicy, storageKey));
  const selected = normalizeCurrencyCode(value || internalValue, normalizedPolicy.defaultCurrency);
  const safeSelected = isCurrencySelectable(normalizedPolicy, selected) ? selected : normalizedPolicy.defaultCurrency;

  React.useEffect(() => {
    const next = chooseCurrencyForStorage(normalizedPolicy, storageKey);
    setInternalValue((current) => isCurrencySelectable(normalizedPolicy, current) ? current : next);
  }, [normalizedPolicy, storageKey]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = normalizeCurrencyCode(event.target.value);
    if (!isCurrencySelectable(normalizedPolicy, next)) return;
    persistCurrencySelection(storageKey, next, { scope, scopeId, actorId });
    setInternalValue(next);
    onChange?.(next);
    window.dispatchEvent(new CustomEvent('tiwlo:currency-change', {
      detail: { currency: next, scope, scopeId, actorId }
    }));
  };

  return (
    <label
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 text-gray-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40 ${className}`}
      title={title}
    >
      <Coins className={`h-4 w-4 text-blue-600 ${iconClassName}`} />
      <select
        value={safeSelected}
        onChange={handleChange}
        className={`min-w-0 appearance-none bg-transparent pr-1 text-[12px] font-black uppercase tracking-tight outline-none ${compact ? 'w-14' : 'w-24'} ${selectClassName}`}
        aria-label={title}
      >
        {options.map((code) => {
          const currency = getCurrencyInfo(code);
          return (
            <option key={code} value={code}>
              {compact ? code : `${code} - ${currency.name}`}
            </option>
          );
        })}
      </select>
    </label>
  );
}
