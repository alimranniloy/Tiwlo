import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { User } from '../types';
import { resetPasswordWithApi } from '../lib/tiwloApi';

type ResetPasswordProps = {
  onLogin: (user: User) => void;
};

export default function ResetPassword({ onLogin }: ResetPasswordProps) {
  const [params] = useSearchParams();
  const [password, setPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const token = params.get('token') || '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await resetPasswordWithApi(token, password);
      onLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9] p-6">
      <div className="w-full max-w-sm rounded border border-gray-100 bg-white p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <BrandLogo className="h-12 w-36" />
          <h1 className="text-lg font-black text-[#2e3d49]">Choose new password</h1>
        </div>
        {!token ? (
          <div className="rounded border border-red-100 bg-red-50 p-4 text-[13px] font-bold text-red-700">Reset token is missing.</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#4a4a4a]">New Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded border border-gray-200 px-4 py-3 pl-10 text-sm outline-none focus:border-blue-600" placeholder="At least 6 characters" />
              </div>
            </label>
            {error && <div className="flex gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>}
            <button disabled={saving} className="w-full rounded bg-gray-900 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        )}
        <Link to="/login" className="mt-6 block text-center text-[13px] font-bold text-[#0069ff] hover:underline">Back to sign in</Link>
      </div>
    </div>
  );
}
