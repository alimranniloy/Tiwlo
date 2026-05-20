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
}) {
  const data = await graphQL<{ addDnsRecord: any }>(
    `mutation AddDnsRecord($input: DnsRecordInput!) {
      addDnsRecord(input: $input) { ${domainFields} }
    }`,
    { input }
  );

  return apiDomainToDomain(data.addDnsRecord);
}

export async function deleteDomainWithApi(id: string) {
  await graphQL<{ deleteDomain: boolean }>(
    `mutation DeleteDomain($id: ID!) {
      deleteDomain(id: $id)
    }`,
    { id }
  );
}
