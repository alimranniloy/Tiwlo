import React, { useState, useEffect, useRef } from 'react';
import { CheckCheck, MessageSquare, Paperclip, Send, X } from 'lucide-react';
import {
  fetchLiveChatSessionWithApi,
  sendLiveChatMessageWithApi,
  startLiveChatWithApi,
  streamSupportAiReplyWithApi,
  type SupportAiStreamEvent
} from '../lib/tiwloApi';

const CHAT_PROMPTS = [
  "Hi, need help?",
  "Cloud, billing, hosting, ISP, or security issue?",
  "Tell me what happened. I'll keep it short.",
  "If it is urgent, support can review it.",
  "Tiwlo support is here."
];

type Message = {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  time: string;
  status?: 'seen';
  createdAt?: string;
  source?: 'local' | 'api' | 'stream';
  authorName?: string;
};

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const timeLabel = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isCustomerSender = (message: any) => {
  const role = String(message?.senderRole || message?.authorRole || '').toLowerCase();
  return ['user', 'customer', 'client', 'owner', 'member'].includes(role);
};

const chatMessageToWidgetMessage = (message: any): Message => {
  const customer = isCustomerSender(message);
  return {
    id: `api-${message.id}`,
    sender: customer ? 'user' : 'ai',
    text: message.body,
    time: timeLabel(message.createdAt),
    status: customer ? 'seen' : undefined,
    createdAt: message.createdAt,
    source: 'api',
    authorName: message.authorName || (customer ? 'You' : 'Tiwlo Support')
  };
};

