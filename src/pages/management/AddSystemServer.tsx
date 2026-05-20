import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, 
  Shield, 
  Terminal, 
  Globe, 
  ChevronRight, 
  Cpu, 
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { createSystemServerWithApi, notifyDataRefresh } from '../../lib/tiwloApi';

const SERVER_TYPES = [
  { id: 'ubuntu', name: 'Ubuntu / Linux', description: 'Bare metal or virtual Linux instance', icon: Terminal, color: 'bg-orange-500' },
  { id: 'cpanel', name: 'cPanel', description: 'Web hosting control panel', icon: Globe, color: 'bg-orange-600' },
  { id: 'whm', name: 'WHM', description: 'Web Host Manager access', icon: Shield, color: 'bg-blue-600' },
  { id: 'virtualizor', name: 'Virtualizor', description: 'VPS Control Panel', icon: Cpu, color: 'bg-indigo-600' },
  { id: 'plesk', name: 'Plesk', description: 'Windows/Linux Control Panel', icon: Database, color: 'bg-blue-400' },
];

export default function AddSystemServer() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('ubuntu');
  const [isConnecting, setIsConnecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    host: '',
    port: '',
    username: '',
    secret: ''
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError('');

    const selected = SERVER_TYPES.find(type => type.id === selectedType)!;
    try {
      await createSystemServerWithApi({
        name: formData.host,
        region: 'External / Imported',
        specs: `${selected.name} via port ${formData.port || '22'}`,
        ip: formData.host,
        provider: selectedType,
        role: selected.name,
        metadata: {
          username: formData.username,
          panel: selectedType,
          connectionMode: 'api_or_ssh'
        }
      });
      notifyDataRefresh();
      setSuccess(true);
    } catch {
      setError('Unable to connect server. Please check the API connection and credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-10 bg-white border border-[#e5e8ed] rounded-lg text-center shadow-sm">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-[#24ad5f]" />
        </div>
        <h2 className="text-2xl font-bold text-[#2e3d49]">Server Connected Successfully</h2>
        <p className="text-gray-500 mt-2 mb-8">The system has successfully established a link with the remote server.</p>
        <button 
          onClick={() => navigate('/management/resources/compute')}
          className="bg-[#0069ff] text-white px-8 py-2.5 rounded font-bold text-[14px] hover:bg-[#0056cc]"
        >
          View Connected Servers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Connect Management Server</h1>
        <p className="text-[13px] text-[#4a4a4a] mt-1">Integrate external control panels or bare metal servers into the Tiwlo ecosystem.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Step 1: Type */}
          <section className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f3f5f9] bg-[#f8f9fa]">
              <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">1. Select Server Environment</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVER_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex items-center gap-4 p-4 border rounded text-left transition-all ${
                    selectedType === type.id 
                      ? 'border-[#0069ff] bg-[#f3f5f9] ring-1 ring-[#0069ff]' 
                      : 'border-[#e5e8ed] hover:border-[#0069ff]'
                  }`}
                >
                  <div className={`w-10 h-10 ${type.color} rounded flex items-center justify-center text-white shrink-0`}>
                    <type.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#2e3d49]">{type.name}</p>
                    <p className="text-[11px] text-gray-500">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Step 2: Credentials */}
          <section className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f3f5f9] bg-[#f8f9fa]">
              <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">2. Connection Details</h2>
            </div>
            <form onSubmit={handleConnect} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Hostname / IP</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="server.example.com"
                    className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#0069ff]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Port</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    placeholder={selectedType === 'cpanel' ? '2083' : selectedType === 'whm' ? '2087' : '22'}
                    className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#0069ff]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Username</label>
                <input 
                  required 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="root"
                  className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#0069ff]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Access Token / Password</label>
                <input 
                  required 
                  type="password" 
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#0069ff]"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded border border-amber-100">
                  <AlertCircle className="h-4 w-4" />
                  <span>Ensure your firewall allows Tiwlo IP addresses.</span>
                </div>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="bg-[#0069ff] text-white px-8 py-3 rounded font-bold text-[14px] hover:bg-[#0056cc] transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {isConnecting ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Testing Connection...</>
                  ) : (
                    <>Connect Server <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-[#031b4e] rounded-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Why connect?</h3>
            <ul className="space-y-4">
              {[
                'Single dashboard for all panels',
                'Global user account automation',
                'Advanced resource monitoring',
                'Automated backup integration'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#24ad5f] shrink-0" />
                  <span className="text-[13px] text-blue-100/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
            <h3 className="font-bold text-[#2e3d49] text-[14px] uppercase tracking-wide mb-4">Supported Panels</h3>
            <div className="flex flex-wrap gap-2">
               {['cPanel 110+', 'WHM 110+', 'Ubuntu 20.04+', 'CentOS 7+', 'Virtualizor 3.0+'].map(v => (
                 <span key={v} className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{v}</span>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
