import { randomUUID } from 'node:crypto';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { requireAdmin, canManageOwnerResource, isAdmin } from '../../core/auth.js';
import { AppError } from '../../core/errors.js';
import { toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';

const CONFIG_KEY = 'powerDnsConfig';
const HOSTNAMES_KEY = 'powerDnsHostnames';
const DOMAIN_ID_META = 'tiwloDomainId';
const HOSTNAME_RECORD_PREFIX = 'powerdns_hostname_';
const DEFAULT_DOMAIN = 'tiwlo.com';

const text = (value, fallback = '') => String(value ?? fallback).trim();
const cleanHost = (value = '', fallback = '') => {
  const host = text(value || fallback).toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/[^a-z0-9.*-]/g, '')
    .replace(/^\.+|\.+$/g, '');
  return host || fallback;
};

const isValidHost = (value = '') => {
  const host = cleanHost(value);
  return host.length > 3 &&
    host.length < 254 &&
    /^[a-z0-9*](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host);
};

const domainFromHost = (hostname, preferredRoot) => {
  const host = cleanHost(hostname);
  const root = cleanHost(preferredRoot);
  if (root && (host === root || host.endsWith(`.${root}`))) return root;
  const parts = host.split('.').filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join('.') : host;
};

const relativeRecordName = (hostname, zone) => {
  const host = cleanHost(hostname);
  const root = cleanHost(zone);
  if (host === root) return '@';
  return host.endsWith(`.${root}`) ? host.slice(0, -(root.length + 1)) : host;
};

const fqdnRecordName = (recordName, zoneName) => {
  const name = cleanHost(recordName || '@');
  const zone = cleanHost(zoneName);
  if (!name || name === '@') return zone;
  if (name === '*') return `*.${zone}`;
  if (name.endsWith(`.${zone}`) || name === zone) return name;
  return `${name}.${zone}`;
};

const addressRecordTypeFor = (ipAddress) => (isIP(text(ipAddress)) === 6 ? 'AAAA' : 'A');

const mailDnsDefaultsFor = (domainName, config) => {
  const domain = cleanHost(domainName || config.primaryDomain);
  const serverIp = text(config.serverIp);
  const addressType = addressRecordTypeFor(serverIp);
  const spfIp = isIP(serverIp) === 6 ? `ip6:${serverIp}` : `ip4:${serverIp}`;
  const postmaster = `postmaster@${domain}`;
  const records = [
    { id: 'mail_a', type: addressType, name: 'mail', value: serverIp },
    { id: 'tmail_a', type: addressType, name: 'tmail', value: serverIp },
    { id: 'email_a', type: addressType, name: 'email', value: serverIp },
    { id: 'smtp_a', type: addressType, name: 'smtp', value: serverIp },
    { id: 'imap_a', type: addressType, name: 'imap', value: serverIp },
    { id: 'pop_a', type: addressType, name: 'pop', value: serverIp },
    { id: 'webmail_a', type: addressType, name: 'webmail', value: serverIp },
    { id: 'root_mx', type: 'MX', name: '@', value: `mail.${domain}`, priority: 10 },
    { id: 'root_spf', type: 'TXT', name: '@', value: `v=spf1 mx a ${spfIp} ~all` },
    { id: 'dmarc_txt', type: 'TXT', name: '_dmarc', value: `v=DMARC1; p=quarantine; rua=mailto:${postmaster}; ruf=mailto:${postmaster}; fo=1` },
    { id: 'autodiscover_cname', type: 'CNAME', name: 'autodiscover', value: `mail.${domain}` },
    { id: 'autoconfig_cname', type: 'CNAME', name: 'autoconfig', value: `mail.${domain}` },
    { id: 'letsencrypt_caa', type: 'CAA', name: '@', value: '0 issue "letsencrypt.org"' }
  ];
  return records.filter((record) => record.value && record.value !== 'SERVER_IP');
};

const detectedServerIp = (ctx) => (
  text(process.env.POWERDNS_SERVER_IP) ||
  text(process.env.SERVER_IP) ||
  text(process.env.PUBLIC_IP) ||
  text(process.env.TPANEL_SERVER_IP) ||
  text(ctx?.requestIp)
);

