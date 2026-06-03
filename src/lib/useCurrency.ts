import React from 'react';
import { fetchPlatformCurrencyWithApi } from './api/settings';
import {
  chooseCurrencyForStorage,
  convertCurrencyAmount,
  currencySelectionStorageKey,
  DEFAULT_CURRENCY_POLICY,
  formatCurrencyAmount,
  isCurrencySelectable,
  normalizeCurrencyCode,
  normalizeCurrencyPolicy,
  persistCurrencySelection,
  readStoredCurrencySelection
} from './currency';
import type { CurrencyPolicy } from './currency';

type UseCurrencyOptions = {
  scope?: string;
  scopeId?: string;
  actorId?: string;
};

export function useCurrency(options: UseCurrencyOptions = {}) {
  const scope = options.scope || 'platform';
  const scopeId = options.scopeId || 'console';
  const actorId = options.actorId || 'guest';
  const storageKey = React.useMemo(
    () => currencySelectionStorageKey(scope, scopeId, actorId),
    [actorId, scope, scopeId]
  );
  const sharedStorageKey = React.useMemo(
    () => currencySelectionStorageKey(scope, scopeId, 'shared'),
    [scope, scopeId]
  );
  const chooseCurrency = React.useCallback((nextPolicy: CurrencyPolicy, country?: string | null) => (
    readStoredCurrencySelection(storageKey, nextPolicy, { detectedCountry: country }) ||
    readStoredCurrencySelection(sharedStorageKey, nextPolicy, { detectedCountry: country }) ||
    chooseCurrencyForStorage(nextPolicy, storageKey, country)
  ), [sharedStorageKey, storageKey]);
  const [policy, setPolicy] = React.useState<CurrencyPolicy>(() => normalizeCurrencyPolicy(DEFAULT_CURRENCY_POLICY));
  const [detectedCountry, setDetectedCountry] = React.useState<string | null>(null);
  const [currency, setCurrencyState] = React.useState(() => chooseCurrency(DEFAULT_CURRENCY_POLICY));

  React.useEffect(() => {
    let active = true;
    fetchPlatformCurrencyWithApi()
      .then((result) => {
        if (!active) return;
        const nextPolicy = normalizeCurrencyPolicy(result.policy || DEFAULT_CURRENCY_POLICY);
        const nextCountry = result.detectedCountry || null;
        const nextCurrency = chooseCurrency(nextPolicy, nextCountry);
        setPolicy(nextPolicy);
        setDetectedCountry(nextCountry);
        setCurrencyState(nextCurrency);
      })
      .catch(() => {
        if (!active) return;
        const fallback = normalizeCurrencyPolicy(DEFAULT_CURRENCY_POLICY);
        const nextCurrency = chooseCurrency(fallback);
        setPolicy(fallback);
        setCurrencyState(nextCurrency);
      });
    return () => {
      active = false;
    };
  }, [actorId, chooseCurrency, scope, scopeId, storageKey]);

  React.useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.scope && detail.scope !== scope) return;
      if (scope !== 'platform' && detail.scopeId && detail.scopeId !== scopeId) return;
      const next = normalizeCurrencyCode(detail.currency, '');
      if (next && isCurrencySelectable(policy, next)) setCurrencyState(next);
    };
    window.addEventListener('tiwlo:currency-change', onChange);
    return () => window.removeEventListener('tiwlo:currency-change', onChange);
  }, [policy, scope, scopeId]);

  const setCurrency = React.useCallback((nextCurrency: string) => {
    const next = normalizeCurrencyCode(nextCurrency);
    if (!isCurrencySelectable(policy, next)) return;
    persistCurrencySelection(storageKey, next, { scope, scopeId, actorId });
    persistCurrencySelection(sharedStorageKey, next, { scope, scopeId, actorId });
    setCurrencyState(next);
    window.dispatchEvent(new CustomEvent('tiwlo:currency-change', {
      detail: { currency: next, scope, scopeId, actorId }
    }));
  }, [actorId, policy, scope, scopeId, sharedStorageKey, storageKey]);

  const convert = React.useCallback((amount: number, sourceCurrency?: string) => (
    convertCurrencyAmount(amount, policy, currency, sourceCurrency)
  ), [currency, policy]);

  const money = React.useCallback((amount: number, sourceCurrency?: string) => (
    formatCurrencyAmount(convert(amount, sourceCurrency), currency)
  ), [convert, currency]);

  return {
    policy,
    currency,
    detectedCountry,
    storageKey,
    setCurrency,
    convert,
    money
  };
}
