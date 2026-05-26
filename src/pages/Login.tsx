import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { loginWithApi } from '../lib/tiwloApi';
import BrandLogo from '../components/BrandLogo';
import AuthCard, { AuthShell, authInputClass } from '../components/AuthCard';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      const result = await loginWithApi(email, password);
      onLogin(result.user);
    } catch (err) {
      setError('Incorrect credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Welcome Back!"
        logo={(
          <button type="button" onClick={() => window.location.href = '/'} aria-label="Go to Tiwlo home">
            <BrandLogo className="h-14 w-40" />
          </button>
        )}
        footer={(
          <p>
            Don't have an account?
            <Link to="/signup" className="ml-1 font-normal text-[#1778f2] hover:underline">Sign up now</Link>
          </p>
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <label htmlFor="email" className="mb-1 block">Email</label>
            <input
              required
              id="email"
              type="text"
              value={email}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className={authInputClass()}
              placeholder="Enter your email"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label htmlFor="password" className="mb-1 block">Password</label>
            <input
              required
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className={authInputClass()}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Incorrect credentials</span>
            </div>
          )}

          <button
            disabled={isLoggingIn}
            className="my-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-[#212121] px-4 py-3 text-sm text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] transition hover:bg-[#313131] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoggingIn ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Sign In'}
          </button>
        </form>

        <Link to="/forgot-password" className="-mt-5 self-end text-[#1778f2] hover:underline">Forgot Password</Link>
      </AuthCard>
    </AuthShell>
  );
}
