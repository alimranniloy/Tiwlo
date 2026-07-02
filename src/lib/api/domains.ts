import { apiDomainToDomain, domainFields, graphQL } from './client';

export async function fetchDomainsWithApi(search?: string) {
  const data = await graphQL<{ domains: any[] }>(
    `query Domains($search: String) {
      domains(search: $search) {
        id
        ownerId
        name
        dns
        status
        records
        autoRenew
        expiresAt
        createdAt
      }
    }`,
    { search }
  );

  return data.domains;
}

export async function registerDomainWithApi(input: { name: string; years?: number; dns?: string[] }) {
  const data = await graphQL<{ registerDomain: any }>(
    `mutation RegisterDomain($input: RegisterDomainInput!) {
      registerDomain(input: $input) { ${domainFields} }
    }`,
    { input }
  );

  return apiDomainToDomain(data.registerDomain);
}

export async function addDnsRecordWithApi(input: {
  domainId: string;
  type: string;
  name: string;
  value: string;
  ttl?: number;
  priority?: number | null;
  metadata?: unknown;
}) {
  const data = await graphQL<{ addDnsRecord: any }>(
    `mutation AddDnsRecord($input: DnsRecordInput!) {
      addDnsRecord(input: $input) { ${domainFields} }
    }`,
    { input }
  );

  return apiDomainToDomain(data.addDnsRecord);
}

export async function fetchDnsRecordsWithApi(domainId: string) {
  const data = await graphQL<{ dnsRecords: any[] }>(
    `query DnsRecords($domainId: ID!) {
      dnsRecords(domainId: $domainId) {
        id
        domainId
        type
        name
        value
        ttl
        priority
        status
        metadata
        createdAt
        updatedAt
      }
    }`,
    { domainId }
  );

  return data.dnsRecords;
}

export async function updateDomainWithApi(input: {
  id: string;
  name?: string;
  dns?: string[];
  status?: string;
  records?: unknown;
  autoRenew?: boolean;
}) {
  const data = await graphQL<{ updateDomain: any }>(
    `mutation UpdateDomain($input: UpdateDomainInput!) {
      updateDomain(input: $input) { ${domainFields} }
    }`,
    { input }
  );

  return data.updateDomain;
}

export async function updateDnsRecordWithApi(input: {
  id: string;
  type?: string;
  name?: string;
  value?: string;
  ttl?: number;
  priority?: number | null;
  status?: string;
  metadata?: unknown;
}) {
  const data = await graphQL<{ updateDnsRecord: any }>(
    `mutation UpdateDnsRecord($input: UpdateDnsRecordInput!) {
      updateDnsRecord(input: $input) {
        id
        domainId
        type
        name
        value
        ttl
        priority
        status
        metadata
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.updateDnsRecord;
}

export async function deleteDnsRecordWithApi(id: string) {
  await graphQL<{ deleteDnsRecord: boolean }>(
    `mutation DeleteDnsRecord($id: ID!) {
      deleteDnsRecord(id: $id)
    }`,
    { id }
  );
}

export async function deleteDomainWithApi(id: string) {
  await graphQL<{ deleteDomain: boolean }>(
    `mutation DeleteDomain($id: ID!) {
      deleteDomain(id: $id)
    }`,
    { id }
  );
}

export async function fetchPowerDnsConfigWithApi() {
  const data = await graphQL<{ powerDnsConfig: any }>(
    `query PowerDnsConfig {
      powerDnsConfig {
        primaryDomain
        serverIp
        nameservers
        soaEmail
        automationEnabled
        dnssecEnabled
        installPackage
        provider
        updatedAt
      }
    }`
  );

  return data.powerDnsConfig;
}

export async function fetchPowerDnsStatusWithApi() {
  const data = await graphQL<{ powerDnsStatus: any }>(
    `query PowerDnsStatus {
      powerDnsStatus {
        ok
        zones
        records
        message
        details
      }
    }`
  );

  return data.powerDnsStatus;
}

export async function updatePowerDnsConfigWithApi(input: {
  primaryDomain?: string;
  serverIp?: string;
  nameservers?: string[];
  soaEmail?: string;
  automationEnabled?: boolean;
  dnssecEnabled?: boolean;
}) {
  const data = await graphQL<{ updatePowerDnsConfig: any }>(
    `mutation UpdatePowerDnsConfig($input: PowerDnsConfigInput!) {
      updatePowerDnsConfig(input: $input) {
        primaryDomain
        serverIp
        nameservers
        soaEmail
        automationEnabled
        dnssecEnabled
        installPackage
        provider
        updatedAt
      }
    }`,
    { input }
  );

  return data.updatePowerDnsConfig;
}

export async function syncPowerDnsWithApi() {
  const data = await graphQL<{ syncPowerDns: any }>(
    `mutation SyncPowerDns {
      syncPowerDns {
        ok
        zones
        records
        message
      }
    }`
  );

  return data.syncPowerDns;
}

export async function repairMailDeliveryDnsWithApi(input: {
  domain?: string;
  mailHost?: string;
  ipv4?: string;
  ipv6?: string;
  forceIpv4?: boolean;
  disableIpv6?: boolean;
  bounceText?: string;
  errorText?: string;
} = {}) {
  const data = await graphQL<{ repairMailDeliveryDns: any }>(
    `mutation RepairMailDeliveryDns($input: MailDnsRepairInput) {
      repairMailDeliveryDns(input: $input) {
        ok
        zones
        records
        message
        details
      }
    }`,
    { input }
  );

  return data.repairMailDeliveryDns;
}

export async function fetchPowerDnsHostnamesWithApi(search?: string) {
  const data = await graphQL<{ powerDnsHostnames: any[] }>(
    `query PowerDnsHostnames($search: String) {
      powerDnsHostnames(search: $search) {
        id
        hostname
        target
        ipAddress
        recordType
        ttl
        status
        notes
        createdAt
        updatedAt
      }
    }`,
    { search }
  );

  return data.powerDnsHostnames;
}

export async function upsertPowerDnsHostnameWithApi(input: {
  id?: string;
  hostname: string;
  target?: string;
  ipAddress?: string;
  recordType?: string;
  ttl?: number;
  status?: string;
  notes?: string;
}) {
  const data = await graphQL<{ upsertPowerDnsHostname: any }>(
    `mutation UpsertPowerDnsHostname($input: PowerDnsHostnameInput!) {
      upsertPowerDnsHostname(input: $input) {
        id
        hostname
        target
        ipAddress
        recordType
        ttl
        status
        notes
        createdAt
        updatedAt
      }
    }`,
    { input }
  );

  return data.upsertPowerDnsHostname;
}

export async function deletePowerDnsHostnameWithApi(id: string) {
  await graphQL<{ deletePowerDnsHostname: boolean }>(
    `mutation DeletePowerDnsHostname($id: ID!) {
      deletePowerDnsHostname(id: $id)
    }`,
    { id }
  );
}
