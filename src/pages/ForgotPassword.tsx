import React from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { requestPasswordResetWithApi } from '../lib/tiwloApi';
import { COUNTRIES, countryByCode, detectBrowserCountryCode, normalizePhoneForCountry } from '../lib/countries';
import { TiwloAuthButton, TiwloAuthInput, TiwloAuthLogo, TiwloAuthShell } from '../components/TiwloAuth';

type RecoveryMode = 'email' | 'phone';

export default function ForgotPassword() {
  const [mode, setMode] = React.useState<RecoveryMode>('email');
  const [email, setEmail] = React.useState('');
  const [country, setCountry] = React.useState(() => detectBrowserCountryCode('BD'));
  const [phone, setPhone] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState('');
  const selectedCountry = countryByCode(country);
  const normalizedPhone = normalizePhoneForCountry(country, phone);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      if (mode === 'email') {
        const nextEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error('Enter a valid email address.');
        await requestPasswordResetWithApi({ email: nextEmail, identifier: nextEmail });
      } else {
        if (!normalizedPhone.localDigits) throw new Error('Enter your mobile number.');
        await requestPasswordResetWithApi({
          identifier: normalizedPhone.e164,
          phone: normalizedPhone.localDigits,
          mobileCountryCode: selectedCountry.dialCode,
          country: selectedCountry.code
        });
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset instructions.');
    } finally {
      setSending(false);
    }
  };

  return (
    <TiwloAuthShell>
      <TiwloAuthLogo />
      <section className="w-full">
        <h1 className="text-center text-[30px] font-semibold tracking-normal">Reset password</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-center text-[14px] leading-6 text-[#555]">
          Choose email or mobile. We will send a secure reset link if the account exists.
        </p>

        {sent ? (
          <div className="mt-8 rounded-[22px] border border-emerald-100 bg-emerald-50 px-5 py-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-3 text-[15px] font-semibold text-emerald-900">Reset link sent successfully.</p>
            <p className="mt-1 text-[13px] leading-5 text-emerald-700">Check your inbox or WhatsApp.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <div className="grid grid-cols-2 rounded-[22px] border border-[#d8d8d8] p-1 text-[13px] font-semibold">
              <button type="button" onClick={() => setMode('email')} className={`rounded-[18px] py-2.5 ${mode === 'email' ? 'bg-[#111] text-white' : 'text-[#555]'}`}>Email</button>
              <button type="button" onClick={() => setMode('phone')} className={`rounded-[18px] py-2.5 ${mode === 'phone' ? 'bg-[#111] text-white' : 'text-[#555]'}`}>Mobile</button>
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
            <TiwloAuthButton disabled={sending}>{sending ? 'Sending...' : 'Send reset link'}</TiwloAuthButton>
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
