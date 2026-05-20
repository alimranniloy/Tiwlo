import { GRAPHQL_URL, getAuthToken, graphQL } from './client';

const supportTicketFields = `
  id
  ownerId
  assignedToId
  subject
  category
  priority
  status
  message
  metadata
  createdAt
  updatedAt
  owner {
    id
    name
    email
    role
  }
  assignedTo {
    id
    name
    email
    role
  }
  messages {
    id
    ticketId
    authorId
    authorName
    authorRole
    body
    visibility
    attachments
    createdAt
  }
`;

const liveChatFields = `
  id
  ownerId
  assignedToId
  status
  channel
  subject
  priority
  lastMessageAt
  metadata
  createdAt
  updatedAt
  owner {
    id
    name
    email
    role
  }
  assignedTo {
    id
    name
    email
    role
  }
  messages {
    id
    sessionId
    authorId
    authorName
    senderRole
    body
    attachments
    createdAt
  }
`;

export async function createSupportTicketWithApi(input: {
  subject: string;
  category: string;
  priority: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const data = await graphQL<{ createSupportTicket: any }>(
    `mutation CreateSupportTicket($input: CreateSupportTicketInput!) {
      createSupportTicket(input: $input) { ${supportTicketFields} }
    }`,
    { input }
  );

  return data.createSupportTicket;
}

export async function fetchSupportTicketsWithApi(status?: string, search?: string) {
  const data = await graphQL<{ supportTickets: any[] }>(
    `query SupportTickets($status: String, $search: String) {
      supportTickets(status: $status, search: $search) { ${supportTicketFields} }
    }`,
    { status, search }
  );

  return data.supportTickets;
}

export async function fetchSupportTicketWithApi(id: string) {
  const data = await graphQL<{ supportTicket: any }>(
    `query SupportTicket($id: ID!) {
      supportTicket(id: $id) { ${supportTicketFields} }
    }`,
    { id }
  );

  return data.supportTicket;
}

export async function replySupportTicketWithApi(id: string, input: {
  body: string;
  visibility?: string;
  attachments?: unknown[];
}) {
  const data = await graphQL<{ replySupportTicket: any }>(
    `mutation ReplySupportTicket($id: ID!, $input: SupportTicketReplyInput!) {
      replySupportTicket(id: $id, input: $input) {
        id
        ticketId
        authorId
        authorName
        authorRole
        body
        visibility
        attachments
        createdAt
      }
    }`,
    { id, input }
  );

  return data.replySupportTicket;
}

export async function assignSupportTicketWithApi(id: string, assigneeId?: string | null) {
  const data = await graphQL<{ assignSupportTicket: any }>(
    `mutation AssignSupportTicket($id: ID!, $assigneeId: ID) {
      assignSupportTicket(id: $id, assigneeId: $assigneeId) { ${supportTicketFields} }
    }`,
    { id, assigneeId }
  );

  return data.assignSupportTicket;
}

export async function updateSupportTicketStatusWithApi(id: string, status: string) {
  const data = await graphQL<{ updateSupportTicketStatus: any }>(
    `mutation UpdateSupportTicketStatus($id: ID!, $status: String!) {
      updateSupportTicketStatus(id: $id, status: $status) { ${supportTicketFields} }
    }`,
    { id, status }
  );

  return data.updateSupportTicketStatus;
}

export async function startLiveChatWithApi(input?: {
  subject?: string;
  priority?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}) {
  const data = await graphQL<{ startLiveChat: any }>(
    `mutation StartLiveChat($input: StartLiveChatInput) {
      startLiveChat(input: $input) { ${liveChatFields} }
    }`,
    { input: input || {} }
  );

  return data.startLiveChat;
}

export async function fetchLiveChatSessionsWithApi(status?: string, search?: string) {
  const data = await graphQL<{ liveChatSessions: any[] }>(
    `query LiveChatSessions($status: String, $search: String) {
      liveChatSessions(status: $status, search: $search) { ${liveChatFields} }
    }`,
    { status, search }
  );

  return data.liveChatSessions;
}

export async function fetchLiveChatSessionWithApi(id: string) {
  const data = await graphQL<{ liveChatSession: any }>(
    `query LiveChatSession($id: ID!) {
      liveChatSession(id: $id) { ${liveChatFields} }
    }`,
    { id }
  );

  return data.liveChatSession;
}

export async function sendLiveChatMessageWithApi(sessionId: string, input: {
  body: string;
  attachments?: unknown[];
}) {
  const data = await graphQL<{ sendLiveChatMessage: any }>(
    `mutation SendLiveChatMessage($sessionId: ID!, $input: LiveChatMessageInput!) {
      sendLiveChatMessage(sessionId: $sessionId, input: $input) {
        id
        sessionId
        authorId
        authorName
        senderRole
        body
        attachments
        createdAt
      }
    }`,
    { sessionId, input }
  );

  return data.sendLiveChatMessage;
}

export async function assignLiveChatSessionWithApi(id: string, assigneeId?: string | null) {
  const data = await graphQL<{ assignLiveChatSession: any }>(
    `mutation AssignLiveChatSession($id: ID!, $assigneeId: ID) {
      assignLiveChatSession(id: $id, assigneeId: $assigneeId) { ${liveChatFields} }
    }`,
    { id, assigneeId }
  );

  return data.assignLiveChatSession;
}

export async function updateLiveChatSessionStatusWithApi(id: string, status: string) {
  const data = await graphQL<{ updateLiveChatSessionStatus: any }>(
    `mutation UpdateLiveChatSessionStatus($id: ID!, $status: String!) {
      updateLiveChatSessionStatus(id: $id, status: $status) { ${liveChatFields} }
    }`,
    { id, status }
  );

  return data.updateLiveChatSessionStatus;
}

export async function createTicketFromLiveChatWithApi(sessionId: string, subject?: string) {
  const data = await graphQL<{ createTicketFromLiveChat: any }>(
    `mutation CreateTicketFromLiveChat($sessionId: ID!, $subject: String) {
      createTicketFromLiveChat(sessionId: $sessionId, subject: $subject) { ${supportTicketFields} }
    }`,
    { sessionId, subject }
  );

  return data.createTicketFromLiveChat;
}

export type SupportAiStreamEvent =
  | { type: 'meta'; channel: string; resourceId: string; analysis?: Record<string, unknown> }
  | { type: 'action'; action: string; label?: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; ok?: boolean; manualOnly?: boolean; fallback?: boolean; message?: string; error?: string; persisted?: unknown; analysis?: Record<string, unknown>; action?: string }
  | { type: 'error'; error: string };

export async function streamSupportAiReplyWithApi(
  input: {
    channel: 'live-chat' | 'ticket';
    sessionId?: string;
    ticketId?: string;
    message: string;
  },
  onEvent: (event: SupportAiStreamEvent) => void,
  options: { signal?: AbortSignal } = {}
) {
  const token = getAuthToken();
  const response = await fetch(`${GRAPHQL_URL.replace(/\/graphql\/?$/, '')}/ai/support/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(input),
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`Support AI stream failed: ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Support AI stream is not available in this browser');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalEvent: SupportAiStreamEvent | null = null;
  let streamError = '';

  const emit = (raw: string) => {
    const data = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();

    if (!data) return;
    const event = JSON.parse(data) as SupportAiStreamEvent;
    finalEvent = event;
    if (event.type === 'error') streamError = event.error;
    onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const parts = buffer.split(/\n\n/);
    buffer = parts.pop() || '';
    parts.forEach(emit);
    if (done) break;
  }

  if (buffer.trim()) emit(buffer);
  if (streamError) throw new Error(streamError);
  return finalEvent;
}
