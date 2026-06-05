import { AlertCircle } from 'lucide-react';

export function SignupAuthError({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-[14px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold leading-5 text-red-600 ${className}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function DuplicateEmailCard({ email, name, avatar }: { email: string; name?: string; avatar?: string }) {
  const label = name || email.split('@')[0] || 'Existing account';
  const initial = label.charAt(0).toUpperCase();
  return (
    <div className="rounded-[18px] border border-[#dfe6f2] bg-[#fbfdff] px-3 py-3">
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt={label} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e9f1ff] text-[15px] font-bold text-[#2563ff]">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-black">{label}</p>
          <p className="truncate text-[12px] text-[#666]">{email}</p>
        </div>
      </div>
      <p className="mt-2 text-[12px] font-medium leading-5 text-[#555]">
        This email already has a Tiwlo account. Continue to login and enter your password.
      </p>
    </div>
  );
}
