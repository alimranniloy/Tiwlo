import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import type { StoreCustomerDashboard } from '../../../lib/tiwloApi';

interface AuthProps {
  dashboard: StoreCustomerDashboard | null;
  mode: 'login' | 'register';
  error: string;
  busy: boolean;
  onSwitch: () => void;
  onSubmit: (input: Record<string, any>) => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({ dashboard, mode, error, busy, onSwitch, onSubmit }) => {
  const accent = dashboard?.settings?.accentColor || '#FF6600';
  const brandName = dashboard?.settings?.logoText || dashboard?.store?.name || 'Store Account';
  const initial = String(brandName).charAt(0).toLowerCase() || 's';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ email, password, name, phone, address });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-10 md:py-20 px-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="w-10 h-10 rounded-sm flex items-center justify-center" style={{ backgroundColor: accent }}>
          <span className="text-white font-bold text-2xl">{initial}</span>
        </div>
        <h1 className="text-2xl font-bold text-[#333]">{brandName}</h1>
      </div>

      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px] bg-white border border-[#DDD] p-6 md:p-10 rounded-sm shadow-none"
      >
        <h2 className="text-xl font-medium mb-2 text-[#333]">
          {mode === 'login' ? 'Sign In' : 'Create Your Account'}
        </h2>
        <p className="mb-6 text-xs text-[#888]">This login is scoped only to {dashboard?.store?.name || 'this store'}.</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <Field icon={<User className="w-4 h-4 text-[#999]" />} label="Full Name">
                  <input type="text" required placeholder="Your full name" className="w-full pl-10 pr-3 py-2 border border-[#DDD] focus:outline-none rounded-sm text-sm" value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
                <Field icon={<Phone className="w-4 h-4 text-[#999]" />} label="Phone Number">
                  <input type="tel" placeholder="+1 (555) 000-0000" className="w-full pl-10 pr-3 py-2 border border-[#DDD] focus:outline-none rounded-sm text-sm" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </Field>
                <Field icon={<MapPin className="w-4 h-4 text-[#999]" />} label="Shipping Address">
                  <input type="text" placeholder="Street, City, State, ZIP" className="w-full pl-10 pr-3 py-2 border border-[#DDD] focus:outline-none rounded-sm text-sm" value={address} onChange={(event) => setAddress(event.target.value)} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <Field icon={<Mail className="w-4 h-4 text-[#999]" />} label="Email Address">
            <input type="email" required placeholder="you@example.com" className="w-full pl-10 pr-3 py-2 border border-[#DDD] focus:outline-none rounded-sm text-sm" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>

          <Field icon={<Lock className="w-4 h-4 text-[#999]" />} label="Password">
            <input type="password" required minLength={6} placeholder="Password" className="w-full pl-10 pr-3 py-2 border border-[#DDD] focus:outline-none rounded-sm text-sm" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="w-full text-white py-2.5 rounded-sm font-bold text-sm transition-colors mt-2 disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Join Now'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#666]">
            {mode === 'login' ? 'New customer?' : 'Already a member?'}
            <button onClick={onSwitch} className="ml-2 hover:underline font-bold" style={{ color: accent }}>
              {mode === 'login' ? 'Register Now' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[#666]">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </div>
    </div>
  );
}
