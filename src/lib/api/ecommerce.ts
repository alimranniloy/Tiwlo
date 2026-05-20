import { GRAPHQL_URL, graphQL } from './client';

const STORE_CUSTOMER_TOKEN_KEY = 'tiwlo_store_customer_token';
const STORE_CUSTOMER_STORE_KEY = 'tiwlo_store_customer_store_id';

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
  error?: string;
};

async function rawGraphQL<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables })
  });
  const text = await response.text();
  let json: GraphQLResponse<T> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const graphQLError = json?.errors?.map((error) => error.message).join(', ');
  const serverError = graphQLError || json?.error || text;
  if (!response.ok || json?.errors?.length) {
    throw new Error(serverError || 'GraphQL request failed');
  }
  if (!json?.data) throw new Error('GraphQL response did not include data');
  return json.data;
}

export function getStoreCustomerToken(storeId?: string) {
  if (storeId) {
    return localStorage.getItem(`${STORE_CUSTOMER_TOKEN_KEY}:${storeId}`) || localStorage.getItem(STORE_CUSTOMER_TOKEN_KEY);
  }
  return localStorage.getItem(STORE_CUSTOMER_TOKEN_KEY);
}

export function setStoreCustomerSession(token: string, storeId: string, customer?: unknown) {
  localStorage.setItem(STORE_CUSTOMER_TOKEN_KEY, token);
  localStorage.setItem(STORE_CUSTOMER_STORE_KEY, storeId);
  localStorage.setItem(`${STORE_CUSTOMER_TOKEN_KEY}:${storeId}`, token);
  if (customer) localStorage.setItem(`tiwlo_store_customer:${storeId}`, JSON.stringify(customer));
}

