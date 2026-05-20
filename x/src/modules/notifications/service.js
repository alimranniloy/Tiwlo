import { isAdmin } from '../../core/auth.js';
import { removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';

export const listNotifications = async (ctx, actor, { scope, status, type } = {}) => {
  const where = {
    ...removeUndefined({ scope, status, type }),
    ...(isAdmin(actor) ? {} : {
      OR: [
        { ownerId: actor.id },
        { ownerId: null, scope: 'platform' }
      ]
    })
  };

  return toApi(await ctx.prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100
  }));
};

export const createNotification = async (ctx, input) => {
  const notification = await ctx.prisma.notification.create({
    data: {
      ownerId: input.ownerId,
      scope: input.scope || 'platform',
      scopeId: input.scopeId || '',
      type: input.type || 'info',
      title: input.title,
      message: input.message,
      status: input.status || 'unread',
      metadata: input.metadata || {}
    }
  });
  await writeAudit(ctx, 'create_notification', 'notification', notification.id, { scope: notification.scope, type: notification.type });
  return toApi(notification);
};

export const markRead = async (ctx, id) => {
  const notification = await ctx.prisma.notification.update({
    where: { id },
    data: { status: 'read', readAt: new Date() }
  });
  await writeAudit(ctx, 'mark_notification_read', 'notification', id);
  return toApi(notification);
};
