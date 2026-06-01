import { Droplet, User } from '../../types';
import { apiDomainToDomain, domainFields, graphQL, resourceFields, resourceToDroplet, userFields } from './client';

export type CloudResourceRecord = {
  id: string;
  ownerId: string;
  type: string;
  name: string;
  ip?: string | null;
  status: string;
  region: string;
  specs: string;
  image?: string | null;
  plan?: string | null;
  cpu?: string | null;
  ram?: string | null;
  disk?: string | null;
  monthlyCost?: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchConsoleData() {
  const data = await graphQL<{
    me: User | null;
    droplets: any[];
    domains: any[];
  }>(
    `query ConsoleData {
      me { ${userFields} }
      droplets { ${resourceFields} }
      domains { ${domainFields} }
    }`
  );

  return {
    user: data.me,
    droplets: data.droplets.map(resourceToDroplet),
    domains: data.domains.map(apiDomainToDomain)
  };
}

export async function createDropletWithApi(input: {
  name: string;
  region: string;
  specs: string;
  image?: string;
  plan?: string;
  cpu?: string;
  ram?: string;
  disk?: string;
  monthlyCost?: number;
  metadata?: Record<string, unknown>;
}) {
  const data = await graphQL<{ createCloudResource: any }>(
    `mutation CreateDroplet($input: CreateCloudResourceInput!) {
      createCloudResource(input: $input) { ${resourceFields} }
    }`,
    { input: { type: 'droplet', ...input } }
  );

  return resourceToDroplet(data.createCloudResource);
}

export async function createCloudResourceOrderWithApi(input: {
  resource: {
    type: string;
    name: string;
    region: string;
    specs: string;
    image?: string;
    plan?: string;
    cpu?: string;
    ram?: string;
    disk?: string;
    ip?: string;
    monthlyCost?: number;
    metadata?: Record<string, unknown>;
  };
  provider?: string;
  currency?: string;
  initialCharge?: number;
  hourlyRate?: number;
}) {
  const data = await graphQL<{ createCloudResourceOrder: any }>(
    `mutation CreateCloudResourceOrder($input: CreateCloudResourceOrderInput!) {
      createCloudResourceOrder(input: $input) {
        status
        provider
        paymentUrl
        reference
        message
        creditBalance
        hourlyRate
        monthlyCost
        invoice {
          id
          number
          amount
          currency
          status
          scope
          items
          dueDate
          createdAt
        }
        resource { ${resourceFields} }
      }
    }`,
    { input }
  );

  return data.createCloudResourceOrder;
}

export async function fetchPlansWithApi(product?: string) {
  const data = await graphQL<{ plans: any[] }>(
    `query Plans($product: String) {
      plans(product: $product) {
        id
        code
        product
        name
        price
        interval
        features
        limits
        isActive
        createdAt
        updatedAt
      }
    }`,
    { product }
  );

  return data.plans;
}

export async function upsertPlanWithApi(input: {
  id?: string;
  code: string;
  product: string;
  name: string;
  price: number;
  interval?: string;
  features: unknown;
  limits?: unknown;
  isActive?: boolean;
}) {
  const data = await graphQL<{ upsertPlan: any }>(
    `mutation UpsertPlan($input: UpsertPlanInput!) {
      upsertPlan(input: $input) {
        id
        code
        product
        name
        price
        interval
        features
        limits
        isActive
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.upsertPlan;
}

export async function deletePlanWithApi(id: string) {
  const data = await graphQL<{ deletePlan: boolean }>(
    `mutation DeletePlan($id: ID!) {
      deletePlan(id: $id)
    }`,
    { id }
  );

  return data.deletePlan;
}

export async function fetchCloudResourcesWithApi(type?: string, search?: string) {
  const data = await graphQL<{ cloudResources: CloudResourceRecord[] }>(
    `query CloudResources($type: String, $search: String) {
      cloudResources(type: $type, search: $search) { ${resourceFields} }
    }`,
    { type, search }
  );

  return data.cloudResources;
}

export async function createCloudResourceWithApi(input: {
  type: string;
  name: string;
  region: string;
  specs: string;
  image?: string;
  plan?: string;
  cpu?: string;
  ram?: string;
  disk?: string;
  monthlyCost?: number;
  metadata?: Record<string, unknown>;
}) {
  const data = await graphQL<{ createCloudResource: CloudResourceRecord }>(
    `mutation CreateCloudResource($input: CreateCloudResourceInput!) {
      createCloudResource(input: $input) { ${resourceFields} }
    }`,
    { input }
  );

  return data.createCloudResource;
}

export async function updateCloudResourceStatusWithApi(id: string, status: string) {
  const data = await graphQL<{ updateResourceStatus: CloudResourceRecord }>(
    `mutation UpdateCloudResourceStatus($id: ID!, $status: String!) {
      updateResourceStatus(id: $id, status: $status) { ${resourceFields} }
    }`,
    { id, status }
  );

  return data.updateResourceStatus;
}

export async function deleteCloudResourceWithApi(id: string) {
  const data = await graphQL<{ deleteCloudResource: boolean }>(
    `mutation DeleteCloudResource($id: ID!) {
      deleteCloudResource(id: $id)
    }`,
    { id }
  );

  return data.deleteCloudResource;
}

export async function createSystemServerWithApi(input: {
  name: string;
  region: string;
  specs: string;
  ip?: string;
  provider?: string;
  role?: string;
  metadata?: Record<string, unknown>;
}) {
  const data = await graphQL<{ createCloudResource: any }>(
    `mutation CreateSystemServer($input: CreateCloudResourceInput!) {
      createCloudResource(input: $input) { ${resourceFields} }
    }`,
    {
      input: {
        type: 'system_server',
        name: input.name,
        region: input.region,
        specs: input.specs,
        ip: input.ip,
        metadata: {
          provider: input.provider,
          role: input.role,
          ip: input.ip,
          ...(input.metadata || {})
        }
      }
    }
  );

  return resourceToDroplet(data.createCloudResource);
}

export async function updateDropletStatusWithApi(id: string, status: Droplet['status']) {
  const data = await graphQL<{ updateResourceStatus: any }>(
    `mutation UpdateResourceStatus($id: ID!, $status: String!) {
      updateResourceStatus(id: $id, status: $status) { ${resourceFields} }
    }`,
    { id, status }
  );

  return resourceToDroplet(data.updateResourceStatus);
}

export async function createTPanelResourceLoginWithApi(id: string) {
  const data = await graphQL<{ createTPanelResourceLogin: { url: string; username: string; accountId?: string; message: string } }>(
    `mutation CreateTPanelResourceLogin($id: ID!) {
      createTPanelResourceLogin(id: $id) {
        url
        username
        accountId
        message
      }
    }`,
    { id }
  );

  return data.createTPanelResourceLogin;
}

export async function changeTPanelResourcePasswordWithApi(id: string, password: string) {
  const data = await graphQL<{ changeTPanelResourcePassword: any }>(
    `mutation ChangeTPanelResourcePassword($id: ID!, $password: String!) {
      changeTPanelResourcePassword(id: $id, password: $password) { ${resourceFields} }
    }`,
    { id, password }
  );

  return resourceToDroplet(data.changeTPanelResourcePassword);
}

export async function deleteDropletWithApi(id: string) {
  await graphQL<{ deleteCloudResource: boolean }>(
    `mutation DeleteResource($id: ID!) {
      deleteCloudResource(id: $id)
    }`,
    { id }
  );
}
