import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, MapPin, MessageCircle, Phone, RefreshCw, ShieldCheck, User, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User as UserType } from '../types';
import {
  changeSignupWhatsAppPhoneWithApi,
  checkSignupAvailabilityWithApi,
  resendSignupWhatsAppOtpWithApi,
  signupWithApi,
  verifySignupWhatsAppOtpWithApi
} from '../lib/tiwloApi';
import BrandLogo from '../components/BrandLogo';
import { COUNTRIES, countryByCode, detectBrowserCountryCode, phoneValidationMessage } from '../lib/countries';
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
  const [form, setForm] = useState<SignupForm>(() => ({ ...initialForm, country: detectBrowserCountryCode(initialForm.country) }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<{ emailAvailable?: boolean; phoneAvailable?: boolean; message?: string }>({});
  const [pendingOtp, setPendingOtp] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
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

  useEffect(() => {
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!email && !phone) {
      setAvailability({});
      return undefined;
    }
    const timer = window.setTimeout(() => {
      checkSignupAvailabilityWithApi({
        email,
        phone,
        country: form.country,
        mobileCountryCode: selectedCountry.dialCode
      })
        .then(setAvailability)
        .catch(() => setAvailability({}));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [form.email, form.phone, form.country, selectedCountry.dialCode]);

  useEffect(() => {
    if (!pendingOtp?.resendAvailableAt) {
      setResendSeconds(0);
      return undefined;
    }
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(pendingOtp.resendAvailableAt).getTime() - Date.now()) / 1000));
      setResendSeconds(seconds);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [pendingOtp?.resendAvailableAt]);

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
      if (result.requiresWhatsAppOtp) {
        setPendingOtp(result);
        setOtp('');
        setOtpError('');
        return;
      }
      if (result.user) onSignup(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingOtp?.challengeId) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Enter the 6 digit WhatsApp OTP.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const result = await verifySignupWhatsAppOtpWithApi(pendingOtp.challengeId, otp.trim());
      onSignup(result.user);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Unable to verify OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!pendingOtp?.challengeId || resendSeconds > 0) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      setPendingOtp(await resendSignupWhatsAppOtpWithApi(pendingOtp.challengeId));
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Unable to resend OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const changeOtpPhone = async () => {
    if (!pendingOtp?.challengeId) return;
    const profileMessage = phoneValidationMessage(form.country, form.phone);
    if (profileMessage) {
      setOtpError(profileMessage);
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      setPendingOtp(await changeSignupWhatsAppPhoneWithApi(pendingOtp.challengeId, {
        phone: form.phone,
        country: form.country,
        mobileCountryCode: selectedCountry.dialCode
      }));
      setOtp('');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Unable to change phone number.');
    } finally {
      setOtpLoading(false);
    }
  };

  if (pendingOtp) {
    return (
      <AuthShell>
        <AuthCard
          wide
          title="Verify WhatsApp"
          socialLabel="Secure signup"
          logo={<BrandLogo className="h-14 w-40" />}
          footer={<p className="text-xs">Already verified? Enter the latest 6 digit code from WhatsApp.</p>}
        >
          <div className="rounded-lg border border-[#d8f3dc] bg-[#f0fff4] p-4 text-[#14532d]">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-black">We sent a 6 digit OTP to your WhatsApp number.</p>
                <p className="mt-1 text-xs leading-5 text-[#166534]">Use the mobile number you entered during signup: <span className="font-mono font-bold">{pendingOtp.phoneE164 || pendingOtp.phone}</span></p>
              </div>
            </div>
          </div>

          <form onSubmit={verifyOtp} className="space-y-5">
            <label className="space-y-2">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#4a4a4a]">WhatsApp OTP</span>
              <input
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                  setOtpError('');
                }}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="w-full rounded-md border border-gray-200 bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.4em] outline-none transition-all focus:border-green-600"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-[140px_1fr_auto]">
              <select value={form.country} onChange={(e) => setValue('country', e.target.value)} className="rounded border border-gray-200 bg-white px-2 py-2 text-xs font-black outline-none">
                {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.dialCode}</option>)}
              </select>
              <input value={form.phone} onChange={(e) => setValue('phone', e.target.value)} placeholder="Change WhatsApp number" className="rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
              <button type="button" onClick={changeOtpPhone} disabled={otpLoading} className="rounded bg-gray-900 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Change Number</button>
            </div>

            {otpError && (
              <div className="flex items-start gap-2 rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button disabled={otpLoading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#128c7e] py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[#0f756a] disabled:opacity-70">
                {otpLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Verify & Create Account <CheckCircle2 className="h-5 w-5" /></>}
              </button>
              <button type="button" onClick={resendOtp} disabled={otpLoading || resendSeconds > 0} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-700 disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> {resendSeconds > 0 ? `Resend ${resendSeconds}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        </AuthCard>
      </AuthShell>
    );
  }

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
                  {form.email && availability.emailAvailable === false && <p className="mt-1 text-[11px] font-bold text-red-600">This email address is already in use.</p>}
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
                      <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#4a4a4a] md:text-xs">Mobile Number</span>
                  <div className="grid grid-cols-[118px_1fr] overflow-hidden rounded-sm border border-gray-200 bg-white focus-within:border-blue-600">
                    <select
                      value={form.country}
                      onChange={(e) => setValue('country', e.target.value)}
                      className="border-r border-gray-200 bg-gray-50 px-2 py-3 text-sm font-black outline-none"
                      aria-label="Mobile country code"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>{country.flag} {country.dialCode}</option>
                      ))}
                    </select>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required type="tel" value={form.phone} onChange={(e) => setValue('phone', e.target.value)} placeholder={form.country === 'BD' ? '1712345678' : 'Mobile number'} className="w-full bg-white px-4 py-3 pl-12 text-sm font-medium outline-none" />
                    </div>
                  </div>
                  {form.phone && availability.phoneAvailable === false && <p className="mt-1 text-[11px] font-bold text-red-600">This phone number is already in use.</p>}
                </label>
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
