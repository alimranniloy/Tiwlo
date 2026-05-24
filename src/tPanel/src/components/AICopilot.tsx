import { useState, useEffect, useRef, Dispatch, SetStateAction, FormEvent } from "react";
import { 
  Sparkles, 
  Send, 
  Terminal, 
  User, 
  Bot, 
  Copy, 
  Check, 
  RotateCw, 
  HelpCircle,
  Code2
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AICopilotProps {
  filesContentHint?: string; // stringified summarize of directory
  openAiPromptTrigger?: string;
  setOpenAiPromptTrigger?: Dispatch<SetStateAction<string>>;
}

export default function AICopilot({ filesContentHint, openAiPromptTrigger, setOpenAiPromptTrigger }: AICopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello Imran! I am your **tPanel Smart AI Copilot**. \n\nI can help you build custom files (Node.js Express logic, HTML index files, etc.), write custom SQL tables and statements, write DNS setups, or explain Nginx servers! Keep me updated with your tasks. What can I script for you today?"
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (chatEndRef.current && chatEndRef.current.parentElement) {
      chatEndRef.current.parentElement.scrollTop = chatEndRef.current.parentElement.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle external triggers (quick prompt button mappings in FileManager, etc)
  useEffect(() => {
    if (openAiPromptTrigger) {
       handleSendPrompt(openAiPromptTrigger);
       if (setOpenAiPromptTrigger) {
         setOpenAiPromptTrigger("");
       }
    }
  }, [openAiPromptTrigger]);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userMsg: Message = { role: "user", text: promptText };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoading(true);

    try {
      // Setup payload including simple history
      const historyPayload = messages.slice(1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          history: historyPayload
        })
      });

      const data = await res.json();
      if (res.ok && data.text) {
         setMessages(prev => [...prev, { role: "assistant", text: data.text }]);
      } else {
         throw new Error(data.error || "Failed to call the AI provider API");
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: `API connection error: ${err.message || "An unexpected error occurred."}\n\nMake sure AI_API_KEY is configured on this tPanel server.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    handleSendPrompt(userInput);
  };

  // Safe client-side parsing of simple Markdown: code blocks, bullet points, headers, bold text
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        // Code Block segment
        const lines = part.split("\n");
        const language = lines[0].replace("```", "").trim() || "code";
        const codeContent = lines.slice(1, -1).join("\n");
        const blockId = `code-block-${index}`;

        const copyCode = () => {
          navigator.clipboard.writeText(codeContent);
          setCopiedId(blockId);
          setTimeout(() => setCopiedId(""), 2000);
        };

        return (
          <div key={index} className="my-3 border border-slate-800 rounded-lg overflow-hidden font-mono text-[11px] shadow-lg max-w-full">
            <div className="bg-slate-900 px-4 py-1.5 flex justify-between items-center text-[10px] text-slate-400 select-none border-b border-slate-800">
              <span className="flex items-center gap-1.5 uppercase font-semibold">
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                {language}
              </span>
              <button 
                onClick={copyCode}
                className="flex items-center gap-1 hover:text-indigo-400 transition bg-slate-950 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
              >
                {copiedId === blockId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-400 overflow-x-auto select-text font-mono truncate whitespace-pre whitespace-pre-wrap select-text selection:bg-sky-500/30">
              {codeContent}
            </pre>
          </div>
        );
      }

      // Standard inline bold / list parsers
      let parsedText = part;
      // Resolve markdown double asterisks **bold** to <strong>bold</strong>
      // Resolve markdown list lines starting with - or * to bullets
      const formattedLines = parsedText.split("\n").map((line, lIdx) => {
        let content = line;
        
        // Headers parsing
        if (content.startsWith("### ")) {
          return <h4 key={lIdx} className="text-xs font-bold text-slate-100 mt-2 mb-1 flex items-center gap-1 font-mono uppercase tracking-wider">{content.substring(4)}</h4>;
        }
        if (content.startsWith("## ")) {
          return <h3 key={lIdx} className="text-sm font-black text-slate-200 mt-3 mb-1.5 font-mono">{content.substring(3)}</h3>;
        }

        // Bullets parsing
        const isBullet = content.trim().startsWith("- ") || content.trim().startsWith("* ");
        if (isBullet) {
          const textOnly = content.trim().substring(2);
          return (
            <li key={lIdx} className="list-disc ml-5 pl-1 py-0.5 leading-relaxed text-xs">
              {parseBoldAndInline(textOnly)}
            </li>
          );
        }

        return <p key={lIdx} className="leading-relaxed mb-2 text-xs">{parseBoldAndInline(content)}</p>;
      });

      return <div key={index} className="space-y-1">{formattedLines}</div>;
    });
  };

  // Helper to resolve inline **bold**
  const parseBoldAndInline = (textPart: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const items = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(textPart)) !== null) {
      if (match.index > lastIndex) {
        items.push(textPart.substring(lastIndex, match.index));
      }
      items.push(<strong key={match.index} className="font-bold text-slate-100 bg-slate-800/20 px-1 rounded border border-slate-800">{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < textPart.length) {
      items.push(textPart.substring(lastIndex));
    }

    return items.length > 0 ? items : textPart;
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        text: "Conversation thread flushed. Let's write some clean server codes! Ask me anything."
      }
    ]);
  };

  return (
    <div className="space-y-6">
      
      {/* Smart Copilot Hero Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse fill-amber-400/5" />
            tPanel AI Copilot Terminal
          </h2>
          <p className="text-slate-400 text-sm mt-1">Generate complete boilerplates, diagnose server DNS mapping logs, build database SQL lists, and analyze scripts.</p>
        </div>
        <div>
          <button 
            type="button"
            onClick={clearChat}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-755 hover:text-rose-455 rounded border border-slate-700 hover:border-slate-600 font-mono transition text-slate-350 cursor-pointer flex items-center justify-center gap-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reset Thread
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Suggestion Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 font-mono">Suggested Scripts</h3>
          
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-1 select-none font-mono">
            <button
              onClick={() => handleSendPrompt("Generate a full Node.js Express app.js index code to fetch users from a database table")}
              className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-850 hover:border-slate-700 transition font-medium shrink-0 max-w-[150px] lg:max-w-none hover:bg-slate-950 flex flex-col gap-1 text-[11px]"
            >
              <span className="text-amber-400">Node JS API</span>
              <span className="text-slate-500 text-[9px] truncate block">Express Route build</span>
            </button>
            <button
              onClick={() => handleSendPrompt("Write a clean responsive index.html with inline style sheet detailing an app hosting server page")}
              className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-850 hover:border-slate-700 transition font-medium shrink-0 max-w-[150px] lg:max-w-none hover:bg-slate-950 flex flex-col gap-1 text-[11px]"
            >
              <span className="text-sky-450 text-sky-400">Web Landing Page</span>
              <span className="text-slate-500 text-[9px] truncate block">Modern HTML template</span>
            </button>
            <button
              onClick={() => handleSendPrompt("Generate a MySQL queries schema script to create databases tables with rows for posts users and comments")}
              className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-850 hover:border-slate-700 transition font-medium shrink-0 max-w-[150px] lg:max-w-none hover:bg-slate-950 flex flex-col gap-1 text-[11px]"
            >
              <span className="text-pink-400">SQL Schema Setup</span>
              <span className="text-slate-500 text-[9px] truncate block">Tables, users inserts</span>
            </button>
            <button
              onClick={() => handleSendPrompt("Explain SPF and DKIM DNS TXT records. How do I configure MX entries in my domains records table?")}
              className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-850 hover:border-slate-700 transition font-medium shrink-0 max-w-[150px] lg:max-w-none hover:bg-slate-950 flex flex-col gap-1 text-[11px]"
            >
              <span className="text-emerald-400">Mail DNS routing</span>
              <span className="text-slate-500 text-[9px] truncate block">Configure core MX setup</span>
            </button>
          </div>
        </div>

        {/* Main Terminal Chat Arena */}
        <div className="lg:col-span-3">
          <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex flex-col h-[520px] shadow-2xl relative font-sans">
            
            {/* Console top ribbon */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300 font-mono">auth_agent_shell : tpanel-ai-runtime</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Copilot Active</span>
              </div>
            </div>

            {/* Chats scrolling logs screen */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text selection:bg-sky-500/25 scrollbar-thin">
              {messages.map((m, mIdx) => (
                <div 
                  key={mIdx}
                  className={`flex gap-3 max-w-[90%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {/* Icon Avatar */}
                  <div className={`p-2 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center ${m.role === "user" ? "bg-sky-600 text-white" : "bg-slate-900 text-amber-400 border border-slate-800"}`}>
                    {m.role === "user" ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
                  </div>

                  {/* Message body bubbles */}
                  <div className={`p-4 rounded-xl text-xs leading-relaxed ${
                    m.role === "user" 
                      ? "bg-sky-600/10 text-sky-100 border border-sky-650/45 rounded-tr-none px-4" 
                      : "bg-slate-900/60 text-slate-300 border border-slate-850 rounded-tl-none font-sans"
                  }`}>
                    {renderMessageContent(m.text)}
                  </div>
                </div>
              ))}

              {/* Bot typing indicator */}
              {isLoading && (
                <div className="flex gap-3 mr-auto items-start max-w-[80%] animate-pulse">
                  <div className="p-2 rounded-lg bg-slate-904 text-amber-500 border border-slate-800 h-9 w-9 flex items-center justify-center">
                    <RotateCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-slate-850 rounded-xl rounded-tl-none text-xs font-mono text-slate-500">
                    <span className="animate-pulse">Thinking, parsing server configurations, loading schema templates...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input prompt footer bar */}
            <div className="bg-slate-900 p-3.5 border-t border-slate-850">
              <form onSubmit={handleFormSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask me to script a server.js express file, write an sql rows table, or configure DNS mx tags..."
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || isLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 rounded-lg flex items-center justify-center gap-1.5 transition font-bold cursor-pointer"
                  id="btn-send-ai-prompt"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Execute</span>
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
