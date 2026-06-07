import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Gift } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserType } from '../types';
import {
  changeSignupWhatsAppPhoneWithApi,
  checkSignupAvailabilityWithApi,
  clearAuthToken,
  fetchSignupPaymentGatewaysWithApi,
  fetchSignupCreditPolicyWithApi,
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
import { DuplicateEmailCard, SignupAuthError } from '../components/signup/SignupAuthBits';
import SignupPromoVerification from '../components/signup/SignupPromoVerification';
import SignupWhatsAppOtpStep from '../components/signup/SignupWhatsAppOtpStep';
import { orderedSignupPromoGateways, promoGateways, providerOf, visibleSignupPromoGateways } from '../components/signup/signupPromoUtils';

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
const signupDraftKey = 'tiwlo_signup_draft_v2';
const defaultCreditPolicy = {
  creditSystemEnabled: true,
  signupPromoCredit: 100,
  signupPromoRequiresPayment: true,
  signupPromoHoldAmount: 1
};

const moneyText = (value: number) => `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

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
  const [creditPolicy, setCreditPolicy] = useState(defaultCreditPolicy);
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
  const paymentGateways = useMemo(() => visibleSignupPromoGateways(gateways), [gateways]);
  const promoEnabled = creditPolicy.creditSystemEnabled && Number(creditPolicy.signupPromoCredit || 0) > 0;
  const promoRequiresPayment = promoEnabled && creditPolicy.signupPromoRequiresPayment !== false;
  const signupCreditLabel = moneyText(creditPolicy.signupPromoCredit);

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
    fetchSignupCreditPolicyWithApi()
      .then((policy) => {
        if (active && policy) setCreditPolicy({ ...defaultCreditPolicy, ...policy });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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
          const ordered = orderedSignupPromoGateways(nextPromoGateways);
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
    if (promoRequiresPayment) {
      setStep('promo');
      return;
    }
    await createAccount({ promo: promoEnabled });
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
    const provider = promo && promoRequiresPayment ? selectedGateway : '';

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

  const signOutSignup = () => {
    clearSignupDraft();
    clearAuthToken();
    localStorage.removeItem('tiwlo_user');
    setForm({ ...initialForm, country: detectBrowserCountryCode(initialForm.country) });
    setPendingOtp(null);
    setPendingPromoProvider('');
    setOtp('');
    setOtpError('');
    setError('');
    setStep('email');
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
      <SignupWhatsAppOtpStep
        pendingOtp={pendingOtp}
        country={form.country}
        phone={form.phone}
        otp={otp}
        otpError={otpError}
        otpLoading={otpLoading}
        resendSeconds={resendSeconds}
        pendingPromoProvider={pendingPromoProvider}
        onOtpChange={(value) => {
          setOtp(value);
          setOtpError('');
        }}
        onCountryChange={(value) => setValue('country', value)}
        onPhoneChange={(value) => setValue('phone', value)}
        onSubmit={verifyOtp}
        onResend={resendOtp}
        onChangePhone={changeOtpPhone}
        onSignOut={signOutSignup}
      />
    );
  }

  if (step === 'promo') {
    return (
      <SignupPromoVerification
        gateways={paymentGateways}
        gatewaysLoading={gatewaysLoading}
        selectedGateway={selectedGateway}
        isLoading={isLoading}
        error={error}
        topActionLabel="Back to account details"
        onTopAction={() => setStep('details')}
        onSelectGateway={setSelectedGateway}
        creditAmount={creditPolicy.signupPromoCredit}
        holdAmount={creditPolicy.signupPromoHoldAmount}
        requiresPayment={promoRequiresPayment}
        onVerify={() => createAccount({ promo: true })}
        onSkip={() => createAccount({ promo: false })}
      />
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
              {promoEnabled && (
                <div className="flex items-center gap-2 rounded-[12px] border border-[#e4ebf7] bg-[#f7faff] px-2.5 py-1.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[#edf4ff] text-[#0069ff]">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-nowrap text-[10.5px] font-black leading-4 text-[#071024]">Get {signupCreditLabel} free credit for new users</p>
                    <p className="whitespace-nowrap text-[10px] font-medium leading-3 text-[#334155]">
                      {promoRequiresPayment ? 'No charges upfront. Cancel anytime.' : 'No payment verification required.'}
                    </p>
                  </div>
                </div>
              )}
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
              {error && availability.emailAvailable !== false && <SignupAuthError message={error} />}
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

            {error && <SignupAuthError message={error} />}
            <TiwloAuthButton disabled={isLoading || availability.phoneAvailable === false}>
              Continue
            </TiwloAuthButton>
          </form>
        ) : null}
      </section>
    </TiwloAuthShell>
  );
}
