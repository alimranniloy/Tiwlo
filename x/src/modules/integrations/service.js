import { removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';

export const listIntegrations = async (ctx, { group, status } = {}) => toApi(await ctx.prisma.integration.findMany({
  where: removeUndefined({ group, status }),
  orderBy: [{ group: 'asc' }, { name: 'asc' }]
}));

export const upsertIntegration = async (ctx, input) => {
  const integration = await ctx.prisma.integration.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      group: input.group,
      name: input.name,
      status: input.status,
      config: input.config || {},
      health: input.health || {}
    },
    update: removeUndefined({
      group: input.group,
      name: input.name,
      status: input.status,
      config: input.config,
      health: input.health,
      lastSyncAt: new Date()
    })
  });
  await writeAudit(ctx, 'upsert_integration', 'integration', integration.id, { key: input.key });
  return toApi(integration);
};
