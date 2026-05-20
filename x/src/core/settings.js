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
export const ACCOUNT_CREDIT_POLICY_KEY = 'accountCreditPolicy';

export const getNewAccountCredit = async (prisma) => {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: ACCOUNT_CREDIT_POLICY_KEY } }
  });

  const value = Number(setting?.value?.newAccountCredit ?? setting?.value ?? DEFAULT_NEW_ACCOUNT_CREDIT);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_NEW_ACCOUNT_CREDIT;
};
