import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserType } from '../types';
import {
  changeSignupWhatsAppPhoneWithApi,
  checkSignupAvailabilityWithApi,
  fetchSignupPaymentGatewaysWithApi,
  resendSignupWhatsAppOtpWithApi,
  startSignupPromoVerificationWithApi,
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
const fallbackGateways = [
  { id: 'bkash', key: 'bkash', name: 'bKash', provider: 'bkash' },
  { id: 'stripe', key: 'stripe', name: 'Stripe', provider: 'stripe' }
];
const signupDraftKey = 'tiwlo_signup_draft_v2';
const providerOrder: Record<string, number> = { bkash: 0, stripe: 1 };
const paymentLogos: Record<string, string> = {
  bkash: '/brand/payments/bkash.svg',
  stripe: '/brand/payments/stripe-mark.svg'
};

const providerOf = (gateway: any) => String(gateway?.provider || gateway?.key || '').toLowerCase();
const providerLabel = (gateway: any) => {
  const provider = providerOf(gateway);
  if (provider === 'bkash') return 'bKash';
  if (provider === 'stripe') return 'Stripe';
  if (provider === 'paypal') return 'PayPal';
  return gateway?.name || provider;
};
const orderedGateways = (items: any[]) => [...items].sort((a, b) => {
  const aProvider = providerOf(a);
  const bProvider = providerOf(b);
  return (providerOrder[aProvider] ?? 99) - (providerOrder[bProvider] ?? 99) || providerLabel(a).localeCompare(providerLabel(b));
});
const promoGateways = (items: any[]) => items.filter((gateway) => Boolean(paymentLogos[providerOf(gateway)]));

const readSignupDraft = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(signupDraftKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const clearSignupDraft = () => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(signupDraftKey);
  }
};

