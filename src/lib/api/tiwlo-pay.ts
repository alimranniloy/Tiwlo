import { graphQL } from './client';

const gatewayFields = `
  id
  key
  name
  provider
  status
  mode
  settings
  createdAt
  updatedAt
`;

const profileFields = `
  id
  ownerId
  owner {
    id
    email
    name
    role
    status
  }
  displayName
  companyName
  supportEmail
  statementDescriptor
  apiKey
  secretPreview
  status
  settings
  createdAt
  updatedAt
`;

const publicProfileFields = `
  id
  displayName
  companyName
  supportEmail
  statementDescriptor
  status
  createdAt
  updatedAt
`;

const linkFields = `
  id
  profileId
  ownerId
  slug
  invoiceId
  title
  description
  amount
  currency
  customerName
  customerEmail
  status
  expiresAt
  allowedProviders
  metadata
  publicUrl
  paidAt
  createdAt
  updatedAt
`;

const transactionFields = `
  id
  profileId
  linkId
  link {
    ${linkFields}
  }
  ownerId
  amount
  fee
  netAmount
  currency
  provider
  status
  reference
  customerName
  customerEmail
  metadata
  createdAt
  updatedAt
`;

const withdrawalFields = `
  id
  profileId
  ownerId
  amount
  currency
  method
  destination
  status
  requestedAt
  processedAt
  metadata
  createdAt
  updatedAt
`;

const summaryFields = `
  balance
  grossVolume
  paidVolume
  fees
  availableForWithdrawal
  pendingWithdrawal
  totalWithdrawn
  totalLinks
  paidInvoices
  unpaidInvoices
  expiredInvoices
  transactions
  merchants
`;

const overviewFields = `
  profile {
    ${profileFields}
  }
  summary {
    ${summaryFields}
  }
  paymentLinks {
    ${linkFields}
  }
  transactions {
    ${transactionFields}
  }
  withdrawals {
    ${withdrawalFields}
  }
  gateways {
    ${gatewayFields}
  }
  chartData
  gatewayBreakdown
`;

export async function fetchTiwloPayOverviewWithApi() {
  const data = await graphQL<{ tiwloPayOverview: any }>(
    `query TiwloPayOverview {
      tiwloPayOverview {
        ${overviewFields}
      }
    }`
  );

  return data.tiwloPayOverview;
}

export async function fetchAdminTiwloPayOverviewWithApi() {
  const data = await graphQL<{ adminTiwloPayOverview: any }>(
    `query AdminTiwloPayOverview {
      adminTiwloPayOverview {
        summary {
          ${summaryFields}
        }
        profiles {
          ${profileFields}
        }
        paymentLinks {
          ${linkFields}
        }
        transactions {
          ${transactionFields}
        }
        withdrawals {
          ${withdrawalFields}
        }
        gateways {
          ${gatewayFields}
        }
        chartData
        gatewayBreakdown
      }
    }`
  );

  return data.adminTiwloPayOverview;
}

export async function fetchPublicTiwloPayLinkWithApi(slug: string) {
  const data = await graphQL<{ publicTiwloPayLink: any }>(
    `query PublicTiwloPayLink($slug: String!) {
      publicTiwloPayLink(slug: $slug) {
        profile {
          ${publicProfileFields}
        }
        link {
          ${linkFields}
        }
        gateways {
          ${gatewayFields}
        }
      }
    }`,
    { slug }
  );

  return data.publicTiwloPayLink;
}

export async function upsertTiwloPayProfileWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertTiwloPayProfile: any }>(
    `mutation UpsertTiwloPayProfile($input: UpsertTiwloPayProfileInput!) {
      upsertTiwloPayProfile(input: $input) {
        ${profileFields}
      }
    }`,
    { input }
  );

  return data.upsertTiwloPayProfile;
}

export async function rotateTiwloPayKeysWithApi() {
  const data = await graphQL<{ rotateTiwloPayKeys: any }>(
    `mutation RotateTiwloPayKeys {
      rotateTiwloPayKeys {
        secretKey
        profile {
          ${profileFields}
        }
      }
    }`
  );

  return data.rotateTiwloPayKeys;
}

export async function requestTiwloPayVerificationWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ requestTiwloPayVerification: any }>(
    `mutation RequestTiwloPayVerification($input: TiwloPayVerificationInput!) {
      requestTiwloPayVerification(input: $input) {
        message
        profile {
          ${profileFields}
        }
      }
    }`,
    { input }
  );

  return data.requestTiwloPayVerification;
}

export async function createTiwloPayLinkWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createTiwloPayLink: any }>(
    `mutation CreateTiwloPayLink($input: CreateTiwloPayLinkInput!) {
      createTiwloPayLink(input: $input) {
        ${linkFields}
      }
    }`,
    { input }
  );

  return data.createTiwloPayLink;
}

export async function payTiwloPayLinkWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ payTiwloPayLink: any }>(
    `mutation PayTiwloPayLink($input: PayTiwloPayLinkInput!) {
      payTiwloPayLink(input: $input) {
        status
        message
        provider
        paymentUrl
        reference
        link {
          ${linkFields}
        }
        transaction {
          ${transactionFields}
        }
      }
    }`,
    { input }
  );

  return data.payTiwloPayLink;
}

export async function requestTiwloPayWithdrawalWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ requestTiwloPayWithdrawal: any }>(
    `mutation RequestTiwloPayWithdrawal($input: RequestTiwloPayWithdrawalInput!) {
      requestTiwloPayWithdrawal(input: $input) {
        ${withdrawalFields}
      }
    }`,
    { input }
  );

  return data.requestTiwloPayWithdrawal;
}

export async function adminUpdateTiwloPayProfileStatusWithApi(id: string, status: string) {
  const data = await graphQL<{ adminUpdateTiwloPayProfileStatus: any }>(
    `mutation AdminUpdateTiwloPayProfileStatus($id: ID!, $status: String!) {
      adminUpdateTiwloPayProfileStatus(id: $id, status: $status) {
        ${profileFields}
      }
    }`,
    { id, status }
  );

  return data.adminUpdateTiwloPayProfileStatus;
}

export async function adminUpdateTiwloPayWithdrawalStatusWithApi(id: string, status: string) {
  const data = await graphQL<{ adminUpdateTiwloPayWithdrawalStatus: any }>(
    `mutation AdminUpdateTiwloPayWithdrawalStatus($id: ID!, $status: String!) {
      adminUpdateTiwloPayWithdrawalStatus(id: $id, status: $status) {
        ${withdrawalFields}
      }
    }`,
    { id, status }
  );

  return data.adminUpdateTiwloPayWithdrawalStatus;
}
