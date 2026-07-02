import React from 'react';
import { AlertCircle, ArrowLeft, Mail, MessageCircle, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  resendPasswordResetOtpWithApi,
  startPasswordResetOtpWithApi,
  verifyPasswordResetOtpWithApi
} from '../lib/tiwloApi';
import { COUNTRIES, countryByCode, detectBrowserCountryCode, normalizePhoneForCountry } from '../lib/countries';
import { TiwloAuthButton, TiwloAuthInput, TiwloAuthLogo, TiwloAuthShell } from '../components/TiwloAuth';

type RecoveryMode = 'email' | 'phone';
type RecoveryChannel = 'email' | 'whatsapp';

type PasswordResetChallenge = {
  challengeId: string;
  channel: RecoveryChannel;
  destination: string;
  expiresAt: string;
  resendAvailableAt: string;
  message: string;
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<RecoveryMode>('email');
  const [email, setEmail] = React.useState('');
  const [country, setCountry] = React.useState(() => detectBrowserCountryCode('BD'));
  const [phone, setPhone] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [challenge, setChallenge] = React.useState<PasswordResetChallenge | null>(null);
  const [otp, setOtp] = React.useState('');
  const [resending, setResending] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());
  const [error, setError] = React.useState('');
  const selectedCountry = countryByCode(country);
  const normalizedPhone = normalizePhoneForCountry(country, phone);

  React.useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const resetInput = () => {
    if (mode === 'email') {
      const nextEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error('Enter a valid email address.');
      return { email: nextEmail, identifier: nextEmail };
    }
    if (!normalizedPhone.localDigits) throw new Error('Enter your mobile number.');
    return {
      identifier: normalizedPhone.e164,
      phone: normalizedPhone.localDigits,
      mobileCountryCode: selectedCountry.dialCode,
      country: selectedCountry.code
    };
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const next = await startPasswordResetOtpWithApi(resetInput());
      setChallenge(next);
      setOtp('');
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to send the ${mode === 'email' ? 'email' : 'WhatsApp'} code.`);
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError(`Enter the 6 digit ${challenge.channel === 'email' ? 'email' : 'WhatsApp'} code.`);
      return;
    }

    setSending(true);
    setError('');
    try {
      const result = await verifyPasswordResetOtpWithApi(challenge.challengeId, otp.trim());
      navigate(`/reset-password?token=${encodeURIComponent(result.resetToken)}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to verify the ${challenge.channel === 'email' ? 'email' : 'WhatsApp'} code.`);
    } finally {
      setSending(false);
    }
  };

  const resendOtp = async () => {
    if (!challenge) return;
    setResending(true);
    setError('');
    try {
      const next = await resendPasswordResetOtpWithApi(challenge.challengeId);
      setChallenge(next);
      setOtp('');
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to resend the ${challenge.channel === 'email' ? 'email' : 'WhatsApp'} code.`);
    } finally {
      setResending(false);
    }
  };

  const resendSeconds = challenge
    ? Math.max(0, Math.ceil((new Date(challenge.resendAvailableAt).getTime() - now) / 1000))
    : 0;

  return (
    <TiwloAuthShell>
      <TiwloAuthLogo />
      <section className="w-full">
        <h1 className="text-center text-[30px] font-semibold tracking-normal">Reset password</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-center text-[14px] leading-6 text-[#555]">
          Email sends the code to your inbox. Mobile sends it to your matched WhatsApp number.
        </p>

        {challenge ? (
          <form onSubmit={verifyOtp} className="mt-8 space-y-5">
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-5 py-5 text-center">
              {challenge.channel === 'email'
                ? <Mail className="mx-auto h-8 w-8 text-emerald-600" />
                : <MessageCircle className="mx-auto h-8 w-8 text-emerald-600" />}
              <p className="mt-3 text-[15px] font-semibold text-emerald-900">{challenge.channel === 'email' ? 'Email code sent' : 'WhatsApp code sent'}</p>
              <p className="mt-1 text-[13px] leading-5 text-emerald-700">Enter the code sent to {challenge.destination}.</p>
            </div>

            <TiwloAuthInput
              label={`6 digit ${challenge.channel === 'email' ? 'email' : 'WhatsApp'} code`}
              value={otp}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />

            {error && <AuthError message={error} />}
            <TiwloAuthButton disabled={sending || otp.length !== 6}>{sending ? 'Verifying...' : 'Verify code'}</TiwloAuthButton>

            <div className="flex items-center justify-between gap-3 text-[13px] font-semibold">
              <button type="button" onClick={() => { setChallenge(null); setOtp(''); setError(''); }} className="text-[#555] hover:text-[#111] hover:underline">
                Change account
              </button>
              <button type="button" onClick={resendOtp} disabled={resending || resendSeconds > 0} className="inline-flex items-center gap-1.5 text-[#2563ff] hover:underline disabled:cursor-not-allowed disabled:text-[#999] disabled:no-underline">
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : resending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <div className="grid grid-cols-2 rounded-[22px] border border-[#d8d8d8] p-1 text-[13px] font-semibold">
              <button type="button" onClick={() => { setMode('email'); setError(''); }} className={`rounded-[18px] py-2.5 ${mode === 'email' ? 'bg-[#111] text-white' : 'text-[#555]'}`}>Email</button>
              <button type="button" onClick={() => { setMode('phone'); setError(''); }} className={`rounded-[18px] py-2.5 ${mode === 'phone' ? 'bg-[#111] text-white' : 'text-[#555]'}`}>Mobile</button>
            </div>

            {mode === 'email' ? (
              <TiwloAuthInput label="Email address" value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
            ) : (
              <label className="relative block">
                <span className="absolute -top-2 left-5 z-10 bg-white px-1 text-[12px] font-medium text-[#2563ff]">Mobile number</span>
                <div className="grid grid-cols-[112px_1fr] overflow-hidden rounded-[22px] border border-[#d8d8d8] bg-white focus-within:border-[#2563ff]">
                  <select value={country} onChange={(event) => setCountry(event.target.value)} className="border-r border-[#dedede] bg-white px-2 text-[13px] font-semibold outline-none">
                    {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.dialCode}</option>)}
                  </select>
                  <input value={phone} type="tel" onChange={(event) => setPhone(event.target.value)} className="h-[54px] px-4 text-[15px] font-medium outline-none" placeholder={selectedCountry.code === 'BD' ? '01712345678' : 'Mobile number'} />
                </div>
                {normalizedPhone.localDigits && <p className="mt-1 text-[12px] font-medium text-[#128c7e]">We will match {normalizedPhone.e164}.</p>}
              </label>
            )}

            {error && <AuthError message={error} />}
            <TiwloAuthButton disabled={sending}>{sending ? 'Sending...' : mode === 'email' ? 'Send email code' : 'Send WhatsApp code'}</TiwloAuthButton>
          </form>
        )}

        <Link to="/login" className="mt-8 flex items-center justify-center gap-2 text-[14px] font-medium text-[#2563ff] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
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
