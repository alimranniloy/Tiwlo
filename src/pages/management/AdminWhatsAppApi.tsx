import React from 'react';
import { AlertCircle, CheckCircle2, KeyRound, MessageCircle, Save, ShieldCheck } from 'lucide-react';
import { fetchSettingsWithApi, upsertSettingWithApi } from '../../lib/tiwloApi';

const SETTING_SCOPE = 'admin';
const SETTING_SCOPE_ID = 'main-admin';
const SETTING_KEY = 'mainAdmin:whatsappApi';

type TemplateKey = 'otp' | 'invoice' | 'forgotPassword' | 'security';

type WhatsAppTemplate = {
  name: string;
  language: string;
  button: boolean;
  buttonType: 'auto' | 'url' | 'copy_code';
};

type WhatsAppConfig = {
  enabled: boolean;
  apiVersion: string;
  accessToken: string;
  phoneNumberId: string;
  businessId: string;
  fromNumber: string;
  templates: Record<TemplateKey, WhatsAppTemplate>;
};

const defaultTemplate = (): WhatsAppTemplate => ({
  name: '',
  language: 'en_US',
  button: true,
  buttonType: 'auto'
});

const defaultConfig = (): WhatsAppConfig => ({
  enabled: false,
  apiVersion: 'v20.0',
  accessToken: '',
  phoneNumberId: '',
  businessId: '',
  fromNumber: '',
  templates: {
    otp: defaultTemplate(),
    invoice: defaultTemplate(),
    forgotPassword: defaultTemplate(),
    security: defaultTemplate()
  }
});

const templateRows: Array<{ key: TemplateKey; label: string; description: string }> = [
  { key: 'otp', label: 'OTP Template', description: 'Signup and WhatsApp number verification codes.' },
  { key: 'invoice', label: 'Invoice Template', description: 'Invoice alerts with the invoice page button.' },
  { key: 'forgotPassword', label: 'Forgot Password Template', description: 'Password reset links with secure button.' },
  { key: 'security', label: 'Security Template', description: 'New login, unusual login, and password change alerts.' }
];

const mergeConfig = (value: Partial<WhatsAppConfig> = {}): WhatsAppConfig => {
  const base = defaultConfig();
  return {
    ...base,
    ...value,
    enabled: Boolean(value.enabled),
    apiVersion: value.apiVersion || base.apiVersion,
    accessToken: value.accessToken || '',
    phoneNumberId: value.phoneNumberId || '',
    businessId: value.businessId || '',
    fromNumber: value.fromNumber || '',
    templates: {
      otp: { ...base.templates.otp, ...(value.templates?.otp || {}) },
      invoice: { ...base.templates.invoice, ...(value.templates?.invoice || {}) },
      forgotPassword: { ...base.templates.forgotPassword, ...(value.templates?.forgotPassword || {}) },
      security: { ...base.templates.security, ...(value.templates?.security || {}) }
    }
  };
};

function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-black uppercase tracking-wide text-[#4B5563]">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-4 text-[#6B7280]">{hint}</span>}
    </label>
  );
}

