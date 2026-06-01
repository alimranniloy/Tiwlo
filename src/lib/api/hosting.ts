import { graphQL } from './client';

const hostingNodeFields = `
  id
  name
  hostname
  ip
  panel
  port
  username
  apiToken
  accessHash
  nameservers
  maxAccounts
  activeAccounts
  status
  monthlyCost
  location
  metadata
  createdAt
  updatedAt
`;

const hostingGroupFields = `
  id
  name
  slug
  description
  sortOrder
  status
  createdAt
  updatedAt
`;

const hostingProductFields = `
  id
  groupId
  groupName
  nodeId
  nodeName
  nodeIp
  code
  name
  module
  accountType
  status
  price
  setupFee
  interval
  limits
  serverConfig
  welcomeEmail
  createdAt
  updatedAt
`;

const hostingPackageFields = `
  id
  productId
  productName
  nodeId
  nodeName
  name
  whmPackageName
  accountType
  status
  limits
  pricing
  createdAt
  updatedAt
`;

const hostingOrderFields = `
  id
  ownerId
  productId
  productName
  packageId
  packageName
  nodeId
  nodeName
  nodeIp
  domain
  hostname
  username
  passwordSecret
  module
  accountType
  status
  amount
  currency
  provisioning
  createdAt
  updatedAt
`;

export async function fetchHostingComputeNodesWithApi(search?: string) {
  const data = await graphQL<{ hostingComputeNodes: any[] }>(
    `query HostingComputeNodes($search: String) {
      hostingComputeNodes(search: $search) {
        ${hostingNodeFields}
      }
    }`,
    { search }
  );

  return data.hostingComputeNodes;
}

export async function fetchCloudDeploymentNodesWithApi(search?: string) {
  const data = await graphQL<{ cloudDeploymentNodes: any[] }>(
    `query CloudDeploymentNodes($search: String) {
      cloudDeploymentNodes(search: $search) {
        id
        name
        ip
        panel
        port
        maxAccounts
        activeAccounts
        remainingAccounts
        location
        status
        metadata
      }
    }`,
    { search }
  );

  return data.cloudDeploymentNodes;
}

export async function upsertHostingComputeNodeWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertHostingComputeNode: any }>(
    `mutation UpsertHostingComputeNode($input: HostingComputeNodeInput!) {
      upsertHostingComputeNode(input: $input) {
        ${hostingNodeFields}
      }
    }`,
    { input }
  );

  return data.upsertHostingComputeNode;
}

export async function deleteHostingComputeNodeWithApi(id: string) {
  const data = await graphQL<{ deleteHostingComputeNode: boolean }>(
    `mutation DeleteHostingComputeNode($id: ID!) {
      deleteHostingComputeNode(id: $id)
    }`,
    { id }
  );

  return data.deleteHostingComputeNode;
}

export async function testHostingComputeNodeWithApi(id: string) {
  const data = await graphQL<{ testHostingComputeNode: any }>(
    `mutation TestHostingComputeNode($id: ID!) {
      testHostingComputeNode(id: $id) {
        ${hostingNodeFields}
      }
    }`,
    { id }
  );

  return data.testHostingComputeNode;
}

export async function fetchHostingProductGroupsWithApi(search?: string) {
  const data = await graphQL<{ hostingProductGroups: any[] }>(
    `query HostingProductGroups($search: String) {
      hostingProductGroups(search: $search) {
        ${hostingGroupFields}
      }
    }`,
    { search }
  );

  return data.hostingProductGroups;
}

export async function upsertHostingProductGroupWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertHostingProductGroup: any }>(
    `mutation UpsertHostingProductGroup($input: HostingProductGroupInput!) {
      upsertHostingProductGroup(input: $input) {
        ${hostingGroupFields}
      }
    }`,
    { input }
  );

  return data.upsertHostingProductGroup;
}

export async function fetchHostingProductsWithApi(search?: string) {
  const data = await graphQL<{ hostingProducts: any[] }>(
    `query HostingProducts($search: String) {
      hostingProducts(search: $search) {
        ${hostingProductFields}
      }
    }`,
    { search }
  );

  return data.hostingProducts;
}

export async function upsertHostingProductWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertHostingProduct: any }>(
    `mutation UpsertHostingProduct($input: HostingProductInput!) {
      upsertHostingProduct(input: $input) {
        ${hostingProductFields}
      }
    }`,
    { input }
  );

  return data.upsertHostingProduct;
}

export async function fetchHostingPackagesWithApi(search?: string) {
  const data = await graphQL<{ hostingPackages: any[] }>(
    `query HostingPackages($search: String) {
      hostingPackages(search: $search) {
        ${hostingPackageFields}
      }
    }`,
    { search }
  );

  return data.hostingPackages;
}

export async function upsertHostingPackageWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ upsertHostingPackage: any }>(
    `mutation UpsertHostingPackage($input: HostingPackageInput!) {
      upsertHostingPackage(input: $input) {
        ${hostingPackageFields}
      }
    }`,
    { input }
  );

  return data.upsertHostingPackage;
}

export async function fetchHostingProvisioningOrdersWithApi(search?: string) {
  const data = await graphQL<{ hostingProvisioningOrders: any[] }>(
    `query HostingProvisioningOrders($search: String) {
      hostingProvisioningOrders(search: $search) {
        ${hostingOrderFields}
      }
    }`,
    { search }
  );

  return data.hostingProvisioningOrders;
}

export async function createHostingProvisioningOrderWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createHostingProvisioningOrder: any }>(
    `mutation CreateHostingProvisioningOrder($input: CreateHostingProvisioningOrderInput!) {
      createHostingProvisioningOrder(input: $input) {
        ${hostingOrderFields}
      }
    }`,
    { input }
  );

  return data.createHostingProvisioningOrder;
}
