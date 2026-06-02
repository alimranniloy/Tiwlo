import React, { useState } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { loginWithApi } from '../lib/tiwloApi';
import {
  TiwloAuthButton,
  TiwloAuthDivider,
  TiwloAuthInput,
  TiwloAuthLogo,
  TiwloAuthShell,
  TiwloLegalLinks,
  TiwloSocialButtons
} from '../components/TiwloAuth';

interface LoginProps {
  onLogin: (user: User) => void;
  maintenanceMode?: boolean;
}

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function LoginPage({ onLogin, maintenanceMode = false }: LoginProps) {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const normalizedEmail = email.trim().toLowerCase();

  const continueWithEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setError('');
    setIsLoggingIn(true);
    try {
      const result = await loginWithApi(normalizedEmail, password);
      onLogin(result.user);
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <TiwloAuthShell>
      <TiwloAuthLogo />
      <section className="w-full">
        <h1 className="text-center text-[30px] font-semibold tracking-normal text-black">Welcome back</h1>

        {step === 'email' ? (
          <form onSubmit={continueWithEmail} className="mt-7 space-y-6">
            <TiwloAuthInput
              label="Email address"
              value={email}
              type="email"
              autoComplete="email"
              autoFocus
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
            />
            {error && <AuthError message={error} />}
            <TiwloAuthButton disabled={!validEmail(normalizedEmail)}>Continue</TiwloAuthButton>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <button type="button" onClick={() => setStep('email')} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#2563ff]">
              <ArrowLeft className="h-4 w-4" />
              {normalizedEmail}
            </button>
            <TiwloAuthInput
              label="Password"
              value={password}
              type="password"
              autoComplete="current-password"
              autoFocus
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
            />
            {error && <AuthError message={error} />}
            <TiwloAuthButton disabled={isLoggingIn}>{isLoggingIn ? 'Logging in...' : 'Login'}</TiwloAuthButton>
            <Link to="/forgot-password" className="block text-center text-[14px] font-medium text-[#2563ff] hover:underline">
              Forgot password?
            </Link>
          </form>
        )}

        {!maintenanceMode && (
          <p className="mt-7 text-center text-[15px] font-medium text-black">
            Don't have an account?
            <Link to="/signup" className="ml-1 text-[#2563ff] hover:underline">Sign up</Link>
          </p>
        )}

        <TiwloAuthDivider />
        <TiwloSocialButtons />
        <TiwloLegalLinks />
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
