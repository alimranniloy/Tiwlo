const COUNTRY_DIAL_CODES = {
  BD: '+880',
  US: '+1',
  CA: '+1',
  GB: '+44',
  IN: '+91',
  PK: '+92',
  NP: '+977',
  LK: '+94',
  AE: '+971',
  SA: '+966',
  SG: '+65',
  MY: '+60'
};

const COUNTRY_LENGTHS = {
  BD: [10, 10],
  US: [10, 10],
  CA: [10, 10],
  GB: [9, 10],
  IN: [10, 10],
  PK: [10, 10],
  NP: [10, 10],
  LK: [9, 9],
  SG: [8, 8],
  MY: [9, 10],
  AE: [9, 9],
  SA: [9, 9]
};

export const cleanText = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

export const normalizeCountry = (value) => cleanText(value, 'BD').toUpperCase().slice(0, 2);

export const normalizePhoneDigits = (value) => cleanText(value).replace(/\D/g, '');

export const phoneValidationMessage = (countryCode, phone) => {
  const country = normalizeCountry(countryCode);
  const digits = normalizePhoneDigits(phone);
  const dialDigits = String(COUNTRY_DIAL_CODES[country] || '').replace(/\D/g, '');
  const localDigits = dialDigits && digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;
  const [min, max] = COUNTRY_LENGTHS[country] || [6, 15];

  if (!localDigits) return 'Mobile number is required.';
  if (country === 'BD' && !/^1[3-9]\d{8}$/.test(localDigits)) {
    return 'Bangladesh number must use +880 and a valid 10 digit mobile number.';
  }
  if (localDigits.length < min || localDigits.length > max) {
    return `Mobile number must be ${min === max ? min : `${min}-${max}`} digits after country code.`;
  }
  return '';
};

export const isProfileInputComplete = (input = {}) => (
  Boolean(cleanText(input.phone)) &&
  Boolean(cleanText(input.country)) &&
  Boolean(cleanText(input.addressLine1)) &&
  Boolean(cleanText(input.city)) &&
  Boolean(cleanText(input.postalCode)) &&
  Boolean(cleanText(input.billingName))
);

export const profileCompletionData = (input = {}) => {
  const phoneError = phoneValidationMessage(input.country, input.phone);
  if (phoneError) return { error: phoneError };
  return {
    data: {
      phone: cleanText(input.phone),
      mobileCountryCode: cleanText(input.mobileCountryCode || COUNTRY_DIAL_CODES[normalizeCountry(input.country)] || ''),
      country: normalizeCountry(input.country),
      addressLine1: cleanText(input.addressLine1),
      city: cleanText(input.city),
      state: cleanText(input.state),
      postalCode: cleanText(input.postalCode),
      billingName: cleanText(input.billingName),
      profileCompletedAt: new Date()
    }
  };
};