export default function SignupPage({ onSignup }: SignupProps) {
  const navigate = useNavigate();
  const draft = useMemo(() => readSignupDraft(), []);
  const [step, setStep] = useState<'email' | 'details' | 'promo'>(() => (
    ['email', 'details', 'promo'].includes(draft?.step) ? draft.step : 'email'
  ));
  const [form, setForm] = useState<SignupForm>(() => ({
    ...initialForm,
    country: detectBrowserCountryCode(initialForm.country),
    ...(draft?.form || {})
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gateways, setGateways] = useState<any[]>([]);
  const [gatewaysLoading, setGatewaysLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(draft?.selectedGateway || 'bkash');
  const [availability, setAvailability] = useState<{ emailAvailable?: boolean; phoneAvailable?: boolean; message?: string; normalizedPhone?: string; existingAccountName?: string; existingAccountEmail?: string; existingAccountAvatar?: string }>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [pendingOtp, setPendingOtp] = useState<any>(draft?.pendingOtp || null);
  const [pendingPromoProvider, setPendingPromoProvider] = useState(draft?.pendingPromoProvider || '');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const selectedCountry = useMemo(() => countryByCode(form.country), [form.country]);
  const normalizedEmail = form.email.trim().toLowerCase();
  const paymentGateways = useMemo(() => {
    const visibleGateways = promoGateways(gateways);
    return orderedGateways(visibleGateways.length > 0 ? visibleGateways : fallbackGateways);
  }, [gateways]);

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
    try {
      window.sessionStorage.setItem(signupDraftKey, JSON.stringify({
        form,
        step,
        selectedGateway,
        pendingOtp,
        pendingPromoProvider
      }));
    } catch {
      // Session storage can fail in private contexts; signup still works without drafts.
    }
  }, [form, step, selectedGateway, pendingOtp, pendingPromoProvider]);

  useEffect(() => {
    let active = true;
    setGatewaysLoading(true);
    fetchSignupPaymentGatewaysWithApi()
      .then((items) => {
        if (!active) return;
        const nextGateways = (items || []).filter((item) => item?.provider);
        const nextPromoGateways = promoGateways(nextGateways);
        setGateways(nextGateways);
        if (nextPromoGateways.length) {
          const ordered = orderedGateways(nextPromoGateways);
          setSelectedGateway((current) => ordered.some((gateway) => providerOf(gateway) === current) ? current : providerOf(ordered[0]));
        }
      })
      .catch(() => {
        if (active) setGateways([]);
      })
      .finally(() => {
        if (active) setGatewaysLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
        const params = new URLSearchParams({
          email: normalizedEmail,
          existing: '1'
        });
        if (result.existingAccountName) params.set('name', result.existingAccountName);
        if (result.existingAccountAvatar) params.set('avatar', result.existingAccountAvatar);
        navigate(`/login?${params.toString()}`);
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

  const continueToPromo = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = validateDetails();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep('promo');
  };

  const startPromoVerification = async (provider: string, user: UserType) => {
    const checkout = await startSignupPromoVerificationWithApi(provider);
    localStorage.setItem('tiwlo_user', JSON.stringify(user));
    clearSignupDraft();
    if (checkout?.paymentUrl) {
      window.location.assign(checkout.paymentUrl);
      return;
    }
    onSignup(user);
  };

  const createAccount = async ({ promo }: { promo: boolean }) => {
    const message = validateDetails();
    if (message) {
      setError(message);
      setStep('details');
      return;
    }
    const provider = promo ? selectedGateway : '';

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
        postalCode: form.postalCode,
        signupPromoOptIn: promo,
        signupPromoProvider: provider || undefined
      });
      if (result.requiresWhatsAppOtp) {
        setPendingOtp(result);
        setPendingPromoProvider(provider);
        setOtp('');
        setOtpError('');
        return;
      }
      if (result.user) {
        if (promo && provider) {
          try {
            await startPromoVerification(provider, result.user);
          } catch (promoError) {
            setError(promoError instanceof Error ? `Account created, but payment verification could not start: ${promoError.message}` : 'Account created, but payment verification could not start.');
            window.setTimeout(() => onSignup(result.user as UserType), 1800);
          }
          return;
        }
        clearSignupDraft();
        onSignup(result.user);
      }
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
      if (pendingPromoProvider) {
        try {
          await startPromoVerification(pendingPromoProvider, result.user);
        } catch (promoError) {
          setOtpError(promoError instanceof Error ? `Account created, but payment verification could not start: ${promoError.message}` : 'Account created, but payment verification could not start.');
          window.setTimeout(() => onSignup(result.user), 1800);
        }
        return;
      }
      clearSignupDraft();
      onSignup(result.user);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Unable to verify OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const promoContent = (
    <section className="w-full">
      <button type="button" onClick={() => setStep('details')} className="inline-flex h-8 items-center rounded-full border border-[#e3e8f3] bg-white px-3 text-[13px] font-bold text-[#0f172a]">
        Back to account details
      </button>

      <div className="mt-4">
        <div className="inline-flex rounded-full bg-[#eef3ff] px-3 py-1 text-[11px] font-black uppercase tracking-normal text-[#3568de]">
          Free credit
        </div>
        <h1 className="mt-2 text-[25px] font-black leading-[1.05] tracking-normal text-[#071024]">Verify payment method</h1>
        <p className="mt-2 text-[14px] font-medium leading-5 text-[#445163]">
          Unlock your $100 credit for 30 days.
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[18px] border border-[#e6ebf4] bg-white">
        {[
          '$1 hold is returned after verification.',
          '$100 credit lasts 30 days.',
          'After credit ends, services need active credit.'
        ].map((text, index) => (
          <div key={text} className={`px-4 py-3 ${index < 2 ? 'border-b border-[#edf1f6]' : ''}`}>
            <p className="text-[13px] font-bold leading-5 text-[#0f172a]">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[14px] font-black text-[#0f172a]">Choose payment method</p>
          {gatewaysLoading && <span className="text-[11px] font-semibold text-[#7b8794]">Loading...</span>}
        </div>
        <div className="grid gap-2">
          {paymentGateways.map((gateway) => {
            const provider = providerOf(gateway);
            const active = selectedGateway === provider;
            const logo = paymentLogos[provider];
            return (
              <button
                key={gateway.id || provider}
                type="button"
                onClick={() => setSelectedGateway(provider)}
                className={`grid min-h-[52px] grid-cols-[26px_42px_1fr] items-center gap-2.5 rounded-[16px] border bg-white px-3 text-left transition ${
                  active ? 'border-[#5e8cff] bg-[#f8fbff]' : 'border-[#e5e8ef] hover:border-[#b9cdf8]'
                }`}
              >
                <span className={`grid h-[20px] w-[20px] place-items-center rounded-full border-2 ${active ? 'border-[#2563ff]' : 'border-[#d7dde8]'}`}>
                  {active && <span className="h-[8px] w-[8px] rounded-full bg-[#2563ff]" />}
                </span>
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white">
                  {logo ? (
                    <img src={logo} alt={`${providerLabel(gateway)} logo`} className={`${provider === 'stripe' ? 'h-8 w-8 rounded-[8px]' : 'h-8 w-8'} object-contain`} />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef2ff] text-[14px] font-black text-[#2563ff]">{providerLabel(gateway).charAt(0)}</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate text-[16px] font-black leading-5 text-[#0f172a]">{providerLabel(gateway)}</span>
                    {provider === 'bkash' && <span className="rounded-full bg-[#f0ecff] px-2 py-0.5 text-[10px] font-black text-[#5d3fd3]">Recommended</span>}
                  </span>
                  <span className="block truncate text-[11px] font-bold uppercase tracking-normal text-[#4b5563]">{provider}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="mt-4"><AuthError message={error} /></div>}

      <div className="mt-4 space-y-2.5">
        <button
          type="button"
          disabled={isLoading || !selectedGateway}
          onClick={() => createAccount({ promo: true })}
          className="h-12 w-full rounded-[18px] bg-[#3e22e8] px-4 text-[16px] font-black text-white transition hover:bg-[#2d18c6] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isLoading ? 'Starting...' : 'Verify and get $100'}
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => createAccount({ promo: false })}
          className="h-11 w-full rounded-[18px] border border-[#d9dce7] bg-white px-4 text-[14px] font-black text-[#3e22e8] transition hover:border-[#3e22e8] disabled:cursor-not-allowed disabled:opacity-55"
        >
          No, just sign up
        </button>
      </div>

      <div className="mt-3 text-center text-[12px] font-semibold text-[#7b8794]">
        <span>Your payment is <span className="text-[#3568de]">secure and encrypted</span></span>
      </div>
    </section>
  );

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
            {pendingPromoProvider ? ' Payment verification starts after this.' : ''}
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

  if (step === 'promo') {
    return (
      <main className="min-h-[100svh] bg-[#f8faff] px-4 py-3 font-sans text-black sm:px-6">
        <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-[420px] flex-col justify-center">
          {promoContent}
        </div>
      </main>
    );
  }

  return (
    <TiwloAuthShell maxWidthClass={step === 'details' ? 'max-w-[680px]' : step === 'promo' ? 'max-w-[480px]' : 'max-w-[360px]'}>
      <TiwloAuthLogo />
      <section className="w-full">
        <h1 className="text-center text-[30px] font-semibold tracking-normal text-black">Create an account</h1>

        {step === 'email' ? (
          <>
            <form onSubmit={continueWithEmail} className="mt-7 space-y-6">
              <div className="rounded-[18px] border border-[#bfd2ff] bg-[#eef4ff] px-4 py-3 text-center text-[13px] font-bold leading-5 text-[#2563ff]">
                Get $100 free credit for new users
              </div>
              <TiwloAuthInput
                label="Email address"
                value={form.email}
                type="email"
                autoComplete="email"
                autoFocus
                onChange={(event) => setValue('email', event.target.value)}
              />
              {availability.emailAvailable === false && (
                <DuplicateEmailCard
                  email={availability.existingAccountEmail || normalizedEmail}
                  name={availability.existingAccountName}
                  avatar={availability.existingAccountAvatar}
                />
              )}
              {error && availability.emailAvailable !== false && <AuthError message={error} />}
              <TiwloAuthButton disabled={!validEmail(normalizedEmail) || availabilityLoading}>
                {availabilityLoading ? 'Checking...' : availability.emailAvailable === false ? 'Login instead' : 'Continue'}
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
        ) : step === 'details' ? (
          <form onSubmit={continueToPromo} className="mt-7 space-y-5">
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
              Continue
            </TiwloAuthButton>
          </form>
        ) : null}
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

function DuplicateEmailCard({ email, name, avatar }: { email: string; name?: string; avatar?: string }) {
  const label = name || email.split('@')[0] || 'Existing account';
  const initial = label.charAt(0).toUpperCase();
  return (
    <div className="rounded-[18px] border border-[#dfe6f2] bg-[#fbfdff] px-3 py-3">
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt={label} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="grid h-10 w-10 rounded-full bg-[#e9f1ff] text-[15px] font-bold text-[#2563ff] place-items-center">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-black">{label}</p>
          <p className="truncate text-[12px] text-[#666]">{email}</p>
        </div>
      </div>
      <p className="mt-2 text-[12px] font-medium leading-5 text-[#555]">
        This email already has a Tiwlo account. Continue to login and enter your password.
      </p>
    </div>
  );
}
