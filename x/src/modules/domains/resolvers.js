import { requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const domainResolvers = {
  Query: {
    domains: (_, args, ctx) => service.listDomains(ctx, args),
    dnsRecords: (_, { domainId }, ctx) => service.listDnsRecords(ctx, domainId)
  },
  Mutation: {
    registerDomain: async (_, { input }, ctx) => service.registerDomain(ctx, await requireAuth(ctx), input),
    addDnsRecord: (_, { input }, ctx) => service.addDnsRecord(ctx, input),
    deleteDnsRecord: (_, { id }, ctx) => service.deleteDnsRecord(ctx, id),
    deleteDomain: (_, { id }, ctx) => service.deleteDomain(ctx, id)
  }
};
