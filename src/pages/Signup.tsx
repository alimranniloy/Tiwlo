import React, { useState } from 'react';
import { Mail, Lock, User, UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User as UserType } from '../types';
import { signupWithApi } from '../lib/tiwloApi';

interface SignupProps {
  onSignup: (user: UserType) => void;
}

export default function SignupPage({ onSignup }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signupWithApi(name, email, password);
      onSignup(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md space-y-6 md:space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div 
            onClick={() => window.location.href = '/'}
            className="w-12 h-12 bg-gray-900 rounded-sm flex items-center justify-center text-white font-black text-2xl italic cursor-pointer shadow-xl shadow-gray-200"
          >
             T
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Tiwlo Cloud</h1>
        </div>

        <div className="bg-white p-10 rounded-sm border border-gray-100 shadow-2xl shadow-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-900"></div>
          
          <div className="mb-6 md:mb-8 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#2e3d49]">Get Started</h2>
            <p className="text-sm text-gray-500 mt-2">Create your cloud infrastructure account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div className="space-y-3 md:space-y-4">
              <div className="relative group">
                <label className="block text-[10px] md:text-xs font-bold text-[#4a4a4a] uppercase tracking-wider mb-1.5 md:mb-2 ml-1">Full Name</label>
                <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 group-focus-within:text-[#0069ff] transition-colors" />
                   <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    placeholder="John Doe"
                    className="w-full bg-white border border-gray-200 rounded-sm px-4 py-3 md:py-3.5 pl-12 focus:outline-none focus:border-blue-600 transition-all font-medium text-sm md:text-base cursor-text"
                   />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[10px] md:text-xs font-bold text-[#4a4a4a] uppercase tracking-wider mb-1.5 md:mb-2 ml-1">Email Address</label>
                <div className="relative">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                   <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="you@example.com"
                    className="w-full bg-white border border-gray-200 rounded-sm px-4 py-3 md:py-3.5 pl-12 focus:outline-none focus:border-blue-600 transition-all font-medium text-sm md:text-base cursor-text"
                   />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[10px] md:text-xs font-bold text-[#4a4a4a] uppercase tracking-wider mb-1.5 md:mb-2 ml-1">Password</label>
                <div className="relative">
                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                   <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Create a password"
                    className="w-full bg-white border border-gray-200 rounded-sm px-4 py-3 md:py-3.5 pl-12 focus:outline-none focus:border-blue-600 transition-all font-medium text-sm md:text-base cursor-text"
                   />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 px-1 py-1">
               <div className="mt-0.5 shrink-0">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
               </div>
               <p className="text-[10px] md:text-[11px] text-gray-500 leading-relaxed">By signing up, you agree to our Terms and Privacy Policy. No credit card required to start.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              disabled={isLoading}
              className="w-full bg-gray-900 text-white py-4 rounded-sm font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 group disabled:opacity-70 shadow-xl shadow-gray-100"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Create Account <UserPlus className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[#e5e8ed] pt-6">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0069ff] font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
