import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, WalletCards } from 'lucide-react';
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
  { id: 'stripe', key: 'stripe', name: 'Card', provider: 'stripe' },
  { id: 'paypal', key: 'paypal', name: 'PayPal', provider: 'paypal' },
  { id: 'bkash', key: 'bkash', name: 'bKash', provider: 'bkash' }
];

export default function SignupPage({ onSignup }: SignupProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'details' | 'promo'>('email');
  const [form, setForm] = useState<SignupForm>(() => ({ ...initialForm, country: detectBrowserCountryCode(initialForm.country) }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gateways, setGateways] = useState<any[]>([]);
  const [gatewaysLoading, setGatewaysLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState('stripe');
  const [availability, setAvailability] = useState<{ emailAvailable?: boolean; phoneAvailable?: boolean; message?: string; normalizedPhone?: string; existingAccountName?: string; existingAccountEmail?: string; existingAccountAvatar?: string }>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [pendingOtp, setPendingOtp] = useState<any>(null);
  const [pendingPromoProvider, setPendingPromoProvider] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const selectedCountry = useMemo(() => countryByCode(form.country), [form.country]);
  const normalizedEmail = form.email.trim().toLowerCase();
  const paymentGateways = gateways.length > 0 ? gateways : fallbackGateways;

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
    let active = true;
    setGatewaysLoading(true);
    fetchSignupPaymentGatewaysWithApi()
      .then((items) => {
        if (!active) return;
        const nextGateways = (items || []).filter((item) => item?.provider);
        setGateways(nextGateways);
        if (nextGateways[0]?.provider) setSelectedGateway(nextGateways[0].provider);
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
        ) : (
          <div className="mt-7 w-full space-y-5">
            <button type="button" onClick={() => setStep('details')} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#2563ff]">
              <ArrowLeft className="h-4 w-4" />
              Back to account details
            </button>

            <div className="rounded-[24px] border border-[#dfe7ff] bg-[#f7faff] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-[#2563ff] text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2563ff]">Free credit</p>
                  <h2 className="mt-1 text-[23px] font-semibold leading-tight text-black">Verify payment method</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-[13px] font-medium leading-5 text-[#4b5563]">
                <div className="flex gap-3 rounded-[18px] bg-white p-3">
                  <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-[#2563ff]" />
                  <span className="min-w-0 break-words">$1 is held to verify your payment method, then returned.</span>
                </div>
                <div className="flex gap-3 rounded-[18px] bg-white p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16a34a]" />
                  <span className="min-w-0 break-words">$100 credit is added for 30 days after payment verification.</span>
                </div>
                <div className="flex gap-3 rounded-[18px] bg-white p-3">
                  <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-[#111]" />
                  <span className="min-w-0 break-words">After credit ends, services need active credit to keep running.</span>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#e5e7eb] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-black">Payment method</p>
                {gatewaysLoading && <span className="text-[11px] font-medium text-[#777]">Loading...</span>}
              </div>
              <div className="grid gap-2">
                {paymentGateways.map((gateway) => {
                  const provider = String(gateway.provider || gateway.key || '').toLowerCase();
                  const active = selectedGateway === provider;
                  return (
                    <button
                      key={gateway.id || provider}
                      type="button"
                      onClick={() => setSelectedGateway(provider)}
                      className={`flex min-h-[54px] items-center gap-3 rounded-[18px] border px-4 text-left transition ${
                        active ? 'border-[#2563ff] bg-[#f3f7ff]' : 'border-[#e5e7eb] bg-white hover:border-[#bfd2ff]'
                      }`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${active ? 'border-[#2563ff] bg-[#2563ff]' : 'border-[#d8d8d8] bg-white'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-white' : 'bg-[#d8d8d8]'}`} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-black">{gateway.name || provider}</span>
                        <span className="block truncate text-[12px] font-medium text-[#666]">{provider.toUpperCase()}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <AuthError message={error} />}

            <div className="space-y-3">
              <TiwloAuthButton type="button" disabled={isLoading || !selectedGateway} onClick={() => createAccount({ promo: true })} className="bg-[#2563ff] hover:bg-[#174ee8]">
                {isLoading ? 'Starting...' : 'Verify and get $100'}
              </TiwloAuthButton>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => createAccount({ promo: false })}
                className="h-[52px] w-full rounded-[22px] border border-[#d8d8d8] bg-white px-5 text-[14px] font-semibold text-black transition hover:border-[#111] disabled:cursor-not-allowed disabled:opacity-55"
              >
                No, just sign up
              </button>
            </div>
          </div>
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
