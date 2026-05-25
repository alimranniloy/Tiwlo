import { isAdmin, requireAuth } from '../../core/auth.js';
import { AppError } from '../../core/errors.js';
import { isReadonlySetting } from '../../core/settings.js';
import { toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { testTiwloEmail } from '../../core/email.js';

const ensureCanWriteSetting = async (ctx, actor, input) => {
  if (isReadonlySetting(input.scope, input.key)) {
    throw new AppError(`${input.key} is controlled by provisioning and cannot be edited manually`, 'FORBIDDEN');
  }

  if (isAdmin(actor)) return;
  if (input.scope === 'user' && (!input.scopeId || input.scopeId === actor.id)) return;

  if (input.scope === 'store' && input.scopeId) {
    const store = await ctx.prisma.store.findUnique({ where: { id: input.scopeId } });
    if (store?.ownerId === actor.id) return;
  }

  if (input.scope === 'isp' && input.scopeId) {
    const site = await ctx.prisma.ispSite.findUnique({ where: { id: input.scopeId } });
    if (site?.ownerId === actor.id) return;
  }

  throw new AppError('You cannot change this setting scope', 'FORBIDDEN');
};

export const listSettings = async (ctx, { scope, scopeId }) => toApi(await ctx.prisma.systemSetting.findMany({
  where: { scope, scopeId: scopeId || '' },
  orderBy: { key: 'asc' }
}));

export const upsertSetting = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await ensureCanWriteSetting(ctx, actor, input);
  const setting = await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: input.scope, scopeId: input.scopeId || '', key: input.key } },
    create: { scope: input.scope, scopeId: input.scopeId || '', key: input.key, value: input.value },
    update: { value: input.value }
  });
  await writeAudit(ctx, 'upsert_setting', 'systemSetting', setting.id, { key: input.key, scope: input.scope });
  return toApi(setting);
};

export const testSystemEmail = async (ctx, input) => {
  const result = await testTiwloEmail(ctx, input || {});
  await writeAudit(ctx, 'test_system_email', 'systemSetting', 'systemEmail', {
    ok: result.ok,
    to: input?.to || input?.recipient,
    host: input?.config?.host || input?.host
  });
  return result;
};
