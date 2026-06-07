export const settingDefinitions = {
  platform: {
    readonly: ['provisioningState', 'systemBuild'],
    editable: ['branding', 'paymentGateways', 'notifications', 'security', 'regions', 'tax', 'accountCreditPolicy']
  },
  store: {
    readonly: ['provisioning'],
    editable: ['checkout', 'shipping', 'tax', 'theme', 'notifications', 'seo', 'domains']
  },
  isp: {
    readonly: ['provisioning'],
    editable: ['radius', 'billing', 'notifications', 'network', 'tax', 'mikrotik']
  },
  user: {
    readonly: [],
    editable: ['profile', 'preferences', 'alerts']
  }
};

export const isReadonlySetting = (scope, key) => (
  settingDefinitions[scope]?.readonly?.includes(key) || false
);

export const DEFAULT_NEW_ACCOUNT_CREDIT = 0;
export const DEFAULT_SIGNUP_PROMO_CREDIT = 100;
export const SIGNUP_PROMO_HOLD_AMOUNT = 1;
export const ACCOUNT_CREDIT_POLICY_KEY = 'accountCreditPolicy';

export const DEFAULT_ACCOUNT_CREDIT_POLICY = {
  creditSystemEnabled: true,
  newAccountCredit: DEFAULT_NEW_ACCOUNT_CREDIT,
  signupPromoCredit: DEFAULT_SIGNUP_PROMO_CREDIT,
  signupPromoRequiresPayment: true,
  signupPromoHoldAmount: SIGNUP_PROMO_HOLD_AMOUNT
};

const nonNegativeMoney = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : fallback;
};

const readRawAccountCreditPolicy = async (prisma) => {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: ACCOUNT_CREDIT_POLICY_KEY } }
  });
  return setting?.value;
};

export const getAccountCreditPolicy = async (prisma) => {
  const value = await readRawAccountCreditPolicy(prisma);
  const objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const legacyCredit = typeof value === 'number' ? value : objectValue.newAccountCredit;
  const creditSystemEnabled = objectValue.creditSystemEnabled ?? objectValue.enabled ?? true;
  return {
    ...DEFAULT_ACCOUNT_CREDIT_POLICY,
    ...objectValue,
    creditSystemEnabled: creditSystemEnabled !== false,
    newAccountCredit: nonNegativeMoney(legacyCredit, DEFAULT_NEW_ACCOUNT_CREDIT),
    signupPromoCredit: nonNegativeMoney(objectValue.signupPromoCredit, DEFAULT_SIGNUP_PROMO_CREDIT),
    signupPromoRequiresPayment: objectValue.signupPromoRequiresPayment !== false,
    signupPromoHoldAmount: nonNegativeMoney(objectValue.signupPromoHoldAmount, SIGNUP_PROMO_HOLD_AMOUNT)
  };
};

export const getPublicSignupCreditPolicy = async (prisma) => {
  const policy = await getAccountCreditPolicy(prisma);
  return {
    creditSystemEnabled: policy.creditSystemEnabled,
    signupPromoCredit: policy.creditSystemEnabled ? policy.signupPromoCredit : 0,
    signupPromoRequiresPayment: policy.signupPromoRequiresPayment,
    signupPromoHoldAmount: policy.signupPromoHoldAmount
  };
};

export const getNewAccountCredit = async (prisma) => {
  const policy = await getAccountCreditPolicy(prisma);
  return policy.creditSystemEnabled ? policy.newAccountCredit : DEFAULT_NEW_ACCOUNT_CREDIT;
};

export const getSignupPromoCredit = async (prisma) => {
  const policy = await getAccountCreditPolicy(prisma);
  return policy.creditSystemEnabled ? policy.signupPromoCredit : 0;
};

export const getSignupPromoHoldAmount = async (prisma) => {
  const policy = await getAccountCreditPolicy(prisma);
  return policy.signupPromoHoldAmount;
};

export const signupPromoRequiresPayment = async (prisma) => {
  const policy = await getAccountCreditPolicy(prisma);
  return policy.creditSystemEnabled && policy.signupPromoCredit > 0 && policy.signupPromoRequiresPayment;
};
