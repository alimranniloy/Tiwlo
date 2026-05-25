export type CountryOption = {
  code: string;
  name: string;
  dialCode: string;
  minLength: number;
  maxLength: number;
};

const ISO_COUNTRY_CODES = `
AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW
`.trim().split(/\s+/);

const DIAL_CODES: Record<string, string> = {
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
  MY: '+60',
  ID: '+62',
  TH: '+66',
  PH: '+63',
  CN: '+86',
  JP: '+81',
  KR: '+82',
  AU: '+61',
  NZ: '+64',
  DE: '+49',
  FR: '+33',
  IT: '+39',
  ES: '+34',
  NL: '+31',
  BE: '+32',
  SE: '+46',
  NO: '+47',
  DK: '+45',
  FI: '+358',
  TR: '+90',
  RU: '+7',
  BR: '+55',
  MX: '+52',
  ZA: '+27',
  NG: '+234',
  EG: '+20'
};

const LENGTHS: Record<string, [number, number]> = {
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

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

export const COUNTRIES: CountryOption[] = ISO_COUNTRY_CODES
  .map((code) => {
    const [minLength, maxLength] = LENGTHS[code] || [6, 15];
    return {
      code,
      name: countryName(code),
      dialCode: DIAL_CODES[code] || '',
      minLength,
      maxLength
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export function countryByCode(code?: string) {
  return COUNTRIES.find((country) => country.code === String(code || '').toUpperCase()) || COUNTRIES.find((country) => country.code === 'BD') || COUNTRIES[0];
}

export function normalizePhoneDigits(phone: string) {
  return String(phone || '').replace(/\D/g, '');
}

export function phoneValidationMessage(countryCode: string, phone: string) {
  const country = countryByCode(countryCode);
  const digits = normalizePhoneDigits(phone);
  const dialDigits = country.dialCode.replace(/\D/g, '');
  const localDigits = dialDigits && digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;

  if (!localDigits) return 'Mobile number is required.';
  if (country.code === 'BD' && !/^1[3-9]\d{8}$/.test(localDigits)) {
    return 'Bangladesh number must use +880 and a valid 10 digit mobile number, for example 1712345678.';
  }
  if (localDigits.length < country.minLength || localDigits.length > country.maxLength) {
    return `${country.name} number must be ${country.minLength === country.maxLength ? country.minLength : `${country.minLength}-${country.maxLength}`} digits after ${country.dialCode || 'country code'}.`;
  }
  return '';
}

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
