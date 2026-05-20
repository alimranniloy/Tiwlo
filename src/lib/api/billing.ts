import { graphQL } from './client';

const invoiceFields = `
  id
  ownerId
  number
  amount
  currency
  status
  scope
  scopeId
  items
  dueDate
  paidAt
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
  hourlyRate
  monthlyCost
  invoice {
    ${invoiceFields}
  }
  resource {
    id
    ownerId
    type
    name
    ip
    status
    region
    specs
    image
    plan
    cpu
    ram
    disk
    monthlyCost
    metadata
    createdAt
    updatedAt
  }
`;

const billingOverviewFields = `
  credits
  monthlySpend
  hourlySpend
  accruedUsage
  outstanding
  dueAmount
  projectedMonthly
  usageLines {
    resourceId
    name
    monthlyCost
    hourlyRate
    hours
    amount
  }
  invoices {
    ${invoiceFields}
  }
`;

export async function fetchInvoicesWithApi(scope?: string) {
  const data = await graphQL<{ invoices: any[] }>(
    `query Invoices($scope: String) {
      invoices(scope: $scope) {
        ${invoiceFields}
      }
    }`,
    { scope }
  );

  return data.invoices;
}

export async function fetchBillingOverviewWithApi() {
  const data = await graphQL<{ billingOverview: any }>(
    `query BillingOverview {
      billingOverview {
        ${billingOverviewFields}
      }
    }`
  );

  return data.billingOverview;
}

export async function settleUsageBillingWithApi() {
  const data = await graphQL<{ settleUsageBilling: any }>(
    `mutation SettleUsageBilling {
      settleUsageBilling {
        ${billingOverviewFields}
      }
    }`
  );

  return data.settleUsageBilling;
}

export async function runCreditAutomationWithApi(ownerId?: string) {
  const data = await graphQL<{ runCreditAutomation: any }>(
    `mutation RunCreditAutomation($input: CreditAutomationInput) {
      runCreditAutomation(input: $input) {
        checkedAt
        mode
        owners
        suspended
        resumed
        results {
          ownerId
          credits
          action
          resourcesSuspended
          resourcesResumed
          storesSuspended
          storesResumed
          ispSitesSuspended
          ispSitesResumed
          networkNodesSuspended
          networkNodesResumed
        }
      }
    }`,
    { input: ownerId ? { ownerId } : {} }
  );

  return data.runCreditAutomation;
}

export async function createInvoiceWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createInvoice: any }>(
    `mutation CreateInvoice($input: CreateInvoiceInput!) {
      createInvoice(input: $input) {
        id
        number
        amount
        status
        scope
      }
    }`,
    { input }
  );

  return data.createInvoice;
}

export async function markInvoicePaidWithApi(id: string) {
  const data = await graphQL<{ markInvoicePaid: any }>(
    `mutation MarkInvoicePaid($id: ID!) {
      markInvoicePaid(id: $id) {
        id
        status
        paidAt
      }
    }`,
    { id }
  );

  return data.markInvoicePaid;
}

export async function startInvoicePaymentWithApi(invoiceId: string, provider: string) {
  const data = await graphQL<{ startInvoicePayment: any }>(
    `mutation StartInvoicePayment($input: StartInvoicePaymentInput!) {
      startInvoicePayment(input: $input) {
        ${checkoutFields}
      }
    }`,
    { input: { invoiceId, provider } }
  );

  return data.startInvoicePayment;
}

export async function startCreditTopUpWithApi(amount: number, currency: string, provider: string) {
  const data = await graphQL<{ startCreditTopUp: any }>(
    `mutation StartCreditTopUp($input: StartCreditTopUpInput!) {
      startCreditTopUp(input: $input) {
        ${checkoutFields}
      }
    }`,
    { input: { amount, currency, provider } }
  );

  return data.startCreditTopUp;
}

export async function fetchPaymentGatewaysWithApi(status?: string) {
  const data = await graphQL<{ paymentGateways: any[] }>(
    `query PaymentGateways($status: String) {
      paymentGateways(status: $status) {
        id
        key
        name
        provider
        status
        mode
        credentials
        settings
        createdAt
        updatedAt
      }
    }`,
    { status }
  );

  return data.paymentGateways;
}

export async function fetchAvailablePaymentGatewaysWithApi() {
  const data = await graphQL<{ availablePaymentGateways: any[] }>(
    `query AvailablePaymentGateways {
      availablePaymentGateways {
        id
        key
        name
        provider
        status
        mode
        settings
        createdAt
      }
    }`
  );

  return data.availablePaymentGateways;
}

export async function upsertPaymentGatewayWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertPaymentGateway: any }>(
    `mutation UpsertPaymentGateway($input: UpsertPaymentGatewayInput!) {
      upsertPaymentGateway(input: $input) {
        id
        key
        name
        provider
        status
        mode
        credentials
        settings
        updatedAt
      }
    }`,
    { input }
  );

  return data.upsertPaymentGateway;
}

export async function testPaymentGatewayWithApi(key: string) {
  const data = await graphQL<{ testPaymentGateway: any }>(
    `mutation TestPaymentGateway($key: String!) {
      testPaymentGateway(key: $key) {
        key
        provider
        mode
        ok
        endpoint
        message
        credentials
        checkedAt
      }
    }`,
    { key }
  );

  return data.testPaymentGateway;
}
