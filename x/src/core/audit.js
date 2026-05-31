import { getActor } from './auth.js';
import { notifyDiscordAuditLog } from '../modules/discord/service.js';

export const writeAudit = async (ctx, action, resource, resourceId, metadata = {}) => {
  const actor = await getActor(ctx);
  const audit = await ctx.prisma.auditLog.create({
    data: {
      actorId: actor?.id,
      action,
      resource,
      resourceId,
      metadata
    }
  });
  notifyDiscordAuditLog(ctx, audit).catch(() => null);
  return audit;
};
