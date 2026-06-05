export const fallbackSignupPromoGateways = [
  { id: 'bkash', key: 'bkash', name: 'bKash', provider: 'bkash' },
  { id: 'stripe', key: 'stripe', name: 'Stripe', provider: 'stripe' }
];

export const signupPromoPaymentLogos: Record<string, string> = {
  bkash: '/brand/payments/bkash.svg',
  stripe: '/brand/payments/stripe-mark.svg'
};

const providerOrder: Record<string, number> = { bkash: 0, stripe: 1 };

export const providerOf = (gateway: any) => String(gateway?.provider || gateway?.key || '').toLowerCase();

export const providerLabel = (gateway: any) => {
  const provider = providerOf(gateway);
  if (provider === 'bkash') return 'bKash';
  if (provider === 'stripe') return 'Stripe';
  if (provider === 'paypal') return 'PayPal';
  return gateway?.name || provider;
};

export const orderedSignupPromoGateways = (items: any[]) => [...items].sort((a, b) => {
  const aProvider = providerOf(a);
  const bProvider = providerOf(b);
  return (providerOrder[aProvider] ?? 99) - (providerOrder[bProvider] ?? 99) || providerLabel(a).localeCompare(providerLabel(b));
});

export const promoGateways = (items: any[]) => items.filter((gateway) => Boolean(signupPromoPaymentLogos[providerOf(gateway)]));

export const visibleSignupPromoGateways = (items: any[]) => {
  const visibleGateways = promoGateways(items);
  return orderedSignupPromoGateways(visibleGateways.length > 0 ? visibleGateways : fallbackSignupPromoGateways);
};
