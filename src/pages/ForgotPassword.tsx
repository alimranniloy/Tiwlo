import React from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { requestPasswordResetWithApi } from '../lib/tiwloApi';
import { COUNTRIES, countryByCode, detectBrowserCountryCode, normalizePhoneForCountry } from '../lib/countries';

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
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-[#DDE3EA] bg-white">
        <div className="border-b border-[#E8ECF2] px-6 py-5 text-center">
          <BrandLogo className="mx-auto h-12 w-36" />
          <h1 className="mt-4 text-xl font-black text-[#111827]">Reset Password</h1>
          <p className="mt-2 text-sm leading-5 text-[#6B7280]">Choose email or mobile number. We will send secure reset instructions if the account exists.</p>
        </div>

        <div className="p-5 sm:p-6">
          {sent ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black">Reset instructions sent successfully.</p>
                  <p className="mt-1 text-[13px] leading-5 text-emerald-700">Check your email or WhatsApp inbox. The secure reset link expires soon for your account safety.</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[#D1D5DB] bg-[#F8FAFC] p-1 text-xs font-black">
                <button type="button" onClick={() => setMode('email')} className={`rounded px-3 py-2.5 ${mode === 'email' ? 'bg-white text-[#111827]' : 'text-[#6B7280]'}`}>
                  Email
                </button>
                <button type="button" onClick={() => setMode('phone')} className={`rounded px-3 py-2.5 ${mode === 'phone' ? 'bg-white text-[#111827]' : 'text-[#6B7280]'}`}>
                  Mobile
                </button>
              </div>

              {mode === 'email' ? (
                <label className="block space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#4B5563]">Email Address</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-[#D1D5DB] px-4 py-3 pl-10 text-sm outline-none focus:border-[#2563EB]" placeholder="you@example.com" />
                  </div>
                </label>
              ) : (
                <label className="block space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#4B5563]">Mobile Number</span>
                  <div className="grid grid-cols-[116px_1fr] overflow-hidden rounded-md border border-[#D1D5DB] bg-white focus-within:border-[#128c7e]">
                    <select value={country} onChange={(event) => setCountry(event.target.value)} className="border-r border-[#D1D5DB] bg-[#F8FAFC] px-2 py-3 text-xs font-black outline-none" aria-label="Country code">
                      {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.dialCode}</option>)}
                    </select>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full px-4 py-3 pl-10 text-sm outline-none" placeholder={selectedCountry.code === 'BD' ? '01712345678' : 'Mobile number'} />
                    </div>
                  </div>
                  {normalizedPhone.localDigits && (
                    <p className="text-[11px] font-bold text-[#128c7e]">We will match it as {normalizedPhone.e164}.</p>
                  )}
                </label>
              )}

              <div className="flex items-start gap-2 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3 text-[12px] leading-5 text-[#4B5563]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#128c7e]" />
                <span>For privacy, we show the same success message even if the account is not found.</span>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button disabled={sending} className="w-full rounded-md bg-[#111827] py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-black disabled:opacity-60">
                {sending ? 'Sending...' : mode === 'email' ? 'Send Email Link' : 'Send WhatsApp Link'}
              </button>
            </form>
          )}

          <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-[13px] font-bold text-[#0069ff] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
