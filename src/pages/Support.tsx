import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  CreditCard,
  Database,
  FileText,
  Headphones,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Server,
  Ticket,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchSupportTicketWithApi,
  fetchSupportTicketsWithApi,
  replySupportTicketWithApi,
  streamSupportAiReplyWithApi,
  type SupportAiStreamEvent
} from '../lib/tiwloApi';

const ticketTabs = ['All Tickets', 'Open', 'In Progress', 'Resolved', 'Closed'];

function normalizeStatus(value?: string) {
  const status = String(value || 'open').toLowerCase();
  if (status === 'pending') return 'in progress';
  return status;
}

function titleCase(value?: string) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ') || 'Open';
}

function relativeDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

function formatTicketDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function displayTicketId(ticket: any) {
  const direct = ticket?.ticketNumber || ticket?.number || ticket?.code;
  if (direct) return String(direct);
  const year = ticket?.createdAt ? new Date(ticket.createdAt).getFullYear() : new Date().getFullYear();
  const shortId = String(ticket?.id || '0000').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase().padStart(4, '0');
  return `TW-${year}-${shortId}`;
}

function ticketThread(ticket: any) {
  if (!ticket) return [];
  if (Array.isArray(ticket.messages) && ticket.messages.length > 0) return ticket.messages;
  return [{
    id: `${ticket.id}-initial`,
    authorName: 'You',
    authorRole: 'user',
    body: ticket.message,
    visibility: 'public',
    createdAt: ticket.createdAt
  }];
}

function isStaffReply(message: any) {
  const role = String(message.authorRole || '').toLowerCase();
  return ['super_admin', 'admin', 'manager', 'staff', 'support'].includes(role);
}

function statusClasses(status?: string) {
  const normalized = normalizeStatus(status);
  if (normalized === 'resolved') return 'bg-[#e9fbf1] text-[#14a66d]';
  if (normalized === 'closed') return 'bg-[#eef2f7] text-[#667085]';
  if (normalized === 'in progress') return 'bg-[#fff8e6] text-[#d99100]';
  return 'bg-[#eef5ff] text-[#3d72d9]';
}

function priorityDot(priority?: string) {
  const normalized = String(priority || '').toLowerCase();
  if (normalized === 'high' || normalized === 'critical') return 'bg-[#ff385c]';
  if (normalized === 'medium') return 'bg-[#ff9f1c]';
  return 'bg-[#16c784]';
}

function SupportHeroGraphic() {
  return (
    <div className="relative hidden min-h-[210px] overflow-hidden lg:block">
      <div className="absolute right-4 top-7 h-48 w-48 rounded-full border-[18px] border-[#4f46ff] border-b-[#2ea8ff] bg-[#ede9ff]" />
      <div className="absolute right-[152px] top-[98px] h-24 w-20 rounded-[28px] border-[12px] border-[#312e81] bg-[#24b7ff]" />
      <div className="absolute right-1 top-[104px] h-24 w-20 rounded-[28px] border-[12px] border-[#312e81] bg-[#ffb4d2]" />
      <div className="absolute right-[82px] top-[74px] flex h-24 w-32 items-center justify-center rounded-[34px] bg-[#5b45ff]">
        <div className="flex gap-2">
          <span className="h-4 w-4 rounded-full bg-white/70" />
          <span className="h-4 w-4 rounded-full bg-white/70" />
          <span className="h-4 w-4 rounded-full bg-white/70" />
        </div>
      </div>
      <div className="absolute right-[300px] top-8 h-7 w-7 rounded-full bg-[#c9c1ff]" />
      <div className="absolute right-[-6px] top-10 h-16 w-16 rounded-full bg-[#d8ccff]" />
      <div className="absolute bottom-6 right-[250px] h-4 w-4 rounded-full bg-[#a492ff]" />
    </div>
  );
}

