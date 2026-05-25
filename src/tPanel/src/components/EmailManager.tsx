import { useState, Dispatch, SetStateAction, FormEvent } from "react";
import { 
  Mail, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Inbox, 
  Send, 
  User, 
  ShieldCheck,
  ArrowLeft,
  Search,
  Star,
  Archive,
  AlertCircle,
  Clock,
  MoreVertical,
  Paperclip,
  Maximize2,
  X,
  RotateCcw,
  CheckSquare,
  FileText,
  Reply
} from "lucide-react";
import { EmailAccount, EmailMail, DomainItem } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface EmailManagerProps {
  emails: EmailAccount[];
  setEmails: Dispatch<SetStateAction<EmailAccount[]>>;
  domains: DomainItem[];
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
}

export default function EmailManager({ emails, setEmails, domains, addActivity }: EmailManagerProps) {
  const [activeAccountId, setActiveAccountId] = useState<string>(emails[0]?.id || "");
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  
  // Create accounts form
  const [emailPrefix, setEmailPrefix] = useState("");
  const [emailDomain, setEmailDomain] = useState(domains[0]?.domainName || "");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailQuota, setEmailQuota] = useState(1024); // 1GB

  // Mailbox state
  const [viewingMailId, setViewingMailId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"inbox" | "starred" | "sent" | "trash" | "drafts">("inbox");
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Compose email fields
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const activeAccount = emails.find(acc => acc.id === activeAccountId);

  // Filter logic
  const getFilteredMails = () => {
    if (!activeAccount) return [];
    let mails = activeAccount.mails;

    if (sidebarTab === "inbox") {
      mails = mails.filter(m => m.from !== activeAccount.address);
    } else if (sidebarTab === "sent") {
      mails = mails.filter(m => m.from === activeAccount.address);
    } else if (sidebarTab === "starred") {
      // simulate starred
      mails = mails.filter((_, i) => i % 3 === 0);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      mails = mails.filter(m => 
        m.subject.toLowerCase().includes(q) || 
        m.from.toLowerCase().includes(q) || 
        m.body.toLowerCase().includes(q)
      );
    }
    return mails;
  };

  const activeMail = activeAccount?.mails.find(m => m.id === viewingMailId);

  const handleCreateEmail = (e: FormEvent) => {
    e.preventDefault();
    if (!emailPrefix.trim() || !emailDomain || !emailPassword.trim()) return;

    const sanitizedPrefix = emailPrefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const fullAddress = `${sanitizedPrefix}@${emailDomain}`;

    if (emails.some(acc => acc.address === fullAddress)) {
      alert("Mailbox already exists.");
      return;
    }
    const hostName = `mail.${emailDomain}`;
    const portalHost = `email.${emailDomain}`;

    const newAccount: EmailAccount = {
      id: "email-" + Math.random().toString(36).substr(2, 9),
      address: fullAddress,
      password: emailPassword,
      hostName,
      portalHost,
      quotaMB: Number(emailQuota),
      usageMB: 0.1,
      mails: [
        {
          id: "mail-welcome",
          from: "Tiwlo Mail <noreply@tiwlo.com>",
          to: fullAddress,
          subject: "Your mailbox is ready",
          body: `Welcome to ${fullAddress}.\n\nLogin: https://${portalHost}\nUsername: ${fullAddress}\nPassword: ${emailPassword}\nHost name: ${hostName}\nIncoming: IMAP 993 SSL\nOutgoing: SMTP 465 SSL or 587 STARTTLS`,
          date: new Date().toISOString().replace('T', ' ').substr(0, 16),
          read: false
        }
      ]
    };

    setEmails(prev => [...prev, newAccount]);
    setIsAddingEmail(false);
    setActiveAccountId(newAccount.id);
    addActivity("email", `Provisioned new identity mailbox: ${newAccount.address}`);
    setEmailPrefix("");
    setEmailPassword("");
  };

  const readMail = (mailId: string) => {
    setViewingMailId(mailId);
    if (!activeAccount) return;
    setEmails(prev => prev.map(acc => {
      if (acc.id === activeAccount.id) {
         return {
           ...acc,
           mails: acc.mails.map(m => m.id === mailId ? { ...m, read: true } : m)
         };
      }
      return acc;
    }));
  };

  const handleSendMail = (e: FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;

    const newMail: EmailMail = {
      id: "m-" + Math.random().toString(36).substr(2, 9),
      from: activeAccount.address,
      to: composeTo.trim().toLowerCase(),
      subject: composeSubject.trim(),
      body: composeBody.trim(),
      date: new Date().toISOString().replace('T', ' ').substr(0, 16),
      read: true
    };

    setEmails(prev => prev.map(acc => {
      if (acc.id === activeAccount.id) {
         return {
           ...acc,
           mails: [...acc.mails, newMail],
           usageMB: parseFloat((acc.usageMB + 0.1).toFixed(2))
         };
      }
      return acc;
    }));

    addActivity("email", `Email successfully dispatched to ${newMail.to}`);
    setComposeTo(""); setComposeSubject(""); setComposeBody("");
    setIsComposing(false); setSidebarTab("sent"); setViewingMailId(null);
  };

  return (
    <div className="flex flex-col h-[750px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-sans relative">
      
      {/* Search Header (Gmail Top Bar) */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4 sm:gap-8 justify-between relative z-20">
        <div className="flex items-center gap-3 shrink-0">
           <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
              <Mail className="w-5 h-5 text-rose-400" />
           </div>
           <h2 className="hidden md:block font-black text-slate-100 tracking-tighter text-lg">Tiwlo Mail</h2>
        </div>

        <div className="flex-1 max-w-2xl relative group">
           <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
           <input 
             type="text" 
             placeholder="Search messages, subjects or senders..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all font-sans"
           />
        </div>

        <div className="flex items-center gap-3 shrink-0">
           <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] font-black text-slate-100 uppercase tracking-widest leading-none">ACTIVE ACCOUNT</span>
              <span className="text-[11px] text-indigo-400 font-bold mt-1.5 truncate max-w-[120px]">{activeAccount?.address}</span>
           </div>
           <select 
             value={activeAccountId}
             onChange={(e) => setActiveAccountId(e.target.value)}
             className="bg-slate-900 border border-slate-700 rounded-lg text-xs p-1 text-slate-300 font-bold focus:outline-none max-w-[40px] sm:max-w-none"
           >
             {emails.map(acc => <option key={acc.id} value={acc.id}>{acc.address}</option>)}
           </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Folders (Gmail Sidebar) */}
        <div className="w-16 sm:w-60 bg-slate-900/50 border-r border-slate-800 p-2 sm:p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <button 
              onClick={() => setIsComposing(true)}
              className="w-full h-12 sm:h-auto sm:py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center justify-center gap-3 text-white font-black shadow-lg shadow-indigo-600/20 transition-all active:scale-95 group mb-6"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span className="hidden sm:inline">Compose</span>
            </button>

            <div className="space-y-1">
               <SidebarItem 
                 icon={Inbox} 
                 label="Inbox" 
                 active={sidebarTab === "inbox"} 
                 count={activeAccount?.mails.filter(m => !m.read && m.from !== activeAccount.address).length}
                 onClick={() => { setSidebarTab("inbox"); setViewingMailId(null); setIsComposing(false); }} 
               />
               <SidebarItem 
                 icon={Star} 
                 label="Starred" 
                 active={sidebarTab === "starred"} 
                 onClick={() => { setSidebarTab("starred"); setViewingMailId(null); setIsComposing(false); }} 
               />
               <SidebarItem 
                 icon={Send} 
                 label="Sent" 
                 active={sidebarTab === "sent"} 
                 onClick={() => { setSidebarTab("sent"); setViewingMailId(null); setIsComposing(false); }} 
               />
               <SidebarItem icon={FileText} label="Drafts" active={sidebarTab === "drafts"} />
               <SidebarItem icon={Trash2} label="Trash" active={sidebarTab === "trash"} />
            </div>
          </div>

          <div className="space-y-4">
             <div className="hidden sm:block p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-black text-slate-500 tracking-wider">
                   <span>Storage Usage</span>
                   <span>{activeAccount ? (activeAccount.usageMB / activeAccount.quotaMB * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                     style={{ width: `${activeAccount ? (activeAccount.usageMB / activeAccount.quotaMB * 100) : 0}%` }}
                   ></div>
                </div>
                <p className="text-[9px] text-slate-600 font-bold">{activeAccount?.usageMB}MB / {activeAccount?.quotaMB}MB</p>
             </div>
             
             <button 
               onClick={() => setIsAddingEmail(true)}
               className="w-full flex items-center justify-center p-2.5 text-xs font-bold text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all border border-transparent hover:border-indigo-500/10"
             >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Identity</span>
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
          
          {/* Controls Bar */}
          <div className="h-12 border-b border-slate-800/60 flex items-center px-4 justify-between shrink-0 bg-slate-950/50">
             <div className="flex items-center gap-1">
                <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"><CheckSquare className="w-4 h-4" /></button>
                <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"><RotateCcw className="w-4 h-4" /></button>
                <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"><MoreVertical className="w-4 h-4" /></button>
             </div>
             <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>1-50 of {getFilteredMails().length}</span>
                <div className="flex gap-1">
                   <button className="p-1 hover:bg-slate-800 rounded text-slate-600 hover:text-slate-200">
                     <ChevronRight className="w-4 h-4 rotate-180" />
                   </button>
                   <button className="p-1 hover:bg-slate-800 rounded text-slate-600 hover:text-slate-200">
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto relative no-scrollbar">
            <AnimatePresence mode="wait">
              {viewingMailId && activeMail ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 sm:p-8 space-y-6"
                >
                  <div className="flex items-start justify-between gap-4">
                     <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                           <button onClick={() => setViewingMailId(null)} className="p-2 hover:bg-slate-900 rounded-full text-slate-400 hover:text-indigo-400 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                           <h3 className="text-xl font-black text-slate-100 tracking-tight leading-tight">{activeMail.subject}</h3>
                        </div>
                        
                        <div className="flex items-center justify-between py-4 border-y border-slate-800/40">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm">
                                {activeMail.from.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                 <p className="text-xs font-black text-slate-100">{activeMail.from.split("<")[0]}</p>
                                 <p className="text-[10px] text-slate-500 font-mono italic">To: {activeMail.to}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeMail.date}</p>
                              <div className="flex justify-end gap-2 mt-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                                 <button className="p-1 text-slate-500 hover:text-amber-400"><Star className="w-3.5 h-3.5" /></button>
                                 <button className="p-1 text-slate-500 hover:text-indigo-400"><Reply className="w-3.5 h-3.5 rotate-180" /></button>
                                 <button className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                           </div>
                        </div>

                        <div className="py-2 text-sm leading-relaxed text-slate-300 font-sans whitespace-pre-wrap select-text selection:bg-indigo-500/30">
                           {activeMail.body}
                        </div>

                        <div className="pt-8 border-t border-slate-800/40 flex items-center gap-3">
                           <button className="px-6 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-black border border-slate-700/50 rounded-xl transition-all flex items-center gap-2">
                             <RotateCcw className="w-3.5 h-3.5" />
                             Reply
                           </button>
                           <button className="px-6 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-black border border-slate-700/50 rounded-xl transition-all flex items-center gap-2">
                             <Send className="w-3.5 h-3.5" />
                             Forward
                           </button>
                        </div>
                     </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="divide-y divide-slate-800/40"
                >
                  {getFilteredMails().length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50 px-10">
                       <Inbox className="w-16 h-16 text-slate-200" />
                       <p className="text-sm font-black tracking-widest uppercase text-slate-600">Inbox is empty</p>
                    </div>
                  ) : (
                    getFilteredMails().map(mail => (
                      <div 
                        key={mail.id}
                        onClick={() => readMail(mail.id)}
                        className={`flex items-center px-4 py-3 gap-4 hover:bg-slate-900/50 hover:shadow-inner cursor-pointer group transition-all relative ${!mail.read ? "bg-indigo-500/[0.02]" : "opacity-80"}`}
                      >
                         <div className="flex items-center gap-3 shrink-0">
                            <button className="p-1 text-slate-700 hover:text-slate-500"><CheckSquare className="w-4 h-4" /></button>
                            <button className="p-1 text-slate-700 hover:text-amber-500/50 group-hover:text-amber-500 transition-colors"><Star className="w-4 h-4" /></button>
                         </div>
                         
                         <div className="w-32 sm:w-48 shrink-0 text-xs truncate">
                            <span className={`transition-colors ${!mail.read ? "font-black text-slate-100" : "text-slate-400"}`}>
                                {mail.from.split("<")[0].trim()}
                            </span>
                         </div>

                         <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={`text-xs truncate ${!mail.read ? "font-bold text-slate-200" : "text-slate-500"}`}>
                                {mail.subject}
                            </span>
                            <span className="text-xs text-slate-600 truncate hidden md:inline">- {mail.body.substring(0, 80)}...</span>
                         </div>

                         <div className="shrink-0 text-[10px] font-black uppercase text-slate-500 tabular-nums w-16 text-right">
                            {mail.date.split(" ")[0]}
                         </div>

                         {/* Hover Actions */}
                         <div className="absolute right-4 inset-y-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 bg-gradient-to-l from-slate-900 via-slate-900 to-transparent pl-12 transition-all">
                            <button className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition-colors"><Archive className="w-4 h-4" /></button>
                            <button className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                            <button className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-colors"><Star className="w-4 h-4" /></button>
                         </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Compose Modal (Gmail Style Popup) */}
      <AnimatePresence>
        {isComposing && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className="absolute bottom-0 right-4 w-full max-w-lg bg-slate-900 border-x border-t border-slate-700 rounded-t-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            style={{ maxHeight: "600px", height: "80%" }}
          >
            <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
               <span className="text-xs font-black text-slate-100 tracking-widest uppercase">New Message</span>
               <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-slate-800 rounded text-slate-500"><Maximize2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setIsComposing(false)} className="p-1.5 hover:bg-rose-500/10 rounded text-slate-500 hover:text-rose-400 transition-colors"><X className="w-4 h-4" /></button>
               </div>
            </div>

            <form onSubmit={handleSendMail} className="flex-1 flex flex-col overflow-hidden">
               <div className="px-4 space-y-2 py-2">
                  <div className="flex items-center border-b border-slate-800/50 py-2 gap-2">
                     <span className="text-xs text-slate-600 font-bold w-12">To</span>
                     <input 
                       type="email" 
                       required
                       value={composeTo}
                       onChange={(e) => setComposeTo(e.target.value)}
                       className="flex-1 bg-transparent border-none outline-none text-xs text-slate-200" 
                     />
                     <span className="text-xs text-slate-700 hover:text-slate-400 cursor-pointer">Cc Bcc</span>
                  </div>
                  <div className="flex items-center border-b border-slate-800/50 py-2 gap-2">
                     <span className="text-xs text-slate-600 font-bold w-12">Subject</span>
                     <input 
                       type="text" 
                       required
                       value={composeSubject}
                       onChange={(e) => setComposeSubject(e.target.value)}
                       className="flex-1 bg-transparent border-none outline-none text-xs text-slate-200" 
                     />
                  </div>
               </div>

               <textarea 
                 required
                 value={composeBody}
                 onChange={(e) => setComposeBody(e.target.value)}
                 className="flex-1 p-4 bg-transparent outline-none border-none resize-none text-sm text-slate-300 font-sans leading-relaxed selection:bg-indigo-500/20"
                 placeholder="Write your message"
               ></textarea>

               <div className="px-4 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <button type="submit" className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 group">
                        Send
                        <Send className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                     </button>
                     <button type="button" className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"><Paperclip className="w-4 h-4" /></button>
                     <button type="button" className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"><ShieldCheck className="w-4 h-4" /></button>
                  </div>
                  <button type="button" onClick={() => setIsComposing(false)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Email Identity Modal */}
      <AnimatePresence>
        {isAddingEmail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <motion.form 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               onSubmit={handleCreateEmail}
               className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 w-full max-w-[440px] shadow-2xl relative overflow-hidden"
             >
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 blur-[60px] rounded-full"></div>
                
                <div className="relative z-10 space-y-6">
                   <div className="text-center space-y-2">
                      <div className="w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-7 h-7 text-indigo-400" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-100 tracking-tighter">Create Mailbox</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Create a mailbox for this hosting account.</p>
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Mailbox address</label>
                         <div className="flex bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. root, admin, sales"
                              value={emailPrefix}
                              onChange={(e) => setEmailPrefix(e.target.value)}
                              className="flex-1 bg-transparent px-4 py-3.5 text-slate-100 text-sm font-mono outline-none" 
                            />
                            <div className="bg-slate-900 px-4 flex items-center gap-2 border-l border-slate-800">
                               <span className="text-slate-500 font-bold">@</span>
                               <select 
                                 value={emailDomain}
                                 onChange={(e) => setEmailDomain(e.target.value)}
                                 className="bg-transparent border-none outline-none text-xs font-black text-indigo-400 cursor-pointer"
                               >
                                 {domains.map(d => <option key={d.id} value={d.domainName} className="bg-slate-950">{d.domainName}</option>)}
                               </select>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Mailbox password</label>
                         <input
                            type="password"
                            required
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            placeholder="Password for email login"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                         />
                      </div>

                      <div className="space-y-2">
                         <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Storage Allocation</label>
                            <span className="text-[10px] font-black italic text-indigo-400 uppercase tracking-widest">{emailQuota}MB (1 GB)</span>
                         </div>
                         <input 
                            type="range" 
                            min="100" 
                            max="10240" 
                            step="100"
                            value={emailQuota}
                            onChange={(e) => setEmailQuota(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setIsAddingEmail(false)}
                        className="py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl transition-all text-xs uppercase tracking-widest"
                      >
                         Cancel
                      </button>
                      <button 
                         type="submit"
                         className="py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                      >
                         Create
                      </button>
                   </div>
                </div>
             </motion.form>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, count, onClick }: { icon: any, label: string, active?: boolean, count?: number, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer group ${
        active 
          ? "bg-rose-600/10 text-rose-400 font-black shadow-inner shadow-rose-500/5 border border-rose-500/10" 
          : "text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
         <Icon className={`w-4.5 h-4.5 ${active ? "text-rose-400" : "text-slate-600 group-hover:text-slate-400"}`} />
         <span className="hidden sm:inline text-xs tracking-tight">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
         <span className={`text-[10px] font-black tabular-nums transition-colors ${active ? "text-rose-400" : "text-slate-600"}`}>
            {count}
         </span>
      )}
    </button>
  );
}
