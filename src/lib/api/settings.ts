import { graphQL, userFields } from './client';

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
