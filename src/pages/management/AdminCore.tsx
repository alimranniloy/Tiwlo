import React from 'react';
import { AlertCircle, BarChart3, Cpu, Gift, Globe2, LifeBuoy, Save, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { fetchPowerDnsConfigWithApi, fetchSettingsWithApi, updatePowerDnsConfigWithApi, upsertSettingWithApi } from '../../lib/tiwloApi';
import DdosProtectionPanel from './DdosProtectionPanel';

type CoreSection = 'resources' | 'domain' | 'credit' | 'tracking' | 'security' | 'support';

const extractGoogleMeasurementId = (value = '') => String(value || '').match(/\bG-[A-Z0-9]{4,}\b/i)?.[0]?.toUpperCase() || '';
const extractGoogleTagManagerId = (value = '') => String(value || '').match(/\bGTM-[A-Z0-9]{4,}\b/i)?.[0]?.toUpperCase() || '';
const extractFacebookPixelId = (value = '') => {
  const text = String(value || '');
  return text.match(/fbq\(['"]init['"],\s*['"](\d{5,30})['"]\)/i)?.[1] || text.match(/\b\d{5,30}\b/)?.[0] || '';
};

export default function AdminCore() {
  const [activeSection, setActiveSection] = React.useState<CoreSection>('resources');
  const [maxDroplets, setMaxDroplets] = React.useState(0);
  const [maxVolumes, setMaxVolumes] = React.useState(0);
  const [creditSystemEnabled, setCreditSystemEnabled] = React.useState(true);
  const [newAccountCredit, setNewAccountCredit] = React.useState(0);
  const [signupPromoCredit, setSignupPromoCredit] = React.useState(100);
  const [signupPromoRequiresPayment, setSignupPromoRequiresPayment] = React.useState(true);
  const [signupPromoHoldAmount, setSignupPromoHoldAmount] = React.useState(1);
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [supportAppId, setSupportAppId] = React.useState('');
  const [chatWidget, setChatWidget] = React.useState(false);
  const [googleAnalyticsEnabled, setGoogleAnalyticsEnabled] = React.useState(false);
  const [googleAnalyticsInput, setGoogleAnalyticsInput] = React.useState('');
  const [googleTagManagerEnabled, setGoogleTagManagerEnabled] = React.useState(false);
  const [googleTagManagerInput, setGoogleTagManagerInput] = React.useState('');
  const [facebookPixelEnabled, setFacebookPixelEnabled] = React.useState(false);
  const [facebookPixelInput, setFacebookPixelInput] = React.useState('');
  const [primaryDomain, setPrimaryDomain] = React.useState('');
  const [serverIp, setServerIp] = React.useState('');
  const [nameserversText, setNameserversText] = React.useState('');
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    fetchSettingsWithApi('platform')
      .then((settings) => {
        const byKey = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
        const creditPolicy = (byKey.accountCreditPolicy as any) || {};
        setMaxDroplets(Number((byKey.resourceLimits as any)?.maxDroplets || 0));
        setMaxVolumes(Number((byKey.resourceLimits as any)?.maxVolumes || 0));
        setCreditSystemEnabled(creditPolicy.creditSystemEnabled !== false);
        setNewAccountCredit(Number(creditPolicy.newAccountCredit || 0));
        setSignupPromoCredit(Number(creditPolicy.signupPromoCredit ?? 100));
        setSignupPromoRequiresPayment(creditPolicy.signupPromoRequiresPayment !== false);
        setSignupPromoHoldAmount(Number(creditPolicy.signupPromoHoldAmount ?? 1));
        setMaintenanceMode(Boolean((byKey.maintenance as any)?.enabled));
        setSupportAppId(String((byKey.supportIntegration as any)?.appId || ''));
        setChatWidget(Boolean((byKey.supportIntegration as any)?.chatWidget));
        const tracking = (byKey.trackingIntegrations as any) || {};
        const googleAnalytics = tracking.googleAnalytics || {};
        const googleTagManager = tracking.googleTagManager || {};
        const facebookPixel = tracking.facebookPixel || {};
        setGoogleAnalyticsEnabled(Boolean(googleAnalytics.enabled));
        setGoogleAnalyticsInput(String(googleAnalytics.tagSnippet || googleAnalytics.measurementId || ''));
        setGoogleTagManagerEnabled(Boolean(googleTagManager.enabled));
        setGoogleTagManagerInput(String(googleTagManager.tagSnippet || googleTagManager.containerId || ''));
        setFacebookPixelEnabled(Boolean(facebookPixel.enabled));
        setFacebookPixelInput(String(facebookPixel.pixelSnippet || facebookPixel.pixelId || ''));
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
      const googleMeasurementId = extractGoogleMeasurementId(googleAnalyticsInput);
      const googleContainerId = extractGoogleTagManagerId(googleTagManagerInput);
      const facebookPixelId = extractFacebookPixelId(facebookPixelInput);
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
            creditSystemEnabled,
            newAccountCredit: Math.max(0, Number(newAccountCredit || 0)),
            signupPromoCredit: Math.max(0, Number(signupPromoCredit || 0)),
            signupPromoRequiresPayment,
            signupPromoHoldAmount: signupPromoRequiresPayment ? Math.max(0.01, Number(signupPromoHoldAmount || 0)) : Math.max(0, Number(signupPromoHoldAmount || 0)),
            blockOrdersWithoutCredit: true,
            suspendServicesWhenEmpty: true,
            autoResumeWhenCreditAdded: true
          }
        }),
        upsertSettingWithApi({ scope: 'platform', key: 'maintenance', value: { enabled: maintenanceMode } }),
        upsertSettingWithApi({ scope: 'platform', key: 'supportIntegration', value: { appId: supportAppId, chatWidget } }),
        upsertSettingWithApi({
          scope: 'platform',
          key: 'trackingIntegrations',
          value: {
            googleAnalytics: {
              enabled: googleAnalyticsEnabled,
              measurementId: googleMeasurementId,
              tagSnippet: googleAnalyticsInput.trim()
            },
            googleTagManager: {
              enabled: googleTagManagerEnabled,
              containerId: googleContainerId,
              tagSnippet: googleTagManagerInput.trim()
            },
            facebookPixel: {
              enabled: facebookPixelEnabled,
              pixelId: facebookPixelId,
              pixelSnippet: facebookPixelInput.trim()
            }
          }
        })
      ]);
      setSaved(true);
      window.dispatchEvent(new Event('tiwlo:platform-status-refresh'));
      window.dispatchEvent(new Event('tiwlo:tracking-refresh'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    }
  };

  const sections: Array<{ id: CoreSection; label: string; desc: string; icon: any }> = [
    { id: 'resources', label: 'Resources', desc: 'Limits and quotas', icon: Cpu },
    { id: 'domain', label: 'Domain & DNS', desc: 'Primary domain, IP, NS', icon: Globe2 },
    { id: 'credit', label: 'Credit System', desc: 'Signup credit and hold', icon: Gift },
    { id: 'tracking', label: 'Analytics', desc: 'Google tag and pixels', icon: BarChart3 },
    { id: 'security', label: 'Security', desc: 'Maintenance and DDoS', icon: ShieldAlert },
    { id: 'support', label: 'Support', desc: 'Live chat integration', icon: LifeBuoy }
  ];

  const inputClass = 'w-full rounded-sm border border-[#dfe5ee] bg-white px-3 py-2 text-sm outline-none focus:border-[#0069ff]';
  const money = (value: number) => `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const googleMeasurementId = extractGoogleMeasurementId(googleAnalyticsInput);
  const googleContainerId = extractGoogleTagManagerId(googleTagManagerInput);
  const facebookPixelId = extractFacebookPixelId(facebookPixelInput);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Core System Options</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Menu based control center for platform fundamentals and live security.</p>
        </div>
        <button onClick={saveSettings} className="inline-flex items-center gap-2 rounded-sm bg-[#0069ff] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#0056cc]">
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </div>

      {error && <div className="rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}
      {saved && <div className="rounded-sm border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-600">Settings saved.</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-sm border border-[#e5e8ed] bg-white p-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button key={section.id} onClick={() => setActiveSection(section.id)} className={`mb-1 flex w-full items-start gap-3 rounded-sm px-3 py-3 text-left ${active ? 'bg-[#e8f1ff] text-[#0056cc]' : 'text-[#2e3d49] hover:bg-[#f8fafc]'}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-sm font-black">{section.label}</span>
                  <span className="block text-[11px] font-semibold text-[#64748b]">{section.desc}</span>
                </span>
              </button>
            );
          })}
        </aside>

        <section className="rounded-sm border border-[#e5e8ed] bg-white">
          {activeSection === 'resources' && (
            <div className="space-y-6 p-6">
              <SectionTitle icon={SlidersHorizontal} title="Resource Limits" desc="Thresholds for default accounts." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-[#64748b]">Max Droplets / User</span>
                  <input type="number" value={maxDroplets} onChange={(event) => setMaxDroplets(Number(event.target.value || 0))} className={inputClass} />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-[#64748b]">Max Volumes / User</span>
                  <input type="number" value={maxVolumes} onChange={(event) => setMaxVolumes(Number(event.target.value || 0))} className={inputClass} />
                </label>
              </div>
            </div>
          )}

          {activeSection === 'domain' && (
            <div className="space-y-6 p-6">
              <SectionTitle icon={Globe2} title="Domain & DNS" desc="Changing this updates platform URLs, PowerDNS nameservers, generated domains, and SSL automation." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-[#64748b]">Primary Domain</span>
                  <input value={primaryDomain} onChange={(event) => setPrimaryDomain(event.target.value)} placeholder="example.com" className={inputClass} />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-[#64748b]">Server IP</span>
                  <input value={serverIp} onChange={(event) => setServerIp(event.target.value)} placeholder="203.0.113.10" className={inputClass} />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] font-black uppercase text-[#64748b]">Nameservers</span>
                <textarea value={nameserversText} onChange={(event) => setNameserversText(event.target.value)} rows={4} className={`${inputClass} font-mono text-xs`} />
              </label>
            </div>
          )}

          {activeSection === 'credit' && (
            <div className="space-y-6 p-6">
              <SectionTitle icon={Gift} title="Credit System" desc="Signup credit, verification hold, and spending guardrails." />
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  <ToggleRow
                    title="Full Credit System"
                    desc="Controls signup credit offers, credit holds, and no-credit provisioning guards."
                    enabled={creditSystemEnabled}
                    onToggle={() => setCreditSystemEnabled((value) => !value)}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-black uppercase text-[#64748b]">Signup Free Credit (USD)</span>
                      <input type="number" min="0" step="0.01" value={signupPromoCredit} onChange={(event) => setSignupPromoCredit(Number(event.target.value || 0))} className={inputClass} disabled={!creditSystemEnabled} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-black uppercase text-[#64748b]">New Account Base Credit (USD)</span>
                      <input type="number" min="0" step="0.01" value={newAccountCredit} onChange={(event) => setNewAccountCredit(Number(event.target.value || 0))} className={inputClass} disabled={!creditSystemEnabled} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-black uppercase text-[#64748b]">Verification Hold (USD)</span>
                      <input type="number" min="0.01" step="0.01" value={signupPromoHoldAmount} onChange={(event) => setSignupPromoHoldAmount(Number(event.target.value || 0))} className={inputClass} disabled={!creditSystemEnabled || !signupPromoRequiresPayment} />
                    </label>
                    <div className="rounded-sm border border-[#e5e8ed] p-3">
                      <ToggleRow
                        title="Payment Method Verification"
                        desc={signupPromoRequiresPayment ? 'Signup opens payment verification.' : 'Credit activates without payment page.'}
                        enabled={creditSystemEnabled && signupPromoRequiresPayment}
                        disabled={!creditSystemEnabled}
                        onToggle={() => setSignupPromoRequiresPayment((value) => !value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-[12px] border border-[#e4ebf7] bg-[#f7faff] px-2.5 py-1.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[#edf4ff] text-[#0069ff]">
                      <Gift className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-nowrap text-[10.5px] font-black leading-4 text-[#071024]">Get {money(signupPromoCredit)} free credit for new users</p>
                      <p className="whitespace-nowrap text-[10px] font-medium leading-3 text-[#334155]">
                        {signupPromoRequiresPayment ? 'No charges upfront. Cancel anytime.' : 'No payment verification required.'}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-sm border border-[#eef2f7] bg-[#fbfcfe] p-3 text-[12px] font-bold text-[#475569]">
                    {creditSystemEnabled ? `${money(signupPromoHoldAmount)} hold ${signupPromoRequiresPayment ? 'will be used for verification.' : 'is ignored while verification is off.'}` : 'Credit system is disabled.'}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-sm border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-700">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>Accounts with 0 credit must add credit before orders or services run.</span>
              </div>
            </div>
          )}

          {activeSection === 'tracking' && (
            <div className="space-y-6 p-6">
              <SectionTitle icon={BarChart3} title="Analytics & Pixels" desc="Google Analytics, Google Tag Manager, and Facebook Pixel for the portal." />
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="space-y-4 rounded-sm border border-[#e5e8ed] p-4">
                  <ToggleRow
                    title="Google Analytics"
                    desc={googleMeasurementId ? `Connected ID: ${googleMeasurementId}` : 'Paste the Google tag script or GA4 measurement ID.'}
                    enabled={googleAnalyticsEnabled}
                    onToggle={() => setGoogleAnalyticsEnabled((value) => !value)}
                  />
                  <label className="block space-y-1">
                    <span className="text-[11px] font-black uppercase text-[#64748b]">Google tag script / measurement ID</span>
                    <textarea
                      value={googleAnalyticsInput}
                      onChange={(event) => setGoogleAnalyticsInput(event.target.value)}
                      rows={8}
                      className={`${inputClass} font-mono text-xs`}
                      placeholder={`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  gtag('config', 'G-XXXXXXXXXX');\n</script>`}
                    />
                  </label>
                  <p className={`text-[12px] font-bold ${googleAnalyticsEnabled && !googleMeasurementId ? 'text-red-600' : 'text-[#64748b]'}`}>
                    {googleMeasurementId ? `GA4 measurement ID detected: ${googleMeasurementId}` : 'No GA4 measurement ID detected yet.'}
                  </p>
                </div>

                <div className="space-y-4 rounded-sm border border-[#e5e8ed] p-4">
                  <ToggleRow
                    title="Facebook Pixel"
                    desc={facebookPixelId ? `Connected ID: ${facebookPixelId}` : 'Paste the Pixel ID or Meta Pixel script.'}
                    enabled={facebookPixelEnabled}
                    onToggle={() => setFacebookPixelEnabled((value) => !value)}
                  />
                  <label className="block space-y-1">
                    <span className="text-[11px] font-black uppercase text-[#64748b]">Facebook / Meta pixel ID or script</span>
                    <textarea
                      value={facebookPixelInput}
                      onChange={(event) => setFacebookPixelInput(event.target.value)}
                      rows={8}
                      className={`${inputClass} font-mono text-xs`}
                      placeholder={`123456789012345\n\nor paste:\nfbq('init', '123456789012345');`}
                    />
                  </label>
                  <p className={`text-[12px] font-bold ${facebookPixelEnabled && !facebookPixelId ? 'text-red-600' : 'text-[#64748b]'}`}>
                    {facebookPixelId ? `Facebook pixel ID detected: ${facebookPixelId}` : 'No Facebook pixel ID detected yet.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-sm border border-[#e5e8ed] p-4">
                <ToggleRow
                  title="Google Tag Manager"
                  desc={googleContainerId ? `Connected container: ${googleContainerId}` : 'Optional GTM container for extra Google tags.'}
                  enabled={googleTagManagerEnabled}
                  onToggle={() => setGoogleTagManagerEnabled((value) => !value)}
                />
                <label className="block space-y-1">
                  <span className="text-[11px] font-black uppercase text-[#64748b]">GTM container ID or script</span>
                  <textarea
                    value={googleTagManagerInput}
                    onChange={(event) => setGoogleTagManagerInput(event.target.value)}
                    rows={5}
                    className={`${inputClass} font-mono text-xs`}
                    placeholder="GTM-XXXXXXX"
                  />
                </label>
              </div>

              <div className="flex items-start gap-2 rounded-sm border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-700">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>Only clean tracking IDs are loaded on the public site; pasted scripts are saved for Tiwlo Team reference.</span>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6 p-6">
              <SectionTitle icon={ShieldAlert} title="Security & DDoS" desc="Maintenance mode and live attack protection." />
              <div className="flex flex-col gap-3 rounded-sm border border-[#e5e8ed] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-[#2e3d49]">Maintenance Mode</p>
                  <p className="text-xs font-semibold text-[#64748b]">When active, the full website shows maintenance mode and only Tiwlo Team can log in.</p>
                </div>
                <button onClick={() => setMaintenanceMode((value) => !value)} className={`relative h-7 w-12 rounded-full ${maintenanceMode ? 'bg-[#0069ff]' : 'bg-gray-200'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${maintenanceMode ? 'right-1' : 'left-1'}`}></span>
                </button>
              </div>
              <DdosProtectionPanel />
            </div>
          )}

          {activeSection === 'support' && (
            <div className="space-y-6 p-6">
              <SectionTitle icon={LifeBuoy} title="Support Integration" desc="External helpdesk and live chat settings." />
              <label className="block space-y-1">
                <span className="text-[11px] font-black uppercase text-[#64748b]">Zendesk / Intercom App ID</span>
                <input value={supportAppId} onChange={(event) => setSupportAppId(event.target.value)} placeholder="app_xxxx_xxxx" className={inputClass} />
              </label>
              <label className="flex items-center gap-3 text-[13px] font-bold text-[#4a4a4a]">
                <input type="checkbox" checked={chatWidget} onChange={(event) => setChatWidget(event.target.checked)} className="h-4 w-4" />
                Enable global chat widget for all users
              </label>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, enabled, disabled = false, onToggle }: { title: string; desc: string; enabled: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-[#e5e8ed] p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-black text-[#2e3d49]">{title}</p>
        <p className="text-xs font-semibold text-[#64748b]">{desc}</p>
      </div>
      <button type="button" disabled={disabled} onClick={onToggle} className={`relative h-7 w-12 rounded-full transition ${enabled ? 'bg-[#0069ff]' : 'bg-gray-200'} disabled:cursor-not-allowed disabled:opacity-50`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${enabled ? 'right-1' : 'left-1'}`}></span>
      </button>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#f3f5f9] pb-4">
      <div className="rounded-sm bg-blue-50 p-2 text-[#0069ff]"><Icon className="h-4 w-4" /></div>
      <div>
        <h2 className="text-[15px] font-black text-[#2e3d49]">{title}</h2>
        <p className="mt-1 text-[12px] font-semibold text-[#64748b]">{desc}</p>
      </div>
    </div>
  );
}
