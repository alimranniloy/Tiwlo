export const dashboardSummary = async (ctx) => {
  const [users, droplets, domains, stores, ispSites, invoices, openTickets, paidInvoices] = await Promise.all([
    ctx.prisma.user.count(),
    ctx.prisma.cloudResource.count({ where: { type: 'droplet' } }),
    ctx.prisma.domain.count(),
    ctx.prisma.store.count(),
    ctx.prisma.ispSite.count(),
    ctx.prisma.invoice.count(),
    ctx.prisma.supportTicket.count({ where: { status: { in: ['open', 'pending'] } } }),
    ctx.prisma.invoice.findMany({ where: { status: 'paid' }, select: { amount: true } })
  ]);

  return {
    users,
    droplets,
    domains,
    stores,
    ispSites,
    invoices,
    openTickets,
    revenue: paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  };
};

export const ecommerceAdminSummary = async (ctx) => {
  const [stores, merchants, products, orders, customers, paidOrders] = await Promise.all([
    ctx.prisma.store.count(),
    ctx.prisma.user.count({ where: { OR: [{ role: 'store_owner' }, { role: 'admin' }, { role: 'super_admin' }] } }),
    ctx.prisma.storeProduct.count(),
    ctx.prisma.storeOrder.count(),
    ctx.prisma.storeCustomer.count(),
    ctx.prisma.storeOrder.findMany({
      where: { status: { in: ['paid', 'delivered', 'fulfilled', 'in_transit'] } },
      select: { total: true }
    })
  ]);

  return { stores, merchants, products, orders, customers, revenue: paidOrders.reduce((sum, order) => sum + order.total, 0) };
};

export const ispDashboardSummary = async (ctx) => {
  const [sites, clients, routers, packagesCount, invoices, paid] = await Promise.all([
    ctx.prisma.ispSite.count(),
    ctx.prisma.ispClient.count(),
    ctx.prisma.ispRouter.count(),
    ctx.prisma.ispPackage.count(),
    ctx.prisma.ispInvoice.count(),
    ctx.prisma.ispInvoice.findMany({ where: { status: 'paid' }, select: { amount: true } })
  ]);

  return { sites, clients, routers, packages: packagesCount, invoices, revenue: paid.reduce((sum, invoice) => sum + invoice.amount, 0) };
};
