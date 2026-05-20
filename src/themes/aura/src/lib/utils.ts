type ClassValue = string | number | false | null | undefined | Record<string, boolean>;

export function cn(...inputs: ClassValue[]) {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([, enabled]) => enabled)
          .map(([className]) => className);
      }
      return [String(input)];
    })
    .join(' ');
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
