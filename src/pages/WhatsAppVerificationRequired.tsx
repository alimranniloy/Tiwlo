import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { User } from '../types';
import { COUNTRIES, countryByCode, normalizePhoneForCountry, phoneValidationMessage } from '../lib/countries';
import { startWhatsAppVerificationWithApi, verifyWhatsAppOtpWithApi } from '../lib/tiwloApi';
import { TiwloAuthButton, TiwloAuthLogo, TiwloAuthShell } from '../components/TiwloAuth';

type Props = {
  user: User;
  setUser: (user: User) => void;
  onLogout: () => void;
};

export default function WhatsAppVerificationRequired({ user, setUser, onLogout }: Props) {
  const [form, setForm] = React.useState({
    country: user.country || 'BD',
    phone: user.phone || ''
  });
  const [challenge, setChallenge] = React.useState<any>(null);
  const [otp, setOtp] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resendSeconds, setResendSeconds] = React.useState(0);
  const selectedCountry = countryByCode(form.country);
  const normalizedPhone = normalizePhoneForCountry(form.country, form.phone);

  const start = async () => {
    const phoneError = phoneValidationMessage(form.country, form.phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = await startWhatsAppVerificationWithApi({
        phone: form.phone,
        country: form.country,
        mobileCountryCode: selectedCountry.dialCode
      });
      setChallenge(next);
      setStatus(next.message || 'OTP sent successfully.');
      setOtp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send WhatsApp OTP.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!challenge?.resendAvailableAt) {
      setResendSeconds(0);
      return undefined;
    }
    const tick = () => setResendSeconds(Math.max(0, Math.ceil((new Date(challenge.resendAvailableAt).getTime() - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [challenge?.resendAvailableAt]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge?.challengeId) {
      await start();
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6 digit WhatsApp OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyWhatsAppOtpWithApi(challenge.challengeId, otp);
      setUser(result.user);
      localStorage.setItem('tiwlo_user', JSON.stringify(result.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify WhatsApp OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TiwloAuthShell>
      <div className="mb-2 flex w-full justify-end">
        <button onClick={onLogout} className="h-9 rounded-full border border-[#dedede] bg-white px-4 text-[12px] font-bold text-[#333] transition hover:border-black">
          Sign out
        </button>
      </div>
      <TiwloAuthLogo />
      <section className="w-full">
        <h1 className="text-center text-[28px] font-semibold tracking-normal">Verify WhatsApp</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-center text-[14px] leading-6 text-[#555]">
          Confirm your number to continue using Tiwlo.
        </p>

        {status && (
          <div className="mt-6 flex items-start gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-semibold leading-5 text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status}</span>
          </div>
        )}
        {error && <AuthError message={error} />}

        <form onSubmit={verify} className="mt-6 space-y-5">
          <label className="relative block">
            <span className="absolute -top-2 left-5 z-10 bg-white px-1 text-[12px] font-medium text-[#2563ff]">WhatsApp number</span>
            <div className="grid grid-cols-[112px_1fr] overflow-hidden rounded-[22px] border border-[#d8d8d8] bg-white focus-within:border-[#2563ff]">
              <select value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} className="border-r border-[#dedede] bg-white px-2 text-[13px] font-semibold outline-none">
                {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.dialCode}</option>)}
              </select>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Mobile number" className="h-[54px] px-4 text-[15px] font-medium outline-none" />
            </div>
            {normalizedPhone.localDigits && <p className="mt-1 text-[12px] font-medium text-[#128c7e]">We will verify {normalizedPhone.e164}.</p>}
          </label>

          {challenge && (
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="h-[56px] w-full rounded-[22px] border border-[#d8d8d8] px-5 text-center text-[24px] font-semibold tracking-[0.34em] outline-none focus:border-[#25d366]"
            />
          )}

          <TiwloAuthButton disabled={loading}>{loading ? 'Working...' : challenge ? 'Verify WhatsApp' : 'Send WhatsApp OTP'}</TiwloAuthButton>

          {challenge && (
            <button type="button" onClick={start} disabled={loading || resendSeconds > 0} className="mx-auto flex items-center justify-center gap-2 text-[13px] font-medium text-[#2563ff] disabled:text-[#999]">
              <RefreshCw className="h-4 w-4" />
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
            </button>
          )}
        </form>
      </section>
    </TiwloAuthShell>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div className="mt-6 flex items-start gap-2 rounded-[14px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold leading-5 text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
