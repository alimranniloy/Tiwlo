import { graphQL } from './client';

const tPanelPackageFields = `
  id
  code
  name
  description
  price
  currency
  interval
  maxAccounts
  maxDomains
  maxDatabases
  maxEmailAccounts
  maxNodeApps
  features
  status
  sortOrder
  metadata
  createdAt
  updatedAt
`;

const tPanelLicenseFields = `
  id
  ownerId
  packageId
  invoiceId
  licenseKey
  label
  serverIp
  serverFingerprint
  status
  billingStatus
  amount
  currency
  issuedAt
  activatedAt
  currentPeriodStart
  currentPeriodEnd
  suspendedAt
  cancelledAt
  lastCheckAt
  lastHeartbeatAt
  metadata
  installCommand
  package {
    id
    code
    name
    maxAccounts
    maxDomains
    maxDatabases
    maxEmailAccounts
    maxNodeApps
    features
  }
  owner {
    id
    name
    email
  }
  invoice {
    id
    number
    status
    amount
    dueDate
  }
  node {
    hostname
    os
    panelVersion
    agentVersion
    lastSeenAt
  }
  createdAt
  updatedAt
`;

const tPanelUpdateFields = `
  id
  version
  title
  channel
  status
  isForced
  releaseNotes
  packageUrl
  checksum
  rolloutMessage
  publishedAt
  metadata
  createdAt
  updatedAt
`;

const tPanelAccountPackageFields = `
  id
  licenseId
  name
  code
  description
  status
  diskMB
  bandwidthGB
  domains
  databases
  emailAccounts
  nodeApps
  ftpAccounts
  metadata
  createdAt
  updatedAt
`;

const tPanelManagedAccountFields = `
  id
  licenseId
  packageId
  username
  domain
  contactEmail
  ownerName
  status
  ipAddress
  homeDirectory
  limits
  usage
  metadata
  createdAt
  updatedAt
`;

const tPanelDnsZoneFields = `
  id
  licenseId
  accountId
  domain
  status
  records
  serial
  lastSyncedAt
  metadata
  createdAt
  updatedAt
`;

const tPanelServiceStateFields = `
  id
  licenseId
  name
  displayName
  status
  enabled
  port
  lastRestartAt
  lastCheckAt
  metadata
  createdAt
  updatedAt
`;

const tPanelSecurityRuleFields = `
  id
  licenseId
  kind
  name
  action
  value
  status
  metadata
  createdAt
  updatedAt
`;

const tPanelRemoteTaskFields = `
  id
  licenseId
  accountId
  action
  status
  priority
  payload
  result
  requestedById
  queuedAt
  dispatchedAt
  completedAt
  createdAt
  updatedAt
`;

const checkoutFields = `
  status
  provider
  paymentUrl
  reference
  message
  creditBalance
  invoice {
    id
    number
    amount
    currency
    status
    scope
    scopeId
    dueDate
    paidAt
  }
`;

export async function fetchTPanelPackagesWithApi(status = 'active') {
  const data = await graphQL<{ tPanelPackages: any[] }>(
    `query TPanelPackages($status: String) {
      tPanelPackages(status: $status) {
        ${tPanelPackageFields}
      }
    }`,
    { status }
  );

  return data.tPanelPackages;
}

export async function fetchMyTPanelLicensesWithApi() {
  const data = await graphQL<{ myTPanelLicenses: any[] }>(
    `query MyTPanelLicenses {
      myTPanelLicenses {
        ${tPanelLicenseFields}
      }
    }`
  );

  return data.myTPanelLicenses;
}

export async function createTPanelLicenseOrderWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createTPanelLicenseOrder: any }>(
    `mutation CreateTPanelLicenseOrder($input: CreateTPanelLicenseOrderInput!) {
      createTPanelLicenseOrder(input: $input) {
        ${tPanelLicenseFields}
      }
    }`,
    { input }
  );

  return data.createTPanelLicenseOrder;
}

export async function payTPanelLicenseOrderWithApi(licenseId: string, provider = 'credit') {
  const data = await graphQL<{ payTPanelLicenseOrder: any }>(
    `mutation PayTPanelLicenseOrder($input: PayTPanelLicenseOrderInput!) {
      payTPanelLicenseOrder(input: $input) {
        license {
          ${tPanelLicenseFields}
        }
        checkout {
          ${checkoutFields}
        }
      }
    }`,
    { input: { licenseId, provider } }
  );

  return data.payTPanelLicenseOrder;
}

export async function renewTPanelLicenseOrderWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ renewTPanelLicenseOrder: any }>(
    `mutation RenewTPanelLicenseOrder($input: RenewTPanelLicenseOrderInput!) {
      renewTPanelLicenseOrder(input: $input) {
        ${tPanelLicenseFields}
      }
    }`,
    { input }
  );

  return data.renewTPanelLicenseOrder;
}

