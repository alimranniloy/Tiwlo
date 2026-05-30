import { graphQL } from './client';

const mailboxAccountFields = `
  id
  address
  username
  domain
  displayName
  profileImageUrl
  hostName
  imapHost
  smtpHost
  portalHost
  quotaMB
  usageMB
  status
`;

const mailboxMessageFields = `
  id
  mailboxId
  folder
  from
  to
  subject
  body
  date
  read
  starred
`;

export async function testSystemEmailWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ testSystemEmail: any }>(
    `mutation TestSystemEmail($input: EmailTestInput!) {
      testSystemEmail(input: $input) {
        ok
        message
        code
        stage
        to
        fromEmail
        host
        port
        secure
        requireTLS
        smtpMode
        requiredPorts
        allowlist
        diagnostic
      }
    }`,
    { input }
  );

  return data.testSystemEmail;
}

export async function mailboxLoginWithApi(email: string, password: string) {
  const data = await graphQL<{ mailboxLogin: any }>(
    `mutation MailboxLogin($input: MailboxLoginInput!) {
      mailboxLogin(input: $input) {
        token
        account { ${mailboxAccountFields} }
      }
    }`,
    { input: { email, password } }
  );

  return data.mailboxLogin;
}

export async function mailboxRegisterWithApi(input: { username: string; domain?: string; password: string; displayName?: string; recoveryEmail: string; recoveryOtp: string }) {
  const data = await graphQL<{ mailboxRegister: any }>(
    `mutation MailboxRegister($input: MailboxRegisterInput!) {
      mailboxRegister(input: $input) {
        token
        account { ${mailboxAccountFields} }
      }
    }`,
    { input }
  );

  return data.mailboxRegister;
}

export async function requestMailboxRecoveryOtpWithApi(input: { username: string; domain?: string; recoveryEmail: string }) {
  const data = await graphQL<{ requestMailboxRecoveryOtp: any }>(
    `mutation RequestMailboxRecoveryOtp($input: RequestMailboxRecoveryOtpInput!) {
      requestMailboxRecoveryOtp(input: $input) {
        ok
        message
        recoveryEmail
        expiresAt
      }
    }`,
    { input }
  );

  return data.requestMailboxRecoveryOtp;
}

export async function fetchMailboxOverviewWithApi(token: string) {
  const data = await graphQL<{ mailboxOverview: any }>(
    `query MailboxOverview($token: String!) {
      mailboxOverview(token: $token) {
        account { ${mailboxAccountFields} }
        messages { ${mailboxMessageFields} }
      }
    }`,
    { token }
  );

  return data.mailboxOverview;
}

export async function sendMailboxEmailWithApi(input: { token: string; draftId?: string; to: string; subject: string; body: string }) {
  const data = await graphQL<{ sendMailboxEmail: any }>(
    `mutation SendMailboxEmail($input: SendMailboxEmailInput!) {
      sendMailboxEmail(input: $input) { ${mailboxMessageFields} }
    }`,
    { input }
  );

  return data.sendMailboxEmail;
}

export async function saveMailboxDraftWithApi(input: { token: string; id?: string; to?: string; subject?: string; body?: string }) {
  const data = await graphQL<{ saveMailboxDraft: any }>(
    `mutation SaveMailboxDraft($input: SaveMailboxDraftInput!) {
      saveMailboxDraft(input: $input) { ${mailboxMessageFields} }
    }`,
    { input }
  );

  return data.saveMailboxDraft;
}

export async function updateMailboxMessageWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ updateMailboxMessage: any }>(
    `mutation UpdateMailboxMessage($input: UpdateMailboxMessageInput!) {
      updateMailboxMessage(input: $input) { ${mailboxMessageFields} }
    }`,
    { input }
  );

  return data.updateMailboxMessage;
}

export async function deleteMailboxMessageWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ deleteMailboxMessage: boolean }>(
    `mutation DeleteMailboxMessage($input: UpdateMailboxMessageInput!) {
      deleteMailboxMessage(input: $input)
    }`,
    { input }
  );

  return data.deleteMailboxMessage;
}

export async function updateMailboxProfileWithApi(input: { token: string; displayName?: string; profileImageUrl?: string }) {
  const data = await graphQL<{ updateMailboxProfile: any }>(
    `mutation UpdateMailboxProfile($input: UpdateMailboxProfileInput!) {
      updateMailboxProfile(input: $input) { ${mailboxAccountFields} }
    }`,
    { input }
  );

  return data.updateMailboxProfile;
}
