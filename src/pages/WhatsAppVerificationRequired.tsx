import React from 'react';
import { AlertCircle, CheckCircle2, LogOut, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { User } from '../types';
import { COUNTRIES, countryByCode, normalizePhoneForCountry, phoneValidationMessage } from '../lib/countries';
import { startWhatsAppVerificationWithApi, verifyWhatsAppOtpWithApi } from '../lib/tiwloApi';

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
      setStatus(next.message || 'A WhatsApp OTP was sent.');
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
    <div className="min-h-screen bg-[#f3f5f9] px-4 py-6 text-[#111827]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center">
        <div className="w-full overflow-hidden rounded-lg border border-[#d9dee7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5e8ed] px-4 py-4 sm:px-5">
            <BrandLogo className="h-10 w-32" />
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-md border border-[#d9dee7] px-3 py-2 text-[11px] font-black text-[#4B5563] hover:bg-[#f8f9fa]">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="mb-4 rounded-lg border border-[#bbf7d0] bg-[#f0fff4] p-4 text-[#14532d]">
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#128c7e] text-white">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black">Verify WhatsApp to continue</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#166534]">A 6 digit OTP will be sent to your selected number.</p>
                </div>
              </div>
            </div>

            {status && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-[12px] font-bold leading-5 text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>OTP sent successfully. Check WhatsApp and enter the code below.</span>
              </div>
            )}
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold leading-5 text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={verify} className="space-y-4">
              <div className="grid grid-cols-[112px_1fr] overflow-hidden rounded-md border border-[#D1D5DB] bg-white focus-within:border-[#128c7e]">
                <select value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} className="border-r border-[#D1D5DB] bg-gray-50 px-2 py-3 text-xs font-black outline-none">
                  {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.dialCode}</option>)}
                </select>
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="WhatsApp mobile number" className="px-4 py-3 text-sm outline-none" />
              </div>
              {normalizedPhone.localDigits && (
                <div className="flex items-start gap-2 rounded-md bg-[#F8FAFC] px-3 py-2 text-[11px] font-bold leading-4 text-[#4B5563]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#128c7e]" />
                  <span>We will verify {normalizedPhone.e164}.</span>
                </div>
              )}

              {challenge && (
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full rounded-md border border-[#D1D5DB] px-4 py-4 text-center text-2xl font-black tracking-[0.28em] outline-none focus:border-[#128c7e]"
                />
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button disabled={loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#128c7e] px-5 py-3 text-sm font-black text-white hover:bg-[#0f756a] disabled:opacity-60">
                  {challenge ? <CheckCircle2 className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                  {loading ? 'Working...' : challenge ? 'Verify WhatsApp' : 'Send WhatsApp OTP'}
                </button>
                {challenge && (
                  <button type="button" onClick={start} disabled={loading || resendSeconds > 0} className="inline-flex items-center justify-center gap-2 rounded-md border border-[#D1D5DB] px-5 py-3 text-sm font-black text-[#374151] disabled:opacity-50">
                    <RefreshCw className="h-4 w-4" /> {resendSeconds > 0 ? `Resend ${resendSeconds}s` : 'Resend'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
