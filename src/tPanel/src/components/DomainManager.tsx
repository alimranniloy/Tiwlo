import { useState, Dispatch, SetStateAction, FormEvent } from "react";
import { 
  Globe, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  ExternalLink,
  Lock,
  PlusCircle,
  HelpCircle
} from "lucide-react";
import { DomainItem, DNSRecord, DNSRecordType } from "../types";

interface DomainManagerProps {
  domains: DomainItem[];
  setDomains: Dispatch<SetStateAction<DomainItem[]>>;
  onAccountUpdate?: (account: any) => void;
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
}

export default function DomainManager({ domains, setDomains, onAccountUpdate, addActivity }: DomainManagerProps) {
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(domains[0]?.id || null);
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  // New Domain Form State
  const [newDomainName, setNewDomainName] = useState("");
  const [newDocRoot, setNewDocRoot] = useState("public_html");

  // New DNS Record Form State
  const [newRecordType, setNewRecordType] = useState<DNSRecordType>("A");
  const [newRecordName, setNewRecordName] = useState("");
  const [newRecordValue, setNewRecordValue] = useState("");
  const [newRecordTtl, setNewRecordTtl] = useState(3600);

  // SSL Generation animation loader status
  const [sslLoadingId, setSslLoadingId] = useState<string | null>(null);

  // Toggle expand/collapse domain zone editor
  const toggleDomainExpand = (id: string) => {
    if (expandedDomainId === id) {
       setExpandedDomainId(null);
    } else {
       setExpandedDomainId(id);
    }
  };

  // Add mapped domain/subdomain
  const authHeaders = () => {
    const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
    return {
      Authorization: `Bearer ${saved?.token || ""}`,
      "Content-Type": "application/json"
    };
  };

  const handleAddDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim() || !newDocRoot.trim()) return;

    const sanitizedName = newDomainName.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "");
    
    try {
      const response = await fetch("/api/user/domains", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ domain: sanitizedName, documentRoot: newDocRoot.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        alert(result.message || "Unable to add this domain.");
        return;
      }
      const newDomain = result.domain as DomainItem;
      setDomains(prev => [newDomain, ...prev.filter((domain) => domain.domainName !== newDomain.domainName)]);
      if (result.account) onAccountUpdate?.(result.account);
      setExpandedDomainId(newDomain.id);
      setIsAddingDomain(false);
      addActivity("domain", `Mapped host domain: "${newDomain.domainName}" onto path ${newDomain.documentRoot}`);
      setNewDomainName("");
      setNewDocRoot("public_html");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to add this domain.");
    }
  };

  // Issue Let's Encrypt certificate
  const issueLetsEncrypt = async (domainId: string, domainName: string) => {
    setSslLoadingId(domainId);
    addActivity("ssl", `Initiating Let's Encrypt validation check for ${domainName}...`);
    try {
      const response = await fetch(`/api/user/domains/${encodeURIComponent(domainName)}/ssl`, {
        method: "POST",
        headers: authHeaders()
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Unable to queue SSL.");
      if (result.account) onAccountUpdate?.(result.account);
      setDomains(prev => prev.map(d => {
        if (d.id === domainId) {
          return {
            ...d,
            sslActive: false,
            sslType: "Let's Encrypt",
            sslExpiry: undefined
          };
        }
        return d;
      }));
      addActivity("ssl", `SSL generation queued for: ${domainName}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to queue SSL.");
    } finally {
      setSslLoadingId(null);
    }
  };

  // Add DNS Record to parent domain configuration
  const handleAddDNSRecord = (domainId: string, e: FormEvent) => {
    e.preventDefault();
    if (!newRecordName.trim() || !newRecordValue.trim()) return;

    const newRecord: DNSRecord = {
      id: "dns-" + Math.random().toString(36).substr(2, 9),
      type: newRecordType,
      name: newRecordName.trim().toLowerCase(),
      value: newRecordValue.trim(),
      ttl: Number(newRecordTtl)
    };

    setDomains(prev => prev.map(d => {
      if (d.id === domainId) {
         return {
           ...d,
           dnsRecords: [...d.dnsRecords, newRecord]
         };
      }
      return d;
    }));

    addActivity("domain", `Added DNS Zone Record [${newRecordType}] for domain configuration.`);
    
    // Clear inputs
    setNewRecordName("");
    setNewRecordValue("");
  };

  // Delete DNS Record
  const handleDeleteDNSRecord = (domainId: string, recordId: string) => {
    setDomains(prev => prev.map(d => {
      if (d.id === domainId) {
        return {
          ...d,
          dnsRecords: d.dnsRecords.filter(r => r.id !== recordId)
        };
      }
      return d;
    }));
    addActivity("domain", `Deleted custom DNS Zone entry.`);
  };

  // Delete domain config entirely
  const handleDeleteDomain = async (id: string, name: string) => {
    if (domains.length <= 1) {
       alert("You must keep at least one default primary domain setup in the system.");
       return;
    }
    if (confirm(`Are you sure you want to completely remove "${name}" and its DNS zone setups?`)) {
       try {
         const response = await fetch(`/api/user/domains/${encodeURIComponent(name)}`, {
           method: "DELETE",
           headers: authHeaders()
         });
         const result = await response.json().catch(() => ({}));
         if (!response.ok || !result.ok) {
           alert(result.message || "Unable to delete this domain.");
           return;
         }
         if (result.account) onAccountUpdate?.(result.account);
         setDomains(prev => prev.filter(d => d.id !== id));
         addActivity("domain", `Terminated web host mapping for: "${name}"`);
         setExpandedDomainId(null);
       } catch (error) {
         alert(error instanceof Error ? error.message : "Unable to delete this domain.");
       }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Domain Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-6 h-6 text-sky-400" />
            Domain &amp; DNS Zone Record Manager
          </h2>
          <p className="text-slate-400 text-sm mt-1">Configure name server registers, add subdomains, manage Let's Encrypt certificates, and write DNS records.</p>
        </div>
        <div>
          <button 
            type="button"
            onClick={() => setIsAddingDomain(true)}
            className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 rounded-lg text-white transition cursor-pointer shadow-md shadow-sky-600/10 flex items-center justify-center gap-1.5"
            id="btn-add-domain"
          >
            <Plus className="w-4 h-4" />
            Add Domain / Subdomain
          </button>
        </div>
      </div>

      {/* Domain List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-5 font-semibold">Web Domain / Sub</th>
                <th className="py-3 px-5 font-semibold hidden sm:table-cell">Document Root</th>
                <th className="py-3 px-5 font-semibold">Secure SSL Status</th>
                <th className="py-3 px-5 font-semibold text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs text-slate-300">
              {domains.map(d => (
                <tr key={d.id} className="hover:bg-slate-800/20 border-b border-slate-800/30">
                  <td className="py-3.5 px-5 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <span>{d.domainName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 hidden sm:table-cell text-slate-400">
                    /{d.documentRoot}
                  </td>
                  <td className="py-3.5 px-5 select-none">
                    {sslLoadingId === d.id ? (
                      <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generating Cert...
                      </div>
                    ) : d.sslActive ? (
                      <div className="flex items-center gap-1.5 text-emerald-400" title={`Expires ${d.sslExpiry}`}>
                        <ShieldCheck className="w-4 h-4 fill-emerald-500/10" />
                        <span>TLS 1.3 Active</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => issueLetsEncrypt(d.id, d.domainName)}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-550/20 text-rose-400 rounded border border-rose-500/20 hover:border-rose-500/30 cursor-pointer text-[10px] transition flex items-center gap-1 font-bold"
                        id={`btn-certify-${d.domainName}`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Issue Free SSL
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleDomainExpand(d.id)}
                        className="px-2 py-1.5 leading-none bg-slate-950 border border-slate-800 hover:text-indigo-400 rounded hover:bg-slate-800 flex items-center gap-1 text-[10px] cursor-pointer transition"
                        title="Zone DNS editor"
                        id={`btn-dns-${d.domainName}`}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>DNS Zone</span>
                        {expandedDomainId === d.id ? <ChevronUp className="w-3" /> : <ChevronDown className="w-3" />}
                      </button>
                      <button
                        onClick={() => handleDeleteDomain(d.id, d.domainName)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-950 border border-transparent hover:border-slate-800 rounded"
                        title="Delete Host"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded DNS Zone Record Editor Layout */}
      {expandedDomainId && domains.find(d => d.id === expandedDomainId) && (
        (() => {
          const dom = domains.find(d => d.id === expandedDomainId)!;
          const resolvedIp = dom.dnsRecords.find((record) => record.type === "A" && (record.name === "@" || record.name === dom.domainName))?.value
            || dom.dnsRecords.find((record) => record.type === "A")?.value
            || "Waiting for server IP";
          return (
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-6 shadow-md shadow-slate-950/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-sky-400" />
                    DNS Zone Record Editor: <code className="text-emerald-400">{dom.domainName}</code>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Add, update or delete authoritative domain name entries for nameserver synchronization.</p>
                </div>
                <div className="text-[11px] bg-slate-950 px-2.5 py-1 text-slate-500 font-mono border border-slate-850 rounded">
                  Resolved IP: <span className="text-slate-300 font-bold">{resolvedIp}</span>
                </div>
              </div>

              {/* dns records table list */}
              <div className="bg-slate-950 border border-slate-850 rounded-lg overflow-hidden">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-900/60 text-slate-500 border-b border-slate-850">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Value</th>
                      <th className="py-2.5 px-3">TTL</th>
                      <th className="py-2.5 px-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {dom.dnsRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-900/20">
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            rec.type === "A" ? "bg-cyan-500/10 text-cyan-400" :
                            rec.type === "CNAME" ? "bg-amber-505/10 text-amber-400" :
                            rec.type === "MX" ? "bg-indigo-500/10 text-indigo-400" :
                            "bg-purple-500/10 text-purple-400"
                          }`}>
                            {rec.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{rec.name}</td>
                        <td className="py-2.5 px-3 break-all max-w-xs">{rec.value}</td>
                        <td className="py-2.5 px-3 text-slate-500">{rec.ttl}s</td>
                        <td className="py-2 px-3 text-right">
                          {rec.name !== "@" && rec.name !== "www" ? (
                            <button
                              onClick={() => handleDeleteDNSRecord(dom.id, rec.id)}
                              className="p-1 hover:bg-slate-900 rounded text-slate-600 hover:text-rose-400"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-600 px-1 text-[10px] select-none">System lock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add record inline form */}
              <form onSubmit={(e) => handleAddDNSRecord(dom.id, e)} className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-3 shadow-inner">
                <div className="flex items-center gap-1 pb-1 text-slate-300 font-semibold text-xs">
                  <PlusCircle className="w-4 h-4 text-sky-400" />
                  <span>Add Custom Zone Record</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Type</label>
                    <select
                      value={newRecordType}
                      onChange={(e) => setNewRecordType(e.target.value as DNSRecordType)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono focus:outline-none focus:border-sky-500 text-slate-300"
                    >
                      <option value="A">A (IP Address)</option>
                      <option value="CNAME">CNAME (Alias)</option>
                      <option value="TXT">TXT (Text Signatures)</option>
                      <option value="MX">MX (Mail routing)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Host/Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. mail or *"
                      value={newRecordName}
                      onChange={(e) => setNewRecordName(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono focus:outline-none focus:border-sky-500 text-slate-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-1">Value/Address</label>
                    <input
                      type="text"
                      required
                      placeholder={newRecordType === "A" ? "e.g. 192.168.1.1" : "e.g. config=abc123txt"}
                      value={newRecordValue}
                      onChange={(e) => setNewRecordValue(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono focus:outline-none focus:border-sky-500 text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">TTL (seconds)</label>
                    <div className="flex gap-2">
                      <select
                        value={newRecordTtl}
                        onChange={(e) => setNewRecordTtl(Number(e.target.value))}
                        className="flex-1 px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono focus:outline-none focus:border-sky-500 text-slate-300 text-xs"
                      >
                        <option value={3600}>3600 (1hr)</option>
                        <option value={14400}>14400 (4hr)</option>
                        <option value={86400}>86400 (1day)</option>
                      </select>
                      <button
                        type="submit"
                        disabled={!newRecordName || !newRecordValue}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold p-1.5 rounded transition block disabled:opacity-45 shrink-0 cursor-pointer"
                        title="Insert Record"
                        id="btn-add-dns-record"
                      >
                        <Plus className="w-5.5 h-5.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>

            </div>
          );
        })()
      )}

      {/* Add Domain Dialog */}
      {isAddingDomain && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddDomain}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-400" />
                Add Host Domain
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddingDomain(false)}
                className="p-1 px-2 text-xs bg-slate-800 hover:bg-slate-755 hover:text-rose-455 text-slate-300 border border-slate-700/80 rounded transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold block">Domain / Subdomain Address</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. blog.mydomain.com" 
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded focus:outline-none focus:border-sky-500 text-slate-300 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold block">Document Root Directory</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. public_html/blog" 
                  value={newDocRoot}
                  onChange={(e) => setNewDocRoot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded focus:outline-none focus:border-sky-500 text-slate-300 font-mono text-xs"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded text-[11px] text-slate-500 leading-normal border border-slate-850 flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                <span>
                  By adding a subdomain, our virtual server config binds requests with this address to the files inside the specified <code className="text-sky-400">/{newDocRoot}</code> subdirectory.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsAddingDomain(false); setNewDomainName(""); }}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-semibold shadow shadow-sky-500/10 cursor-pointer"
              >
                Configure Mapper
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