export default function AdminWhatsAppApi() {
  const [config, setConfig] = React.useState<WhatsAppConfig>(defaultConfig);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');

  const loadConfig = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const settings = await fetchSettingsWithApi(SETTING_SCOPE, SETTING_SCOPE_ID);
      const stored = settings.find((setting) => setting.key === SETTING_KEY)?.value;
      setConfig(mergeConfig(stored || {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load WhatsApp API settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const setValue = <K extends keyof WhatsAppConfig>(key: K, value: WhatsAppConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setNotice('');
    setError('');
  };

  const setTemplateValue = <K extends keyof WhatsAppTemplate>(templateKey: TemplateKey, key: K, value: WhatsAppTemplate[K]) => {
    setConfig((current) => ({
      ...current,
      templates: {
        ...current.templates,
        [templateKey]: {
          ...current.templates[templateKey],
          [key]: value
        }
      }
    }));
    setNotice('');
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      if (config.enabled && (!config.accessToken.trim() || !config.phoneNumberId.trim())) {
        throw new Error('Access key and WhatsApp phone number ID are required when the API is on.');
      }
      if (config.enabled && !config.templates.otp.name.trim()) {
        throw new Error('OTP template name is required when WhatsApp signup verification is on.');
      }
      await upsertSettingWithApi({
        scope: SETTING_SCOPE,
        scopeId: SETTING_SCOPE_ID,
        key: SETTING_KEY,
        value: mergeConfig(config)
      });
      setNotice('WhatsApp API settings saved.');
      window.dispatchEvent(new Event('tiwlo:platform-status-refresh'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save WhatsApp API settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 text-sm font-bold text-[#4B5563]">Loading WhatsApp API settings...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#128c7e]">Tiwlo Team</p>
          <h1 className="mt-2 text-2xl font-black text-[#111827]">WhatsApp API</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5563]">
            Connect Meta WhatsApp Cloud API templates for signup OTP, invoices, password reset, and security alerts.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black ${config.enabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'}`}>
          <span className={`h-2 w-2 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
          {config.enabled ? 'WhatsApp API On' : 'WhatsApp API Off'}
        </div>
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-lg border border-[#DDE3EA] bg-white">
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-5">
            <div className="grid h-10 w-10 place-items-center rounded bg-[#e8fff6] text-[#128c7e]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#111827]">Connection</h2>
              <p className="mt-1 text-xs leading-5 text-[#6B7280]">Use the values from Meta Business Manager and your approved WhatsApp Cloud API sender.</p>
            </div>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <label className="flex items-center justify-between rounded border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 md:col-span-2">
              <span>
                <span className="block text-sm font-black text-[#111827]">Enable WhatsApp API</span>
                <span className="block text-xs text-[#6B7280]">When enabled, signup requires WhatsApp OTP and existing users must verify their number.</span>
              </span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(event) => setValue('enabled', event.target.checked)}
                className="h-5 w-5 accent-[#128c7e]"
              />
            </label>
            <Field label="Access Key" hint="Meta Cloud API permanent or system-user access token.">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={config.accessToken}
                  onChange={(event) => setValue('accessToken', event.target.value)}
                  placeholder="EAAG..."
                  className="w-full rounded border border-[#D1D5DB] px-4 py-3 pl-10 text-sm outline-none focus:border-[#128c7e]"
                />
              </div>
            </Field>
            <Field label="WhatsApp Phone Number ID">
              <input value={config.phoneNumberId} onChange={(event) => setValue('phoneNumberId', event.target.value)} placeholder="Phone number ID" className="w-full rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#128c7e]" />
            </Field>
            <Field label="Business ID">
              <input value={config.businessId} onChange={(event) => setValue('businessId', event.target.value)} placeholder="Meta business ID" className="w-full rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#128c7e]" />
            </Field>
            <Field label="WhatsApp Number" hint="Optional visible sender number for Tiwlo Team reference.">
              <input value={config.fromNumber} onChange={(event) => setValue('fromNumber', event.target.value)} placeholder="+880..." className="w-full rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#128c7e]" />
            </Field>
            <Field label="Graph API Version">
              <input value={config.apiVersion} onChange={(event) => setValue('apiVersion', event.target.value)} placeholder="v20.0" className="w-full rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#128c7e]" />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#DDE3EA] bg-white">
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-5">
            <div className="grid h-10 w-10 place-items-center rounded bg-[#eef2ff] text-[#1D4ED8]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#111827]">Message Templates</h2>
              <p className="mt-1 text-xs leading-5 text-[#6B7280]">Template names and languages must match approved Meta WhatsApp templates.</p>
            </div>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {templateRows.map((row) => {
              const template = config.templates[row.key];
              return (
                <div key={row.key} className="grid gap-4 p-5 lg:grid-cols-[220px_1fr_135px_150px_145px] lg:items-center">
                  <div>
                    <p className="text-sm font-black text-[#111827]">{row.label}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#6B7280]">{row.description}</p>
                  </div>
                  <input
                    value={template.name}
                    onChange={(event) => setTemplateValue(row.key, 'name', event.target.value)}
                    placeholder="template_name"
                    className="w-full rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#128c7e]"
                  />
                  <input
                    value={template.language}
                    onChange={(event) => setTemplateValue(row.key, 'language', event.target.value)}
                    placeholder="en_US"
                    className="w-full rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#128c7e]"
                  />
                  <select
                    value={template.buttonType || 'auto'}
                    onChange={(event) => setTemplateValue(row.key, 'buttonType', event.target.value as WhatsAppTemplate['buttonType'])}
                    className="w-full rounded border border-[#D1D5DB] px-3 py-3 text-sm font-bold outline-none focus:border-[#128c7e]"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="url">URL Button</option>
                    <option value="copy_code">Copy Code</option>
                  </select>
                  <label className="inline-flex items-center gap-2 text-xs font-black text-[#374151]">
                    <input
                      type="checkbox"
                      checked={template.button !== false}
                      onChange={(event) => setTemplateValue(row.key, 'button', event.target.checked)}
                      className="h-4 w-4 accent-[#128c7e]"
                    />
                    Send Button Param
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex justify-end">
          <button disabled={saving} className="inline-flex items-center gap-2 rounded bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#1F2937] disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save WhatsApp API'}
          </button>
        </div>
      </form>
    </div>
  );
}
