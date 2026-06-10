export function isProfileComplete(user: {
  phone?: string | null;
  country?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  billingName?: string | null;
}) {
  return Boolean(
    String(user.phone || '').trim() &&
    String(user.country || '').trim() &&
    String(user.addressLine1 || '').trim() &&
    String(user.city || '').trim() &&
    String(user.postalCode || '').trim() &&
    String(user.billingName || '').trim()
  );
}