export async function fetchAdminTPanelOverviewWithApi() {
  const data = await graphQL<{ adminTPanelOverview: any }>(
    `query AdminTPanelOverview {
      adminTPanelOverview {
        summary {
          packages
          licenses
          activeLicenses
          suspendedLicenses
          expiredLicenses
          pendingLicenses
          monthlyRevenue
          dueAmount
        }
        licenses {
          ${tPanelLicenseFields}
        }
        packages {
          ${tPanelPackageFields}
        }
        updates {
          ${tPanelUpdateFields}
        }
      }
    }`
  );

  return data.adminTPanelOverview;
}

export async function adminUpdateTPanelLicenseStatusWithApi(id: string, status: string, note?: string) {
  const data = await graphQL<{ adminUpdateTPanelLicenseStatus: any }>(
    `mutation AdminUpdateTPanelLicenseStatus($input: AdminTPanelLicenseStatusInput!) {
      adminUpdateTPanelLicenseStatus(input: $input) {
        ${tPanelLicenseFields}
      }
    }`,
    { input: { id, status, note } }
  );

  return data.adminUpdateTPanelLicenseStatus;
}

export async function adminPublishTPanelUpdateWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ adminPublishTPanelUpdate: any }>(
    `mutation AdminPublishTPanelUpdate($input: AdminPublishTPanelUpdateInput!) {
      adminPublishTPanelUpdate(input: $input) {
        ${tPanelUpdateFields}
      }
    }`,
    { input }
  );

  return data.adminPublishTPanelUpdate;
}

export async function fetchTPanelControlOverviewWithApi(licenseId?: string) {
  const data = await graphQL<{ tPanelControlOverview: any }>(
    `query TPanelControlOverview($licenseId: ID) {
      tPanelControlOverview(licenseId: $licenseId) {
        sections {
          key
          label
          description
          actions
        }
        license {
          ${tPanelLicenseFields}
        }
        packages {
          ${tPanelAccountPackageFields}
        }
        accounts {
          ${tPanelManagedAccountFields}
        }
        dnsZones {
          ${tPanelDnsZoneFields}
        }
        services {
          ${tPanelServiceStateFields}
        }
        securityRules {
          ${tPanelSecurityRuleFields}
        }
        tasks {
          ${tPanelRemoteTaskFields}
        }
        requiredPackages
      }
    }`,
    { licenseId }
  );

  return data.tPanelControlOverview;
}

export async function upsertTPanelAccountPackageWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertTPanelAccountPackage: any }>(
    `mutation UpsertTPanelAccountPackage($input: TPanelAccountPackageInput!) {
      upsertTPanelAccountPackage(input: $input) {
        ${tPanelAccountPackageFields}
      }
    }`,
    { input }
  );

  return data.upsertTPanelAccountPackage;
}

export async function createTPanelManagedAccountWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createTPanelManagedAccount: any }>(
    `mutation CreateTPanelManagedAccount($input: TPanelManagedAccountInput!) {
      createTPanelManagedAccount(input: $input) {
        ${tPanelManagedAccountFields}
      }
    }`,
    { input }
  );

  return data.createTPanelManagedAccount;
}

export async function updateTPanelManagedAccountStatusWithApi(id: string, status: string, note?: string) {
  const data = await graphQL<{ updateTPanelManagedAccountStatus: any }>(
    `mutation UpdateTPanelManagedAccountStatus($input: TPanelManagedAccountStatusInput!) {
      updateTPanelManagedAccountStatus(input: $input) {
        ${tPanelManagedAccountFields}
      }
    }`,
    { input: { id, status, note } }
  );

  return data.updateTPanelManagedAccountStatus;
}

export async function upsertTPanelDnsZoneWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertTPanelDnsZone: any }>(
    `mutation UpsertTPanelDnsZone($input: TPanelDnsZoneInput!) {
      upsertTPanelDnsZone(input: $input) {
        ${tPanelDnsZoneFields}
      }
    }`,
    { input }
  );

  return data.upsertTPanelDnsZone;
}

export async function upsertTPanelServiceStateWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertTPanelServiceState: any }>(
    `mutation UpsertTPanelServiceState($input: TPanelServiceStateInput!) {
      upsertTPanelServiceState(input: $input) {
        ${tPanelServiceStateFields}
      }
    }`,
    { input }
  );

  return data.upsertTPanelServiceState;
}

export async function upsertTPanelSecurityRuleWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertTPanelSecurityRule: any }>(
    `mutation UpsertTPanelSecurityRule($input: TPanelSecurityRuleInput!) {
      upsertTPanelSecurityRule(input: $input) {
        ${tPanelSecurityRuleFields}
      }
    }`,
    { input }
  );

  return data.upsertTPanelSecurityRule;
}

export async function queueTPanelRemoteTaskWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ queueTPanelRemoteTask: any }>(
    `mutation QueueTPanelRemoteTask($input: TPanelRemoteTaskInput!) {
      queueTPanelRemoteTask(input: $input) {
        ${tPanelRemoteTaskFields}
      }
    }`,
    { input }
  );

  return data.queueTPanelRemoteTask;
}
