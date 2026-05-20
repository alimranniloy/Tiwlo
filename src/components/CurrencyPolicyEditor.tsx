import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Globe2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Zap
} from 'lucide-react';
import { fetchSettingsWithApi, upsertSettingWithApi } from '../lib/tiwloApi';
import {
  CURRENCY_POLICY_KEY,
  convertCurrencyAmount,
  DEFAULT_CURRENCY_POLICY,
  fetchLiveCurrencyRates,
  formatCurrencyAmount,
  getCurrencyCatalog,
  getCurrencyInfo,
  normalizeCurrencyCode,
  normalizeCurrencyPolicy
} from '../lib/currency';
import type { CurrencyPolicy } from '../lib/currency';

type CurrencyPolicyEditorProps = {
  scope: 'platform' | 'store';
  scopeId?: string;
  inheritedPolicy?: unknown;
  title: string;
  description: string;
  onPolicySaved?: (policy: CurrencyPolicy) => Promise<void> | void;
};

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      aria-pressed={checked}
      aria-label={label}
      title={label}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

export default function CurrencyPolicyEditor({
  scope,
  scopeId,
  inheritedPolicy,
  title,
  description,
  onPolicySaved
}: CurrencyPolicyEditorProps) {
  const [policy, setPolicy] = React.useState<CurrencyPolicy>(() => normalizeCurrencyPolicy(inheritedPolicy || DEFAULT_CURRENCY_POLICY));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [currencyToAdd, setCurrencyToAdd] = React.useState('BDT');
  const [query, setQuery] = React.useState('');

  const catalog = React.useMemo(() => getCurrencyCatalog(), []);

  const loadPolicy = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const settings = await fetchSettingsWithApi(scope, scopeId);
      const saved = settings.find((setting) => setting.key === CURRENCY_POLICY_KEY)?.value;
      setPolicy(normalizeCurrencyPolicy(saved || inheritedPolicy || DEFAULT_CURRENCY_POLICY));
    } catch (err) {
      setPolicy(normalizeCurrencyPolicy(inheritedPolicy || DEFAULT_CURRENCY_POLICY));
      setError(err instanceof Error ? err.message : 'Unable to load currency settings');
    } finally {
      setLoading(false);
    }
  }, [inheritedPolicy, scope, scopeId]);

  React.useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const updatePolicy = (updater: (current: CurrencyPolicy) => CurrencyPolicy | Partial<CurrencyPolicy>) => {
    setNotice('');
    setPolicy((current) => normalizeCurrencyPolicy(updater(current)));
  };

  const addCurrency = () => {
    const code = normalizeCurrencyCode(currencyToAdd, '');
    if (!code) return;
    updatePolicy((current) => ({
      ...current,
      enabledCurrencies: Array.from(new Set([...current.enabledCurrencies, code])),
      allowedCurrencies: Array.from(new Set([...current.allowedCurrencies, code])),
      rates: {
        ...current.rates,
        [code]: Number(current.rates[code] || (code === 'BDT' ? 122.75 : 1))
      }
    }));
  };

  const removeCurrency = (code: string) => {
    const normalized = normalizeCurrencyCode(code);
    if (normalized === policy.baseCurrency) return;
    updatePolicy((current) => {
      const enabledCurrencies = current.enabledCurrencies.filter((item) => item !== normalized);
      const allowedCurrencies = current.allowedCurrencies.filter((item) => item !== normalized);
      const rates = { ...current.rates };
      delete rates[normalized];
      return {
        ...current,
        enabledCurrencies,
        allowedCurrencies,
        defaultCurrency: current.defaultCurrency === normalized ? current.baseCurrency : current.defaultCurrency,
        rates
      };
    });
  };

  const toggleAllowed = (code: string, allowed: boolean) => {
    const normalized = normalizeCurrencyCode(code);
    if (normalized === policy.baseCurrency && !allowed) return;
    updatePolicy((current) => {
      const allowedCurrencies = allowed
        ? Array.from(new Set([...current.allowedCurrencies, normalized]))
        : current.allowedCurrencies.filter((item) => item !== normalized);
      return {
        ...current,
        allowedCurrencies,
        defaultCurrency: allowedCurrencies.includes(current.defaultCurrency) ? current.defaultCurrency : current.baseCurrency
      };
    });
  };

  const setRate = (code: string, value: string) => {
    const normalized = normalizeCurrencyCode(code);
    updatePolicy((current) => ({
      ...current,
      rates: {
        ...current.rates,
        [normalized]: Math.max(0.000001, Number(value) || 1)
      }
    }));
  };

  const savePolicy = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    const normalized = normalizeCurrencyPolicy(policy);
    try {
      await upsertSettingWithApi({
        scope,
        scopeId,
        key: CURRENCY_POLICY_KEY,
        value: normalized
      });
      await onPolicySaved?.(normalized);
      setPolicy(normalized);
      setNotice('Currency settings saved and published.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save currency settings');
    } finally {
      setSaving(false);
    }
  };

  const syncRates = async () => {
    if (!policy.rateApiEnabled) {
      setError('Turn on rate API sync first.');
      return;
    }
    setSyncing(true);
    setError('');
    setNotice('');
    try {
      const next = await fetchLiveCurrencyRates(policy);
      setPolicy(next);
      setNotice('Live rates synced. Save to publish them.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync live currency rates');
    } finally {
      setSyncing(false);
    }
  };

  const addOptions = React.useMemo(
    () => catalog.filter((currency) => !policy.enabledCurrencies.includes(currency.code)),
    [catalog, policy.enabledCurrencies]
  );
  React.useEffect(() => {
    if (addOptions.length && !addOptions.some((currency) => currency.code === currencyToAdd)) {
      setCurrencyToAdd(addOptions[0].code);
    }
  }, [addOptions, currencyToAdd]);

  const filteredCurrencies = policy.enabledCurrencies
    .filter((code) => {
      const currency = getCurrencyInfo(code);
      const haystack = `${currency.code} ${currency.name}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    })
    .map((code) => getCurrencyInfo(code));

  const lastUpdated = policy.lastUpdatedAt ? new Date(policy.lastUpdatedAt).toLocaleString() : 'Not synced yet';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-sm border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
            <Coins className="h-3.5 w-3.5" /> Main currency: USD
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPolicy}
            className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={savePolicy}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-sm border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Base', value: policy.baseCurrency, icon: ShieldCheck },
          { label: 'Default first', value: policy.defaultCurrency, icon: Star },
          { label: 'Allowed', value: String(policy.allowedCurrencies.length), icon: Globe2 },
          { label: 'Auto switch', value: policy.autoSwitch ? 'On' : 'Off', icon: Zap }
        ].map((item) => (
          <div key={item.label} className="border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{item.label}</span>
              <item.icon className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900">Configured Currencies</h2>
              <p className="text-xs font-medium text-gray-500">Rate is the display value for 1 USD.</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search currency..."
                className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-black">Currency</th>
                  <th className="px-4 py-3 font-black">Per USD</th>
                  <th className="px-4 py-3 font-black">Preview</th>
                  <th className="px-4 py-3 font-black">Website allow</th>
                  <th className="px-4 py-3 font-black">Default</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading currency policy...</td>
                  </tr>
                ) : filteredCurrencies.length ? filteredCurrencies.map((currency) => {
                  const rate = Number(policy.rates[currency.code] || 1);
                  const allowed = policy.allowedCurrencies.includes(currency.code);
                  return (
                    <tr key={currency.code} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-blue-50 text-xs font-black text-blue-700">{currency.symbol}</div>
                          <div>
                            <p className="font-black text-gray-900">{currency.code}</p>
                            <p className="text-xs font-medium text-gray-500">{currency.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0.000001"
                          step="0.000001"
                          value={rate}
                          onChange={(event) => setRate(currency.code, event.target.value)}
                          disabled={currency.code === policy.baseCurrency}
                          className="w-32 rounded-sm border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700">{formatCurrencyAmount(convertCurrencyAmount(1, policy, currency.code), currency.code)}</td>
                      <td className="px-4 py-3">
                        <Toggle checked={allowed} onChange={(checked) => toggleAllowed(currency.code, checked)} label={`Allow ${currency.code}`} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => updatePolicy((current) => ({ ...current, defaultCurrency: currency.code, allowedCurrencies: Array.from(new Set([...current.allowedCurrencies, currency.code])) }))}
                          className={`rounded-sm border px-2.5 py-1.5 text-[11px] font-black ${
                            policy.defaultCurrency === currency.code
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {policy.defaultCurrency === currency.code ? 'Default' : 'Make default'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeCurrency(currency.code)}
                          disabled={currency.code === policy.baseCurrency}
                          className="rounded-sm border border-red-100 p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                          title={`Remove ${currency.code}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No currencies match this search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-black text-gray-900">Add Currency</h2>
              <p className="text-xs font-medium text-gray-500">All supported browser currencies are available.</p>
            </div>
            <div className="space-y-3 p-4">
              <select
                value={currencyToAdd}
                onChange={(event) => setCurrencyToAdd(event.target.value)}
                className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
              >
                {addOptions.map((currency) => (
                  <option key={currency.code} value={currency.code}>{currency.code} - {currency.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addCurrency}
                disabled={!addOptions.length}
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gray-900 px-3 py-2 text-xs font-black text-white hover:bg-black disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add to allowed list
              </button>
            </div>
          </div>

          <div className="border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-black text-gray-900">Behavior</h2>
              <p className="text-xs font-medium text-gray-500">Selection is cached per user or store visitor.</p>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">Auto currency switch</p>
                  <p className="text-xs font-medium text-gray-500">Uses locale only when the user has no saved choice.</p>
                </div>
                <Toggle checked={policy.autoSwitch} onChange={(checked) => updatePolicy((current) => ({ ...current, autoSwitch: checked }))} label="Auto currency switch" />
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Default display currency</span>
                <select
                  value={policy.defaultCurrency}
                  onChange={(event) => updatePolicy((current) => ({ ...current, defaultCurrency: event.target.value, allowedCurrencies: Array.from(new Set([...current.allowedCurrencies, event.target.value])) }))}
                  className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                >
                  {policy.enabledCurrencies.map((code) => <option key={code} value={code}>{code} - {getCurrencyInfo(code).name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Cache minutes</span>
                <input
                  type="number"
                  min="15"
                  value={policy.rateCacheMinutes}
                  onChange={(event) => updatePolicy((current) => ({ ...current, rateCacheMinutes: Math.max(15, Number(event.target.value) || 1440) }))}
                  className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-black text-gray-900">Live Rate API</h2>
              <p className="text-xs font-medium text-gray-500">Optional no-key sync, saved into this policy.</p>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">API sync</p>
                  <p className="text-xs font-medium text-gray-500">Frankfurter daily reference rates.</p>
                </div>
                <Toggle checked={policy.rateApiEnabled} onChange={(checked) => updatePolicy((current) => ({ ...current, rateApiEnabled: checked }))} label="Rate API sync" />
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Endpoint</span>
                <input
                  value={policy.rateApiUrl}
                  onChange={(event) => updatePolicy((current) => ({ ...current, rateApiUrl: event.target.value }))}
                  className="w-full rounded-sm border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                />
              </label>
              <div className="rounded-sm border border-gray-100 bg-gray-50 p-3 text-xs font-medium leading-5 text-gray-500">
                <p><span className="font-black text-gray-700">Last sync:</span> {lastUpdated}</p>
                <p><span className="font-black text-gray-700">Source:</span> {policy.lastSource || policy.rateApiUrl}</p>
              </div>
              <button
                type="button"
                onClick={syncRates}
                disabled={syncing || !policy.rateApiEnabled}
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync rates now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
