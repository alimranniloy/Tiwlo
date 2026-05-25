import { AlertTriangle, LifeBuoy, LogOut, ShieldOff } from 'lucide-react';
import { User } from '../types';

interface BannedAccountProps {
  user: User;
  onLogout: () => void;
}

function statusTitle(status?: string) {
  const value = String(status || 'restricted').toLowerCase();
  if (value === 'banned' || value === 'blocked') return 'Account Banned';
  if (value === 'suspended') return 'Account Suspended';
  if (value === 'disabled') return 'Account Disabled';
  return 'Account Restricted';
}

export default function BannedAccount({ user, onLogout }: BannedAccountProps) {
  return (
    <div className="min-h-screen bg-[#f3f5f9] px-3 py-5 text-[#2e3d49] sm:px-4 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-4xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-lg border border-red-100 bg-white">
          <div className="border-b border-red-100 bg-red-50 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-red-600 text-white">
                  <ShieldOff className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">Access Denied</p>
                  <h1 className="text-xl font-black tracking-tight text-[#2e3d49]">{statusTitle(user.status)}</h1>
                </div>
              </div>
              <div className="rounded border border-red-200 bg-white/80 px-3 py-2 text-[11px] font-black uppercase text-red-700">
                {user.status || 'restricted'}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:space-y-6 sm:p-8">
            <div className="rounded border border-[#e5e8ed] bg-[#f8f9fa] p-5">
              <div className="mb-3 flex items-center gap-2 text-[#111827]">
                <ShieldOff className="h-6 w-6" />
                <p className="text-sm font-black">Dashboard is locked</p>
              </div>
              <p className="text-[13px] font-medium leading-6 text-[#4a4a4a]">
                This account cannot access the Tiwlo dashboard right now. Your login is valid, but dashboard,
                billing, cloud, store, and ISP tools are locked until an administrator restores access.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-[#e5e8ed] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Account</p>
                <p className="mt-1 break-all text-[13px] font-bold text-[#2e3d49]">{user.email}</p>
              </div>
              <div className="rounded border border-[#e5e8ed] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</p>
                <p className="mt-1 text-[13px] font-bold uppercase text-red-600">{user.status || 'restricted'}</p>
              </div>
              <div className="rounded border border-[#e5e8ed] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">User ID</p>
                <p className="mt-1 break-all text-[13px] font-bold text-[#2e3d49]">{user.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded border border-amber-100 bg-amber-50 p-4 text-amber-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-[13px] font-bold">
                If this is a mistake, contact support or your platform administrator with the account email above.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#f3f5f9] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <a
                href="mailto:support@tiwlo.app"
                className="flex w-full items-center justify-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2.5 text-[13px] font-bold text-[#4a4a4a] hover:bg-[#f3f5f9] sm:w-auto"
              >
                <LifeBuoy className="h-4 w-4" /> Contact Support
              </a>
              <button
                onClick={onLogout}
                className="flex w-full items-center justify-center gap-2 rounded bg-[#111827] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-black sm:w-auto"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
