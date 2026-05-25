import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { User } from '../types';
import { verifyEmailWithApi } from '../lib/tiwloApi';

type VerifyEmailProps = {
  onLogin: (user: User) => void;
};

export default function VerifyEmail({ onLogin }: VerifyEmailProps) {
  const [params] = useSearchParams();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState('Verifying your email...');
  const token = params.get('token') || '';

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }
    verifyEmailWithApi(token)
      .then((result) => {
        onLogin(result.user);
        setStatus('success');
        setMessage('Your email is verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Unable to verify email.');
      });
  }, [onLogin, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9] p-6">
      <div className="w-full max-w-sm rounded border border-gray-100 bg-white p-8 text-center">
        <BrandLogo className="mx-auto mb-6 h-12 w-36" />
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {status === 'error' ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className={`h-6 w-6 ${status === 'loading' ? 'animate-pulse' : ''}`} />}
        </div>
        <h1 className="text-lg font-black text-[#2e3d49]">{status === 'error' ? 'Verification failed' : 'Email verification'}</h1>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[#6B7280]">{message}</p>
        <Link to="/" className="mt-6 inline-flex rounded bg-gray-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-black">
          Continue
        </Link>
      </div>
    </div>
  );
}
