import { graphQL } from './client';

const ispSiteFields = `
  id
  ownerId
  planId
  name
  code
  region
  status
  node
  bandwidth
  subscribers
  settings
  createdAt
  updatedAt
`;

export async function fetchIspDashboardSummary() {
  const data = await graphQL<{ ispDashboardSummary: any }>(
    `query IspDashboardSummary {
      ispDashboardSummary {
        sites
        clients
        routers
        packages
        invoices
        revenue
      }
    }`
  );

  return data.ispDashboardSummary;
}

export async function createIspSiteWithApi(input: {
  name: string;
  code: string;
  region: string;
  node: string;
  bandwidth: string;
  subscribers?: number;
  planCode?: string;
  settings?: Record<string, unknown>;
}) {
  const data = await graphQL<{ createIspSite: { id: string; code: string } }>(
    `mutation CreateIspSite($input: CreateIspSiteInput!) {
      createIspSite(input: $input) { id code }
    }`,
    { input }
  );

  return data.createIspSite;
}

export async function fetchPrimaryIspSite() {
  const sites = await fetchIspSitesWithApi();
  return sites[0] || null;
}

export async function fetchIspSiteByIdWithApi(id: string) {
  const data = await graphQL<{ ispSite: any }>(
    `query IspSite($id: ID!) {
      ispSite(id: $id) {
        ${ispSiteFields}
      }
    }`,
    { id }
  );

  return data.ispSite;
}

export async function updateIspSiteWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateIspSite: any }>(
    `mutation UpdateIspSite($input: UpdateIspSiteInput!) {
      updateIspSite(input: $input) {
        ${ispSiteFields}
      }
    }`,
    { input }
  );

  return data.updateIspSite;
}

export async function createIspRouterWithApi(input: {
  siteId: string;
  name: string;
  ip: string;
  vendor?: string;
  config?: Record<string, unknown>;
}) {
  const data = await graphQL<{ createIspRouter: { id: string } }>(
    `mutation CreateIspRouter($input: CreateIspRouterInput!) {
      createIspRouter(input: $input) { id }
    }`,
    { input }
  );

  return data.createIspRouter;
}

export async function updateIspRouterWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateIspRouter: any }>(
    `mutation UpdateIspRouter($input: UpdateIspRouterInput!) {
      updateIspRouter(input: $input) {
        id
        siteId
        name
        ip
        vendor
        status
        config
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.updateIspRouter;
}

export async function deleteIspRouterWithApi(id: string) {
  const data = await graphQL<{ deleteIspRouter: boolean }>(
    `mutation DeleteIspRouter($id: ID!) {
      deleteIspRouter(id: $id)
    }`,
    { id }
  );

  return data.deleteIspRouter;
}

export async function syncIspRouterWithApi(id: string) {
  const data = await graphQL<{ syncIspRouter: any }>(
    `mutation SyncIspRouter($id: ID!) {
      syncIspRouter(id: $id) {
        id
        status
        config
        updatedAt
      }
    }`,
    { id }
  );

  return data.syncIspRouter;
}

export async function fetchIspSitesWithApi() {
  const data = await graphQL<{ ispSites: any[] }>(
    `query IspSites {
      ispSites {
        ${ispSiteFields}
      }
    }`
  );

  return data.ispSites;
}

export async function fetchIspClientsWithApi(search?: string, siteId?: string) {
  const data = await graphQL<{ ispClients: any[] }>(
    `query IspClients($search: String, $siteId: ID) {
      ispClients(search: $search, siteId: $siteId) {
        id
        siteId
        packageId
        name
        username
        email
        phone
        address
        status
        balance
        metadata
        createdAt
        updatedAt
      }
    }`,
    { search, siteId }
  );

  return data.ispClients;
}

export async function createIspClientWithApi(input: {
  siteId: string;
  packageId?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  balance?: number;
  metadata?: unknown;
}) {
  const data = await graphQL<{ createIspClient: any }>(
    `mutation CreateIspClient($input: CreateIspClientInput!) {
      createIspClient(input: $input) {
        id
        siteId
        packageId
        name
        username
        email
        phone
        address
        status
        balance
        metadata
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.createIspClient;
}

export async function updateIspClientWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateIspClient: any }>(
    `mutation UpdateIspClient($input: UpdateIspClientInput!) {
      updateIspClient(input: $input) {
        id
        siteId
        packageId
        name
        username
        email
        phone
        address
        status
        balance
        metadata
        updatedAt
      }
    }`,
    { input }
  );

  return data.updateIspClient;
}

export async function deleteIspClientWithApi(id: string) {
  const data = await graphQL<{ deleteIspClient: boolean }>(
    `mutation DeleteIspClient($id: ID!) {
      deleteIspClient(id: $id)
    }`,
    { id }
  );

  return data.deleteIspClient;
}

export async function fetchIspPackagesWithApi() {
  const data = await graphQL<{ ispPackages: any[] }>(
    `query IspPackages {
      ispPackages {
        id
        name
        speed
        price
        features
        status
        createdAt
        updatedAt
      }
    }`
  );

  return data.ispPackages;
}

