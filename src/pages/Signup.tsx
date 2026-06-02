import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User as UserType } from '../types';
import {
  changeSignupWhatsAppPhoneWithApi,
  checkSignupAvailabilityWithApi,
  resendSignupWhatsAppOtpWithApi,
  signupWithApi,
  verifySignupWhatsAppOtpWithApi
} from '../lib/tiwloApi';
import { COUNTRIES, countryByCode, detectBrowserCountryCode, phoneValidationMessage } from '../lib/countries';
import {
  TiwloAuthButton,
  TiwloAuthDivider,
  TiwloAuthInput,
  TiwloAuthLogo,
  TiwloAuthShell,
  TiwloLegalLinks,
  TiwloSocialButtons
} from '../components/TiwloAuth';

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

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function SignupPage({ onSignup }: SignupProps) {
  const [step, setStep] = useState<'email' | 'details'>('email');
  const [form, setForm] = useState<SignupForm>(() => ({ ...initialForm, country: detectBrowserCountryCode(initialForm.country) }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<{ emailAvailable?: boolean; phoneAvailable?: boolean; message?: string; normalizedPhone?: string }>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [pendingOtp, setPendingOtp] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const selectedCountry = useMemo(() => countryByCode(form.country), [form.country]);
  const normalizedEmail = form.email.trim().toLowerCase();

  const setValue = (key: keyof SignupForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
    setOtpError('');
  };

  useEffect(() => {
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!email && !phone) {
      setAvailability({});
      setAvailabilityLoading(false);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setAvailabilityLoading(true);
      checkSignupAvailabilityWithApi({
        email,
        phone,
        country: form.country,
        mobileCountryCode: selectedCountry.dialCode
      })
        .then((result) => {
          if (active) setAvailability(result);
        })
        .catch(() => {
          if (active) setAvailability({});
        })
        .finally(() => {
          if (active) setAvailabilityLoading(false);
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
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

  const continueWithEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setAvailabilityLoading(true);
    setError('');
    try {
      const result = await checkSignupAvailabilityWithApi({ email: normalizedEmail });
      setAvailability((current) => ({ ...current, ...result }));
      if (result.emailAvailable === false) {
        setError('This email address is already in use.');
        return;
      }
      setStep('details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check this email right now.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const validateDetails = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!validEmail(normalizedEmail)) return 'Email address is required.';
    if (availability.emailAvailable === false) return 'This email address is already in use.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (!form.billingName.trim()) return 'Billing name is required.';
    if (!form.addressLine1.trim()) return 'Address is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.postalCode.trim()) return 'Postal code is required.';
    if (availability.phoneAvailable === false) return 'This phone number is already in use.';
    return phoneValidationMessage(form.country, form.phone);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = validateDetails();
    if (message) {
      setError(message);
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const result = await signupWithApi({
        name: form.name,
        email: normalizedEmail,
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
      setError(err instanceof Error ? err.message : 'Unable to create account.');
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
      <TiwloAuthShell>
        <TiwloAuthLogo />
        <section className="w-full">
          <h1 className="text-center text-[28px] font-semibold tracking-normal">Verify WhatsApp</h1>
          <p className="mx-auto mt-3 max-w-[320px] text-center text-[14px] leading-6 text-[#555]">
            We sent a 6 digit code to {pendingOtp.phoneE164 || pendingOtp.phone}.
          </p>

          <form onSubmit={verifyOtp} className="mt-7 space-y-5">
            <input
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                setOtpError('');
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="h-[56px] w-full rounded-[22px] border border-[#d8d8d8] px-5 text-center text-[24px] font-semibold tracking-[0.34em] outline-none focus:border-[#25d366]"
            />

            <div className="grid grid-cols-[112px_1fr] overflow-hidden rounded-[18px] border border-[#dedede] bg-white">
              <select value={form.country} onChange={(event) => setValue('country', event.target.value)} className="border-r border-[#dedede] bg-white px-2 text-[12px] font-semibold outline-none">
                {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.dialCode}</option>)}
              </select>
              <input value={form.phone} onChange={(event) => setValue('phone', event.target.value)} placeholder="Change phone number" className="h-[48px] px-4 text-[14px] outline-none" />
            </div>

            {otpError && <AuthError message={otpError} />}

            <TiwloAuthButton disabled={otpLoading}>{otpLoading ? 'Checking...' : 'Verify account'}</TiwloAuthButton>
            <div className="flex items-center justify-center gap-4 text-[13px] font-medium">
              <button type="button" onClick={resendOtp} disabled={otpLoading || resendSeconds > 0} className="text-[#2563ff] disabled:text-[#999]">
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
              </button>
              <button type="button" onClick={changeOtpPhone} disabled={otpLoading} className="text-[#2563ff] disabled:text-[#999]">
                Change number
              </button>
            </div>
          </form>
        </section>
      </TiwloAuthShell>
    );
  }

  return (
    <TiwloAuthShell maxWidthClass={step === 'details' ? 'max-w-[680px]' : 'max-w-[360px]'}>
      <TiwloAuthLogo />
      <section className="w-full">
        <h1 className="text-center text-[30px] font-semibold tracking-normal text-black">Create an account</h1>

        {step === 'email' ? (
          <>
            <form onSubmit={continueWithEmail} className="mt-7 space-y-6">
              <TiwloAuthInput
                label="Email address"
                value={form.email}
                type="email"
                autoComplete="email"
                autoFocus
                onChange={(event) => setValue('email', event.target.value)}
              />
              {availability.emailAvailable === false && <AuthError message="This email address is already in use." />}
              {error && availability.emailAvailable !== false && <AuthError message={error} />}
              <TiwloAuthButton disabled={!validEmail(normalizedEmail) || availabilityLoading || availability.emailAvailable === false}>
                {availabilityLoading ? 'Checking...' : 'Continue'}
              </TiwloAuthButton>
            </form>

            <p className="mt-7 text-center text-[15px] font-medium text-black">
              Already have an account?
              <Link to="/login" className="ml-1 text-[#2563ff] hover:underline">Login</Link>
            </p>
            <TiwloAuthDivider />
            <TiwloSocialButtons />
            <TiwloLegalLinks />
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <button type="button" onClick={() => setStep('email')} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#2563ff]">
              <ArrowLeft className="h-4 w-4" />
              {normalizedEmail}
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              <TiwloAuthInput label="Full name" value={form.name} autoComplete="name" onChange={(event) => setValue('name', event.target.value)} />
              <TiwloAuthInput label="Password" value={form.password} type="password" autoComplete="new-password" onChange={(event) => setValue('password', event.target.value)} />
              <TiwloAuthInput label="Billing name" value={form.billingName} onChange={(event) => setValue('billingName', event.target.value)} />
              <label className="relative block">
                <span className="absolute -top-2 left-5 bg-white px-1 text-[12px] font-medium text-[#2563ff]">Country</span>
                <select value={form.country} onChange={(event) => setValue('country', event.target.value)} className="h-[54px] w-full rounded-[22px] border border-[#d8d8d8] bg-white px-5 text-[15px] font-medium outline-none focus:border-[#2563ff]">
                  {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name}</option>)}
                </select>
              </label>
              <label className="relative block sm:col-span-2">
                <span className="absolute -top-2 left-5 z-10 bg-white px-1 text-[12px] font-medium text-[#2563ff]">Mobile number</span>
                <div className="grid grid-cols-[118px_1fr] overflow-hidden rounded-[22px] border border-[#d8d8d8] bg-white focus-within:border-[#2563ff]">
                  <select value={form.country} onChange={(event) => setValue('country', event.target.value)} className="border-r border-[#dedede] bg-white px-3 text-[13px] font-semibold outline-none">
                    {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.dialCode}</option>)}
                  </select>
                  <input value={form.phone} type="tel" onChange={(event) => setValue('phone', event.target.value)} placeholder={form.country === 'BD' ? '01712345678' : 'Mobile number'} className="h-[54px] px-4 text-[15px] font-medium outline-none" />
                </div>
                {availability.phoneAvailable === false && <p className="mt-1 text-[12px] font-semibold text-red-600">This phone number is already in use.</p>}
                {availability.normalizedPhone && availability.phoneAvailable !== false && <p className="mt-1 text-[12px] font-medium text-[#128c7e]">We will verify {availability.normalizedPhone}.</p>}
              </label>
              <TiwloAuthInput label="Address" value={form.addressLine1} autoComplete="street-address" onChange={(event) => setValue('addressLine1', event.target.value)} wrapperClassName="sm:col-span-2" />
              <TiwloAuthInput label="City" value={form.city} onChange={(event) => setValue('city', event.target.value)} />
              <TiwloAuthInput label="State / Division" value={form.state} onChange={(event) => setValue('state', event.target.value)} />
              <TiwloAuthInput label="Postal code" value={form.postalCode} onChange={(event) => setValue('postalCode', event.target.value)} />
            </div>

            <p className="text-center text-[12px] leading-5 text-[#666]">
              Your billing and mobile details are used for account security, invoices, and WhatsApp verification.
            </p>

            {error && <AuthError message={error} />}
            <TiwloAuthButton disabled={isLoading || availability.phoneAvailable === false}>
              {isLoading ? 'Creating...' : 'Create account'}
            </TiwloAuthButton>
          </form>
        )}
      </section>
    </TiwloAuthShell>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-[14px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold leading-5 text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
