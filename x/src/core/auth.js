import jwt from 'jsonwebtoken';
import { forbidden, unauthorized } from './errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const ADMIN_ROLES = new Set(['super_admin', 'admin']);

export const STAFF_ROLES = new Set(['super_admin', 'admin', 'manager', 'staff', 'store_owner', 'isp_admin']);

export const createToken = (user) => (
  jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
);

export const createImpersonationToken = (user, actor) => (
  jwt.sign({
    sub: user.id,
    role: user.role,
    kind: 'admin_impersonation',
    impersonatedBy: actor.id
  }, JWT_SECRET, { expiresIn: '2h' })
);

export const getActor = async (ctx) => {
  if (ctx.user) return ctx.user;
  return null;
};

export const requireAuth = async (ctx) => {
  const actor = await getActor(ctx);
  if (!actor) unauthorized();
  return actor;
};

export const isAdmin = (user) => ADMIN_ROLES.has(user?.role);

export const requireAdmin = async (ctx) => {
  const actor = await requireAuth(ctx);
  if (!isAdmin(actor)) forbidden();
  return actor;
};

export const requireAnyRole = async (ctx, roles) => {
  const actor = await requireAuth(ctx);
  if (!roles.includes(actor.role)) forbidden();
  return actor;
};

export const ownerWhere = async (ctx) => {
  const actor = await requireAuth(ctx);
  return isAdmin(actor) ? {} : { ownerId: actor.id };
};

export const canManageOwnerResource = async (ctx, ownerId) => {
  const actor = await requireAuth(ctx);
  if (isAdmin(actor) || actor.id === ownerId) return actor;
  forbidden();
};