export function clearStoreCustomerSession(storeId?: string) {
  const currentStoreId = storeId || localStorage.getItem(STORE_CUSTOMER_STORE_KEY) || '';
  localStorage.removeItem(STORE_CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(STORE_CUSTOMER_STORE_KEY);
  if (currentStoreId) {
    localStorage.removeItem(`${STORE_CUSTOMER_TOKEN_KEY}:${currentStoreId}`);
    localStorage.removeItem(`tiwlo_store_customer:${currentStoreId}`);
  }
}

async function storeCustomerGraphQL<T>(query: string, variables?: Record<string, unknown>, storeId?: string): Promise<T> {
  const token = getStoreCustomerToken(storeId);
  if (!token) throw new Error('Store customer login is required');
  return rawGraphQL<T>(query, variables, token);
}

const storeFields = `
  id
  ownerId
  name
  slug
  category
  status
  domain
  customDomain
  contactEmail
  phone
  address
  currency
  region
  settings
  createdAt
  updatedAt
`;

const storeCustomerFields = `
  id
  storeId
  name
  email
  phone
  status
  tier
  address
  points
  lastLoginAt
  createdAt
  updatedAt
`;

const storeOrderFields = `
  id
  storeId
  customerId
  number
  status
  total
  currency
  items
  shipping
  payment
  createdAt
  updatedAt
`;

export type EcommerceControlMetric = {
  label: string;
  value: string;
  detail?: string;
  tone?: string;
  delta?: string;
};

export type EcommerceControlAction = {
  key: string;
  label: string;
  intent: 'primary' | 'success' | 'danger' | 'neutral' | string;
  description?: string;
  payload?: Record<string, unknown>;
};

export type EcommerceControlFunction = {
  key: string;
  sectionKey: string;
  sectionLabel: string;
  group: string;
  label: string;
  intent: 'primary' | 'success' | 'danger' | 'neutral' | string;
  description?: string;
  source: string;
  settings?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type EcommerceControlRecord = {
  id: string;
  sectionKey: string;
  title: string;
  status: string;
  owner?: string;
  summary?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type EcommerceControlSection = {
  key: string;
  group: string;
  label: string;
  path: string;
  status: string;
  description?: string;
  config?: Record<string, any> & {
    functionCatalog?: EcommerceControlFunction[];
    functionCount?: number;
    functionGroups?: string[];
  };
  metrics: EcommerceControlMetric[];
  actions: EcommerceControlAction[];
  records: EcommerceControlRecord[];
  activity: Array<{ id: string; title: string; status: string; message?: string; createdAt?: string }>;
};

export type StorefrontThemeTemplate = {
  key: string;
  name: string;
  layout: string;
  header: string;
  previewImage?: string;
  sections: Array<{
    id: string;
    key: string;
    type: string;
    title: string;
    priority: number;
    enabled: boolean;
    settings?: Record<string, any>;
  }>;
};

export type StorefrontThemeCatalogItem = {
  key: string;
  name: string;
  category: string;
  version: string;
  defaultTemplate: string;
  previewImage?: string;
  templates: StorefrontThemeTemplate[];
  modules: Array<{ key: string; name: string; status: string; settings?: Record<string, any> }>;
  controls: string[];
};

export type StoreThemeRuntime = {
  theme: StorefrontThemeCatalogItem;
  store: any;
  activeTheme: any;
  activeTemplate: StorefrontThemeTemplate;
  settings: Record<string, any>;
  preview: boolean;
  products: any[];
  categories: Array<{ id: string; name: string; count: number }>;
  records: Record<string, any[]>;
  modules: Array<{ key: string; name: string; status: string; settings?: Record<string, any> }>;
  adminControls: string[];
};

export type StoreCustomerDashboard = {
  store: any;
  activeTheme: any;
  settings: Record<string, any>;
  customer: any;
  orders: any[];
  products: any[];
  categories: Array<{ id: string; name: string; count: number }>;
  records: Record<string, any[]>;
  stats: Record<string, any>;
};

const ecommerceControlSectionFields = `
  key
  group
  label
  path
  status
  description
  config
  metrics {
    label
    value
    detail
    tone
    delta
  }
  actions {
    key
    label
    intent
    description
    payload
  }
  records {
    id
    sectionKey
    title
    status
    owner
    summary
    data
    createdAt
    updatedAt
  }
  activity {
    id
    title
    status
    message
    createdAt
  }
`;

async function resolveStoreId(storeId?: string) {
  if (storeId) return storeId;
  const store = await fetchPrimaryStore();
  if (!store) throw new Error('No store is connected to this account');
  return store.id;
}

export async function fetchEcommerceAdminSummary() {
  const data = await graphQL<{ ecommerceAdminSummary: any }>(
    `query EcommerceAdminSummary {
      ecommerceAdminSummary {
        stores
        merchants
        products
        orders
        customers
        revenue
      }
    }`
  );

  return data.ecommerceAdminSummary;
}

export async function fetchEcommerceControlSections() {
  const data = await graphQL<{ ecommerceControlSections: EcommerceControlSection[] }>(
    `query EcommerceControlSections {
      ecommerceControlSections {
        ${ecommerceControlSectionFields}
      }
    }`
  );

  return data.ecommerceControlSections;
}

export async function fetchEcommerceControlSection(pathOrKey = '/management/ecommerce') {
  const isPath = pathOrKey.startsWith('/');
  const data = await graphQL<{ ecommerceControlSection: EcommerceControlSection }>(
    `query EcommerceControlSection($key: String, $path: String) {
      ecommerceControlSection(key: $key, path: $path) {
        ${ecommerceControlSectionFields}
      }
    }`,
    { key: isPath ? undefined : pathOrKey, path: isPath ? pathOrKey : undefined }
  );

  return data.ecommerceControlSection;
}

export async function fetchEcommerceControlSchema(pathOrKey = '/management/ecommerce') {
  const isPath = pathOrKey.startsWith('/');
  const data = await graphQL<{ ecommerceControlSchema: Record<string, unknown> }>(
    `query EcommerceControlSchema($key: String, $path: String) {
      ecommerceControlSchema(key: $key, path: $path)
    }`,
    { key: isPath ? undefined : pathOrKey, path: isPath ? pathOrKey : undefined }
  );

  return data.ecommerceControlSchema;
}

export async function fetchEcommerceControlFunctions(pathOrKey = '/management/ecommerce', limit = 120) {
  const isPath = pathOrKey.startsWith('/');
  const data = await graphQL<{ ecommerceControlFunctions: EcommerceControlFunction[] }>(
    `query EcommerceControlFunctions($key: String, $path: String, $limit: Int) {
      ecommerceControlFunctions(key: $key, path: $path, limit: $limit) {
        key
        sectionKey
        sectionLabel
        group
        label
        intent
        description
        source
        settings
        payload
      }
    }`,
    { key: isPath ? undefined : pathOrKey, path: isPath ? pathOrKey : undefined, limit }
  );

  return data.ecommerceControlFunctions;
}

export async function upsertEcommerceControlRecordWithApi(input: {
  sectionKey: string;
  id?: string;
  title: string;
  status?: string;
  owner?: string;
  summary?: string;
  data?: Record<string, unknown>;
}) {
  const data = await graphQL<{ upsertEcommerceControlRecord: EcommerceControlRecord }>(
    `mutation UpsertEcommerceControlRecord($input: EcommerceControlRecordInput!) {
      upsertEcommerceControlRecord(input: $input) {
        id
        sectionKey
        title
        status
        owner
        summary
        data
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.upsertEcommerceControlRecord;
}

export async function deleteEcommerceControlRecordWithApi(sectionKey: string, id: string) {
  const data = await graphQL<{ deleteEcommerceControlRecord: boolean }>(
    `mutation DeleteEcommerceControlRecord($sectionKey: String!, $id: ID!) {
      deleteEcommerceControlRecord(sectionKey: $sectionKey, id: $id)
    }`,
    { sectionKey, id }
  );

  return data.deleteEcommerceControlRecord;
}

export async function runEcommerceControlActionWithApi(input: {
  sectionKey: string;
  actionKey: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}) {
  const data = await graphQL<{ runEcommerceControlAction: { ok: boolean; message: string; section: EcommerceControlSection } }>(
    `mutation RunEcommerceControlAction($input: EcommerceControlActionInput!) {
      runEcommerceControlAction(input: $input) {
        ok
        message
        section {
          ${ecommerceControlSectionFields}
        }
      }
    }`,
    { input }
  );

  return data.runEcommerceControlAction;
}

export async function createStoreWithApi(input: {
  name: string;
  slug: string;
  category: string;
  planCode?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  customDomain?: string;
  settings?: Record<string, unknown>;
}) {
  const data = await graphQL<{ createStore: { id: string; slug: string } }>(
    `mutation CreateStore($input: CreateStoreInput!) {
      createStore(input: $input) { id slug }
    }`,
    { input }
  );

  return data.createStore;
}

export async function checkStoreSubdomainAvailability(subdomain: string) {
  const data = await graphQL<{
    storeSubdomainAvailability: {
      available: boolean;
      subdomain: string;
      domain: string;
      reason?: string;
    };
  }>(
    `query StoreSubdomainAvailability($subdomain: String!) {
      storeSubdomainAvailability(subdomain: $subdomain) {
        available
        subdomain
        domain
        reason
      }
    }`,
    { subdomain }
  );

  return data.storeSubdomainAvailability;
}

export async function fetchStoreByIdWithApi(id: string) {
  const data = await graphQL<{ store: any }>(
    `query Store($id: ID!) {
      store(id: $id) {
        ${storeFields}
      }
    }`,
    { id }
  );

  return data.store;
}

export async function fetchPrimaryStore() {
  const data = await graphQL<{ stores: any[] }>(
    `query Stores {
      stores {
        ${storeFields}
      }
    }`
  );

  return data.stores[0] || null;
}

export async function fetchStoresWithApi(search?: string) {
  const data = await graphQL<{ stores: any[] }>(
    `query Stores($search: String) {
      stores(search: $search) {
        ${storeFields}
      }
    }`,
    { search }
  );

  return data.stores;
}

export async function updateStoreWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateStore: any }>(
    `mutation UpdateStore($input: UpdateStoreInput!) {
      updateStore(input: $input) {
        ${storeFields}
      }
    }`,
    { input }
  );

  return data.updateStore;
}

export async function deleteStoreWithApi(id: string) {
  const data = await graphQL<{ deleteStore: boolean }>(
    `mutation DeleteStore($id: ID!) {
      deleteStore(id: $id)
    }`,
    { id }
  );

  return data.deleteStore;
}

export async function fetchStoreProductsForAdmin(storeId?: string) {
  const id = await resolveStoreId(storeId);
  const data = await graphQL<{ storeProducts: any[] }>(
    `query StoreProducts($storeId: ID!) {
      storeProducts(storeId: $storeId) {
        id
        storeId
        name
        sku
        description
        category
        price
        stock
        status
        image
        metadata
        createdAt
        updatedAt
      }
    }`,
    { storeId: id }
  );

  return data.storeProducts;
}

export async function createStoreProductWithApi(input: {
  storeId: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  price: number;
  stock?: number;
  status?: string;
  image?: string;
  metadata?: unknown;
}) {
  const data = await graphQL<{ createStoreProduct: any }>(
    `mutation CreateStoreProduct($input: CreateStoreProductInput!) {
      createStoreProduct(input: $input) {
        id
        storeId
        name
        sku
        description
        category
        price
        stock
        status
        image
        metadata
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.createStoreProduct;
}

export async function updateStoreProductWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateStoreProduct: any }>(
    `mutation UpdateStoreProduct($input: UpdateStoreProductInput!) {
      updateStoreProduct(input: $input) {
        id
        storeId
        name
        sku
        description
        category
        price
        stock
        status
        image
        metadata
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.updateStoreProduct;
}

export async function deleteStoreProductWithApi(id: string) {
  const data = await graphQL<{ deleteStoreProduct: boolean }>(
    `mutation DeleteStoreProduct($id: ID!) {
      deleteStoreProduct(id: $id)
    }`,
    { id }
  );

  return data.deleteStoreProduct;
}

export async function createStoreOrderWithApi(input: {
  storeId?: string;
  customerId?: string;
  number?: string;
  status?: string;
  total: number;
  currency?: string;
  items: unknown;
  shipping?: unknown;
  payment?: unknown;
}) {
  const storeId = await resolveStoreId(input.storeId);
  const query = `mutation CreateStoreOrder($input: CreateStoreOrderInput!) {
    createStoreOrder(input: $input) {
      ${storeOrderFields}
    }
  }`;
  const variables = {
    input: {
      ...input,
      storeId,
      currency: input.currency || 'USD'
    }
  };

  const storeCustomerToken = getStoreCustomerToken(storeId);
  if (storeCustomerToken) {
    const data = await rawGraphQL<{ createStoreOrder: any }>(query, variables, storeCustomerToken);
    return data.createStoreOrder;
  }

  const data = await graphQL<{ createStoreOrder: any }>(
    query,
    variables
  );

  return data.createStoreOrder;
}

export async function fetchStoreOrdersForAdmin(storeId?: string) {
  const id = await resolveStoreId(storeId);
  const data = await graphQL<{ storeOrders: any[] }>(
    `query StoreOrders($storeId: ID!) {
      storeOrders(storeId: $storeId) {
        ${storeOrderFields}
      }
    }`,
    { storeId: id }
  );

  return data.storeOrders;
}

export async function updateStoreOrderStatusWithApi(id: string, status: string) {
  const data = await graphQL<{ updateStoreOrderStatus: any }>(
    `mutation UpdateStoreOrderStatus($id: ID!, $status: String!) {
      updateStoreOrderStatus(id: $id, status: $status) {
        id
        number
        status
        total
        currency
        updatedAt
      }
    }`,
    { id, status }
  );

  return data.updateStoreOrderStatus;
}

export async function fetchStoreCustomersForAdmin(storeId?: string) {
  const id = await resolveStoreId(storeId);
  const data = await graphQL<{ storeCustomers: any[] }>(
    `query StoreCustomers($storeId: ID!) {
      storeCustomers(storeId: $storeId) {
        ${storeCustomerFields}
      }
    }`,
    { storeId: id }
  );

  return data.storeCustomers;
}

export async function createStoreCustomerWithApi(input: {
  storeId: string;
  name: string;
  email: string;
  phone?: string;
  tier?: string;
  address?: unknown;
}) {
  const data = await graphQL<{ createStoreCustomer: any }>(
    `mutation CreateStoreCustomer($input: CreateStoreCustomerInput!) {
      createStoreCustomer(input: $input) {
        ${storeCustomerFields}
      }
    }`,
    { input }
  );

  return data.createStoreCustomer;
}

const storeCustomerDashboardFields = `
  store {
    ${storeFields}
  }
  activeTheme {
    id
    storeId
    name
    key
    status
    settings
  }
  settings
  customer {
    ${storeCustomerFields}
  }
  orders {
    ${storeOrderFields}
  }
  products {
    id
    storeId
    name
    sku
    description
    category
    price
    stock
    status
    image
    metadata
    createdAt
    updatedAt
  }
  categories
  records
  stats
`;

export async function registerStoreCustomerWithApi(input: {
  storeId?: string;
  slug?: string;
  domain?: string;
  themeKey?: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: unknown;
}) {
  const data = await rawGraphQL<{ registerStoreCustomer: { token: string; customer: any; dashboard: StoreCustomerDashboard } }>(
    `mutation RegisterStoreCustomer($input: StoreCustomerRegisterInput!) {
      registerStoreCustomer(input: $input) {
        token
        customer {
          ${storeCustomerFields}
        }
        dashboard {
          ${storeCustomerDashboardFields}
        }
      }
    }`,
    { input }
  );
  setStoreCustomerSession(data.registerStoreCustomer.token, data.registerStoreCustomer.dashboard.store.id, data.registerStoreCustomer.customer);
  return data.registerStoreCustomer;
}

export async function loginStoreCustomerWithApi(input: {
  storeId?: string;
  slug?: string;
  domain?: string;
  themeKey?: string;
  email: string;
  password: string;
}) {
  const data = await rawGraphQL<{ loginStoreCustomer: { token: string; customer: any; dashboard: StoreCustomerDashboard } }>(
    `mutation LoginStoreCustomer($input: StoreCustomerLoginInput!) {
      loginStoreCustomer(input: $input) {
        token
        customer {
          ${storeCustomerFields}
        }
        dashboard {
          ${storeCustomerDashboardFields}
        }
      }
    }`,
    { input }
  );
  setStoreCustomerSession(data.loginStoreCustomer.token, data.loginStoreCustomer.dashboard.store.id, data.loginStoreCustomer.customer);
  return data.loginStoreCustomer;
}

export async function fetchStoreCustomerDashboardWithApi(input: {
  storeId?: string;
  slug?: string;
  domain?: string;
  themeKey?: string;
}) {
  const data = await storeCustomerGraphQL<{ storeCustomerDashboard: StoreCustomerDashboard }>(
    `query StoreCustomerDashboard($storeId: ID, $slug: String, $domain: String, $themeKey: String) {
      storeCustomerDashboard(storeId: $storeId, slug: $slug, domain: $domain, themeKey: $themeKey) {
        ${storeCustomerDashboardFields}
      }
    }`,
    input,
    input.storeId
  );
  localStorage.setItem(`tiwlo_store_customer:${data.storeCustomerDashboard.store.id}`, JSON.stringify(data.storeCustomerDashboard.customer));
  return data.storeCustomerDashboard;
}

export async function updateStoreCustomerProfileWithApi(input: {
  name?: string;
  phone?: string;
  address?: unknown;
}, storeId?: string) {
  const data = await storeCustomerGraphQL<{ updateStoreCustomerProfile: any }>(
    `mutation UpdateStoreCustomerProfile($input: UpdateStoreCustomerProfileInput!) {
      updateStoreCustomerProfile(input: $input) {
        ${storeCustomerFields}
      }
    }`,
    { input },
    storeId
  );
  if (storeId) localStorage.setItem(`tiwlo_store_customer:${storeId}`, JSON.stringify(data.updateStoreCustomerProfile));
  return data.updateStoreCustomerProfile;
}

export async function fetchStoreCustomerGroupsWithApi(search?: string) {
  const data = await graphQL<{ storeCustomerGroups: any[] }>(
    `query StoreCustomerGroups($search: String) {
      storeCustomerGroups(search: $search) {
        customerCount
        activeCount
        store {
          ${storeFields}
        }
        latestCustomer {
          ${storeCustomerFields}
        }
      }
    }`,
    { search }
  );
  return data.storeCustomerGroups;
}

export async function updateStoreCustomerWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateStoreCustomer: any }>(
    `mutation UpdateStoreCustomer($input: UpdateStoreCustomerInput!) {
      updateStoreCustomer(input: $input) {
        ${storeCustomerFields}
      }
    }`,
    { input }
  );
  return data.updateStoreCustomer;
}

export async function deleteStoreCustomerWithApi(id: string) {
  const data = await graphQL<{ deleteStoreCustomer: boolean }>(
    `mutation DeleteStoreCustomer($id: ID!) {
      deleteStoreCustomer(id: $id)
    }`,
    { id }
  );
  return data.deleteStoreCustomer;
}

export async function selectStoreThemeWithApi(storeId: string, key: string) {
  const data = await graphQL<{ selectStoreTheme: any }>(
    `mutation SelectTheme($storeId: ID!, $key: String!) {
      selectStoreTheme(storeId: $storeId, key: $key) {
        id
        key
        status
      }
    }`,
    { storeId, key }
  );

  return data.selectStoreTheme;
}

export async function fetchStorefrontThemeCatalog() {
  const data = await graphQL<{ storefrontThemeCatalog: StorefrontThemeCatalogItem[] }>(
    `query StorefrontThemeCatalog {
      storefrontThemeCatalog
    }`
  );

  return data.storefrontThemeCatalog;
}

export async function fetchStoreThemeRuntime(input: {
  storeId?: string;
  slug?: string;
  domain?: string;
  themeKey?: string;
  templateKey?: string;
  preview?: boolean;
}) {
  const data = await graphQL<{ storeThemeRuntime: StoreThemeRuntime }>(
    `query StoreThemeRuntime($storeId: ID, $slug: String, $domain: String, $themeKey: String, $templateKey: String, $preview: Boolean) {
      storeThemeRuntime(storeId: $storeId, slug: $slug, domain: $domain, themeKey: $themeKey, templateKey: $templateKey, preview: $preview) {
        theme
        store {
          ${storeFields}
        }
        activeTheme {
          id
          storeId
          name
          key
          status
          settings
          createdAt
          updatedAt
        }
        activeTemplate
        settings
        preview
        products {
          id
          storeId
          name
          sku
          description
          category
          price
          stock
          status
          image
          metadata
          createdAt
          updatedAt
        }
        categories
        records
        modules
        adminControls
      }
    }`,
    input
  );

  return data.storeThemeRuntime;
}

export async function selectStoreHomepageTemplateWithApi(input: {
  storeId: string;
  themeKey?: string;
  templateKey: string;
}) {
  const data = await graphQL<{ selectStoreHomepageTemplate: any }>(
    `mutation SelectStoreHomepageTemplate($input: StoreHomepageTemplateInput!) {
      selectStoreHomepageTemplate(input: $input) {
        id
        storeId
        name
        key
        status
        settings
        updatedAt
      }
    }`,
    { input }
  );

  return data.selectStoreHomepageTemplate;
}

export async function updateStoreThemeSettingsWithApi(input: {
  storeId: string;
  key: string;
  settings: Record<string, unknown>;
}) {
  const data = await graphQL<{ updateStoreThemeSettings: any }>(
    `mutation UpdateStoreThemeSettings($input: StoreThemeSettingsInput!) {
      updateStoreThemeSettings(input: $input) {
        id
        storeId
        name
        key
        status
        settings
        updatedAt
      }
    }`,
    { input }
  );

  return data.updateStoreThemeSettings;
}

export async function importStoreThemeDemoDataWithApi(storeId: string, themeKey = 'aura') {
  const data = await graphQL<{ importStoreThemeDemoData: StoreThemeRuntime }>(
    `mutation ImportStoreThemeDemoData($storeId: ID!, $themeKey: String) {
      importStoreThemeDemoData(storeId: $storeId, themeKey: $themeKey) {
        theme
        store {
          ${storeFields}
        }
        activeTheme {
          id
          storeId
          name
          key
          status
          settings
          updatedAt
        }
        activeTemplate
        settings
        preview
        products {
          id
          storeId
          name
          sku
          description
          category
          price
          stock
          status
          image
          metadata
          createdAt
          updatedAt
        }
        categories
        records
        modules
        adminControls
      }
    }`,
    { storeId, themeKey }
  );

  return data.importStoreThemeDemoData;
}

export async function eraseStoreThemeDemoDataWithApi(storeId: string, themeKey?: string) {
  const data = await graphQL<{ eraseStoreThemeDemoData: StoreThemeRuntime }>(
    `mutation EraseStoreThemeDemoData($storeId: ID!, $themeKey: String) {
      eraseStoreThemeDemoData(storeId: $storeId, themeKey: $themeKey) {
        theme
        store {
          ${storeFields}
        }
        activeTheme {
          id
          storeId
          name
          key
          status
          settings
          updatedAt
        }
        activeTemplate
        settings
        preview
        products {
          id
          storeId
          name
          sku
          description
          category
          price
          stock
          status
          image
          metadata
          createdAt
          updatedAt
        }
        categories
        records
        modules
        adminControls
      }
    }`,
    { storeId, themeKey }
  );

  return data.eraseStoreThemeDemoData;
}

export async function fetchStorePluginsForAdmin(storeId?: string) {
  const id = await resolveStoreId(storeId);
  const data = await graphQL<{ storePlugins: any[] }>(
    `query StorePlugins($storeId: ID!) {
      storePlugins(storeId: $storeId) {
        id
        name
        key
        status
        settings
        createdAt
        updatedAt
      }
    }`,
    { storeId: id }
  );

  return data.storePlugins;
}

export async function installStorePluginWithApi(storeId: string, key: string, name: string) {
  const data = await graphQL<{ installStorePlugin: any }>(
    `mutation InstallStorePlugin($storeId: ID!, $key: String!, $name: String!) {
      installStorePlugin(storeId: $storeId, key: $key, name: $name) {
        id
        storeId
        name
        key
        status
        settings
        createdAt
        updatedAt
      }
    }`,
    { storeId, key, name }
  );

  return data.installStorePlugin;
}

export async function toggleStorePluginWithApi(id: string, status: string) {
  const data = await graphQL<{ toggleStorePlugin: any }>(
    `mutation ToggleStorePlugin($id: ID!, $status: String!) {
      toggleStorePlugin(id: $id, status: $status) {
        id
        storeId
        name
        key
        status
        settings
        updatedAt
      }
    }`,
    { id, status }
  );

  return data.toggleStorePlugin;
}

export async function fetchStoreThemesForAdmin(storeId?: string) {
  const id = await resolveStoreId(storeId);
  const data = await graphQL<{ storeThemes: any[] }>(
    `query StoreThemes($storeId: ID!) {
      storeThemes(storeId: $storeId) {
        id
        storeId
        name
        key
        status
        settings
        createdAt
        updatedAt
      }
    }`,
    { storeId: id }
  );

  return data.storeThemes;
}

export async function fetchStoreAdminRecordsWithApi(storeId: string, section: string) {
  const data = await graphQL<{ storeAdminRecords: any[] }>(
    `query StoreAdminRecords($storeId: ID!, $section: String!) {
      storeAdminRecords(storeId: $storeId, section: $section) {
        id
        storeId
        section
        title
        status
        data
        createdAt
        updatedAt
      }
    }`,
    { storeId, section }
  );

  return data.storeAdminRecords;
}

export async function upsertStoreAdminRecordWithApi(input: {
  storeId: string;
  section: string;
  id?: string;
  title: string;
  status?: string;
  data?: unknown;
}) {
  const data = await graphQL<{ upsertStoreAdminRecord: any }>(
    `mutation UpsertStoreAdminRecord($input: StoreAdminRecordInput!) {
      upsertStoreAdminRecord(input: $input) {
        id
        storeId
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

  return data.upsertStoreAdminRecord;
}

export async function deleteStoreAdminRecordWithApi(storeId: string, section: string, id: string) {
  const data = await graphQL<{ deleteStoreAdminRecord: boolean }>(
    `mutation DeleteStoreAdminRecord($storeId: ID!, $section: String!, $id: ID!) {
      deleteStoreAdminRecord(storeId: $storeId, section: $section, id: $id)
    }`,
    { storeId, section, id }
  );

  return data.deleteStoreAdminRecord;
}
