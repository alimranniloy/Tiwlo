import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { loginWithApi } from '../lib/tiwloApi';
import BrandLogo from '../components/BrandLogo';

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
    <div className="min-h-screen bg-[#f3f5f9] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="cursor-pointer"
            aria-label="Go to Tiwlo home"
          >
             <BrandLogo className="h-14 w-40" />
          </button>
        </div>

        <div className="bg-white p-10 rounded-sm border border-gray-100 shadow-2xl shadow-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-lg font-bold text-[#2e3d49]">Sign in to your account</h2>
            <p className="text-[13px] text-gray-500 mt-1">Manage your virtual machine instances.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Email Address</label>
                <input
                  required
                  type="text"
                  value={email}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-white border border-gray-200 rounded-sm px-4 py-3 text-[14px] focus:outline-none focus:border-blue-600 transition-all font-medium"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[12px] font-bold text-[#4a4a4a] uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-[12px] font-bold text-[#0069ff] hover:underline">Forgot?</Link>
                </div>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-white border border-gray-200 rounded-sm px-4 py-3 text-[14px] focus:outline-none focus:border-blue-600 transition-all font-medium"
                  placeholder="Your password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Incorrect credentials</span>
              </div>
            )}

            <button
              disabled={isLoggingIn}
              className="w-full bg-gray-900 text-white py-4 rounded-sm font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-70 flex items-center justify-center shadow-lg shadow-gray-100"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-[13px]">
            <p className="text-gray-500">
              Not a member?{' '}
              <Link to="/signup" className="text-[#0069ff] font-bold hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
