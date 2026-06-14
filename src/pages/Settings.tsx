import React from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  ChevronRight,
  CreditCard,
  Database,
  Globe,
  Key,
  Mail,
  Plus,
  Shield,
  Smartphone,
  User as UserIcon,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { fetchBillingOverviewWithApi, updateProfileWithApi } from '../lib/tiwloApi';
import { COUNTRIES, countryByCode, phoneValidationMessage } from '../lib/countries';
import { useCurrency } from '../lib/useCurrency';

interface SettingsProps {
  user: User;
  setUser: (user: User) => void;
}

export default function SettingsPage({ user, setUser }: SettingsProps) {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'console', actorId: user.id });
  const [name, setName] = React.useState(user.name);
  const [phone, setPhone] = React.useState(user.phone || '');
  const [country, setCountry] = React.useState(user.country || 'BD');
  const [billingName, setBillingName] = React.useState(user.billingName || user.name);
  const [addressLine1, setAddressLine1] = React.useState(user.addressLine1 || '');
  const [city, setCity] = React.useState(user.city || '');
  const [state, setState] = React.useState(user.state || '');
  const [postalCode, setPostalCode] = React.useState(user.postalCode || '');
  const [primaryRegion, setPrimaryRegion] = React.useState(user.primaryRegion || 'New York 3');
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isSaved, setIsSaved] = React.useState(false);
  const [creditBalance, setCreditBalance] = React.useState<number | null>(typeof user.credits === 'number' ? user.credits : null);
  const navigate = useNavigate();
  const isAdminUser = ['admin', 'super_admin'].includes(user.role);

  React.useEffect(() => {
    let isMounted = true;
    fetchBillingOverviewWithApi()
      .then((overview) => {
        if (isMounted) setCreditBalance(Number(overview?.credits || 0));
      })
      .catch(() => {
        if (isMounted && typeof user.credits === 'number') setCreditBalance(user.credits);
      });
    return () => {
      isMounted = false;
    };
  }, [user.credits]);

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSaved(false);
    setIsSaving(true);

    try {
      const phoneError = phoneValidationMessage(country, phone);
      if (phoneError) throw new Error(phoneError);
      const selectedCountry = countryByCode(country);
      const updatedUser = await updateProfileWithApi({
        id: user.id,
        name,
        phone,
        mobileCountryCode: selectedCountry.dialCode,
        country,
        billingName,
        addressLine1,
        city,
        state,
        postalCode,
        primaryRegion
      });
      const nextUser = { ...user, ...updatedUser };
      setUser(nextUser);
      localStorage.setItem('tiwlo_user', JSON.stringify(nextUser));
      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const navSections = [
    { title: 'Team Access', description: 'Review account access options', icon: Users, path: '/team', color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Billing & Invoices', description: 'Payments and subscriptions', icon: CreditCard, path: '/billing', color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'API & Integration', description: 'Tokens and webhooks', icon: Key, path: '/api-tokens', color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  const preferenceSections = [
    { title: 'Security', description: 'Review account profile and access settings', icon: Shield, path: '/settings' },
    { title: 'Notifications', description: 'View live notifications and alert status', icon: Bell, path: '/alerts' },
    { title: 'Networking', description: 'Manage networks, domains, and firewalls', icon: Globe, path: '/networking' },
    { title: 'Project Usage', description: 'Review activity, limits, and audit trail', icon: Activity, path: '/activity' }
  ];

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">Account Settings</h1>
          <p className="mt-1 text-sm font-medium text-[#52637a]">Profile updates are saved through the user API.</p>
        </div>
        <div className="hidden items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 md:flex">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">{user.status || 'active'} account</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600 shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          <section className="overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
            <div className="flex items-center justify-between border-b border-[#e4e9f1] bg-[#f7f9fc] p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-2">
                  <UserIcon className="h-5 w-5 text-[#111827]" />
                </div>
                <div>
                  <h2 className="font-bold text-[#111827]">Profile Information</h2>
                  <p className="text-xs text-[#6B7280]">Update identity details stored in the database.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-8 p-8">
              <div className="flex flex-col items-start gap-10 md:flex-row">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border-4 border-white bg-[#111827] text-3xl font-bold text-white">
                    {user.avatar ? <img src={user.avatar} className="h-full w-full object-cover" alt="" /> : user.name.charAt(0)}
                  </div>
                </div>

                <div className="grid w-full flex-1 grid-cols-1 gap-6 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Full Name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Email Address</span>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        className="w-full cursor-not-allowed rounded-md border border-[#cdd6e3] bg-gray-50 px-5 py-3 pl-12 text-[14px] text-gray-500"
                      />
                    </div>
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Phone Number</span>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder={country === 'BD' ? '1712345678' : 'Mobile number'}
                        className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 pl-12 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                      />
                    </div>
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Country</span>
                    <select
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 text-[14px] font-bold transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                    >
                      {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Billing Name</span>
                    <input
                      type="text"
                      value={billingName}
                      onChange={(event) => setBillingName(event.target.value)}
                      className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Billing Address</span>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(event) => setAddressLine1(event.target.value)}
                      className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">City</span>
                    <input
                      type="text"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">State / Division</span>
                    <input
                      type="text"
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Postal Code</span>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                      className="w-full rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Primary Region</span>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <select
                        value={primaryRegion}
                        onChange={(event) => setPrimaryRegion(event.target.value)}
                        className="w-full appearance-none rounded-md border border-[#cdd6e3] bg-[#F9FAFB] px-5 py-3 pl-12 text-[14px] transition-all focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
                      >
                        <option>New York 3</option>
                        <option>San Francisco 2</option>
                        <option>London 1</option>
                        <option>Frankfurt 1</option>
                        <option>Singapore 1</option>
                      </select>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-8">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                  <p className="text-[11px] font-medium text-[#6B7280]">Authenticated API session active</p>
                </div>
                <div className="flex items-center gap-4">
                  {isSaved && <span className="text-[13px] font-bold text-[#059669]">Settings updated.</span>}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-blue-600 px-8 py-3 text-[14px] font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {preferenceSections.map((section) => (
              <button
                key={section.title}
                onClick={() => navigate(section.path)}
                className="rounded-md border border-[#E5E7EB] bg-white p-6 text-left transition-all hover:border-blue-600"
              >
                <div className="flex gap-5">
                  <div className="rounded-md bg-gray-50 p-3 text-gray-400">
                    <section.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#111827]">{section.title}</h4>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{section.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="relative overflow-hidden rounded-md border border-gray-200 bg-white p-8 shadow-sm">
            <div className="relative z-10">
              <div className="mb-1 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Account Credits</span>
              </div>
              <div className="mb-2 font-mono text-4xl font-black tracking-tight text-[#111827]">
                {money(creditBalance ?? user.credits ?? 0, 'USD')}
              </div>
              <p className="mb-6 text-[12px] leading-relaxed text-[#6B7280]">Credit balance comes from the billing API.</p>
              <button onClick={() => navigate('/billing')} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#111827] py-3 text-[13px] font-bold text-white hover:bg-black">
                <Plus className="h-4 w-4" /> Add Credits
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-md bg-[#111827] p-8 text-white">
            <Database className="absolute -bottom-10 -right-10 h-48 w-48 text-blue-600 opacity-10" />
            <h3 className="mb-6 text-xl font-bold">Account Access</h3>
            <div className="space-y-4">
              {navSections.map((nav) => (
                <button
                  key={nav.path}
                  onClick={() => navigate(nav.path)}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${nav.bg} ${nav.color}`}>
                      <nav.icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">{nav.title}</p>
                      <p className="text-[11px] text-gray-400">{nav.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-red-100 bg-red-50 p-8">
            <h3 className="mb-2 text-[13px] font-bold uppercase tracking-widest text-red-900">{isAdminUser ? 'Critical Actions' : 'Account Help'}</h3>
            <p className="mb-6 text-[12px] leading-relaxed text-red-700">
              {isAdminUser ? 'Account deactivation is handled by admin user controls.' : 'For account deactivation or access changes, contact support from the user dashboard.'}
            </p>
            <button onClick={() => navigate(isAdminUser ? '/management/users' : '/support')} className="w-full rounded-md border border-red-200 bg-white py-3 text-[13px] font-bold text-red-600 transition-colors hover:bg-red-100">
              {isAdminUser ? 'Open User Controls' : 'Contact Support'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
