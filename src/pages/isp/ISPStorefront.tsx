import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, 
  Server, 
  Activity, 
  Shield, 
  ChevronRight, 
  Plus, 
  Globe, 
  Database, 
  Zap, 
  Users, 
  BarChart3,
  Search,
  Settings
} from 'lucide-react';
import { fetchIspSitesWithApi } from '../../lib/tiwloApi';

export default function ISPStorefront() {
  const navigate = useNavigate();

  const [myInstances, setMyInstances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIspSitesWithApi()
      .then((sites) => {
        setMyInstances(sites.map((site) => ({
          id: site.id,
          code: site.code,
          name: site.name,
          status: site.status === 'healthy' ? 'Healthy' : site.status,
          node: site.node,
          subscribers: Number(site.subscribers || 0).toLocaleString(),
          bandwidth: site.bandwidth,
          region: site.region,
          active: site.status !== 'maintenance'
        })));
      })
      .catch(() => setMyInstances([]))
      .finally(() => setIsLoading(false));
  }, []);

  const totalSubscribers = myInstances.reduce((sum, instance) => sum + Number(String(instance.subscribers).replace(/,/g, '') || 0), 0);
  const activeSites = myInstances.filter((instance) => instance.active).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-sm">
              <Network className="w-7 h-7 text-white" />
            </div>
            Global Connectivity Cloud
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Enterprise-grade orchestration for ISP providers. Scale your fiber backbone, manage RADIUS clusters, and automate multi-tenant billing from a unified SaaS console.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/isp-billing/add-router')}
            className="px-6 py-2.5 bg-[#0069ff] hover:bg-blue-700 text-white rounded-sm text-sm font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Deploy New ISP Site
          </button>
        </div>
      </div>

      {/* Global Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Subscribers', value: totalSubscribers.toLocaleString(), icon: Users, color: 'blue' },
          { label: 'ISP Sites', value: String(myInstances.length), icon: Activity, color: 'green' },
          { label: 'Live Clusters', value: String(activeSites), icon: Database, color: 'purple' },
          { label: 'API Records', value: String(myInstances.length), icon: Shield, color: 'indigo' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-sm border border-gray-200">
             <div className="flex items-center justify-between mb-4">
                <div className={`p-2 bg-gray-50 rounded-sm`}>
                   <stat.icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-600 rounded-sm text-[10px] font-bold">
                   <Zap className="w-3 h-3" /> STABLE
                </div>
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{stat.label}</p>
             <h3 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Instances List */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">Active ISP Deployments</h2>
              <div className="relative">
                 <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input type="text" placeholder="Search clusters..." className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-sm text-xs w-48 focus:border-blue-400 transition-colors outline-none" />
              </div>
           </div>
           
           {isLoading ? (
             <div className="bg-white rounded-sm border border-gray-200 p-12 text-center text-sm font-bold text-gray-400">Loading ISP sites from API...</div>
           ) : myInstances.length === 0 ? (
             <div className="bg-white rounded-sm border border-gray-200 p-12 text-center text-sm font-bold text-gray-400">No ISP deployments found in the database.</div>
           ) : myInstances.map((instance) => (
             <div key={instance.id} className="bg-white rounded-sm border border-gray-200 hover:border-blue-300 transition-all group overflow-hidden">
                <div className="p-6">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 flex items-center justify-center rounded-sm border ${instance.active ? 'bg-blue-50 border-blue-100 text-[#0069ff]' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                            <Globe className="w-6 h-6" />
                         </div>
                         <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-[#0069ff] transition-colors">{instance.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5">
                               <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${instance.status === 'Healthy' ? 'bg-green-500 animate-pulse' : instance.status === 'Warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                  <span className="text-[11px] font-medium text-gray-500">{instance.status}</span>
                               </div>
                               <span className="text-gray-300">|</span>
                               <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{instance.code}</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-8 md:text-right">
                         <div>
                            <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-tight leading-none mb-1">Subscribers</span>
                            <span className="text-sm font-bold text-gray-700">{instance.subscribers}</span>
                         </div>
                         <div>
                            <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-tight leading-none mb-1">Load</span>
                            <span className="text-sm font-bold text-gray-700">{instance.bandwidth}</span>
                         </div>
                         <button 
                           onClick={() => navigate(`/isp-billing/admin?siteId=${instance.id}`)}
                           className="p-2.5 bg-gray-50 text-gray-400 hover:bg-[#0069ff] hover:text-white rounded-sm transition-all shadow-sm"
                         >
                            <ChevronRight className="w-5 h-5" />
                         </button>
                      </div>
                   </div>
                </div>
                <div className="px-6 py-2 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{instance.node}</span>
                      <span className="text-[10px] font-medium text-gray-500">{instance.region}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <Settings className="w-3 h-3 text-gray-400 hover:text-blue-600 cursor-pointer" />
                      <BarChart3 className="w-3 h-3 text-gray-400 hover:text-blue-600 cursor-pointer" />
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                 <Shield className="w-4 h-4 text-blue-600" /> Security Status
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">RADIUS Auth</span>
                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">ENCRYPTED</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Handshake</span>
                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">TLS 1.3</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Firewall Rules</span>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">84 ACTIVE</span>
                 </div>
              </div>
           </div>

           <div className="bg-gray-900 p-6 rounded-sm text-white relative overflow-hidden">
              <div className="relative z-10">
                 <h3 className="font-bold text-white mb-1">Global Traffic Monitor</h3>
                 <p className="text-gray-400 text-xs mb-4">View real-time BGP and peering sessions across all sites.</p>
                 <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold transition-all">
                    Launch Network Visualizer
                 </button>
              </div>
              <Activity className="absolute -bottom-6 -right-6 w-24 h-24 text-white/5" />
           </div>

           <div className="border border-dashed border-gray-300 rounded-sm p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors group">
              <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-full mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                 <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-900">Add New Deployment</p>
              <p className="text-xs text-gray-500 mt-1">Deploy a new RADIUS or Node site.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
