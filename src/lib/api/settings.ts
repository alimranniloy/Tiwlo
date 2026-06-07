import { GRAPHQL_URL, graphQL, userFields } from './client';

export type PlatformStatus = {
  maintenance: {
    enabled: boolean;
    updatedAt?: string | null;
  };
  whatsapp?: {
    enabled: boolean;
    configured?: boolean;
  };
};

export type PlatformCurrencyStatus = {
  policy: unknown;
  detectedCountry?: string | null;
  detectedCurrency?: string | null;
  fallbackCurrency?: string;
};

export type SignupCreditPolicy = {
  creditSystemEnabled: boolean;
  signupPromoCredit: number;
  signupPromoRequiresPayment: boolean;
  signupPromoHoldAmount: number;
};

export async function fetchPlatformStatusWithApi(): Promise<PlatformStatus> {
  const apiBase = GRAPHQL_URL.replace(/\/graphql\/?$/, '');
  const response = await fetch(`${apiBase}/api/platform/status`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Platform status request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchPlatformCurrencyWithApi(): Promise<PlatformCurrencyStatus> {
  const apiBase = GRAPHQL_URL.replace(/\/graphql\/?$/, '');
  const response = await fetch(`${apiBase}/api/platform/currency`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Platform currency request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchSettingsWithApi(scope: string, scopeId?: string) {
  const data = await graphQL<{ settings: any[] }>(
    `query Settings($scope: String!, $scopeId: String) {
      settings(scope: $scope, scopeId: $scopeId) {
        id
        scope
        scopeId
        key
        value
      }
    }`,
    { scope, scopeId }
  );

  return data.settings;
}

export async function fetchSignupCreditPolicyWithApi(): Promise<SignupCreditPolicy> {
  const data = await graphQL<{ signupCreditPolicy: SignupCreditPolicy }>(
    `query SignupCreditPolicy {
      signupCreditPolicy
    }`
  );

  return data.signupCreditPolicy;
}

export async function upsertSettingWithApi(input: { scope: string; scopeId?: string; key: string; value: unknown }) {
  const data = await graphQL<{ upsertSetting: any }>(
    `mutation UpsertSetting($input: UpsertSettingInput!) {
      upsertSetting(input: $input) {
        id
        scope
        scopeId
        key
        value
      }
    }`,
    { input }
  );

  return data.upsertSetting;
}

export async function updateProfileWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateProfile: any }>(
    `mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) {
        ${userFields}
      }
    }`,
    { input }
  );

  return data.updateProfile;
}
