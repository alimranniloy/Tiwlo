import CurrencyPolicyEditor from '../../../components/CurrencyPolicyEditor';
import type { CurrencyPolicy } from '../../../lib/currency';
import { updateStoreWithApi } from '../../../lib/tiwloApi';

export default function CurrenciesPage({
  store,
  onStoreUpdated
}: {
  store: any;
  onStoreUpdated?: (store: any) => void;
}) {
  const saveStorePolicy = async (policy: CurrencyPolicy) => {
    const updated = await updateStoreWithApi({
      id: store.id,
      settings: {
        ...(store.settings || {}),
        currencyPolicy: policy
      }
    });
    onStoreUpdated?.(updated);
  };

  return (
    <CurrencyPolicyEditor
      scope="store"
      scopeId={store.id}
      inheritedPolicy={store.settings?.currencyPolicy}
      title="Store Currencies"
      description="Control storefront currencies for this ecommerce store, including USD conversion rates, allowed website switcher options, default display currency, and auto switching."
      onPolicySaved={saveStorePolicy}
    />
  );
}
