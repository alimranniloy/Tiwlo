import { graphQL } from './client';

const policyFields = `
  id
  enabled
  mode
  sensitivity
  requestsPerSecondThreshold
  packetsPerSecondThreshold
  burstWindowSeconds
  blockDurationSeconds
  challengeThreshold
  syncToConnectedServers
  protectHostingNodes
  protectCloudResources
  protectDomains
  protectEcommerceDomains
  automationMode
  metadata
  createdAt
  updatedAt
`;

const assetFields = `
  id
  resourceKey
  kind
  resourceId
  name
  ip
  domain
  provider
  panel
  status
  riskScore
  lastSyncAt
  metadata
  createdAt
  updatedAt
`;

const eventFields = `
  id
  assetId
  assetKey
  assetName
  sourceIp
  vector
  severity
  requestsPerSecond
  packetsPerSecond
  confidence
  status
  blockedUntil
  metadata
  createdAt
  updatedAt
`;

const blockRuleFields = `
  id
  sourceIp
  cidr
  scope
  assetId
  assetKey
  reason
  status
  expiresAt
  enforcementState
  actionPlan
  metadata
  createdAt
  updatedAt
`;

const overviewFields = `
  policy { ${policyFields} }
  metrics {
    protectedAssets
    activeBlocks
    activeAttacks
    mitigatedToday
    peakRps
    averageRiskScore
  }
  assets { ${assetFields} }
  events { ${eventFields} }
  blockRules { ${blockRuleFields} }
  telemetry {
    bucket
    requests
    packets
    attacks
    blocked
  }
`;

export async function fetchDdosProtectionOverviewWithApi() {
  const data = await graphQL<{ ddosProtectionOverview: any }>(
    `query DdosProtectionOverview {
      ddosProtectionOverview { ${overviewFields} }
    }`
  );

  return data.ddosProtectionOverview;
}

export async function updateDdosProtectionPolicyWithApi(input: Record<string, unknown>) {
  const allowedKeys = [
    'enabled',
    'mode',
    'sensitivity',
    'requestsPerSecondThreshold',
    'packetsPerSecondThreshold',
    'burstWindowSeconds',
    'blockDurationSeconds',
    'challengeThreshold',
    'syncToConnectedServers',
    'protectHostingNodes',
    'protectCloudResources',
    'protectDomains',
    'protectEcommerceDomains',
    'automationMode',
    'metadata'
  ];
  const cleanInput = Object.fromEntries(
    allowedKeys
      .filter((key) => input[key] !== undefined)
      .map((key) => [key, input[key]])
  );
  const data = await graphQL<{ updateDdosProtectionPolicy: any }>(
    `mutation UpdateDdosProtectionPolicy($input: DdosProtectionPolicyInput!) {
      updateDdosProtectionPolicy(input: $input) { ${policyFields} }
    }`,
    { input: cleanInput }
  );

  return data.updateDdosProtectionPolicy;
}

export async function syncDdosProtectionAssetsWithApi() {
  const data = await graphQL<{ syncDdosProtectionAssets: any }>(
    `mutation SyncDdosProtectionAssets {
      syncDdosProtectionAssets { ${overviewFields} }
    }`
  );

  return data.syncDdosProtectionAssets;
}

export async function ingestDdosTelemetryWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ ingestDdosTelemetry: any }>(
    `mutation IngestDdosTelemetry($input: DdosTelemetryInput!) {
      ingestDdosTelemetry(input: $input) { ${eventFields} }
    }`,
    { input }
  );

  return data.ingestDdosTelemetry;
}

export async function createDdosBlockRuleWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ createDdosBlockRule: any }>(
    `mutation CreateDdosBlockRule($input: DdosBlockRuleInput!) {
      createDdosBlockRule(input: $input) { ${blockRuleFields} }
    }`,
    { input }
  );

  return data.createDdosBlockRule;
}

export async function releaseDdosBlockRuleWithApi(id: string) {
  const data = await graphQL<{ releaseDdosBlockRule: any }>(
    `mutation ReleaseDdosBlockRule($id: ID!) {
      releaseDdosBlockRule(id: $id) { ${blockRuleFields} }
    }`,
    { id }
  );

  return data.releaseDdosBlockRule;
}
