import type { Domain, Droplet, User } from '../../types';

const GRAPHQL_URL = (import.meta as any).env?.VITE_GRAPHQL_URL || '/graphql';
const TOKEN_KEY = 'tiwlo_auth_token';

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
  error?: string;
};

const userFields = `
  id
  email
  name
  avatar
  credits
  role
  status
  phone
  mobileCountryCode
  primaryRegion
  country
  addressLine1
  city
  state
  postalCode
  billingName
  profileCompletedAt
  emailVerifiedAt
  whatsappVerifiedAt
  whatsappVerifiedPhone
  whatsappVerificationRequired
  createdAt
  updatedAt
`;

const resourceFields = `
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
`;

const domainFields = `
  id
  ownerId
  name
  dns
  status
  records
  autoRenew
  expiresAt
  createdAt
  updatedAt
`;

const moduleFields = `
  id
  key
  group
  label
  path
  status
  description
  config
  metrics
  createdAt
  updatedAt
`;

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function graphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, variables })
    });
  } catch {
    throw new Error('API connection failed.');
  }

  const text = await response.text();
  let json: GraphQLResponse<T> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const graphQLError = json?.errors?.map((error) => error.message).join(', ');
  const serverError = graphQLError || json?.error || text;

  if (!response.ok) {
    throw new Error(serverError || `GraphQL request failed: ${response.status}`);
  }

  if (json?.errors?.length) {
    throw new Error(graphQLError || 'GraphQL request failed');
  }

  if (!json?.data) {
    throw new Error('GraphQL response did not include data');
  }

  return json.data;
}

function relativeDate(value?: string) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

function resourceToDroplet(resource: any): Droplet {
  return {
    id: resource.id,
    name: resource.name,
    ip: resource.ip || 'Provisioning',
    status: resource.status === 'off' || resource.status === 'restarting' ? resource.status : 'active',
    region: resource.region,
    specs: resource.specs,
    image: resource.image,
    plan: resource.plan,
    cpu: resource.cpu,
    ram: resource.ram,
    disk: resource.disk,
    monthlyCost: resource.monthlyCost,
    metadata: resource.metadata || null,
    createdAt: relativeDate(resource.createdAt)
  };
}

function apiDomainToDomain(domain: any): Domain {
  return {
    id: domain.id,
    name: domain.name,
    dns: Array.isArray(domain.dns) ? domain.dns : ['ns1.tiwlo.com', 'ns2.tiwlo.com']
  };
}

export async function fetchPlatformStatusWithApi() {
  const apiBase = GRAPHQL_URL.replace(/\/graphql\/?$/, '');
  const response = await fetch(`${apiBase}/api/platform/status`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Platform status request failed: ${response.status}`);
  }
  return response.json() as Promise<{
    maintenance: { enabled: boolean; updatedAt?: string | null };
    whatsapp?: { enabled: boolean; configured?: boolean };
  }>;
}

export async function fetchCurrentUserWithApi() {
  const data = await graphQL<{ me: User | null }>(
    `query CurrentUser {
      me { ${userFields} }
    }`
  );

  return data.me;
}

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

export async function fetchAdminModules(group?: string) {
  const data = await graphQL<{ adminModules: any[] }>(
    `query AdminModules($group: String) {
      adminModules(group: $group) { ${moduleFields} }
    }`,
    { group }
  );

  return data.adminModules;
}
