import bcrypt from 'bcryptjs';
import { createToken } from '../../core/auth.js';
import { normalizeEmail, removeUndefined, toApi } from '../../core/format.js';
import { AppError } from '../../core/errors.js';
import { writeAudit } from '../../core/audit.js';
import { getNewAccountCredit } from '../../core/settings.js';

export const login = async (ctx, input) => {
  const email = normalizeEmail(input.email);
  const user = await ctx.prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 'UNAUTHENTICATED');

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) throw new AppError('Invalid credentials', 'UNAUTHENTICATED');

  await writeAudit({ ...ctx, user }, 'login', 'user', user.id, { email });
  return { token: createToken(user), user: toApi(user) };
};

export const signup = async (ctx, input) => {
  const email = normalizeEmail(input.email);
  const existing = await ctx.prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Account already exists', 'BAD_USER_INPUT');
  if (email === 'admin@tiwlo.app') {
    throw new AppError('Administrator accounts cannot be created from public signup', 'FORBIDDEN');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const newAccountCredit = await getNewAccountCredit(ctx.prisma);
  const user = await ctx.prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name,
      credits: newAccountCredit,
      role: 'user'
    }
  });

  await writeAudit({ ...ctx, user }, 'signup', 'user', user.id, { email });
  return { token: createToken(user), user: toApi(user) };
};

export const updateProfile = async (ctx, actor, input) => {
  const id = input.id || actor.id;
  const user = await ctx.prisma.user.update({
    where: { id },
    data: removeUndefined({
      name: input.name,
      phone: input.phone,
      primaryRegion: input.primaryRegion,
      avatar: input.avatar
    })
  });
  await writeAudit(ctx, 'update_profile', 'user', user.id, { fields: Object.keys(removeUndefined(input)) });
  return toApi(user);
};

export const verifyPassword = async (ctx, actor, password) => {
  if (!actor.passwordHash) throw new AppError('Password verification is not available for this account', 'BAD_USER_INPUT');
  const validPassword = await bcrypt.compare(password, actor.passwordHash);
  if (!validPassword) throw new AppError('Incorrect password', 'UNAUTHENTICATED');

  await writeAudit(ctx, 'verify_password', 'user', actor.id, { purpose: 'sensitive_action' });
  return true;
};