const getStoredUser = () => {
  try {
    const saved = localStorage.getItem('tiwlo_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const TiwloAvatar = ({ className = "w-[46px] h-[46px]" }) => (
  <div className={`relative shrink-0 flex items-center justify-center bg-gray-50 rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)] border border-gray-100 ${className}`}>
    <div className="ai-profile-anim relative">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <defs>
          <mask id="ai-clipping">
            <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
            <polygon points="25,25 75,25 50,75" fill="white"></polygon>
            <polygon points="50,25 75,75 25,75" fill="white"></polygon>
            <polygon points="35,35 65,35 50,65" fill="white"></polygon>
            <polygon points="35,35 65,35 50,65" fill="white"></polygon>
            <polygon points="35,35 65,35 50,65" fill="white"></polygon>
            <polygon points="35,35 65,35 50,65" fill="white"></polygon>
          </mask>
        </defs>
      </svg>
      <div className="box"></div>
    </div>
  </div>
);

const UserAvatar = ({ name, className = 'w-7 h-7' }: { name?: string; className?: string }) => {
  const label = String(name || 'You').trim();
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'Y';

  return (
    <div className={`shrink-0 flex items-center justify-center rounded-full bg-[#111827] text-white text-[11px] font-black ${className}`}>
      {initials}
    </div>
  );
};

export default function FloatingAIWidget() {
  const storedUser = getStoredUser();
  const userName = String(storedUser?.name || storedUser?.email || 'You');
  const [isOpen, setIsOpen] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'sys-1',
      sender: 'system',
      text: `Chat Ticket #${Math.floor(10000 + Math.random() * 90000)} initiated`,
      time: timeLabel(),
      source: 'local'
    },
    {
      id: 'sys-2',
      sender: 'system',
      text: 'Tiwlo Support joined the chat',
      time: timeLabel(),
      source: 'local'
    },
    {
      id: 'ai-1',
      sender: 'ai',
      text: "Hi, welcome to Tiwlo Support. Tell me what you need help with.",
      time: timeLabel(),
      source: 'local'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasRequestedAgent, setHasRequestedAgent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('tiwlo_live_chat_session_id'));
  const [apiError, setApiError] = useState('');
  const [aiMode, setAiMode] = useState<'ai' | 'manual' | 'escalated'>('ai');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeStreamRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    setMessages((current) => current.map((message) => (
      message.id === 'ai-1'
        ? { ...message, text: "Hi, welcome to Tiwlo Support. Tell me what you need help with." }
        : message
    )));
  }, []);

  useEffect(() => () => activeStreamRef.current?.abort(), []);

  useEffect(() => {
    setMsgIndex(Math.floor(Math.random() * CHAT_PROMPTS.length));

    const isClosed = localStorage.getItem('tiwlo_ai_popup_closed');
    if (!isClosed) {
      const timer = setTimeout(() => {
        setShowBubble(true);
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBubble(false);
    localStorage.setItem('tiwlo_ai_popup_closed', 'true');
  };

  const mergeApiSession = (session: any) => {
    if (!session?.messages) return;
    const apiMessages = session.messages
      .map(chatMessageToWidgetMessage)
      .filter((message: Message, index: number, list: Message[]) => {
        if (message.sender !== 'ai') return true;
        const previousUser = [...list.slice(0, index), ...messages]
          .reverse()
          .find((item) => item.sender === 'user');
        return !previousUser || normalizeText(previousUser.text) !== normalizeText(message.text);
      });
    setMessages((current) => {
      const localMessages = current.filter((message) => (
        message.source !== 'api' &&
        !apiMessages.some((apiMessage: Message) => (
          apiMessage.sender === message.sender &&
          apiMessage.text === message.text &&
          ['user', 'ai'].includes(message.sender)
        ))
      ));
      return [...localMessages, ...apiMessages];
    });
  };

  const syncChatSession = async (id = sessionId) => {
    if (!id) return null;
    try {
      const session = await fetchLiveChatSessionWithApi(id);
      if (session) mergeApiSession(session);
      return session;
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('not found')) {
        localStorage.removeItem('tiwlo_live_chat_session_id');
        setSessionId(null);
      }
      return null;
    }
  };

  const ensureChatSession = async (metadata: Record<string, unknown> = {}) => {
    if (sessionId) return sessionId;
    const session = await startLiveChatWithApi({
      subject: 'Widget live chat',
      priority: metadata.requestedAgent ? 'high' : 'normal',
      metadata: { source: 'floating-widget', ...metadata }
    });
    setSessionId(session.id);
    localStorage.setItem('tiwlo_live_chat_session_id', session.id);
    setMessages((current) => [...current, {
      id: `session-${session.id}`,
      sender: 'system',
      text: `Live chat #${String(session.id).slice(-6).toUpperCase()} connected to support`,
      time: timeLabel(),
      source: 'local'
    }]);
    mergeApiSession(session);
    return session.id;
  };

  const openPopup = async (metadata: Record<string, unknown> = {}) => {
    setIsOpen(true);
    setShowBubble(false);
    localStorage.setItem('tiwlo_ai_popup_closed', 'true');
    try {
      await ensureChatSession(metadata);
      setApiError('');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to start live chat');
    }
  };

  const togglePopup = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    void openPopup({ openedFrom: 'floating-button' });
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    activeStreamRef.current?.abort();
    const newUserMsg: Message = {
      id: `local-${Date.now()}`,
      sender: 'user',
      text,
      time: timeLabel(),
      status: 'seen',
      createdAt: new Date().toISOString(),
      source: 'local',
      authorName: userName
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const id = await ensureChatSession({ openedFrom: 'message-send' });
      await sendLiveChatMessageWithApi(id, { body: text });
      await syncChatSession(id);
      setApiError('');

      const streamId = `stream-ai-${Date.now()}`;
      let draft = '';
      const controller = new AbortController();
      activeStreamRef.current = controller;

      await streamSupportAiReplyWithApi({
        channel: 'live-chat',
        sessionId: id,
        message: text
      }, (event: SupportAiStreamEvent) => {
        if (event.type === 'chunk') {
          draft += event.text;
          if (normalizeText(draft) === normalizeText(text)) {
            return;
          }
          setIsTyping(false);
          setMessages((current) => {
            const existing = current.some((message) => message.id === streamId);
            if (!existing) {
              return [...current, {
                id: streamId,
                sender: 'ai',
                text: draft,
                time: timeLabel(),
                source: 'stream'
              }];
            }
            return current.map((message) => (
              message.id === streamId ? { ...message, text: draft } : message
            ));
          });
        }

        if (event.type === 'action' && event.action === 'human_notified') {
          setAiMode('escalated');
        }

        if (event.type === 'done') {
          setIsTyping(false);
          if (event.message && normalizeText(event.message) === normalizeText(text)) {
            setMessages((current) => current.filter((message) => message.id !== streamId));
          }
          setAiMode(event.manualOnly ? 'manual' : Boolean(event.analysis?.needsHuman) ? 'escalated' : 'ai');
          if (event.manualOnly) {
            setMessages((current) => [...current, {
              id: `manual-${Date.now()}`,
              sender: 'system',
              text: 'AI is off. Your message is in the human support queue.',
              time: timeLabel(),
              source: 'local'
            }]);
          }
        }
      }, { signal: controller.signal });

      await syncChatSession(id);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setIsTyping(false);
      setAiMode('manual');
      setApiError(err instanceof Error ? err.message : 'Unable to send message');
      setMessages(prev => [...prev, {
        id: `send-error-${Date.now()}`,
        sender: 'system',
        text: 'Message could not be sent to support. Please try again.',
        time: timeLabel(),
        source: 'local'
      }]);
    }
  };
  
  const requestLiveAgent = async () => {
    activeStreamRef.current?.abort();
    setHasRequestedAgent(true);
    setAiMode('manual');
    setMessages(prev => [...prev, {
        id: `agent-request-${Date.now()}`,
        sender: 'system',
        text: 'Connecting you to a live agent queue...',
        time: timeLabel(),
        source: 'local'
      }]);

    try {
      const id = await ensureChatSession({ requestedAgent: true });
      await sendLiveChatMessageWithApi(id, { body: 'Live agent requested from chat widget.' });
      await syncChatSession(id);
      setMessages(prev => [...prev, {
        id: `agent-queued-${Date.now()}`,
        sender: 'system',
        text: 'Your request is visible in the Staff Support Center.',
        time: timeLabel(),
        source: 'local'
      }]);
      setApiError('');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to request a live agent');
    }
  };

  useEffect(() => {
    const handler = () => {
      void openPopup({ openedFrom: 'support-page' });
    };
    window.addEventListener('tiwlo:open-chat', handler);
    return () => window.removeEventListener('tiwlo:open-chat', handler);
  });

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    void syncChatSession(sessionId);
    const timer = window.setInterval(() => {
      void syncChatSession(sessionId);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [isOpen, sessionId]);

  return (
    <div className="fixed bottom-6 right-6 z-[9900] flex flex-col items-end gap-4 pointer-events-none font-sans">
      <style>{`
        .ai-profile-anim {
          --color-one: #38bdf8; /* sky blue */
          --color-two: #fca5a5; /* soft red */
          --color-three: transparent;
          --color-four: transparent;
          --color-five: rgba(209, 213, 219, 0.5); /* light gray */
          --time-animation: 5s;
          --size: 0.35;
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          transform: scale(var(--size));
          animation: colorize calc(var(--time-animation) * 3) ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-profile-anim::before {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          border-radius: 50%;
          border: none;
          background: linear-gradient(180deg, var(--color-five), var(--color-four));
        }

        .ai-profile-anim .box {
          width: 100%; height: 100%;
          background: linear-gradient(180deg, var(--color-one) 30%, var(--color-two) 70%);
          mask: url(#ai-clipping); -webkit-mask: url(#ai-clipping);
          position: absolute;
          top: 0;
          left: 0;
        }

        .ai-profile-anim svg {
          position: absolute; left: 0; top: 0; pointer-events: none;
          width: 100px;
          height: 100px;
        }

        .ai-profile-anim svg #ai-clipping {
          filter: contrast(15);
          animation: roundness calc(var(--time-animation) / 2) linear infinite;
        }

        .ai-profile-anim svg #ai-clipping polygon { filter: blur(7px); }
        .ai-profile-anim svg #ai-clipping polygon:nth-child(1) { transform-origin: 75% 25%; transform: rotate(90deg); }
        .ai-profile-anim svg #ai-clipping polygon:nth-child(2) { transform-origin: 50% 50%; animation: rotation var(--time-animation) linear infinite reverse; }
        .ai-profile-anim svg #ai-clipping polygon:nth-child(3) { transform-origin: 50% 60%; animation: rotation var(--time-animation) linear infinite; animation-delay: calc(var(--time-animation) / -3); }
        .ai-profile-anim svg #ai-clipping polygon:nth-child(4) { transform-origin: 40% 40%; animation: rotation var(--time-animation) linear infinite reverse; }
        .ai-profile-anim svg #ai-clipping polygon:nth-child(5) { transform-origin: 40% 40%; animation: rotation var(--time-animation) linear infinite reverse; animation-delay: calc(var(--time-animation) / -2); }
        .ai-profile-anim svg #ai-clipping polygon:nth-child(6) { transform-origin: 60% 40%; animation: rotation var(--time-animation) linear infinite; }
        .ai-profile-anim svg #ai-clipping polygon:nth-child(7) { transform-origin: 60% 40%; animation: rotation var(--time-animation) linear infinite; animation-delay: calc(var(--time-animation) / -1.5); }

        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes roundness { 0%, 60%, 100% { filter: contrast(15); } 20%, 40% { filter: contrast(3); } }
        @keyframes colorize { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.2); } }
        @keyframes aiBubble {
          0%, 2% { transform: scale(0.95); opacity: 0; pointer-events: none; }
          6% { transform: scale(1.02); opacity: 1; pointer-events: auto; }
          8% { transform: scale(1); opacity: 1; pointer-events: auto; }
          40% { transform: scale(1); opacity: 1; pointer-events: auto; }
          43% { transform: scale(0.95); opacity: 0; pointer-events: none; }
          100% { transform: scale(0.95); opacity: 0; pointer-events: none; }
        }
      `}</style>

      {/* Live Chat Window */}
      <div
        className={`absolute bottom-[80px] right-0 transition-all duration-300 origin-bottom-right pointer-events-auto flex flex-col z-50 overflow-hidden bg-white border border-gray-200 ${
          isOpen ? 'scale-100 opacity-100 translate-y-0 w-[calc(100vw-32px)] sm:w-[380px] h-[550px] max-h-[calc(100vh-120px)]' : 'scale-[0.85] opacity-0 translate-y-8 pointer-events-none w-[calc(100vw-32px)] sm:w-[380px] h-[550px]'
        }`}
      >
        {/* Header */}
        <div className="bg-[#2f71ff] px-4 py-3 flex gap-3 items-center shrink-0">
          <div className="relative">
             <TiwloAvatar className="w-10 h-10 border-none bg-white/10" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-[2px] border-[#2f71ff] rounded-full"></div>
          </div>
          <div className="flex-1 text-white min-w-0">
            <h3 className="font-bold text-[15px] leading-tight">Tiwlo Support</h3>
            <p className="text-blue-100 text-[12px] opacity-90 mt-0.5 truncate">
              {aiMode === 'manual' ? 'Support queue' : aiMode === 'escalated' ? 'Support is reviewing this chat' : 'Usually replies in a few minutes'}
            </p>
          </div>
          <button onClick={togglePopup} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f8fafc] flex flex-col gap-3">
          {apiError && (
            <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600">
              {apiError}
            </div>
          )}
          {messages.map((m) => {
            if (m.sender === 'system') {
              return (
                <div key={m.id} className="flex justify-center my-1.5">
                  <span className="text-[11px] text-gray-500 bg-white border border-gray-100 px-3 py-1 font-medium">
                    {m.text}
                  </span>
                </div>
              )
            }

            const isUser = m.sender === 'user';
            return (
              <div key={m.id} className={`flex gap-2 w-full mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                {isUser ? (
                  <UserAvatar name={m.authorName || userName} className="w-7 h-7 mt-auto" />
                ) : (
                  <TiwloAvatar className="w-7 h-7 shrink-0 mt-auto opacity-90" />
                )}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  <span className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {isUser ? (m.authorName || userName) : (m.authorName || 'Tiwlo Support')}
                  </span>
                  <div className={`px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    isUser 
                      ? 'bg-[#2f71ff] text-white' 
                      : 'bg-white text-gray-800 border border-gray-100'
                  }`}>
                    {m.text}
                  </div>
                  <div className={`text-[10px] text-gray-400 mt-1 flex items-center gap-1 px-1`}>
                    {m.time}
                    {isUser && m.status === 'seen' && (
                      <CheckCheck size={12} className="text-[#2f71ff] ml-0.5" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          
          {isTyping && (
            <div className="flex items-end gap-2 max-w-[80%] mt-1">
              <TiwloAvatar className="w-7 h-7 shrink-0 opacity-90 mb-1" />
              <div className="bg-white px-3 py-3 border border-gray-100 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {!hasRequestedAgent && (
          <div className="px-4 pb-3 bg-[#f8fafc] shrink-0 pt-1 flex justify-start">
            <button 
              onClick={requestLiveAgent} 
              className="text-[12px] text-[#2f71ff] font-medium px-4 py-1.5 bg-white hover:bg-blue-50 transition-colors border border-blue-100"
            >
              Need a live human agent?
            </button>
          </div>
        )}

        {/* Footer (Input) */}
        <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-50 shrink-0">
            <Paperclip size={20} />
          </button>
          <input 
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-gray-100 px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:bg-white transition-all w-full min-w-0"
          />
          <button 
            onClick={handleSend}
            className={`p-2.5 transition-colors flex items-center justify-center shrink-0 ${inputValue.trim() ? 'bg-[#2f71ff] text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}
            disabled={!inputValue.trim()}
          >
            <Send size={18} className="translate-x-[1px]" />
          </button>
        </div>
      </div>

      {/* Mini Chat Bubble Prompt - Only visible when not open and hasn't been closed by user */}
      {!isOpen && showBubble && (
        <div className="absolute bottom-[72px] right-2 origin-bottom-right" style={{ animation: 'aiBubble 20s cubic-bezier(0.2, 0.8, 0.2, 1) infinite' }}>
          <div className="bg-white border border-gray-100 p-4 w-[280px] sm:w-[320px] relative overflow-hidden pointer-events-auto group">
            <button 
              onClick={handleCloseBubble}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 rounded-full p-1 transition-colors z-10"
              title="Close"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
            <div className="flex gap-4 relative z-10 cursor-pointer" onClick={togglePopup}>
              <div className="relative shrink-0">
                 <TiwloAvatar />
                 <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="pt-0.5 pr-4 flex-1">
                <h4 className="text-[14px] font-bold text-gray-900 leading-none mb-1.5 font-sans tracking-tight">Tiwlo Support</h4>
                <p className="text-[13.5px] text-gray-600 leading-[1.4] font-medium font-sans line-clamp-2">
                  {CHAT_PROMPTS[msgIndex]}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={togglePopup}
        className="w-[60px] h-[60px] rounded-full bg-[#2f71ff] flex items-center justify-center hover:scale-105 transition-all duration-300 outline-none pointer-events-auto relative active:scale-95 z-50 group"
        title="Chat Setup"
      >
        <div className="relative text-white flex items-center justify-center transition-transform duration-300">
          {isOpen ? (
            <X size={28} className="text-white transition-opacity duration-300" strokeWidth={2.5} />
          ) : (
             <MessageSquare size={28} className="fill-white stroke-transparent transition-opacity duration-300" strokeWidth={2} />
          )}
        </div>
        
        {/* Large Notification Dot */}
        {!isOpen && !localStorage.getItem('tiwlo_ai_popup_closed') && (
          <span className="absolute top-[0px] right-[2px] flex h-[16px] w-[16px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-[16px] w-[16px] bg-red-500 border-[2.5px] border-white"></span>
          </span>
        )}
      </button>
    </div>
  );
}
