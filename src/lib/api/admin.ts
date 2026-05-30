import { graphQL, moduleFields } from './client';

export type MainAdminRecord = {
  id: string;
  section: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

const MAIN_ADMIN_SCOPE = 'admin';
const MAIN_ADMIN_SCOPE_ID = 'main-admin';

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `admin_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function adminRecordKey(section: string) {
  return `mainAdmin:${section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general'}`;
}

function normalizeAdminRecords(section: string, setting?: any): MainAdminRecord[] {
  const records = Array.isArray(setting?.value?.records) ? setting.value.records : [];
  return records.map((record: any) => ({
    id: record.id,
    section,
    title: record.title || record.data?.name || record.id,
    status: record.status || 'active',
    data: record.data || {},
    createdAt: record.createdAt || setting?.createdAt,
    updatedAt: record.updatedAt || setting?.updatedAt
  }));
}

async function fetchAdminRecordSetting(section: string, scopeId = MAIN_ADMIN_SCOPE_ID) {
  const data = await graphQL<{ settings: any[] }>(
    `query MainAdminRecordSetting($scope: String!, $scopeId: String) {
      settings(scope: $scope, scopeId: $scopeId) {
        id
        key
        value
        createdAt
        updatedAt
      }
    }`,
    { scope: MAIN_ADMIN_SCOPE, scopeId }
  );

  return data.settings.find((setting) => setting.key === adminRecordKey(section));
}

async function saveAdminRecordSetting(section: string, records: MainAdminRecord[], scopeId = MAIN_ADMIN_SCOPE_ID) {
  const data = await graphQL<{ upsertSetting: any }>(
    `mutation SaveMainAdminRecords($input: UpsertSettingInput!) {
      upsertSetting(input: $input) {
        id
        key
        value
        createdAt
        updatedAt
      }
    }`,
    {
      input: {
        scope: MAIN_ADMIN_SCOPE,
        scopeId,
        key: adminRecordKey(section),
        value: { section, records }
      }
    }
  );

  return data.upsertSetting;
}

export async function fetchDashboardSummary() {
  const data = await graphQL<{ dashboardSummary: any }>(
    `query DashboardSummary {
      dashboardSummary {
        users
        droplets
        domains
        stores
        ispSites
        invoices
        openTickets
        revenue
      }
    }`
  );

  return data.dashboardSummary;
}

export async function fetchUsersForAdmin(search?: string) {
  const data = await graphQL<{ users: any[] }>(
    `query Users($search: String) {
      users(search: $search) {
        id
        name
        email
        role
        status
        credits
        createdAt
        updatedAt
        securitySummary
        deviceSessions {
          id
          fingerprintHint
          deviceName
          browser
          os
          ipAddress
          ipPrefix
          country
          region
          city
          firstSeenAt
          lastSeenAt
          loginCount
          lastEvent
          unusual
          unusualReasons
          metadata
        }
      }
    }`,
    { search }
  );

  return data.users;
}

export async function updateUserWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateUser: any }>(
    `mutation UpdateUser($input: UpdateUserInput!) {
      updateUser(input: $input) {
        id
        name
        email
        role
        status
        credits
        createdAt
        updatedAt
        securitySummary
        deviceSessions {
          id
          fingerprintHint
          deviceName
          browser
          os
          ipAddress
          ipPrefix
          country
          region
          city
          firstSeenAt
          lastSeenAt
          loginCount
          lastEvent
          unusual
          unusualReasons
          metadata
        }
      }
    }`,
    { input }
  );

  return data.updateUser;
}

export async function deleteUserWithApi(id: string) {
  const data = await graphQL<{ deleteUser: boolean }>(
    `mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }`,
    { id }
  );

  return data.deleteUser;
}

export async function fetchRolesWithApi() {
  const data = await graphQL<{ roles: any[] }>(
    `query Roles {
      roles {
        id
        key
        name
        description
        permissions
        isSystem
      }
    }`
  );

  return data.roles;
}

export async function fetchAdminModules(group?: string) {
  const data = await graphQL<{ adminModules: any[] }>(
    `query AdminModules($group: String) {
      adminModules(group: $group) { ${moduleFields} }
    }`,
    { group }
  );

  return data.adminModules;
}

export async function updateAdminModuleStatus(key: string, status: string) {
  const data = await graphQL<{ updateAdminModuleStatus: any }>(
    `mutation UpdateAdminModuleStatus($key: String!, $status: String!) {
      updateAdminModuleStatus(key: $key, status: $status) { ${moduleFields} }
    }`,
    { key, status }
  );

  return data.updateAdminModuleStatus;
}

export async function upsertAdminModuleWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertAdminModule: any }>(
    `mutation UpsertAdminModule($input: UpsertAdminModuleInput!) {
      upsertAdminModule(input: $input) { ${moduleFields} }
    }`,
    { input }
  );

  return data.upsertAdminModule;
}

