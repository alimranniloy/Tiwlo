import { isAdmin } from '../../core/auth.js';
import { removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { forbidden } from '../../core/errors.js';

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

export const markRead = async (ctx, actor, id) => {
  const current = await ctx.prisma.notification.findUnique({ where: { id } });
  if (!current) forbidden('Notification was not found');
  if (!isAdmin(actor) && current.ownerId && current.ownerId !== actor.id) {
    forbidden('You cannot update this notification');
  }
  const notification = await ctx.prisma.notification.update({
    where: { id },
    data: { status: 'read', readAt: new Date() }
  });
  await writeAudit(ctx, 'mark_notification_read', 'notification', id);
  return toApi(notification);
};
