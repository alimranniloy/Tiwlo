import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Lock, Mail, MapPin, Phone, ShieldCheck, User, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User as UserType } from '../types';
import { signupWithApi } from '../lib/tiwloApi';
import BrandLogo from '../components/BrandLogo';
import { COUNTRIES, countryByCode, phoneValidationMessage } from '../lib/countries';
import AuthCard, { AuthShell } from '../components/AuthCard';

interface SignupProps {
  onSignup: (user: UserType) => void;
}

type SignupForm = {
  name: string;
  email: string;
  password: string;
  billingName: string;
  country: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
};

const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  billingName: '',
  country: 'BD',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: ''
};

function Field({
  label,
  icon: Icon,
  children
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#4a4a4a] md:text-xs">{label}</span>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        {children}
      </div>
    </label>
  );
}

export default function SignupPage({ onSignup }: SignupProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const selectedCountry = useMemo(() => countryByCode(form.country), [form.country]);

  const setValue = (key: keyof SignupForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const validateAccountStep = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email address is required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const validateProfileStep = () => {
    if (!form.billingName.trim()) return 'Billing name is required.';
    if (!form.addressLine1.trim()) return 'Address is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.postalCode.trim()) return 'Postal code is required.';
    return phoneValidationMessage(form.country, form.phone);
  };

  const nextStep = () => {
    const message = validateAccountStep();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const accountMessage = validateAccountStep();
    const profileMessage = validateProfileStep();
    if (accountMessage || profileMessage) {
      setError(accountMessage || profileMessage);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await signupWithApi({
        name: form.name,
        email: form.email,
        password: form.password,
        billingName: form.billingName,
        country: form.country,
        mobileCountryCode: selectedCountry.dialCode,
        phone: form.phone,
        addressLine1: form.addressLine1,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode
      });
      onSignup(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        wide
        title="Create Account"
        socialLabel="Sign up with"
        logo={(
          <button type="button" onClick={() => window.location.href = '/'} className="cursor-pointer" aria-label="Go to Tiwlo home">
            <BrandLogo className="h-14 w-40" />
          </button>
        )}
        footer={(
          <p>
            Already have an account?
            <Link to="/login" className="ml-1 font-normal text-[#1778f2] hover:underline">Sign In</Link>
          </p>
        )}
      >
          <div className="grid h-9 w-full grid-cols-2 overflow-hidden rounded-full border border-gray-200 bg-gray-50 p-1 text-[11px] font-black uppercase">
              <span className={`grid place-items-center rounded-full ${step === 1 ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>Account</span>
              <span className={`grid place-items-center rounded-full ${step === 2 ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>Billing</span>
            </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <div className="grid grid-cols-1 gap-4">
                <Field label="Full Name" icon={User}>
                  <input required type="text" value={form.name} onChange={(e) => setValue('name', e.target.value)} placeholder="John Doe" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600 md:py-3.5 md:text-base" />
                </Field>
                <Field label="Email Address" icon={Mail}>
                  <input required type="email" value={form.email} onChange={(e) => setValue('email', e.target.value)} placeholder="you@example.com" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600 md:py-3.5 md:text-base" />
                </Field>
                <Field label="Password" icon={Lock}>
                  <input required type="password" value={form.password} onChange={(e) => setValue('password', e.target.value)} placeholder="Create a password" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600 md:py-3.5 md:text-base" />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Billing Name" icon={User}>
                  <input required type="text" value={form.billingName} onChange={(e) => setValue('billingName', e.target.value)} placeholder="John Doe" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600" />
                </Field>
                <label className="space-y-1.5">
                  <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#4a4a4a] md:text-xs">Country</span>
                  <select value={form.country} onChange={(e) => setValue('country', e.target.value)} className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-blue-600">
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                </label>
                <Field label={`Mobile Number ${selectedCountry.dialCode || ''}`} icon={Phone}>
                  <input required type="tel" value={form.phone} onChange={(e) => setValue('phone', e.target.value)} placeholder={form.country === 'BD' ? '1712345678' : 'Mobile number'} className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600" />
                </Field>
                <Field label="Address" icon={MapPin}>
                  <input required type="text" value={form.addressLine1} onChange={(e) => setValue('addressLine1', e.target.value)} placeholder="Street address" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600" />
                </Field>
                <Field label="City" icon={MapPin}>
                  <input required type="text" value={form.city} onChange={(e) => setValue('city', e.target.value)} placeholder="Dhaka" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600" />
                </Field>
                <Field label="State / Division" icon={MapPin}>
                  <input type="text" value={form.state} onChange={(e) => setValue('state', e.target.value)} placeholder="Dhaka Division" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600" />
                </Field>
                <Field label="Postal Code" icon={MapPin}>
                  <input required type="text" value={form.postalCode} onChange={(e) => setValue('postalCode', e.target.value)} placeholder="1207" className="w-full rounded-sm border border-gray-200 bg-white px-4 py-3 pl-12 text-sm font-medium outline-none transition-all focus:border-blue-600" />
                </Field>
              </div>
            )}

            <div className="flex items-start gap-3 px-1 py-1">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <p className="text-[10px] leading-relaxed text-gray-500 md:text-[11px]">Address and mobile details are required before dashboard access is unlocked.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-700 transition-all hover:border-gray-900 active:scale-95">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              {step === 1 ? (
                <button type="button" onClick={nextStep} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#212121] py-3 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] transition-all hover:bg-[#313131] active:scale-95">
                  Next Step <ArrowRight className="h-5 w-5" />
                </button>
              ) : (
                <button disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#212121] py-3 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] transition-all hover:bg-[#313131] active:scale-95 disabled:opacity-70">
                  {isLoading ? <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white" /> : <>Create Account <UserPlus className="h-5 w-5" /></>}
                </button>
              )}
            </div>
          </form>
      </AuthCard>
    </AuthShell>
  );
}
