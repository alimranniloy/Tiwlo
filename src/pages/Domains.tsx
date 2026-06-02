import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  Plus, 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  X, 
  ChevronRight, 
  Check, 
  Info, 
  CreditCard, 
  Loader2,
  AlertCircle,
  Edit3,
  Save
} from 'lucide-react';
import { Domain } from '../types';
import { addDnsRecordWithApi, deleteDnsRecordWithApi, deleteDomainWithApi, fetchDnsRecordsWithApi, registerDomainWithApi, updateDnsRecordWithApi } from '../lib/tiwloApi';
import { useActionConfirmation } from '../components/ActionConfirmation';

interface DomainsProps {
  domains: Domain[];
  setDomains: (domains: Domain[]) => void;
}

export default function DomainsPage({ domains, setDomains }: DomainsProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ name: string; available: boolean; price: number } | null>(null);
  const [selectedYears, setSelectedYears] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [dnsRecordForm, setDnsRecordForm] = useState<any>({ id: '', type: 'A', name: '@', value: '', ttl: 300, priority: '' });
  const [savingRecord, setSavingRecord] = useState(false);
  const { confirmDelete } = useActionConfirmation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      setSearchResult({
        name: searchQuery.includes('.') ? searchQuery : `${searchQuery}.com`,
        available: true,
        price: 0
      });
      setIsSearching(false);
    }, 200);
  };

  const openDns = async (domain: Domain) => {
    setSelectedDomain(domain);
    setError('');
    try {
      setDnsRecords(await fetchDnsRecordsWithApi(domain.id));
    } catch (err) {
      setDnsRecords([]);
      setError(err instanceof Error ? err.message : 'Unable to load DNS records.');
    }
  };

  const saveDnsRecord = async () => {
    if (!selectedDomain || !dnsRecordForm.value.trim()) return;
    setSavingRecord(true);
    setError('');
    try {
      const input = {
        type: dnsRecordForm.type,
        name: dnsRecordForm.name || '@',
        value: dnsRecordForm.value,
        ttl: Number(dnsRecordForm.ttl || 300),
        priority: dnsRecordForm.priority === '' ? null : Number(dnsRecordForm.priority)
      };
      if (dnsRecordForm.id) {
        await updateDnsRecordWithApi({ id: dnsRecordForm.id, ...input });
      } else {
        await addDnsRecordWithApi({ domainId: selectedDomain.id, ...input, metadata: { provider: 'powerdns', userManaged: true } });
      }
      setDnsRecords(await fetchDnsRecordsWithApi(selectedDomain.id));
      setDnsRecordForm({ id: '', type: 'A', name: '@', value: '', ttl: 300, priority: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save DNS record.');
    } finally {
      setSavingRecord(false);
    }
  };

  const removeDnsRecord = async (record: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete DNS record?',
      message: 'This removes the record from your PowerDNS zone.',
      resourceName: `${record.type} ${record.name}`,
      confirmLabel: 'Delete record'
    });
    if (!confirmed) return;
    await deleteDnsRecordWithApi(record.id);
    setDnsRecords(dnsRecords.filter((item) => item.id !== record.id));
  };

  const handleRegister = () => {
    if (!searchResult) return;
    
    setIsRegistering(true);
    setTimeout(async () => {
      try {
        const domain = await registerDomainWithApi({ name: searchResult.name, years: selectedYears });
        setDomains([domain, ...domains]);
        setIsDrawerOpen(false);
        setSearchResult(null);
        setSearchQuery('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to register domain from the API.');
      }
      setIsRegistering(false);
    }, 1500);
  };

  const removeDomain = async (id: string) => {
    const domain = domains.find((item) => item.id === id);
    const confirmed = await confirmDelete({
      title: 'Remove domain?',
      message: 'Are you sure you want to remove this domain?',
      resourceName: domain?.name || id,
      confirmLabel: 'Remove domain'
    });
    if (!confirmed) return;

    try {
      await deleteDomainWithApi(id);
      setDomains(domains.filter(d => d.id !== id));
    } catch {
      setError('Unable to delete domain from the API.');
    }
  };

  return (
    <div className="mx-auto max-w-[1220px] space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">Domains</h1>
          <p className="mt-1 text-sm font-medium text-[#52637a]">Manage your domain names and DNS records across our global infrastructure.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 rounded-md bg-[#11843b] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0b6b30]"
          >
            <Plus className="h-4 w-4" /> Register New Domain
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600 shadow-sm">{error}</div>
      )}

      <div className="overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#e4e9f1] bg-[#f7f9fc]">
                <th className="text-left px-6 py-4 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Domain</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Nameservers</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Propagation</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Records</th>
                <th className="text-right px-6 py-4 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Globe className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No domains added yet. Add one to start managing your DNS.</p>
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr key={domain.id} className="group transition-colors hover:bg-[#f7faff]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-blue-50 p-2 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
                          <Globe className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-[#111827] text-[15px]">{domain.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-[12px] font-bold text-[#24ad5f] uppercase tracking-wider">Active</span>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        {domain.dns.slice(0, 2).map(ns => (
                          <span key={ns} className="text-[12px] font-mono text-[#6B7280]">{ns}</span>
                        ))}
                        {domain.dns.length > 2 && (
                          <span className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-tighter">+{domain.dns.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-[12px] font-medium text-[#374151]">Global (100%)</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-[13px] text-[#4B5563] font-medium">DNS records from API</span>
                    </td>
                    <td className="px-6 py-5 text-right space-x-1">
                       <button onClick={() => openDns(domain)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Manage DNS">
                         <Search className="h-4 w-4" />
                       </button>
                       <button className="p-2 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-md transition-all" title="Open Site">
                         <ExternalLink className="h-4 w-4" />
                       </button>
                       <button 
                        onClick={() => removeDomain(domain.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
                        title="Delete Domain"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-[#eff6ff] p-6 rounded-md border border-blue-100">
            <h3 className="text-[15px] font-bold text-[#1e40af] mb-2 flex items-center gap-2">
               <ShieldCheck className="h-4 w-4" /> DNS Security
            </h3>
            <p className="text-[13px] text-[#1e40af]/80 leading-relaxed">
               All domains on Tiwlo Cloud are protected with DNSSEC and global DDoS mitigation. You can enable advanced protection in the domain settings.
            </p>
         </div>
         <div className="bg-[#f0fdf4] p-6 rounded-md border border-green-100">
            <h3 className="text-[15px] font-bold text-[#166534] mb-2 flex items-center gap-2">
               <Clock className="h-4 w-4" /> Propagation Speed
            </h3>
            <p className="text-[13px] text-[#166534]/80 leading-relaxed">
               DNS updates typically propagate globally within 60 seconds thanks to our Anycast network routing technology.
            </p>
         </div>
      </div>

      {/* Domain Registration Drawer Overlay */}
      {isDrawerOpen && (
        <>
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <div 
            className="fixed top-0 right-0 h-full w-full max-w-[500px] bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#f8f9fa]">
              <div>
                 <h2 className="text-lg font-bold text-[#111827]">Register New Domain</h2>
                 <p className="text-[12px] text-gray-500">Secure your digital identity instantly.</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-8">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="space-y-3">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Search Domain Name</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search for available domains..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSearching}
                    className="bg-[#0069ff] text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-[#0056cc] transition-all disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </button>
                </div>
              </form>

              {/* Search Results */}
              {searchResult && (
                <div 
                  className={`p-5 rounded-lg border ${searchResult.available ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#111827]">{searchResult.name}</h3>
                        {searchResult.available ? (
                          <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Available</span>
                        ) : (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Unavailable</span>
                        )}
                      </div>
                      {searchResult.available && <p className="text-[12px] text-green-600 font-medium mt-1">Found a perfect match!</p>}
                    </div>
                    {searchResult.available && (
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#111827]">${searchResult.price}</div>
                        <div className="text-[11px] text-gray-400 uppercase font-bold">/ year</div>
                      </div>
                    )}
                  </div>

                  {!searchResult.available && (
                    <div className="mt-4 flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[13px] font-medium">This domain is already registered. Try another one.</span>
                    </div>
                  )}

                  {/* Recommended TLDs */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Recommended for you</p>
                     <div className="space-y-2">
                        {[
                          { ext: '.net', price: 14.99 },
                          { ext: '.org', price: 15.50 },
                          { ext: '.io', price: 32.00 }
                        ].map(rec => (
                          <div key={rec.ext} className="flex items-center justify-between p-3 border border-gray-100 rounded-md hover:border-blue-200 transition-all cursor-pointer bg-white group">
                             <div className="flex items-center gap-2">
                                <span className="text-[14px] font-bold text-[#111827]">{searchResult.name.split('.')[0]}<span className="text-blue-600">{rec.ext}</span></span>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className="text-[13px] font-bold text-[#111827]">${rec.price}</span>
                                <button className="text-[11px] font-bold text-blue-600 uppercase group-hover:underline">Add</button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              )}

              {/* Configuration Options (If Available) */}
              {searchResult?.available && (
                <div className="space-y-6">
                  {/* Duration Picker */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registration Period</label>
                    <div className="grid grid-cols-5 gap-2">
                       {[1, 2, 3, 5, 10].map(years => (
                         <button 
                          key={years}
                          onClick={() => setSelectedYears(years)}
                          className={`py-2 rounded border text-[12px] font-bold transition-all ${
                            selectedYears === years ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                         >
                           {years}Y
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3">
                     <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Included Features</label>
                     <div className="space-y-2">
                        {[
                          { label: 'Privacy Protection', desc: 'Hide your WHOIS information' },
                          { label: 'DNS Management', desc: 'Full control over DNS records' },
                          { label: 'Auto-Renewal', desc: 'Never lose your domain' }
                        ].map(feature => (
                          <div key={feature.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                             <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-gray-200">
                                <Check className="h-3 w-3 text-blue-600" />
                             </div>
                             <div>
                                <p className="text-[13px] font-bold text-[#111827]">{feature.label}</p>
                                <p className="text-[11px] text-gray-400">{feature.desc}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-100 flex gap-3">
                     <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                     <p className="text-[12px] text-blue-800 leading-relaxed">
                       Domain prices vary by TLD. Registration includes free SSL certificates and Anycast DNS as standard features.
                     </p>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-gray-100 space-y-4">
               {searchResult?.available && (
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                       <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total Price</span>
                       <span className="text-2xl font-bold text-[#111827]">${(searchResult.price * selectedYears).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[12px] text-gray-500">{selectedYears} Year{selectedYears > 1 ? 's' : ''} Registration</span>
                    </div>
                 </div>
               )}
               <button 
                 disabled={!searchResult?.available || isRegistering}
                 onClick={handleRegister}
                 className={`w-full py-3.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                   searchResult?.available 
                    ? 'bg-[#0069ff] text-white hover:bg-[#0056cc] shadow-lg shadow-blue-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                 }`}
               >
                 {isRegistering ? (
                   <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finalizing Registration...
                   </>
                 ) : (
                   <>
                      <CreditCard className="h-4 w-4" /> 
                      Proceed to Checkout
                   </>
                 )}
               </button>
               <p className="text-[10px] text-center text-gray-400">
                  By clicking checkout, you agree to our Domain Name Terms of Service.
               </p>
            </div>
          </div>
        </>
      )}

      {selectedDomain && (
        <>
          <div onClick={() => setSelectedDomain(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <div className="fixed top-0 right-0 z-[101] flex h-full w-full max-w-[720px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-[#f8f9fa] px-6 py-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-[#111827]">{selectedDomain.name}</h2>
                <p className="text-[12px] text-gray-500">PowerDNS records for this domain.</p>
              </div>
              <button onClick={() => setSelectedDomain(null)} className="rounded p-2 text-gray-400 hover:bg-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 border-b border-gray-100 pb-5 lg:grid-cols-[100px_1fr_1.4fr_100px_100px_auto]">
                <select value={dnsRecordForm.type} onChange={(event) => setDnsRecordForm({ ...dnsRecordForm, type: event.target.value })} className="rounded border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500">
                  {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'].map((type) => <option key={type}>{type}</option>)}
                </select>
                <input value={dnsRecordForm.name} onChange={(event) => setDnsRecordForm({ ...dnsRecordForm, name: event.target.value })} placeholder="@" className="rounded border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
                <input value={dnsRecordForm.value} onChange={(event) => setDnsRecordForm({ ...dnsRecordForm, value: event.target.value })} placeholder="Value" className="rounded border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
                <input type="number" value={dnsRecordForm.ttl} onChange={(event) => setDnsRecordForm({ ...dnsRecordForm, ttl: Number(event.target.value || 300) })} className="rounded border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
                <input value={dnsRecordForm.priority} onChange={(event) => setDnsRecordForm({ ...dnsRecordForm, priority: event.target.value })} placeholder="prio" className="rounded border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
                <button disabled={savingRecord} onClick={saveDnsRecord} className="inline-flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white disabled:opacity-60">
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead className="bg-[#f8f9fa] text-left">
                    <tr>
                      {['Type', 'Name', 'Value', 'TTL', 'Priority', 'Actions'].map((head) => (
                        <th key={head} className="px-4 py-3 text-[11px] font-black uppercase text-gray-500">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dnsRecords.length ? dnsRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-4 py-3 text-[12px] font-black text-blue-700">{record.type}</td>
                        <td className="px-4 py-3 font-mono text-[12px]">{record.name}</td>
                        <td className="max-w-[280px] truncate px-4 py-3 font-mono text-[12px] text-gray-600">{record.value}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-gray-600">{record.ttl}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-gray-600">{record.priority ?? '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setDnsRecordForm({ ...record, priority: record.priority ?? '' })} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Edit record">
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button onClick={() => removeDnsRecord(record)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete record">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-[13px] font-bold text-gray-400">No DNS records yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