const adminEmailFor = (value) => {
  const raw = text(value);
  if (raw.includes('@')) {
    const [local, domain] = raw.toLowerCase().split('@');
    return `${cleanHost(local || 'admin')}.${cleanHost(domain)}`;
  }
  return `admin.${cleanHost(value).replace(/\.$/, '')}`;
};

const serialNow = () => Math.floor(Date.now() / 1000);

const uniqueHosts = (items = []) => Array.from(new Set(
  items
    .map((item) => (typeof item === 'string' ? item : item?.host || item?.hostname || item?.name))
    .map((item) => cleanHost(item))
    .filter(isValidHost)
));

const settingWhere = (key) => ({ scope_scopeId_key: { scope: 'platform', scopeId: '', key } });

const readSetting = async (ctx, key, fallback) => {
  const row = await ctx.prisma.systemSetting.findUnique({ where: settingWhere(key) }).catch(() => null);
  return row?.value ?? fallback;
};

const writeSetting = async (ctx, key, value) => ctx.prisma.systemSetting.upsert({
  where: settingWhere(key),
  create: { scope: 'platform', scopeId: '', key, value },
  update: { value }
});

export const defaultPowerDnsConfig = (ctx, input = {}) => {
  const primaryDomain = cleanHost(input.primaryDomain || process.env.APP_DOMAIN || process.env.TIWLO_DOMAIN || DEFAULT_DOMAIN, DEFAULT_DOMAIN);
  const serverIp = text(input.serverIp || detectedServerIp(ctx) || 'SERVER_IP');
  const nsInput = Array.isArray(input.nameservers) ? input.nameservers : [];
  const nameservers = uniqueHosts(nsInput).length
    ? uniqueHosts(nsInput)
    : [`ns1.${primaryDomain}`, `ns2.${primaryDomain}`];

  return {
    primaryDomain,
    serverIp,
    nameservers,
    soaEmail: text(input.soaEmail || `admin@${primaryDomain}`),
    automationEnabled: input.automationEnabled !== false,
    dnssecEnabled: Boolean(input.dnssecEnabled),
    installPackage: true,
    provider: 'powerdns',
    updatedAt: input.updatedAt || null
  };
};

export const getPowerDnsConfig = async (ctx) => {
  const saved = await readSetting(ctx, CONFIG_KEY, {});
  return defaultPowerDnsConfig(ctx, saved || {});
};

export const defaultNameserversFor = async (ctx) => {
  const config = await getPowerDnsConfig(ctx);
  return config.nameservers;
};

export const primaryDomainFor = async (ctx) => {
  const config = await getPowerDnsConfig(ctx);
  return config.primaryDomain;
};

export const serverIpFor = async (ctx) => {
  const config = await getPowerDnsConfig(ctx);
  return config.serverIp;
};

