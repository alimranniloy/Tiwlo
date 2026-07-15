import React from 'react';
import { LogOut, MailCheck, RefreshCw } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { fetchCurrentUserWithApi, resendEmailVerificationWithApi } from '../lib/api/auth';
import type { User } from '../types';

type Props = {
  user: User;
  setUser: (user: User) => void;
  onLogout: () => void;
};

export default function EmailVerificationRequired({ user, setUser, onLogout }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const refresh = async () => {
    setBusy(true);
    setMessage('');
    try {
      const updated = await fetchCurrentUserWithApi();
      if (updated) {
        setUser(updated);
        localStorage.setItem('tiwlo_user', JSON.stringify(updated));
        if (!updated.emailVerifiedAt) setMessage('Email is not verified yet. Open the link in your inbox first.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to refresh account status.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setMessage('');
    try {
      await resendEmailVerificationWithApi();
      setMessage('A new verification email was sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resend the verification email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-[#101828]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <section className="w-full rounded-xl border border-[#e4e7ec] bg-white p-6 text-center sm:p-9">
          <div className="mb-7 flex items-center justify-between">
            <BrandLogo className="h-10 w-28" />
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-md border border-[#d0d5dd] px-3 py-2 text-xs font-bold text-[#475467]">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eaf4ff] text-[#0069ff]">
            <MailCheck className="h-10 w-10" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Verify your email</h1>
          <p className="mt-3 text-sm leading-6 text-[#475467]">
            A verification link was sent to <strong>{user.email}</strong>. Social-app accounts must verify their email before opening Tiwlo or completing billing information.
          </p>
          {message && <p className="mt-4 rounded-md bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#475467]">{message}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button disabled={busy} onClick={resend} className="rounded-md border border-[#d0d5dd] bg-white px-4 py-3 text-sm font-bold disabled:opacity-60">Resend email</button>
            <button disabled={busy} onClick={refresh} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0069ff] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> I verified, refresh
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
