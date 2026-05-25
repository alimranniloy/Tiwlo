import React from 'react';
import { AlertCircle, LockKeyhole, LogOut, MapPin, Phone, Save, User as UserIcon } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { User } from '../types';
import { updateProfileWithApi } from '../lib/tiwloApi';
import { COUNTRIES, countryByCode, phoneValidationMessage } from '../lib/countries';

type CompleteProfileProps = {
  user: User;
  setUser: (user: User) => void;
  onLogout: () => void;
};

export default function CompleteProfile({ user, setUser, onLogout }: CompleteProfileProps) {
  const [form, setForm] = React.useState({
    name: user.name,
    billingName: user.billingName || user.name,
    country: user.country || 'BD',
    phone: user.phone || '',
    addressLine1: user.addressLine1 || '',
    city: user.city || '',
    state: user.state || '',
    postalCode: user.postalCode || ''
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const selectedCountry = countryByCode(form.country);

  const setValue = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const phoneError = phoneValidationMessage(form.country, form.phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfileWithApi({
        id: user.id,
        ...form,
        mobileCountryCode: selectedCountry.dialCode
      });
      const nextUser = { ...user, ...updated };
      setUser(nextUser);
      localStorage.setItem('tiwlo_user', JSON.stringify(nextUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] px-4 py-6 text-[#111827]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-lg border border-[#d9dee7] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e5e8ed] p-5 sm:flex-row sm:items-center sm:justify-between">
            <BrandLogo className="h-11 w-32" />
            <button onClick={onLogout} className="inline-flex items-center justify-center gap-2 rounded border border-[#d9dee7] px-3 py-2 text-[12px] font-bold text-[#4B5563] hover:bg-[#f8f9fa]">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
          <div className="p-5 md:p-8">
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-black">Profile setup is required before dashboard access.</p>
                  <p className="mt-1 text-[13px] leading-5">Please add billing address, country, and a valid mobile number. Your dashboard will unlock right after saving.</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Full Name</span>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={form.name} onChange={(event) => setValue('name', event.target.value)} className="w-full rounded border border-[#D1D5DB] px-4 py-3 pl-11 text-sm outline-none focus:border-blue-600" />
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Billing Name</span>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={form.billingName} onChange={(event) => setValue('billingName', event.target.value)} className="w-full rounded border border-[#D1D5DB] px-4 py-3 pl-11 text-sm outline-none focus:border-blue-600" />
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Country</span>
                <select value={form.country} onChange={(event) => setValue('country', event.target.value)} className="w-full rounded border border-[#D1D5DB] px-4 py-3 text-sm font-bold outline-none focus:border-blue-600">
                  {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Mobile {selectedCountry.dialCode}</span>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={form.phone} onChange={(event) => setValue('phone', event.target.value)} placeholder={form.country === 'BD' ? '1712345678' : 'Mobile number'} className="w-full rounded border border-[#D1D5DB] px-4 py-3 pl-11 text-sm outline-none focus:border-blue-600" />
                </div>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Address</span>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={form.addressLine1} onChange={(event) => setValue('addressLine1', event.target.value)} className="w-full rounded border border-[#D1D5DB] px-4 py-3 pl-11 text-sm outline-none focus:border-blue-600" />
                </div>
              </label>
              <input value={form.city} onChange={(event) => setValue('city', event.target.value)} placeholder="City" className="rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-blue-600" />
              <input value={form.state} onChange={(event) => setValue('state', event.target.value)} placeholder="State / Division" className="rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-blue-600" />
              <input value={form.postalCode} onChange={(event) => setValue('postalCode', event.target.value)} placeholder="Postal code" className="rounded border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-blue-600 md:col-span-2" />
              <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded bg-[#111827] px-5 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-60 md:col-span-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save And Unlock Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
