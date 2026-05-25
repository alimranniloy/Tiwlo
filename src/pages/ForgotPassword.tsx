import React from 'react';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { requestPasswordResetWithApi } from '../lib/tiwloApi';

export default function ForgotPassword() {
  const [email, setEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await requestPasswordResetWithApi(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9] p-6">
      <div className="w-full max-w-sm rounded border border-gray-100 bg-white p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <BrandLogo className="h-12 w-36" />
          <h1 className="text-lg font-black text-[#2e3d49]">Reset password</h1>
        </div>
        {sent ? (
          <div className="rounded border border-emerald-100 bg-emerald-50 p-4 text-[13px] font-bold leading-6 text-emerald-700">
            <CheckCircle2 className="mb-2 h-5 w-5" />
            If an account exists for that email, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4a4a4a]">Email Address</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded border border-gray-200 px-4 py-3 pl-10 text-sm outline-none focus:border-blue-600" placeholder="you@example.com" />
              </div>
            </label>
            {error && <div className="flex gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>}
            <button disabled={sending} className="w-full rounded bg-gray-900 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-black disabled:opacity-60">
              {sending ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <Link to="/login" className="mt-6 block text-center text-[13px] font-bold text-[#0069ff] hover:underline">Back to sign in</Link>
      </div>
    </div>
  );
}
