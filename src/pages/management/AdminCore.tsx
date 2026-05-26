import React from 'react';
import { Settings, Cpu, HardDrive, Database, LifeBuoy, Save, AlertCircle, Globe2 } from 'lucide-react';
import { fetchPowerDnsConfigWithApi, fetchSettingsWithApi, updatePowerDnsConfigWithApi, upsertSettingWithApi } from '../../lib/tiwloApi';
import DdosProtectionPanel from './DdosProtectionPanel';

export default function AdminCore() {
  const [maxDroplets, setMaxDroplets] = React.useState(0);
  const [maxVolumes, setMaxVolumes] = React.useState(0);
  const [newAccountCredit, setNewAccountCredit] = React.useState(0);
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [supportAppId, setSupportAppId] = React.useState('');
  const [chatWidget, setChatWidget] = React.useState(false);
  const [primaryDomain, setPrimaryDomain] = React.useState('');
  const [serverIp, setServerIp] = React.useState('');
  const [nameserversText, setNameserversText] = React.useState('');
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    fetchSettingsWithApi('platform')
      .then((settings) => {
        const byKey = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
        setMaxDroplets(Number((byKey.resourceLimits as any)?.maxDroplets || 0));
        setMaxVolumes(Number((byKey.resourceLimits as any)?.maxVolumes || 0));
        setNewAccountCredit(Number((byKey.accountCreditPolicy as any)?.newAccountCredit || 0));
        setMaintenanceMode(Boolean((byKey.maintenance as any)?.enabled));
        setSupportAppId(String((byKey.supportIntegration as any)?.appId || ''));
        setChatWidget(Boolean((byKey.supportIntegration as any)?.chatWidget));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load settings'));
    fetchPowerDnsConfigWithApi()
      .then((config) => {
        setPrimaryDomain(config.primaryDomain || '');
        setServerIp(config.serverIp || '');
        setNameserversText((config.nameservers || []).join('\n'));
      })
      .catch(() => {});
  }, []);

  const saveSettings = async () => {
    setError('');
    setSaved(false);
    try {
      await Promise.all([
        upsertSettingWithApi({ scope: 'platform', key: 'resourceLimits', value: { maxDroplets, maxVolumes } }),
        updatePowerDnsConfigWithApi({
          primaryDomain,
          serverIp,
          nameservers: nameserversText.split(/\s+/).map((item) => item.trim()).filter(Boolean)
        }),
        upsertSettingWithApi({
          scope: 'platform',
          key: 'accountCreditPolicy',
          value: {
            newAccountCredit: Math.max(0, Number(newAccountCredit || 0)),
            blockOrdersWithoutCredit: true,
            suspendServicesWhenEmpty: true,
            autoResumeWhenCreditAdded: true
          }
        }),
        upsertSettingWithApi({ scope: 'platform', key: 'maintenance', value: { enabled: maintenanceMode } }),
        upsertSettingWithApi({ scope: 'platform', key: 'supportIntegration', value: { appId: supportAppId, chatWidget } })
      ]);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Core System Options</h1>
        <p className="text-[13px] text-[#4a4a4a] mt-1">Fine-tune platform fundamentals and resource limits.</p>
      </div>

      <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#f3f5f9] bg-[#f8f9fa] flex items-center justify-between">
           <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Platform Behavior</h2>
           <button onClick={saveSettings} className="bg-[#0069ff] text-white px-4 py-1.5 rounded font-bold text-[12px] flex items-center gap-2 hover:bg-[#0056cc] transition-all">
              <Save className="h-4 w-4" /> Save Changes
           </button>
        </div>
        {error && <div className="mx-8 mt-6 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}
        {saved && <div className="mx-8 mt-6 rounded border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-600">Settings saved.</div>}
        <div className="p-8 space-y-10">
           {/* Section: Resource Limits */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-[15px] font-bold text-[#2e3d49] mb-1">Resource Limits</h3>
                <p className="text-[12px] text-gray-400">Thresholds for default accounts.</p>
              </div>
              <div className="md:col-span-2 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Max Droplets / User</label>
                       <input type="number" value={maxDroplets} onChange={(event) => setMaxDroplets(Number(event.target.value || 0))} className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2 text-[14px] focus:outline-none focus:border-[#0069ff]" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Max Volumes / User</label>
                       <input type="number" value={maxVolumes} onChange={(event) => setMaxVolumes(Number(event.target.value || 0))} className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2 text-[14px] focus:outline-none focus:border-[#0069ff]" />
                    </div>
                 </div>
              </div>
           </div>

           <div className="h-px bg-[#f3f5f9]"></div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-[15px] font-bold text-[#2e3d49] mb-1 flex items-center gap-2"><Globe2 className="h-4 w-4 text-blue-600" /> Domain Name</h3>
                <p className="text-[12px] text-gray-400">Changing this updates platform URLs, PowerDNS nameservers, generated store domains, ISP hostnames, and SSL automation.</p>
              </div>
              <div className="md:col-span-2 space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Primary Domain</label>
                       <input value={primaryDomain} onChange={(event) => setPrimaryDomain(event.target.value)} placeholder="example.com" className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2 text-[14px] focus:outline-none focus:border-[#0069ff]" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Server IP</label>
                       <input value={serverIp} onChange={(event) => setServerIp(event.target.value)} placeholder="203.0.113.10" className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2 text-[14px] focus:outline-none focus:border-[#0069ff]" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Nameservers</label>
                    <textarea value={nameserversText} onChange={(event) => setNameserversText(event.target.value)} rows={3} className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2 font-mono text-[12px] focus:outline-none focus:border-[#0069ff]" />
                 </div>
              </div>
           </div>

           <div className="h-px bg-[#f3f5f9]"></div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-[15px] font-bold text-[#2e3d49] mb-1">New Account Credit</h3>
                <p className="text-[12px] text-gray-400">Default credit applied when a user signs up.</p>
              </div>
              <div className="md:col-span-2 space-y-4">
                 <div className="max-w-sm space-y-2">
                    <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Signup Credit (USD)</label>
                    <input type="number" min="0" step="0.01" value={newAccountCredit} onChange={(event) => setNewAccountCredit(Number(event.target.value || 0))} className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2 text-[14px] focus:outline-none focus:border-[#0069ff]" />
                 </div>
                 <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded text-blue-700 text-[12px] font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>Current default is USD {Number(newAccountCredit || 0).toFixed(2)}. Accounts with 0 credit must add credit before orders or services run.</span>
                 </div>
              </div>
           </div>

           <div className="h-px bg-[#f3f5f9]"></div>

           {/* Section: Maintenance Role */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-[15px] font-bold text-[#2e3d49] mb-1">Maintenance Mode</h3>
                <p className="text-[12px] text-gray-400">Put platform into read-only mode.</p>
              </div>
              <div className="md:col-span-2 flex items-center gap-6">
                 <button onClick={() => setMaintenanceMode((value) => !value)} className={`w-12 h-7 rounded-full relative cursor-pointer ${maintenanceMode ? 'bg-[#0069ff]' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                 </button>
                 <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded text-amber-600 text-[12px] font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>When active, non-admin users cannot spin up new resources.</span>
                 </div>
              </div>
           </div>

           <div className="h-px bg-[#f3f5f9]"></div>

           <DdosProtectionPanel />

           <div className="h-px bg-[#f3f5f9]"></div>

           {/* Section: Support API */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-[15px] font-bold text-[#2e3d49] mb-1">Support Integration</h3>
                <p className="text-[12px] text-gray-400">External helpdesk credentials.</p>
              </div>
              <div className="md:col-span-2 space-y-4">
                  <div className="space-y-2">
                     <label className="text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Zendesk / Intercom App ID</label>
                     <input type="text" value={supportAppId} onChange={(event) => setSupportAppId(event.target.value)} placeholder="app_xxxx_xxxx" className="w-full bg-[#f8f9fa] border border-[#e5e8ed] rounded px-4 py-2 text-[14px] focus:outline-none focus:border-[#0069ff]" />
                  </div>
                  <div className="flex items-center gap-3">
                     <input type="checkbox" checked={chatWidget} onChange={(event) => setChatWidget(event.target.checked)} className="w-4 h-4" />
                     <span className="text-[13px] text-[#4a4a4a]">Enable global chat widget for all users</span>
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