export const ensurePowerDnsTables = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS domains (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      master VARCHAR(128) DEFAULT NULL,
      last_check INTEGER DEFAULT NULL,
      type VARCHAR(6) NOT NULL DEFAULT 'NATIVE',
      notified_serial INTEGER DEFAULT NULL,
      account VARCHAR(40) DEFAULT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS domains_name_idx ON domains(name)`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS records (
      id BIGSERIAL PRIMARY KEY,
      domain_id INTEGER DEFAULT NULL,
      name VARCHAR(255) DEFAULT NULL,
      type VARCHAR(10) DEFAULT NULL,
      content VARCHAR(65535) DEFAULT NULL,
      ttl INTEGER DEFAULT NULL,
      prio INTEGER DEFAULT NULL,
      disabled BOOLEAN DEFAULT false,
      ordername VARCHAR(255),
      auth BOOLEAN DEFAULT true
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS records_name_type_idx ON records(name, type)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS records_domain_id_idx ON records(domain_id)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS records_ordername_idx ON records(ordername)`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS supermasters (
      ip VARCHAR(64) NOT NULL,
      nameserver VARCHAR(255) NOT NULL,
      account VARCHAR(40) NOT NULL,
      PRIMARY KEY (ip, nameserver)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      domain_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(10) NOT NULL,
      modified_at INTEGER NOT NULL,
      account VARCHAR(40) DEFAULT NULL,
      comment VARCHAR(65535) NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS comments_name_type_idx ON comments(name, type)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS comments_domain_id_idx ON comments(domain_id)`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS domainmetadata (
      id SERIAL PRIMARY KEY,
      domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
      kind VARCHAR(32),
      content TEXT
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS domainmetadata_domain_id_kind_idx ON domainmetadata(domain_id, kind)`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cryptokeys (
      id SERIAL PRIMARY KEY,
      domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
      flags INTEGER NOT NULL,
      active BOOLEAN,
      published BOOLEAN DEFAULT true,
      content TEXT
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS cryptokeys_domain_id_idx ON cryptokeys(domain_id)`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tsigkeys (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      algorithm VARCHAR(50),
      secret VARCHAR(255)
    )
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tsigkeys'
          AND column_name = 'id'
      ) THEN
        ALTER TABLE tsigkeys ADD COLUMN id SERIAL;
        ALTER TABLE tsigkeys ADD PRIMARY KEY (id);
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS tsigkeys_namealgo_idx ON tsigkeys(name, algorithm)`);
};

const upsertPowerDnsDomain = async (ctx, domain) => {
  await ensurePowerDnsTables(ctx.prisma);
  const existing = await ctx.prisma.$queryRaw`
    SELECT id FROM domains WHERE name = ${domain.name} LIMIT 1
  `;
  if (existing?.[0]?.id) {
    await ctx.prisma.$executeRaw`
      UPDATE domains SET type = 'NATIVE', account = ${domain.ownerId || null} WHERE id = ${existing[0].id}
    `;
    return Number(existing[0].id);
  }
  const inserted = await ctx.prisma.$queryRaw`
    INSERT INTO domains (name, type, account)
    VALUES (${domain.name}, 'NATIVE', ${domain.ownerId || null})
    RETURNING id
  `;
  return Number(inserted?.[0]?.id);
};

const recordContent = (record, zoneName) => {
  const type = text(record.type).toUpperCase();
  const value = text(record.value);
  if (['CNAME', 'MX', 'NS', 'PTR'].includes(type) && value && !value.endsWith('.') && isValidHost(value)) {
    return value;
  }
  return value;
};

export const syncPowerDnsDomain = async (ctx, domainIdOrName) => {
  const where = String(domainIdOrName || '').includes('.') ? { name: cleanHost(domainIdOrName) } : { id: domainIdOrName };
  const domain = await ctx.prisma.domain.findUnique({ where });
  if (!domain) throw new AppError('Domain was not found for PowerDNS sync', 'NOT_FOUND');

  const records = await ctx.prisma.dnsRecord.findMany({
    where: { domainId: domain.id, status: { not: 'deleted' } },
    orderBy: [{ type: 'asc' }, { name: 'asc' }]
  });
  const config = await getPowerDnsConfig(ctx);
  const pdnsDomainId = await upsertPowerDnsDomain(ctx, domain);
  const serial = serialNow();
  const nameservers = uniqueHosts(domain.dns || config.nameservers).length ? uniqueHosts(domain.dns || config.nameservers) : config.nameservers;
  const soaNs = nameservers[0] || `ns1.${domain.name}`;
  const zoneRecords = [
    {
      name: domain.name,
      type: 'SOA',
      content: `${soaNs} ${adminEmailFor(config.soaEmail || domain.name)} ${serial} 10800 3600 604800 300`,
      ttl: 300,
      prio: null
    },
    ...nameservers.map((ns) => ({
      name: domain.name,
      type: 'NS',
      content: ns,
      ttl: 300,
      prio: null
    })),
    ...records.map((record) => ({
      name: fqdnRecordName(record.name, domain.name),
      type: text(record.type).toUpperCase(),
      content: recordContent(record, domain.name),
      ttl: Number(record.ttl || 300),
      prio: record.priority == null ? null : Number(record.priority)
    }))
  ].filter((record) => record.name && record.type && record.content);

  await ctx.prisma.$executeRaw`DELETE FROM records WHERE domain_id = ${pdnsDomainId}`;
  for (const record of zoneRecords) {
    await ctx.prisma.$executeRaw`
      INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, auth)
      VALUES (${pdnsDomainId}, ${record.name}, ${record.type}, ${record.content}, ${record.ttl}, ${record.prio}, false, true)
    `;
  }
  await ctx.prisma.$executeRaw`
    UPDATE domains SET notified_serial = ${serial} WHERE id = ${pdnsDomainId}
  `;

  await ctx.prisma.domain.update({
    where: { id: domain.id },
    data: {
      dns: nameservers,
      records: records.map((record) => ({
        id: record.id,
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority,
        status: record.status,
        metadata: { ...(record.metadata || {}), provider: 'powerdns' }
      }))
    }
  });

  return { ok: true, domain: domain.name, records: zoneRecords.length, serial };
};

export const syncAllPowerDns = async (ctx, actor = null) => {
  await ensurePowerDnsTables(ctx.prisma);
  const domains = await ctx.prisma.domain.findMany({ where: { status: { not: 'deleted' } }, orderBy: { name: 'asc' } });
  const results = [];
  for (const domain of domains) {
    results.push(await syncPowerDnsDomain(ctx, domain.id));
  }
  await writeAudit(ctx, 'powerdns_sync_all', 'powerdns', 'all', { domains: results.length, actorId: actor?.id || null }).catch(() => {});
  return {
    ok: true,
    zones: results.length,
    records: results.reduce((sum, item) => sum + Number(item.records || 0), 0),
    message: `PowerDNS synchronized ${results.length} zone(s).`
  };
};

const serializeHostname = (input = {}, existing = {}) => {
  const hostname = cleanHost(input.hostname || input.host || existing.hostname);
  const ipAddress = text(input.ipAddress ?? input.ip ?? existing.ipAddress);
  const recordType = text(input.recordType || existing.recordType || (ipAddress && ipAddress.includes(':') ? 'AAAA' : 'A')).toUpperCase();
  if (!isValidHost(hostname)) throw new AppError('A valid hostname is required', 'BAD_USER_INPUT');
  if (!['A', 'AAAA', 'CNAME'].includes(recordType)) throw new AppError('Hostname record type must be A, AAAA, or CNAME', 'BAD_USER_INPUT');
  if (['A', 'AAAA'].includes(recordType) && !isIP(ipAddress)) throw new AppError('A valid IP address is required for hostname A/AAAA records', 'BAD_USER_INPUT');
  if (recordType === 'CNAME' && !isValidHost(input.target || existing.target)) throw new AppError('A valid CNAME target is required', 'BAD_USER_INPUT');
  return {
    id: input.id || existing.id || randomUUID(),
    hostname,
    target: cleanHost(input.target || existing.target || ''),
    ipAddress,
    recordType,
    ttl: Math.max(60, Number(input.ttl || existing.ttl || 300)),
    status: text(input.status || existing.status || 'active'),
    notes: text(input.notes || existing.notes || ''),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const listPowerDnsHostnames = async (ctx, { search } = {}) => {
  const rows = await readSetting(ctx, HOSTNAMES_KEY, []);
  const term = cleanHost(search || '');
  const filtered = term ? rows.filter((row) => row.hostname.includes(term) || row.ipAddress?.includes(term)) : rows;
  return filtered.sort((a, b) => a.hostname.localeCompare(b.hostname));
};

const persistHostnameRecord = async (ctx, actor, hostnameRow, config) => {
  const zoneName = domainFromHost(hostnameRow.hostname, config.primaryDomain);
  const nameservers = config.nameservers;
  const domain = await ctx.prisma.domain.upsert({
    where: { name: zoneName },
    create: {
      ownerId: actor.id,
      name: zoneName,
      dns: nameservers,
      status: 'active',
      records: []
    },
    update: {
      dns: nameservers,
      status: 'active'
    }
  });
  const value = hostnameRow.recordType === 'CNAME' ? hostnameRow.target : hostnameRow.ipAddress;
  await ctx.prisma.dnsRecord.upsert({
    where: { id: `${HOSTNAME_RECORD_PREFIX}${hostnameRow.id}` },
    create: {
      id: `${HOSTNAME_RECORD_PREFIX}${hostnameRow.id}`,
      domainId: domain.id,
      type: hostnameRow.recordType,
      name: relativeRecordName(hostnameRow.hostname, zoneName),
      value,
      ttl: hostnameRow.ttl,
      metadata: { source: 'powerdns_hostname', hostnameId: hostnameRow.id, provider: 'powerdns' }
    },
    update: {
      domainId: domain.id,
      type: hostnameRow.recordType,
      name: relativeRecordName(hostnameRow.hostname, zoneName),
      value,
      ttl: hostnameRow.ttl,
      status: hostnameRow.status,
      metadata: { source: 'powerdns_hostname', hostnameId: hostnameRow.id, provider: 'powerdns' }
    }
  });
  await syncPowerDnsDomain(ctx, domain.id);
};

export const upsertPowerDnsHostname = async (ctx, actor, input) => {
  await requireAdmin(ctx);
  const config = await getPowerDnsConfig(ctx);
  const rows = await readSetting(ctx, HOSTNAMES_KEY, []);
  const existing = rows.find((row) => row.id === input.id || cleanHost(row.hostname) === cleanHost(input.hostname));
  const nextRow = serializeHostname(input, existing || {});
  const nextRows = existing
    ? rows.map((row) => (row.id === existing.id ? nextRow : row))
    : [...rows, nextRow];
  await writeSetting(ctx, HOSTNAMES_KEY, nextRows);
  await persistHostnameRecord(ctx, actor, nextRow, config);
  await writeAudit(ctx, existing ? 'powerdns_hostname_updated' : 'powerdns_hostname_created', 'powerdnsHostname', nextRow.id, { hostname: nextRow.hostname });
  return nextRow;
};

export const deletePowerDnsHostname = async (ctx, id) => {
  await requireAdmin(ctx);
  const rows = await readSetting(ctx, HOSTNAMES_KEY, []);
  const existing = rows.find((row) => row.id === id);
  if (!existing) return true;
  await writeSetting(ctx, HOSTNAMES_KEY, rows.filter((row) => row.id !== id));
  await ctx.prisma.dnsRecord.delete({ where: { id: `${HOSTNAME_RECORD_PREFIX}${id}` } }).catch(() => {});
  const zoneName = domainFromHost(existing.hostname, (await getPowerDnsConfig(ctx)).primaryDomain);
  await syncPowerDnsDomain(ctx, zoneName).catch(() => {});
  await writeAudit(ctx, 'powerdns_hostname_deleted', 'powerdnsHostname', id, { hostname: existing.hostname });
  return true;
};

const upsertCoreZoneRecords = async (ctx, actor, config) => {
  const domain = await ctx.prisma.domain.upsert({
    where: { name: config.primaryDomain },
    create: {
      ownerId: actor.id,
      name: config.primaryDomain,
      dns: config.nameservers,
      status: 'active',
      records: []
    },
    update: {
      dns: config.nameservers,
      status: 'active'
    }
  });
  const addressType = addressRecordTypeFor(config.serverIp);
  const baseRecords = [
    { id: 'root_a', type: addressType, name: '@', value: config.serverIp },
    { id: 'www_a', type: addressType, name: 'www', value: config.serverIp },
    ...mailDnsDefaultsFor(config.primaryDomain, config),
    ...config.nameservers.map((ns, index) => ({ id: `ns${index + 1}_a`, type: addressType, name: relativeRecordName(ns, config.primaryDomain), value: config.serverIp }))
  ].filter((record) => record.value && record.value !== 'SERVER_IP');

  for (const record of baseRecords) {
    await ctx.prisma.dnsRecord.upsert({
      where: { id: `powerdns_${config.primaryDomain}_${record.id}` },
      create: {
        id: `powerdns_${config.primaryDomain}_${record.id}`,
        domainId: domain.id,
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: 300,
        priority: record.priority == null ? null : Number(record.priority),
        metadata: { source: 'powerdns_core', provider: 'powerdns' }
      },
      update: {
        domainId: domain.id,
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: 300,
        priority: record.priority == null ? null : Number(record.priority),
        status: 'active',
        metadata: { source: 'powerdns_core', provider: 'powerdns' }
      }
    });
  }
  await syncPowerDnsDomain(ctx, domain.id);
};

const updateSslConfigForDomain = async (ctx, config) => {
  const domainsText = [
    config.primaryDomain,
    `www.${config.primaryDomain}`,
    `mail.${config.primaryDomain}`,
    `tmail.${config.primaryDomain}`,
    `email.${config.primaryDomain}`,
    ...config.nameservers
  ].filter(isValidHost).join('\n');
  const current = await readSetting(ctx, 'sslAutomation', {});
  await writeSetting(ctx, 'sslAutomation', {
    ...current,
    autoEnabled: true,
    includeKnownDomains: true,
    includeWildcard: false,
    primaryDomain: config.primaryDomain,
    email: current.email || config.soaEmail || `admin@${config.primaryDomain}`,
    domainsText
  });
};

const applyPrimaryDomainToStores = async (ctx, actor, previousDomain, config) => {
  const stores = await ctx.prisma.store.findMany();
  for (const store of stores) {
    const nextDomain = `${store.slug}.${config.primaryDomain}`;
    const shouldUpdate = !store.domain || !previousDomain || store.domain.endsWith(`.${previousDomain}`) || store.domain === previousDomain;
    if (!shouldUpdate) continue;
    await ctx.prisma.store.update({
      where: { id: store.id },
      data: {
        domain: nextDomain,
        settings: {
          ...(store.settings || {}),
          rootDomain: config.primaryDomain,
          routeMode: 'powerdns_authoritative',
          ssl: 'queued'
        }
      }
    });
    const domain = await ctx.prisma.domain.upsert({
      where: { name: config.primaryDomain },
      create: {
        ownerId: store.ownerId || actor.id,
        name: config.primaryDomain,
        dns: config.nameservers,
        status: 'active',
        records: []
      },
      update: { dns: config.nameservers, status: 'active' }
    });
    await ctx.prisma.dnsRecord.upsert({
      where: { id: `store_${store.id}_subdomain_a` },
      create: {
        id: `store_${store.id}_subdomain_a`,
        domainId: domain.id,
        type: 'A',
        name: store.slug,
        value: config.serverIp,
        ttl: 300,
        metadata: { storeId: store.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' }
      },
      update: {
        domainId: domain.id,
        type: 'A',
        name: store.slug,
        value: config.serverIp,
        status: 'active',
        metadata: { storeId: store.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' }
      }
    });
  }
};

const applyPrimaryDomainToIsp = async (ctx, actor, config) => {
  const sites = await ctx.prisma.ispSite.findMany();
  for (const site of sites) {
    const domainName = `isp-${site.code}.${config.primaryDomain}`;
    const domain = await ctx.prisma.domain.upsert({
      where: { name: config.primaryDomain },
      create: {
        ownerId: site.ownerId || actor.id,
        name: config.primaryDomain,
        dns: config.nameservers,
        status: 'active',
        records: []
      },
      update: { dns: config.nameservers, status: 'active' }
    });
    await ctx.prisma.dnsRecord.upsert({
      where: { id: `isp_${site.id}_root_a` },
      create: {
        id: `isp_${site.id}_root_a`,
        domainId: domain.id,
        type: 'A',
        name: `isp-${site.code}`,
        value: config.serverIp,
        ttl: 300,
        metadata: { siteId: site.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' }
      },
      update: {
        domainId: domain.id,
        type: 'A',
        name: `isp-${site.code}`,
        value: config.serverIp,
        status: 'active',
        metadata: { siteId: site.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' }
      }
    });
    await ctx.prisma.systemSetting.upsert({
      where: { scope_scopeId_key: { scope: 'isp', scopeId: site.id, key: 'provisioning' } },
      create: {
        scope: 'isp',
        scopeId: site.id,
        key: 'provisioning',
        value: { publicUrl: `https://${domainName}`, ssl: 'queued', domainId: domain.id, routeMode: 'powerdns_authoritative' }
      },
      update: {
        value: { publicUrl: `https://${domainName}`, ssl: 'queued', domainId: domain.id, routeMode: 'powerdns_authoritative' }
      }
    });
  }
};

export const updatePowerDnsConfig = async (ctx, actor, input) => {
  if (!isAdmin(actor)) throw new AppError('Admin access required', 'FORBIDDEN');
  const previous = await getPowerDnsConfig(ctx);
  const next = defaultPowerDnsConfig(ctx, {
    ...previous,
    ...input,
    nameservers: Array.isArray(input.nameservers) ? input.nameservers : previous.nameservers,
    updatedAt: new Date().toISOString()
  });
  await writeSetting(ctx, CONFIG_KEY, next);
  await writeSetting(ctx, 'domainIdentity', {
    primaryDomain: next.primaryDomain,
    serverIp: next.serverIp,
    nameservers: next.nameservers,
    provider: 'powerdns',
    updatedAt: next.updatedAt
  });
  await upsertCoreZoneRecords(ctx, actor, next);
  await applyPrimaryDomainToStores(ctx, actor, previous.primaryDomain, next);
  await applyPrimaryDomainToIsp(ctx, actor, next);
  await updateSslConfigForDomain(ctx, next);
  const sync = await syncAllPowerDns(ctx, actor);
  await writeAudit(ctx, 'powerdns_config_updated', 'powerdns', next.primaryDomain, { previousDomain: previous.primaryDomain, sync });
  return next;
};

export const powerDnsStatus = async (ctx) => {
  const config = await getPowerDnsConfig(ctx);
  await ensurePowerDnsTables(ctx.prisma);
  const [zones, records] = await Promise.all([
    ctx.prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM domains`,
    ctx.prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM records`
  ]);
  const expectedNameservers = uniqueHosts(config.nameservers);
  const publicNameservers = await dns.resolveNs(config.primaryDomain).then(uniqueHosts).catch(() => []);
  const mailHost = `mail.${config.primaryDomain}`;
  const mailAddresses = await dns.lookup(mailHost, { all: true }).then((items) => items.map((item) => item.address)).catch(() => []);
  const serverIp = text(config.serverIp);
  const missingExpectedNs = expectedNameservers.filter((ns) => !publicNameservers.includes(ns));
  const nameserverAligned = expectedNameservers.length > 0 && missingExpectedNs.length === 0;
  const mailAligned = !serverIp || serverIp === 'SERVER_IP' || mailAddresses.includes(serverIp);
  const issues = [
    ...(nameserverAligned ? [] : [`Parent registry still shows ${publicNameservers.join(', ') || 'no nameservers'} instead of ${expectedNameservers.join(', ')}.`]),
    ...(mailAligned ? [] : [`${mailHost} does not resolve to ${serverIp}.`])
  ];
  return {
    ok: issues.length === 0,
    zones: Number(zones?.[0]?.count || 0),
    records: Number(records?.[0]?.count || 0),
    message: issues[0] || `PowerDNS is configured for ${config.primaryDomain}.`,
    details: {
      primaryDomain: config.primaryDomain,
      serverIp,
      expectedNameservers,
      publicNameservers,
      missingExpectedNs,
      nameserverAligned,
      mailHost,
      mailAddresses,
      mailAligned,
      requiredPorts: ['53/tcp', '53/udp', '25/tcp', '465/tcp', '587/tcp', '993/tcp', '995/tcp']
    }
  };
};

let syncTimer = null;
let syncRunning = false;

export const startPowerDnsAutomation = ({ prisma }) => {
  if (syncTimer) clearInterval(syncTimer);
  const ctx = { prisma };
  const run = async () => {
    if (syncRunning) return;
    syncRunning = true;
    try {
      await ensurePowerDnsTables(prisma);
      const config = await getPowerDnsConfig(ctx);
      if (config.automationEnabled) {
        await upsertCoreZoneRecords(ctx, { id: process.env.SYSTEM_ACTOR_ID || 'system' }, config).catch(() => {});
        await syncAllPowerDns(ctx, null);
      }
    } catch (error) {
      console.error('PowerDNS automation failed:', error.message || error);
    } finally {
      syncRunning = false;
    }
  };
  run();
  syncTimer = setInterval(run, 10 * 60 * 1000);
};

export const requireZoneAccess = async (ctx, domain) => {
  if (!domain) throw new AppError('Domain not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, domain.ownerId);
  return domain;
};
