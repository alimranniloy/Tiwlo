import { mergeResolvers } from './core/mergeResolvers.js';
import { authResolvers } from './modules/auth/resolvers.js';
import { userResolvers } from './modules/users/resolvers.js';
import { dashboardResolvers } from './modules/dashboard/resolvers.js';
import { cloudResolvers } from './modules/cloud/resolvers.js';
import { domainResolvers } from './modules/domains/resolvers.js';
import { billingResolvers } from './modules/billing/resolvers.js';
import { settingResolvers } from './modules/settings/resolvers.js';
import { adminResolvers } from './modules/admin/resolvers.js';
import { integrationResolvers } from './modules/integrations/resolvers.js';
import { supportResolvers } from './modules/support/resolvers.js';
import { ecommerceResolvers } from './modules/ecommerce/resolvers.js';
import { ispResolvers } from './modules/isp/resolvers.js';
import { rbacResolvers } from './modules/rbac/resolvers.js';
import { notificationResolvers } from './modules/notifications/resolvers.js';
import { hostingResolvers } from './modules/hosting/resolvers.js';
import { ddosResolvers } from './modules/ddos/resolvers.js';
import { aiModelResolvers } from './modules/ai-model/resolvers.js';
import { tiwloPayResolvers } from './modules/tiwlo-pay/resolvers.js';
import { tPanelResolvers } from './modules/tpanel/resolvers.js';

export const resolvers = mergeResolvers(
  authResolvers,
  userResolvers,
  dashboardResolvers,
  cloudResolvers,
  domainResolvers,
  billingResolvers,
  settingResolvers,
  adminResolvers,
  integrationResolvers,
  supportResolvers,
  ecommerceResolvers,
  ispResolvers,
  hostingResolvers,
  ddosResolvers,
  aiModelResolvers,
  tiwloPayResolvers,
  tPanelResolvers,
  rbacResolvers,
  notificationResolvers
);
