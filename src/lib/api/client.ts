import { Domain, Droplet } from '../../types';

export const GRAPHQL_URL = (import.meta as any).env?.VITE_GRAPHQL_URL || '/graphql';
export const TOKEN_KEY = 'tiwlo_auth_token';

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
  error?: string;
};

export const userFields = `
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
  promoCreditAmount
  promoCreditExpiresAt
  promoCreditStatus
  promoCreditSource
  promoPaymentMethod
  promoVerifiedAt
  createdAt
  updatedAt
`;

export const resourceFields = `
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

export const domainFields = `
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

export const moduleFields = `
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

export function setAuthToken(token?: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function graphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
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
    throw new Error('API connection failed. Make sure the Tiwlo backend is running and open the app through the Tiwlo proxy/dev server.');
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
  const weeks = Math.floor(days / 7);
  return `${weeks} weeks ago`;
}

export function resourceToDroplet(resource: any): Droplet {
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

export function apiDomainToDomain(domain: any): Domain {
  return {
    id: domain.id,
    name: domain.name,
    dns: Array.isArray(domain.dns) ? domain.dns : ['ns1.tiwlo.com', 'ns2.tiwlo.com']
  };
}

export function notifyDataRefresh() {
  window.dispatchEvent(new Event('tiwlo:data-refresh'));
}
