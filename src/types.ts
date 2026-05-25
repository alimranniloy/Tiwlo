export interface Droplet {
  id: string;
  name: string;
  ip: string;
  status: 'active' | 'off' | 'restarting';
  region: string;
  specs: string;
  createdAt: string;
}

export interface Domain {
  id: string;
  name: string;
  dns: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  credits?: number;
  status?: string;
  phone?: string;
  mobileCountryCode?: string;
  primaryRegion?: string;
  country?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  billingName?: string;
  profileCompletedAt?: string;
  emailVerifiedAt?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'staff' | 'user' | 'store_owner' | 'store_customer' | 'isp_admin';
}

export interface AppState {
  droplets: Droplet[];
  domains: Domain[];
  user: User | null;
}
