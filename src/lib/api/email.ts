import { graphQL } from './client';

const mailboxAccountFields = `
  id
  address
  username
  domain
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
        to
        fromEmail
        host
        port
        secure
        requiredPorts
        allowlist
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

export async function sendMailboxEmailWithApi(input: { token: string; to: string; subject: string; body: string }) {
  const data = await graphQL<{ sendMailboxEmail: any }>(
    `mutation SendMailboxEmail($input: SendMailboxEmailInput!) {
      sendMailboxEmail(input: $input) { ${mailboxMessageFields} }
    }`,
    { input }
  );

  return data.sendMailboxEmail;
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