function ActionCard({
  icon,
  title,
  body,
  action,
  accent,
  href,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
  accent: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[20px] font-black tracking-tight text-[#111827]">{title}</h3>
        <p className="mt-2 min-h-[40px] text-[13px] leading-5 text-[#7b8496]">{body}</p>
        <div className="mt-6 inline-flex items-center gap-2 text-[13px] font-black text-[#4f35ff]">
          {action}
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="grid grid-cols-[56px_minmax(0,1fr)] gap-6 rounded-[18px] border border-[#e6e9f2] bg-white p-7 transition-colors hover:border-[#c8c6ff]">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="grid w-full grid-cols-[56px_minmax(0,1fr)] gap-6 rounded-[18px] border border-[#e6e9f2] bg-white p-7 text-left transition-colors hover:border-[#c8c6ff]">
      {content}
    </button>
  );
}

export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsError, setTicketsError] = useState('');
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Tickets');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [ticketAiDraft, setTicketAiDraft] = useState('');
  const [streamingTicketId, setStreamingTicketId] = useState('');
  const ticketStreamRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;
    setTicketsLoading(true);
    fetchSupportTicketsWithApi()
      .then((items) => {
        if (!isMounted) return;
        setTickets(items || []);
        setTicketsError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        setTicketsError(err instanceof Error ? err.message : 'Unable to load tickets');
      })
      .finally(() => {
        if (isMounted) setTicketsLoading(false);
      });
    return () => {
      isMounted = false;
      ticketStreamRef.current?.abort();
    };
  }, []);

  const filteredTickets = useMemo(() => {
    if (activeTab === 'All Tickets') return tickets;
    const target = activeTab.toLowerCase();
    return tickets.filter((ticket) => normalizeStatus(ticket.status) === target);
  }, [activeTab, tickets]);

  const counts = useMemo(() => ({
    open: tickets.filter((ticket) => normalizeStatus(ticket.status) === 'open').length,
    progress: tickets.filter((ticket) => normalizeStatus(ticket.status) === 'in progress').length,
    resolved: tickets.filter((ticket) => normalizeStatus(ticket.status) === 'resolved').length
  }), [tickets]);

  const openLiveChat = () => {
    window.dispatchEvent(new CustomEvent('tiwlo:open-chat', { detail: { source: 'support-page' } }));
  };

  const openTicketDetails = async (ticket: any) => {
    setSelectedTicket(ticket);
    setDetailError('');
    setTicketReply('');
    setTicketDetailLoading(true);
    try {
      setSelectedTicket(await fetchSupportTicketWithApi(ticket.id));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Unable to load ticket details');
    } finally {
      setTicketDetailLoading(false);
    }
  };

  const streamTicketAiReply = async (ticketId: string, message: string) => {
    ticketStreamRef.current?.abort();
    const controller = new AbortController();
    ticketStreamRef.current = controller;
    let draft = '';
    setStreamingTicketId(ticketId);
    setTicketAiDraft('');

    try {
      await streamSupportAiReplyWithApi({
        channel: 'ticket',
        ticketId,
        message
      }, (event: SupportAiStreamEvent) => {
        if (event.type === 'chunk') {
          draft += event.text;
          setTicketAiDraft(draft);
        }
      }, { signal: controller.signal });

      const fresh = await fetchSupportTicketWithApi(ticketId);
      setSelectedTicket(fresh);
      setTickets((current) => current.map((ticket) => ticket.id === fresh.id ? fresh : ticket));
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setDetailError(err instanceof Error ? err.message : 'Unable to stream Tiwlo AI reply');
      }
    } finally {
      setStreamingTicketId('');
      setTicketAiDraft('');
    }
  };

  const handleReplyTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTicket || !ticketReply.trim()) return;
    setIsReplying(true);
    setDetailError('');
    try {
      const replyText = ticketReply.trim();
      await replySupportTicketWithApi(selectedTicket.id, { body: replyText, visibility: 'public' });
      const fresh = await fetchSupportTicketWithApi(selectedTicket.id);
      setSelectedTicket(fresh);
      setTickets((current) => current.map((ticket) => ticket.id === fresh.id ? fresh : ticket));
      setTicketReply('');
      void streamTicketAiReply(selectedTicket.id, replyText);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Unable to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10 text-[#111827]">
      <section className="overflow-hidden rounded-[22px] border border-[#ece9ff] bg-[#f1efff]">
        <div className="grid min-h-[260px] grid-cols-1 gap-8 px-6 py-8 md:px-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-20">
          <div className="flex max-w-[720px] flex-col justify-center">
            <h1 className="text-[30px] font-black tracking-tight text-[#0c1433] md:text-[38px]">
              How can we help you today? <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-4 text-[16px] font-semibold text-[#2e3550]">
              Search our knowledge base or get in touch with our support team.
            </p>
            <div className="mt-8 flex h-16 w-full max-w-[680px] items-center rounded-[10px] border border-[#e4e7f0] bg-white px-5">
              <input
                type="text"
                placeholder="Search for articles, guides, and more..."
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#111827] outline-none placeholder:text-[#9aa3b4]"
              />
              <Search className="h-5 w-5 shrink-0 text-[#617085]" />
            </div>
          </div>
          <SupportHeroGraphic />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ActionCard
          icon={<MessageCircle className="h-7 w-7 text-[#2377d9]" />}
          title="Live Chat"
          body="Chat with our technical team in real-time."
          action="Start Chatting"
          accent="bg-[#e8f5ff]"
          onClick={openLiveChat}
        />
        <ActionCard
          icon={<Ticket className="h-7 w-7 text-[#5636e8]" />}
          title="Create Ticket"
          body="Submit a ticket and get help from our team."
          action="Open Ticket"
          accent="bg-[#f0ecff]"
          href="/support/create-ticket"
        />
        <ActionCard
          icon={<Users className="h-7 w-7 text-[#22a96b]" />}
          title="Community"
          body="Ask questions and share knowledge with others."
          action="Join Community"
          accent="bg-[#e8faef]"
          href="/documentation"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-[18px] border border-[#e6e9f2] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#edf0f6] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <h2 className="text-[18px] font-black tracking-tight text-[#111827]">Your Support Tickets</h2>
            <button
              type="button"
              onClick={() => setActiveTab('All Tickets')}
              className="inline-flex items-center gap-2 text-[13px] font-black text-[#4f35ff]"
            >
              View All Tickets <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-8 overflow-x-auto border-b border-[#edf0f6] px-5 pt-4 md:px-8">
            {ticketTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 border-b-2 pb-4 text-[13px] font-black transition-colors ${
                  activeTab === tab
                    ? 'border-[#4f35ff] text-[#4f35ff]'
                    : 'border-transparent text-[#7b8496] hover:text-[#111827]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed">
              <thead>
                <tr className="border-b border-[#edf0f6] text-left text-[11px] font-black uppercase tracking-[0.12em] text-[#8a94a8]">
                  <th className="w-[18%] px-5 py-4 md:px-8">Ticket ID</th>
                  <th className="w-[36%] px-4 py-4">Subject</th>
                  <th className="w-[14%] px-4 py-4">Status</th>
                  <th className="w-[14%] px-4 py-4">Priority</th>
                  <th className="w-[14%] px-4 py-4">Last Update</th>
                  <th className="w-[4%] px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f6]">
                {ticketsLoading && (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-[13px] font-bold text-[#7b8496]">
                      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#4f35ff]" />
                      Loading support tickets...
                    </td>
                  </tr>
                )}
                {!ticketsLoading && ticketsError && (
                  <tr>
                    <td colSpan={6} className="px-8 py-10">
                      <div className="rounded-[12px] border border-[#ffd6dc] bg-[#fff5f6] px-4 py-3 text-[13px] font-bold text-[#d92d4b]">
                        {ticketsError}
                      </div>
                    </td>
                  </tr>
                )}
                {!ticketsLoading && !ticketsError && filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#f1efff]">
                        <LifeBuoy className="h-7 w-7 text-[#5636e8]" />
                      </div>
                      <p className="mt-4 text-[15px] font-black text-[#111827]">No tickets found</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#7b8496]">Create a ticket when you need support from our team.</p>
                    </td>
                  </tr>
                )}
                {!ticketsLoading && !ticketsError && filteredTickets.slice(0, 8).map((ticket) => (
                  <tr key={ticket.id} className="text-[14px] font-semibold text-[#273043] transition-colors hover:bg-[#fbfbff]">
                    <td className="px-5 py-5 md:px-8">
                      <button
                        type="button"
                        onClick={() => openTicketDetails(ticket)}
                        className="max-w-full truncate text-left font-black text-[#4f35ff]"
                      >
                        {displayTicketId(ticket)}
                      </button>
                    </td>
                    <td className="px-4 py-5">
                      <button
                        type="button"
                        onClick={() => openTicketDetails(ticket)}
                        className="block max-w-full truncate text-left text-[#1f2937]"
                      >
                        {ticket.subject}
                      </button>
                    </td>
                    <td className="px-4 py-5">
                      <span className={`inline-flex max-w-full rounded-[8px] px-3 py-1 text-[12px] font-black ${statusClasses(ticket.status)}`}>
                        <span className="truncate">{titleCase(normalizeStatus(ticket.status))}</span>
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <span className="inline-flex max-w-full items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(ticket.priority)}`} />
                        <span className="truncate">{titleCase(ticket.priority || 'Low')}</span>
                      </span>
                    </td>
                    <td className="truncate px-4 py-5 text-[#4b5565]">{relativeDate(ticket.updatedAt || ticket.createdAt)}</td>
                    <td className="px-4 py-5">
                      <button type="button" onClick={() => openTicketDetails(ticket)} className="rounded-md p-1 text-[#1f2937] hover:bg-[#f1efff]">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center border-t border-[#edf0f6] px-5 py-5">
            <button
              type="button"
              onClick={() => setActiveTab('All Tickets')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-[#ebe7ff] bg-[#f4f1ff] px-8 text-[14px] font-black text-[#4f35ff]"
            >
              View All Tickets <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[18px] border border-[#e6e9f2] bg-white p-6">
            <h3 className="text-[18px] font-black tracking-tight text-[#111827]">Support Status</h3>
            <div className="mt-5 space-y-5">
              {[
                { icon: Server, label: 'System Status', sub: 'All systems operational', meta: 'Operational', color: 'text-[#16c784]', bg: 'bg-[#f0fbf5]' },
                { icon: Database, label: 'Server Management', sub: 'Manage and monitor your servers', meta: counts.open ? `${counts.open} open` : 'Ready', color: 'text-[#2377d9]', bg: 'bg-[#eef7ff]' },
                { icon: CreditCard, label: 'Billing & Payments', sub: 'Understand billing, payments and invoices', meta: '24/7 Available', color: 'text-[#f5a623]', bg: 'bg-[#fff8e6]' },
                { icon: BookOpen, label: 'API Documentation', sub: 'Explore our API and integrations', meta: 'Guides', color: 'text-[#5636e8]', bg: 'bg-[#f1efff]' }
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.bg}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-[#1f2937]">{item.label}</p>
                    <p className="truncate text-[12px] font-semibold text-[#7b8496]">{item.sub}</p>
                  </div>
                  <span className={`max-w-[108px] truncate text-right text-[11px] font-black ${item.color}`}>
                    {item.meta}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-[#eeeaff] bg-[#f3f0ff] p-7">
            <div className="grid grid-cols-[60px_minmax(0,1fr)] gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-[15px] bg-white">
                <Crown className="h-8 w-8 text-[#5636e8]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[17px] font-black text-[#111827]">Need priority support?</h3>
                <p className="mt-2 text-[13px] font-semibold leading-6 text-[#687083]">
                  Upgrade your plan and get access to 15-minute response time and a dedicated technical account manager.
                </p>
              </div>
            </div>
            <Link
              to="/billing"
              className="mt-6 flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#4f2fff] px-5 text-[14px] font-black text-white"
            >
              Explore Enterprise <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[18px] border border-[#e6e9f2] bg-white p-4">
            <div className="rounded-[12px] bg-[#fbfbff] p-3 text-center">
              <p className="text-[18px] font-black text-[#111827]">{tickets.length}</p>
              <p className="truncate text-[11px] font-bold text-[#7b8496]">Tickets</p>
            </div>
            <div className="rounded-[12px] bg-[#fbfbff] p-3 text-center">
              <p className="text-[18px] font-black text-[#111827]">{counts.progress}</p>
              <p className="truncate text-[11px] font-bold text-[#7b8496]">Progress</p>
            </div>
            <div className="rounded-[12px] bg-[#fbfbff] p-3 text-center">
              <p className="text-[18px] font-black text-[#111827]">{counts.resolved}</p>
              <p className="truncate text-[11px] font-bold text-[#7b8496]">Resolved</p>
            </div>
          </div>
        </aside>
      </section>

      {selectedTicket && (
        <>
          <div onClick={() => setSelectedTicket(null)} className="fixed inset-0 z-[100] bg-[#0c1433]/35" />
          <div className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-[560px] flex-col border-l border-[#e6e9f2] bg-white">
            <div className="border-b border-[#edf0f6] bg-[#fbfbff] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-[8px] px-2.5 py-1 text-[11px] font-black ${statusClasses(selectedTicket.status)}`}>
                      {titleCase(normalizeStatus(selectedTicket.status))}
                    </span>
                    <span className="font-mono text-[11px] font-black uppercase text-[#7b8496]">{displayTicketId(selectedTicket)}</span>
                  </div>
                  <h2 className="truncate text-[20px] font-black tracking-tight text-[#111827]">{selectedTicket.subject}</h2>
                  <p className="mt-1 text-[12px] font-semibold text-[#7b8496]">{titleCase(selectedTicket.category)} - {titleCase(selectedTicket.priority)}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="rounded-[8px] p-2 text-[#667085] transition-colors hover:bg-[#f1efff]">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7f8fc] p-6">
              {detailError && <div className="rounded-[12px] border border-[#ffd6dc] bg-[#fff5f6] p-3 text-[12px] font-bold text-[#d92d4b]">{detailError}</div>}
              {ticketDetailLoading ? (
                <div className="flex h-full items-center justify-center text-[13px] font-bold text-[#7b8496]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading ticket...
                </div>
              ) : (
                <>
                  {ticketThread(selectedTicket).map((message: any) => {
                    const staff = isStaffReply(message);
                    return (
                      <div key={message.id} className={`flex ${staff ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[84%] rounded-[14px] border px-4 py-3 ${
                          staff ? 'border-[#e6e9f2] bg-white text-[#1f2937]' : 'border-[#4f35ff] bg-[#4f35ff] text-white'
                        }`}>
                          <div className={`mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider ${staff ? 'text-[#7b8496]' : 'text-white/75'}`}>
                            <span>{staff ? message.authorName : 'You'}</span>
                            <span>{formatTicketDate(message.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{message.body}</p>
                        </div>
                      </div>
                    );
                  })}
                  {streamingTicketId === selectedTicket.id && (
                    <div className="flex justify-start">
                      <div className="max-w-[84%] rounded-[14px] border border-[#e6e9f2] bg-white px-4 py-3 text-[#1f2937]">
                        <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider text-[#4f35ff]">
                          <span>Tiwlo AI</span>
                          <span>Live</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                          {ticketAiDraft || 'Checking your ticket...'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleReplyTicket} className="border-t border-[#edf0f6] bg-white p-5">
              <textarea
                required
                rows={4}
                value={ticketReply}
                onChange={(event) => setTicketReply(event.target.value)}
                placeholder="Reply to this ticket..."
                className="w-full resize-none rounded-[12px] border border-[#dfe3ec] bg-white px-4 py-3 text-[14px] font-semibold text-[#111827] outline-none transition-colors placeholder:text-[#98a2b3] focus:border-[#4f35ff]"
              />
              <button disabled={isReplying || !ticketReply.trim()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#4f2fff] text-[14px] font-black text-white transition-colors hover:bg-[#3e24df] disabled:opacity-50">
                <Send className="h-4 w-4" /> {isReplying ? 'Sending...' : 'Send Reply'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
