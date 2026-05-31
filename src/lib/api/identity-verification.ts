import { graphQL, userFields } from './client';

const identityVerificationFields = `
  id
  ownerId
  flow
  status
  token
  source
  requestedById
  supportTicketId
  liveChatSessionId
  tiwloPayProfileId
  requirement
  payload
  review
  mobileLink
  expiresAt
  submittedAt
  reviewedAt
  createdAt
  updatedAt
  owner {
    ${userFields}
  }
`;

export async function fetchIdentityVerificationChallengeWithApi(flow?: string, token?: string) {
  const data = await graphQL<{ identityVerificationChallenge: any }>(
    `query IdentityVerificationChallenge($flow: String, $token: String) {
      identityVerificationChallenge(flow: $flow, token: $token) {
        mobileOnly
        mobileLink
        rejectedReason
        rejectedAt
        request { ${identityVerificationFields} }
      }
    }`,
    { flow, token }
  );

  return data.identityVerificationChallenge;
}

export async function fetchIdentityVerificationsWithApi(status?: string, flow?: string) {
  const data = await graphQL<{ identityVerifications: any[] }>(
    `query IdentityVerifications($status: String, $flow: String) {
      identityVerifications(status: $status, flow: $flow) { ${identityVerificationFields} }
    }`,
    { status, flow }
  );

  return data.identityVerifications;
}

export async function startIdentityVerificationWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ startIdentityVerification: any }>(
    `mutation StartIdentityVerification($input: StartIdentityVerificationInput!) {
      startIdentityVerification(input: $input) { ${identityVerificationFields} }
    }`,
    { input }
  );

  return data.startIdentityVerification;
}

export async function submitIdentityVerificationWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ submitIdentityVerification: any }>(
    `mutation SubmitIdentityVerification($input: SubmitIdentityVerificationInput!) {
      submitIdentityVerification(input: $input) {
        message
        request { ${identityVerificationFields} }
      }
    }`,
    { input }
  );

  return data.submitIdentityVerification;
}

export async function reviewIdentityVerificationWithApi(id: string, status: string, reason?: string) {
  const data = await graphQL<{ reviewIdentityVerification: any }>(
    `mutation ReviewIdentityVerification($id: ID!, $status: String!, $reason: String) {
      reviewIdentityVerification(id: $id, status: $status, reason: $reason) { ${identityVerificationFields} }
    }`,
    { id, status, reason }
  );

  return data.reviewIdentityVerification;
}
