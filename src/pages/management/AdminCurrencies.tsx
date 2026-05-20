import CurrencyPolicyEditor from '../../components/CurrencyPolicyEditor';

export default function AdminCurrencies() {
  return (
    <CurrencyPolicyEditor
      scope="platform"
      title="Currency Configuration"
      description="Manage the platform currency catalog, website-allowed currencies, USD-based conversion rates, default display currency, auto switching, and optional live rate sync."
    />
  );
}
