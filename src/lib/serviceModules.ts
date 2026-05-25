export const SERVICE_MODULE_GROUP = 'service-control';

export const SERVICE_MODULE_KEYS = {
  ecommerce: 'service.ecommerce',
  isp: 'service.isp',
  tiwloPay: 'service.tiwlo-pay',
  tpanel: 'service.tpanel'
} as const;

export const SERVICE_MODULES = [
  {
    key: SERVICE_MODULE_KEYS.ecommerce,
    label: 'E-Commerce',
    userPaths: ['/store', '/store/create', '/store/management', '/store/admin', '/store/user', '/themes'],
    adminPath: '/management/ecommerce'
  },
  {
    key: SERVICE_MODULE_KEYS.isp,
    label: 'ISP Billing',
    userPaths: ['/isp-billing'],
    adminPath: '/management/isp'
  },
  {
    key: SERVICE_MODULE_KEYS.tiwloPay,
    label: 'Tiwlo Pay',
    userPaths: ['/tiwlo-pay'],
    adminPath: '/management/tiwlo-pay'
  },
  {
    key: SERVICE_MODULE_KEYS.tpanel,
    label: 'tPanel',
    userPaths: ['/tpanel'],
    adminPath: '/management/tpanel'
  }
] as const;

export type ServiceModuleKey = typeof SERVICE_MODULE_KEYS[keyof typeof SERVICE_MODULE_KEYS];

export function serviceEnabled(modules: any[] | undefined, key: ServiceModuleKey | string) {
  const module = modules?.find((item) => item.key === key);
  if (!module) return true;
  return !['disabled', 'inactive', 'off', 'suspended'].includes(String(module.status || '').toLowerCase());
}

export function serviceKeyForPath(path: string) {
  return SERVICE_MODULES.find((service) => service.userPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)));
}
