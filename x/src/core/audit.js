import { getActor } from './auth.js';

export const writeAudit = async (ctx, action, resource, resourceId, metadata = {}) => {
  const actor = await getActor(ctx);
  return ctx.prisma.auditLog.create({
    data: {
      actorId: actor?.id,
      action,
      resource,
      resourceId,
      metadata
    }
  });
};
