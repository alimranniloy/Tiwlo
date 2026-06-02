import { 
  MessageCircle, 
  Ticket, 
  HelpCircle, 
  Search, 
  ChevronRight, 
  ArrowUpRight, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Users,
  ShieldCheck,
  Send,
  Plus,
  X,
  Paperclip,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import React, { useState } from 'react';
import {
  createSupportTicketWithApi,
  fetchSupportTicketWithApi,
  fetchSupportTicketsWithApi,
  replySupportTicketWithApi,
  streamSupportAiReplyWithApi,
  type SupportAiStreamEvent
} from '../lib/tiwloApi';

function formatTicketDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function Support() {
  const [isTicketDrawerOpen, setIsTicketDrawerOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Technical');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsError, setTicketsError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [ticketAiDraft, setTicketAiDraft] = useState('');
  const [streamingTicketId, setStreamingTicketId] = useState('');
  const ticketStreamRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    fetchSupportTicketsWithApi()
      .then(setTickets)
      .catch((err) => setTicketsError(err instanceof Error ? err.message : 'Unable to load tickets'));
  }, []);

  React.useEffect(() => () => ticketStreamRef.current?.abort(), []);

  const faqs = [
    { question: 'How do I resize my droplet?', category: 'Droplets' },
    { question: 'Configure automatic backups', category: 'Storage' },
    { question: 'Resetting root password', category: 'Security' },
    { question: 'Setting up VPC networking', category: 'Networking' },
  ];

  const reloadTickets = async () => {
    const nextTickets = await fetchSupportTicketsWithApi();
    setTickets(nextTickets);
    return nextTickets;
  };

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
        if (event.type === 'action' && event.action === 'human_notified') {
          setSubmitSuccess('Human support has been notified.');
        }
        if (event.type === 'done' && event.manualOnly) {
          setSubmitSuccess('Ticket created. AI is off, so human support will reply manually.');
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

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const created = await createSupportTicketWithApi({
        subject: ticketSubject,
        category: ticketCategory,
        priority: ticketPriority,
        message: ticketMessage
      });
      const nextTickets = await reloadTickets();
      setTickets(nextTickets);
      setSubmitSuccess('Ticket created. Tiwlo AI is checking it now.');
      setIsSubmitting(false);
      setIsTicketDrawerOpen(false);
      setSelectedTicket(created);
      void streamTicketAiReply(created.id, ticketMessage);
      setTicketSubject('');
      setTicketMessage('');
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit ticket');
    }
  };

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-16">
      {/* Header & Search */}
      <div className="relative overflow-hidden rounded-md bg-[#031b4e] p-8 shadow-[0_12px_28px_rgba(3,27,78,0.15)] md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white mb-4">
            How can we help you today?
          </h1>
          <p className="text-gray-400 text-sm md:text-base mb-8 font-medium">
            Search our knowledge base or get in touch with our experts.
          </p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search documentation, guides, and tutorials..."
            className="w-full rounded-md border border-white/10 bg-white/10 py-4 pl-12 pr-6 text-white backdrop-blur-md transition-all placeholder:text-white/45 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          className="group rounded-md border border-[#d9e1ec] bg-white p-8 shadow-[0_1px_2px_rgba(3,27,78,0.04)] transition-all hover:border-[#0069ff] hover:shadow-md"
        >
          <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center mb-6 transition-transform">
            <MessageCircle className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-2">Live Chat</h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Chat with our technical team in real-time. Average wait time: <span className="text-[#111827] font-bold">2 mins</span>.
          </p>
          <button onClick={openLiveChat} className="flex items-center gap-2 text-blue-600 font-bold text-sm group/btn">
            Start a Session 
            <ArrowUpRight className="h-4 w-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        <div 
          onClick={() => setIsTicketDrawerOpen(true)}
          className="group cursor-pointer rounded-md border border-[#d9e1ec] bg-white p-8 shadow-[0_1px_2px_rgba(3,27,78,0.04)] transition-all hover:border-[#0069ff] hover:shadow-md"
        >
          <div className="w-14 h-14 bg-indigo-50 rounded-lg flex items-center justify-center mb-6 transition-transform">
            <Ticket className="h-7 w-7 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-2">Create Ticket</h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Open a support ticket for complex technical queries or billing issues.
          </p>
          <button className="flex items-center gap-2 text-indigo-600 font-bold text-sm group/btn">
            Open New Ticket 
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div 
          className="group rounded-md border border-[#d9e1ec] bg-white p-8 shadow-[0_1px_2px_rgba(3,27,78,0.04)] transition-all hover:border-[#0069ff] hover:shadow-md"
        >
          <div className="w-14 h-14 bg-purple-50 rounded-lg flex items-center justify-center mb-6 transition-transform">
            <Users className="h-7 w-7 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-2">Community</h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Ask questions and share knowledge with other Tiwlo users.
          </p>
          <button className="flex items-center gap-2 text-purple-600 font-bold text-sm group/btn">
            Join the Forum 
            <ArrowUpRight className="h-4 w-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* FAQs */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-[#111827]">Popular Resources</h2>
            <button className="text-sm font-bold text-blue-600 hover:underline">View Documentation</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="group cursor-pointer rounded-md border border-[#d9e1ec] bg-white p-5 transition-colors hover:border-[#0069ff] hover:bg-[#f7faff]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{faq.category}</span>
                    <h4 className="text-sm font-bold text-[#111827] group-hover:text-blue-600 transition-colors">{faq.question}</h4>
                  </div>
                  <BookOpen className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>

          {/* Featured Tutorial Section */}
          <div className="group relative overflow-hidden rounded-md bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-[0_12px_28px_rgba(3,27,78,0.15)]">
            <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform duration-700">
               <HelpCircle className="h-40 w-40" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black uppercase tracking-widest">New Tutorial</div>
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" /> 15 min read
                </div>
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">Scale your application globally with Tiwlo Edge</h3>
              <p className="text-blue-100 text-sm mb-6 max-w-lg leading-relaxed">
                Learn how to deploy your containers to 15 global regions and reduce latency by up to 80% using our integrated load balancing.
              </p>
              <button className="flex items-center gap-2 rounded-md bg-white px-6 py-2.5 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50">
                Start Learning <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status & Recent Tickets */}
        <div className="lg:col-span-4 space-y-8">
          {/* Support Status */}
          <div className="rounded-md border border-[#d9e1ec] bg-white p-6 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
             <h3 className="text-sm font-black uppercase tracking-widest text-[#6B7280] mb-6">Service Continuity</h3>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full ring-4 ring-green-500/20"></div>
                      <span className="text-sm font-bold text-gray-700">Global Infrastructure</span>
                   </div>
                   <span className="text-[11px] font-black uppercase text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full ring-4 ring-green-500/20"></div>
                      <span className="text-sm font-bold text-gray-700">Live Support Team</span>
                   </div>
                   <span className="text-[11px] font-black uppercase text-green-600">Active</span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                   <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                     All support channels are currently running at peak efficiency. 
                     Response times for new tickets is under <span className="text-gray-900 font-bold">12 hours</span>.
                   </p>
                </div>
             </div>
          </div>

          {/* Recent Tickets */}
          <div className="rounded-md border border-[#d9e1ec] bg-white p-6 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#6B7280]">Your Tickets</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
             </div>
             <div className="space-y-4">
                {ticketsError && <div className="rounded border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">{ticketsError}</div>}
                {!ticketsError && tickets.length === 0 && (
                  <div className="rounded border border-dashed border-gray-200 p-4 text-center text-xs font-bold text-gray-400">
                    No tickets found.
                  </div>
                )}
                {tickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} onClick={() => openTicketDetails(ticket)} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold font-mono text-gray-400 uppercase">{ticket.id}</span>
                       <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                         ticket.status === 'resolved' || ticket.status === 'Resolved' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                       }`}>
                         {ticket.status}
                       </span>
                    </div>
                    <div className="text-sm font-bold text-[#111827] group-hover:text-blue-600 transition-colors truncate">
                      {ticket.subject}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1.5">
                       <Clock className="h-3 w-3" /> Created: {formatTicketDate(ticket.createdAt)}
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="rounded-md border border-blue-100 bg-blue-50 p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-bold text-blue-900">Priority Support</h4>
             </div>
             <p className="text-xs text-blue-700 leading-relaxed font-medium mb-4">
               Upgrade your plan to get access to 15-minute guaranteed response times and a dedicated technical account manager.
             </p>
             <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">
               Explore Enterprise
             </button>
          </div>
        </div>
      </div>

      {/* Submit Ticket Drawer */}
      {isTicketDrawerOpen && (
        <>
          <div 
            onClick={() => setIsTicketDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <div 
            className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-[500px] flex-col bg-white shadow-[0_24px_80px_rgba(3,27,78,0.24)]"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#f8f9fa]">
              <div>
                 <h2 className="text-lg font-bold text-[#111827]">Submit a New Ticket</h2>
                 <p className="text-[12px] text-gray-500">Our experts usually respond within 12 hours.</p>
              </div>
              <button 
                onClick={() => setIsTicketDrawerOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
               {submitError && <div className="rounded border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">{submitError}</div>}
               {submitSuccess && (
                 <div className="flex items-center gap-2 rounded border border-green-100 bg-green-50 p-3 text-xs font-bold text-green-700">
                   <CheckCircle2 className="h-4 w-4" /> {submitSuccess}
                 </div>
               )}
               <form id="support-ticket-form" onSubmit={handleSubmitTicket} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Subject Line</label>
                    <input 
                      required
                      type="text" 
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. My droplet is unresponsive"
                      className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
                      <select 
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option>Technical</option>
                        <option>Billing</option>
                        <option>Account</option>
                        <option>Abuse</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Priority</label>
                      <select 
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Message Details</label>
                    <textarea 
                      required
                      rows={6}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe your issue in detail. Include any error messages or steps to reproduce..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium resize-none"
                    ></textarea>
                 </div>

                 <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-[12px] text-amber-800 leading-relaxed font-medium">
                      Please do not share sensitive information like passwords or credit card numbers in support tickets.
                    </p>
                 </div>

                 <div className="flex items-center gap-2 text-blue-600 cursor-pointer hover:underline">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-xs font-bold">Attach Screenshot or Logs</span>
                 </div>
               </form>
            </div>

            <div className="p-6 border-t border-gray-100">
               <button 
                 form="support-ticket-form"
                 type="submit"
                 disabled={isSubmitting}
                 className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0069ff] py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-[#0056cc] disabled:opacity-50"
               >
                 {isSubmitting ? (
                   <>
                      <Clock className="h-4 w-4 animate-spin" /> Submitting...
                   </>
                 ) : (
                   <>
                      <Send className="h-4 w-4" /> Open Ticket
                   </>
                 )}
               </button>
            </div>
          </div>
        </>
      )}

      {selectedTicket && (
        <>
          <div onClick={() => setSelectedTicket(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <div className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-[560px] flex-col bg-white shadow-[0_24px_80px_rgba(3,27,78,0.24)]">
            <div className="border-b border-gray-100 bg-[#f8f9fa] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                      ['resolved', 'closed'].includes(String(selectedTicket.status).toLowerCase())
                        ? 'bg-green-100 text-green-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedTicket.status}
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase text-gray-400">{selectedTicket.id}</span>
                  </div>
                  <h2 className="text-lg font-bold text-[#111827]">{selectedTicket.subject}</h2>
                  <p className="mt-1 text-[12px] text-gray-500">{selectedTicket.category} - {selectedTicket.priority}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="rounded-full p-2 transition-colors hover:bg-gray-200">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fafc] p-6">
              {detailError && <div className="rounded border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">{detailError}</div>}
              {ticketDetailLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading ticket...
                </div>
              ) : (
                <>
                  {ticketThread(selectedTicket).map((message: any) => {
                    const staff = isStaffReply(message);
                    return (
                      <div key={message.id} className={`flex ${staff ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[84%] rounded-lg border px-4 py-3 ${
                          staff ? 'border-gray-100 bg-white text-gray-800' : 'border-blue-100 bg-blue-600 text-white'
                        }`}>
                          <div className={`mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider ${staff ? 'text-gray-400' : 'text-blue-100'}`}>
                            <span>{staff ? message.authorName : 'You'}</span>
                            <span>{formatTicketDate(message.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.body}</p>
                        </div>
                      </div>
                    );
                  })}
                  {streamingTicketId === selectedTicket.id && (
                    <div className="flex justify-start">
                      <div className="max-w-[84%] rounded-lg border border-blue-100 bg-white px-4 py-3 text-gray-800 shadow-sm">
                        <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider text-blue-500">
                          <span>Tiwlo AI</span>
                          <span>Live</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                          {ticketAiDraft || 'Checking your ticket...'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleReplyTicket} className="border-t border-gray-100 bg-white p-5">
              <textarea
                required
                rows={4}
                value={ticketReply}
                onChange={(event) => setTicketReply(event.target.value)}
                placeholder="Reply to this ticket..."
                className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button disabled={isReplying || !ticketReply.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#0069ff] py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-[#0056cc] disabled:opacity-50">
                <Send className="h-4 w-4" /> {isReplying ? 'Sending...' : 'Send Reply'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