export async function fetchAuditLogs(resource?: string, resourceId?: string) {
  const data = await graphQL<{ auditLogs: any[] }>(
    `query AuditLogs($resource: String, $resourceId: String) {
      auditLogs(resource: $resource, resourceId: $resourceId) {
        id
        actorId
        action
        resource
        resourceId
        metadata
        createdAt
      }
    }`,
    { resource, resourceId }
  );

  return data.auditLogs;
}

export async function fetchNotificationsWithApi(scope?: string, status?: string, type?: string) {
  const data = await graphQL<{ notifications: any[] }>(
    `query Notifications($scope: String, $status: String, $type: String) {
      notifications(scope: $scope, status: $status, type: $type) {
        id
        ownerId
        scope
        scopeId
        type
        title
        message
        status
        metadata
        readAt
        createdAt
      }
    }`,
    { scope, status, type }
  );

  return data.notifications;
}

export async function markNotificationReadWithApi(id: string) {
  const data = await graphQL<{ markNotificationRead: any }>(
    `mutation MarkNotificationRead($id: ID!) {
      markNotificationRead(id: $id) {
        id
        status
        readAt
      }
    }`,
    { id }
  );

  return data.markNotificationRead;
}

export async function createNotificationWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createNotification: any }>(
    `mutation CreateNotification($input: CreateNotificationInput!) {
      createNotification(input: $input) {
        id
        ownerId
        scope
        scopeId
        type
        title
        message
        status
        metadata
        readAt
        createdAt
      }
    }`,
    { input }
  );

  return data.createNotification;
}

export async function fetchApiCredentialsWithApi(ownerId?: string) {
  const data = await graphQL<{ apiCredentials: any[] }>(
    `query ApiCredentials($ownerId: ID) {
      apiCredentials(ownerId: $ownerId) {
        id
        ownerId
        name
        scopes
        status
        lastUsedAt
        expiresAt
        createdAt
      }
    }`,
    { ownerId }
  );

  return data.apiCredentials;
}

export async function createApiCredentialWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createApiCredential: any }>(
    `mutation CreateApiCredential($input: CreateApiCredentialInput!) {
      createApiCredential(input: $input) {
        id
        ownerId
        name
        scopes
        status
        createdAt
      }
    }`,
    { input }
  );

  return data.createApiCredential;
}

export async function revokeApiCredentialWithApi(id: string) {
  const data = await graphQL<{ revokeApiCredential: any }>(
    `mutation RevokeApiCredential($id: ID!) {
      revokeApiCredential(id: $id) {
        id
        status
      }
    }`,
    { id }
  );

  return data.revokeApiCredential;
}

export async function fetchIntegrationsWithApi(group?: string, status?: string) {
  const data = await graphQL<{ integrations: any[] }>(
    `query Integrations($group: String, $status: String) {
      integrations(group: $group, status: $status) {
        id
        key
        group
        name
        status
        config
        health
        lastSyncAt
      }
    }`,
    { group, status }
  );

  return data.integrations;
}

export async function upsertIntegrationWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertIntegration: any }>(
    `mutation UpsertIntegration($input: UpsertIntegrationInput!) {
      upsertIntegration(input: $input) {
        id
        key
        group
        name
        status
        config
        health
      }
    }`,
    { input }
  );

  return data.upsertIntegration;
}

export async function fetchMainAdminRecordsWithApi(section: string, scopeId = MAIN_ADMIN_SCOPE_ID) {
  const setting = await fetchAdminRecordSetting(section, scopeId);
  return normalizeAdminRecords(section, setting);
}

export async function upsertMainAdminRecordWithApi(input: {
  section: string;
  id?: string;
  title: string;
  status?: string;
  data?: Record<string, unknown>;
  scopeId?: string;
}) {
  const setting = await fetchAdminRecordSetting(input.section, input.scopeId);
  const records = normalizeAdminRecords(input.section, setting);
  const now = new Date().toISOString();
  const id = input.id || makeId();
  const existing = records.find((record) => record.id === id);
  const nextRecord: MainAdminRecord = {
    id,
    section: input.section,
    title: input.title,
    status: input.status || 'active',
    data: input.data || {},
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  const nextRecords = records.some((record) => record.id === id)
    ? records.map((record) => (record.id === id ? nextRecord : record))
    : [nextRecord, ...records];

  await saveAdminRecordSetting(input.section, nextRecords, input.scopeId);
  return nextRecord;
}

export async function deleteMainAdminRecordWithApi(section: string, id: string, scopeId = MAIN_ADMIN_SCOPE_ID) {
  const setting = await fetchAdminRecordSetting(section, scopeId);
  const nextRecords = normalizeAdminRecords(section, setting).filter((record) => record.id !== id);
  await saveAdminRecordSetting(section, nextRecords, scopeId);
  return true;
}
