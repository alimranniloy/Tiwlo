import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  Plus, 
  Search, 
  Power, 
  Trash2, 
  Cpu,
  BarChart2,
  Terminal,
  ExternalLink,
  Activity,
  KeyRound,
  X
} from 'lucide-react';
import { Droplet } from '../types';
import {
  changeTPanelResourcePasswordWithApi,
  createTPanelResourceLoginWithApi,
  deleteDropletWithApi,
  updateDropletStatusWithApi
} from '../lib/tiwloApi';
import { useActionConfirmation } from '../components/ActionConfirmation';

interface DropletsProps {
  droplets: Droplet[];
  setDroplets: (droplets: Droplet[]) => void;
}

export default function DropletsPage({ droplets, setDroplets }: DropletsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [selectedDroplet, setSelectedDroplet] = useState<Droplet | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const { confirmDelete } = useActionConfirmation();

  const deleteDroplet = async (id: string) => {
    const droplet = droplets.find((item) => item.id === id);
    const confirmed = await confirmDelete({
      title: 'Delete droplet?',
      message: 'Are you sure you want to delete this droplet? All data will be lost.',
      resourceName: droplet?.name || id
    });
    if (!confirmed) return;

    try {
      await deleteDropletWithApi(id);
      setDroplets(droplets.filter(d => d.id !== id));
    } catch {
      setError('Unable to delete droplet from the API.');
    }
  };

  const toggleStatus = async (id: string) => {
    const target = droplets.find(d => d.id === id);
    const nextStatus = target?.status === 'active' ? 'off' : 'active';

    try {
      setActionLoading(`power:${id}`);
      const updated = await updateDropletStatusWithApi(id, nextStatus);
      setDroplets(droplets.map(d => d.id === id ? updated : d));
      setSelectedDroplet((current) => current?.id === id ? updated : current);
    } catch {
      setError('Unable to update droplet status from the API.');
    } finally {
      setActionLoading('');
    }
  };

  const isTPanelDroplet = (droplet: Droplet) => Boolean((droplet.metadata as any)?.tpanelAccount || (droplet.metadata as any)?.deploymentNode?.module === 'tpanel');
  const tPanelAccount = (droplet?: Droplet | null) => (droplet?.metadata as any)?.tpanelAccount || null;

  const openTPanelLogin = async (droplet: Droplet) => {
    try {
      setActionLoading(`login:${droplet.id}`);
      const login = await createTPanelResourceLoginWithApi(droplet.id);
      window.open(login.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open tPanel login.');
    } finally {
      setActionLoading('');
    }
  };

  const changePassword = async () => {
    if (!selectedDroplet) return;
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    try {
      setActionLoading(`password:${selectedDroplet.id}`);
      const updated = await changeTPanelResourcePasswordWithApi(selectedDroplet.id, newPassword);
      setDroplets(droplets.map(d => d.id === selectedDroplet.id ? updated : d));
      setSelectedDroplet(updated);
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to queue password change.');
    } finally {
      setActionLoading('');
    }
  };

  const filteredDroplets = droplets.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.ip.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Droplets</h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1">Manage and monitor your cloud servers.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search droplets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#e5e8ed] rounded py-1.5 pl-10 pr-3 text-[13px] focus:outline-none focus:border-[#0069ff] w-48 transition-all"
            />
          </div>
          <Link 
            to="/droplets/create"
            className="bg-[#0069ff] text-white px-5 py-2 rounded font-bold text-[13px] hover:bg-[#0056cc] transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Droplet
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>
      )}

      <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
        {filteredDroplets.length === 0 ? (
          <div className="p-16 text-center">
            <Server className="h-12 w-12 text-[#e5e8ed] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#2e3d49]">No droplets found</h3>
            <p className="text-gray-400 text-sm mt-1">Deploy your first droplet to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e5e8ed]">
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Resources</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Monitoring (1h)</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ed]">
                {filteredDroplets.map((droplet) => (
                  <tr key={droplet.id} className="hover:bg-[#f3f5f9] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-[#f3f5f9] border border-[#e5e8ed] flex items-center justify-center text-[#8ba2ad] group-hover:bg-[#0069ff] group-hover:text-white transition-all`}>
                          <Server className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[#0069ff] hover:underline cursor-pointer">{droplet.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <div className={`w-1.5 h-1.5 rounded-full ${droplet.status === 'active' ? 'bg-[#24ad5f]' : 'bg-gray-300'}`}></div>
                             <span className="text-[11px] text-gray-500 font-medium capitalize">{droplet.status === 'active' ? 'Running' : 'Off'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-mono font-medium text-[#2e3d49]">{droplet.ip}</span>
                        <span className="text-[11px] text-gray-400">{droplet.region}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setSelectedDroplet(droplet)}
                          className="mb-1 w-fit rounded border border-[#d8e6ff] bg-[#f3f7ff] px-2 py-1 text-[11px] font-bold text-[#0069ff] hover:bg-white"
                        >
                          {droplet.plan || 'Package'} portal
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase w-7 font-mono">CPU</span>
                            <div className="w-16 h-1 w-24 bg-[#e5e8ed] rounded-full overflow-hidden">
                              <div className="h-full bg-[#0069ff] w-[24%]"></div>
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold">24%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase w-7 font-mono">RAM</span>
                            <div className="w-16 h-1 w-24 bg-[#e5e8ed] rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 w-[56%]"></div>
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold">56%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[11px] font-bold text-gray-400 uppercase">No metrics API data</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                         <button 
                          onClick={() => toggleStatus(droplet.id)}
                          className={`p-2 rounded hover:bg-[#f3f5f9] transition-all ${
                            droplet.status === 'active' ? 'text-amber-500' : 'text-green-500'
                          }`}
                          title={droplet.status === 'active' ? 'Power Off' : 'Power On'}
                         >
                           <Power className="h-4.5 w-4.5" />
                         </button>
                         {isTPanelDroplet(droplet) && (
                          <button
                            onClick={() => openTPanelLogin(droplet)}
                            disabled={actionLoading === `login:${droplet.id}`}
                            className="p-2 text-[#0069ff] hover:bg-[#f3f5f9] rounded transition-all disabled:opacity-50"
                            title="tPanel Login"
                          >
                            <ExternalLink className="h-4.5 w-4.5" />
                          </button>
                         )}
                         <button onClick={() => setSelectedDroplet(droplet)} className="p-2 text-gray-400 hover:text-[#0069ff] hover:bg-[#f3f5f9] rounded transition-all" title="Access Console">
                           <Terminal className="h-4.5 w-4.5" />
                         </button>
                         <div className="w-px h-4 bg-[#e5e8ed] mx-1"></div>
                         <button 
                          onClick={() => deleteDroplet(droplet.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded transition-all"
                          title="Destroy"
                         >
                           <Trash2 className="h-4.5 w-4.5" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedDroplet && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-0 md:p-6" onClick={() => setSelectedDroplet(null)}>
          <section className="h-full w-full overflow-y-auto bg-white p-6 shadow-xl md:h-auto md:max-h-[calc(100vh-48px)] md:max-w-xl md:rounded" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#e5e8ed] pb-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#0069ff]">Resource portal</p>
                <h2 className="mt-1 text-xl font-black text-[#2e3d49]">{selectedDroplet.name}</h2>
                <p className="mt-1 text-[12px] font-bold text-gray-500">{selectedDroplet.region}</p>
              </div>
              <button onClick={() => setSelectedDroplet(null)} className="rounded border border-[#e5e8ed] p-2 text-gray-500 hover:bg-[#f3f5f9]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              {[
                ['Status', selectedDroplet.status === 'active' ? 'Running' : 'Off'],
                ['Package', selectedDroplet.plan || 'Default'],
                ['IPv4', selectedDroplet.ip],
                ['IPv6', (selectedDroplet.metadata as any)?.ipv6 || 'Included on request'],
                ['CPU', selectedDroplet.cpu || '-'],
                ['RAM', selectedDroplet.ram || '-'],
                ['Disk', selectedDroplet.disk || '-'],
                ['Account', tPanelAccount(selectedDroplet)?.username || 'Pending']
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-[#e5e8ed] bg-[#f8f9fa] p-3">
                  <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
                  <p className="mt-1 break-words font-bold text-[#2e3d49]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {isTPanelDroplet(selectedDroplet) && (
                <button
                  onClick={() => openTPanelLogin(selectedDroplet)}
                  className="flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-3 text-[13px] font-bold text-white hover:bg-[#0056cc]"
                >
                  <ExternalLink className="h-4 w-4" /> tPanel Login
                </button>
              )}
              <button
                onClick={() => toggleStatus(selectedDroplet.id)}
                disabled={actionLoading === `power:${selectedDroplet.id}`}
                className="flex items-center justify-center gap-2 rounded border border-[#e5e8ed] px-4 py-3 text-[13px] font-bold text-[#2e3d49] hover:bg-[#f3f5f9] disabled:opacity-60"
              >
                <Power className="h-4 w-4" /> {selectedDroplet.status === 'active' ? 'Turn Off Account' : 'Turn On Account'}
              </button>
            </div>

            {isTPanelDroplet(selectedDroplet) && (
              <div className="mt-5 rounded border border-[#e5e8ed] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#0069ff]" />
                  <h3 className="text-[13px] font-black uppercase text-[#2e3d49]">Change tPanel password</h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password"
                    className="flex-1 rounded border border-[#e5e8ed] px-3 py-2 text-sm outline-none focus:border-[#0069ff]"
                  />
                  <button
                    onClick={changePassword}
                    disabled={actionLoading === `password:${selectedDroplet.id}`}
                    className="rounded bg-[#2e3d49] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#1f2933] disabled:opacity-60"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
