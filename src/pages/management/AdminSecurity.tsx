import React from 'react';
import { AlertCircle, CheckCircle2, Globe, Lock, LogIn, Power, Save, Shield } from 'lucide-react';
import { fetchSettingsWithApi, upsertSettingWithApi } from '../../lib/tiwloApi';

export default function AdminSecurity() {
  const [require2fa, setRequire2fa] = React.useState(false);
  const [passwordComplexity, setPasswordComplexity] = React.useState(true);
  const [sessionTtl, setSessionTtl] = React.useState('24h');
  const [ipBlacklist, setIpBlacklist] = React.useState('');
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    Promise.all([fetchSettingsWithApi('security'), fetchSettingsWithApi('platform')])
      .then(([securitySettings, platformSettings]) => {
        const byKey = Object.fromEntries(securitySettings.map((setting) => [setting.key, setting.value]));
        const platformByKey = Object.fromEntries(platformSettings.map((setting) => [setting.key, setting.value]));
        const auth = (byKey.authenticationPolicy || {}) as any;
        const ip = (byKey.ipAccessControl || {}) as any;
        setRequire2fa(Boolean(auth.require2fa));
        setPasswordComplexity(auth.passwordComplexity !== false);
        setSessionTtl(String(auth.sessionTtl || '24h'));
        setIpBlacklist(Array.isArray(ip.blacklist) ? ip.blacklist.join(', ') : '');
        setMaintenanceMode(Boolean((platformByKey.maintenance as any)?.enabled));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load security settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await Promise.all([
        upsertSettingWithApi({
          scope: 'security',
          key: 'authenticationPolicy',
          value: { require2fa, passwordComplexity, sessionTtl }
        }),
        upsertSettingWithApi({
          scope: 'security',
          key: 'ipAccessControl',
          value: { blacklist: ipBlacklist.split(',').map((item) => item.trim()).filter(Boolean) }
        }),
        upsertSettingWithApi({
          scope: 'platform',
          key: 'maintenance',
          value: { enabled: maintenanceMode }
        })
      ]);
      setSaved(true);
      window.dispatchEvent(new Event('tiwlo:platform-status-refresh'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`relative h-6 w-10 rounded-full ${value ? 'bg-[#0069ff]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${value ? 'right-1' : 'left-1'}`}></span>
    </button>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Security & Access Control</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Global security policies are saved in system settings.</p>
        </div>
        <button onClick={save} disabled={saving || loading} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Policy'}
        </button>
      </div>

      {error && <div className="flex items-start gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="mt-0.5 h-4 w-4" /> {error}</div>}
      {saved && <div className="flex items-start gap-2 rounded border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700"><CheckCircle2 className="mt-0.5 h-4 w-4" /> Security settings saved.</div>}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <LogIn className="h-5 w-5 text-[#0069ff]" />
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Authentication Policies</h2>
          </div>
          <div className="space-y-6 p-6">
            {loading ? (
              <div className="py-8 text-center text-sm font-bold text-gray-400">Loading settings from API...</div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-[#f3f5f9] pb-4">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#2e3d49]">Require 2FA</h3>
                    <p className="text-[12px] text-gray-400">All users must enable two-factor authentication.</p>
                  </div>
                  <Toggle value={require2fa} onChange={() => setRequire2fa((value) => !value)} />
                </div>
                <div className="flex items-center justify-between border-b border-[#f3f5f9] pb-4">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#2e3d49]">Password Complexity</h3>
                    <p className="text-[12px] text-gray-400">Force uppercase, numbers, and symbols.</p>
                  </div>
                  <Toggle value={passwordComplexity} onChange={() => setPasswordComplexity((value) => !value)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#2e3d49]">Session Timeout</h3>
                    <p className="text-[12px] text-gray-400">Auto-logoff users after inactivity.</p>
                  </div>
                  <select value={sessionTtl} onChange={(event) => setSessionTtl(event.target.value)} className="rounded border border-[#e5e8ed] bg-[#f8f9fa] px-2 py-1 text-[12px] font-bold text-[#2e3d49]">
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <Power className="h-5 w-5 text-[#0069ff]" />
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Maintenance Mode</h2>
          </div>
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-5">
              <div>
                <h3 className="text-[14px] font-bold text-[#2e3d49]">Full Site Maintenance</h3>
                <p className="text-[12px] text-gray-400">Users see the maintenance page. Admins can still sign in.</p>
              </div>
              <Toggle value={maintenanceMode} onChange={() => setMaintenanceMode((value) => !value)} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f5f9] bg-[#f8f9fa] px-6 py-4">
            <Globe className="h-5 w-5 text-[#0069ff]" />
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">IP Access Control</h2>
          </div>
          <div className="space-y-6 p-6">
            <label className="space-y-3">
              <span className="block text-[12px] font-bold uppercase tracking-wider text-[#4a4a4a]">Global Blacklist (CSV)</span>
              <textarea
                value={ipBlacklist}
                onChange={(event) => setIpBlacklist(event.target.value)}
                className="min-h-[100px] w-full rounded border border-[#e5e8ed] bg-[#f8f9fa] p-3 font-mono text-[13px] focus:border-red-500 focus:outline-none"
                placeholder="1.2.3.4, 5.6.7.8, 10.0.0.0/24"
              />
            </label>
            <div className="flex items-center gap-3 rounded border border-blue-100 bg-blue-50 p-4">
              <Shield className="h-5 w-5 shrink-0 text-[#0069ff]" />
              <p className="text-[12px] font-medium text-blue-700">Trusted admin subnets can be managed here and persisted through the settings API.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e8ed] bg-white p-6">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-[#0069ff]" />
          <div>
            <h3 className="text-[14px] font-bold text-[#2e3d49]">Policy Source</h3>
            <p className="text-[12px] text-gray-400">Scope: security / keys: authenticationPolicy, ipAccessControl</p>
          </div>
        </div>
      </div>
    </div>
  );
}