export async function fetchIspRoutersWithApi(siteId: string) {
  const data = await graphQL<{ ispRouters: any[] }>(
    `query IspRouters($siteId: ID!) {
      ispRouters(siteId: $siteId) {
        id
        siteId
        name
        ip
        vendor
        status
        config
        createdAt
        updatedAt
      }
    }`,
    { siteId }
  );

  return data.ispRouters;
}

export async function fetchRadiusServersWithApi(siteId: string) {
  const data = await graphQL<{ radiusServers: any[] }>(
    `query RadiusServers($siteId: ID!) {
      radiusServers(siteId: $siteId) {
        id
        siteId
        name
        host
        secret
        status
        metadata
        createdAt
        updatedAt
      }
    }`,
    { siteId }
  );

  return data.radiusServers;
}

export async function createRadiusServerWithApi(input: {
  siteId: string;
  name: string;
  host: string;
  secret: string;
  metadata?: unknown;
}) {
  const data = await graphQL<{ createRadiusServer: any }>(
    `mutation CreateRadiusServer($input: CreateRadiusServerInput!) {
      createRadiusServer(input: $input) {
        id
        siteId
        name
        host
        status
        metadata
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.createRadiusServer;
}

export async function updateRadiusServerWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateRadiusServer: any }>(
    `mutation UpdateRadiusServer($input: UpdateRadiusServerInput!) {
      updateRadiusServer(input: $input) {
        id
        siteId
        name
        host
        status
        metadata
        updatedAt
      }
    }`,
    { input }
  );

  return data.updateRadiusServer;
}

export async function deleteRadiusServerWithApi(id: string) {
  const data = await graphQL<{ deleteRadiusServer: boolean }>(
    `mutation DeleteRadiusServer($id: ID!) {
      deleteRadiusServer(id: $id)
    }`,
    { id }
  );

  return data.deleteRadiusServer;
}

export async function fetchNetworkDevicesWithApi(siteId: string, type?: string) {
  const data = await graphQL<{ networkDevices: any[] }>(
    `query NetworkDevices($siteId: ID!, $type: String) {
      networkDevices(siteId: $siteId, type: $type) {
        id
        siteId
        type
        name
        serial
        status
        metadata
        createdAt
        updatedAt
      }
    }`,
    { siteId, type }
  );

  return data.networkDevices;
}

export async function upsertNetworkDeviceWithApi(input: {
  siteId: string;
  type: string;
  id?: string;
  name: string;
  serial?: string;
  status?: string;
  metadata?: unknown;
}) {
  const data = await graphQL<{ upsertNetworkDevice: any }>(
    `mutation UpsertNetworkDevice($input: NetworkDeviceInput!) {
      upsertNetworkDevice(input: $input) {
        id
        siteId
        type
        name
        serial
        status
        metadata
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.upsertNetworkDevice;
}

export async function deleteNetworkDeviceWithApi(id: string) {
  const data = await graphQL<{ deleteNetworkDevice: boolean }>(
    `mutation DeleteNetworkDevice($id: ID!) {
      deleteNetworkDevice(id: $id)
    }`,
    { id }
  );

  return data.deleteNetworkDevice;
}

export async function fetchIspInvoicesWithApi(status?: string, siteId?: string) {
  const data = await graphQL<{ ispInvoices: any[] }>(
    `query IspInvoices($status: String, $siteId: ID) {
      ispInvoices(status: $status, siteId: $siteId) {
        id
        siteId
        number
        clientName
        amount
        status
        dueDate
        items
        createdAt
      }
    }`,
    { status, siteId }
  );

  return data.ispInvoices;
}

export async function fetchIspAdminRecordsWithApi(siteId: string, section: string) {
  const data = await graphQL<{ ispAdminRecords: any[] }>(
    `query IspAdminRecords($siteId: ID!, $section: String!) {
      ispAdminRecords(siteId: $siteId, section: $section) {
        id
        siteId
        section
        title
        status
        data
        createdAt
        updatedAt
      }
    }`,
    { siteId, section }
  );

  return data.ispAdminRecords;
}

export async function upsertIspAdminRecordWithApi(input: {
  siteId: string;
  section: string;
  id?: string;
  title: string;
  status?: string;
  data?: unknown;
}) {
  const data = await graphQL<{ upsertIspAdminRecord: any }>(
    `mutation UpsertIspAdminRecord($input: IspAdminRecordInput!) {
      upsertIspAdminRecord(input: $input) {
        id
        siteId
        section
        title
        status
        data
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.upsertIspAdminRecord;
}

export async function deleteIspAdminRecordWithApi(siteId: string, section: string, id: string) {
  const data = await graphQL<{ deleteIspAdminRecord: boolean }>(
    `mutation DeleteIspAdminRecord($siteId: ID!, $section: String!, $id: ID!) {
      deleteIspAdminRecord(siteId: $siteId, section: $section, id: $id)
    }`,
    { siteId, section, id }
  );

  return data.deleteIspAdminRecord;
}
