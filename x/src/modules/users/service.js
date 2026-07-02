import { createImpersonationToken, isAdmin } from '../../core/auth.js';
import { normalizeEmail, removeUndefined, toApi } from '../../core/format.js';
import { AppError, notFound } from '../../core/errors.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { writeAudit } from '../../core/audit.js';
import { runCreditAutomationForOwner } from '../billing/creditAutomation.js';
import { enforceRestrictedStatusServices } from '../../../../tSecurity/index.js';

export const listUsers = async (ctx, args = {}) => {
  const { search, role, status } = args;
  const where = {
    ...searchWhere(search, ['email', 'name', 'role']),
    ...removeUndefined({ role, status })
  };

  return toApi(await ctx.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, ...pagination(args) }));
};

export const updateUserRole = async (ctx, actor, id, role) => {
  const user = await ctx.prisma.user.update({ where: { id }, data: { role } });
  await writeAudit(ctx, 'update_user_role', 'user', id, { role, actorRole: actor.role });
  return toApi(user);
};

export const updateUser = async (ctx, actor, input) => {
  const { id, email, ...data } = input;
  const existing = await ctx.prisma.user.findUnique({ where: { id } });
  if (!existing) notFound('User');

  const normalizedEmail = email === undefined ? undefined : normalizeEmail(email);
  if (normalizedEmail === 'admin@tiwlo.app' && existing.email !== 'admin@tiwlo.app') {
    throw new AppError('This email is reserved for the Tiwlo Team account', 'BAD_USER_INPUT');
  }

  const user = await ctx.prisma.user.update({
    where: { id },
    data: removeUndefined({
      ...data,
      email: normalizedEmail
    })
  });

  if (input.credits !== undefined) {
    await runCreditAutomationForOwner(ctx, id);
  }

  const shieldResult = input.status !== undefined ? await enforceRestrictedStatusServices(ctx, id, input.status) : null;

  await writeAudit(ctx, 'update_user', 'user', id, {
    actorRole: actor.role,
    fields: Object.keys(removeUndefined(input)).filter((field) => field !== 'id'),
    tSecurity: shieldResult
  });
  return toApi(user);
};

export const deleteUser = async (ctx, actor, id) => {
  if (actor.id === id) {
    throw new AppError('You cannot delete your own account', 'BAD_USER_INPUT');
  }

  const existing = await ctx.prisma.user.findUnique({ where: { id } });
  if (!existing) notFound('User');

  await ctx.prisma.user.delete({ where: { id } });
  await writeAudit(ctx, 'delete_user', 'user', id, { email: existing.email, actorRole: actor.role });
  return true;
};

export const impersonateUser = async (ctx, actor, id) => {
  const user = await ctx.prisma.user.findUnique({ where: { id } });
  if (!user) notFound('User');
  if (isAdmin(user)) {
    throw new AppError('Tiwlo Team accounts cannot be opened through user impersonation.', 'BAD_USER_INPUT');
  }

  await writeAudit(ctx, 'impersonate_user', 'user', user.id, {
    targetEmail: user.email,
    targetRole: user.role,
    actorRole: actor.role
  });

  return {
    token: createImpersonationToken(user, actor),
    user: toApi(user)
  };
};

export const scopedUserWhere = (actor) => (isAdmin(actor) ? {} : { id: actor.id });
