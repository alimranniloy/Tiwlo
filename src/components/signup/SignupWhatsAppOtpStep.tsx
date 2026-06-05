import type { FormEvent } from 'react';
import { COUNTRIES } from '../../lib/countries';
import { TiwloAuthButton, TiwloAuthLogo, TiwloAuthShell } from '../TiwloAuth';
import { SignupAuthError } from './SignupAuthBits';

type Props = {
  pendingOtp: any;
  country: string;
  phone: string;
  otp: string;
  otpError?: string;
  otpLoading?: boolean;
  resendSeconds: number;
  pendingPromoProvider?: string;
  onOtpChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onResend: () => void;
  onChangePhone: () => void;
  onSignOut: () => void;
};

export default function SignupWhatsAppOtpStep({
  pendingOtp,
  country,
  phone,
  otp,
  otpError = '',
  otpLoading = false,
  resendSeconds,
  pendingPromoProvider = '',
  onOtpChange,
  onCountryChange,
  onPhoneChange,
  onSubmit,
  onResend,
  onChangePhone,
  onSignOut
}: Props) {
  return (
    <TiwloAuthShell>
      <div className="mb-4 flex w-full justify-end">
        <button type="button" onClick={onSignOut} className="h-9 rounded-full border border-[#dedede] bg-white px-4 text-[12px] font-bold text-[#333] transition hover:border-black">
          Sign out
        </button>
      </div>
      <TiwloAuthLogo />
      <section className="w-full">
        <h1 className="text-center text-[28px] font-semibold tracking-normal">Verify WhatsApp</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-center text-[14px] leading-6 text-[#555]">
          We sent a 6 digit code to {pendingOtp.phoneE164 || pendingOtp.phone}.
          {pendingPromoProvider ? ' Payment verification starts after this.' : ''}
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <input
            value={otp}
            onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="h-[56px] w-full rounded-[22px] border border-[#d8d8d8] px-5 text-center text-[24px] font-semibold tracking-[0.34em] outline-none focus:border-[#25d366]"
          />

          <div className="grid grid-cols-[112px_1fr] overflow-hidden rounded-[18px] border border-[#dedede] bg-white">
            <select value={country} onChange={(event) => onCountryChange(event.target.value)} className="border-r border-[#dedede] bg-white px-2 text-[12px] font-semibold outline-none">
              {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.dialCode}</option>)}
            </select>
            <input value={phone} onChange={(event) => onPhoneChange(event.target.value)} placeholder="Change phone number" className="h-[48px] px-4 text-[14px] outline-none" />
          </div>

          {otpError && <SignupAuthError message={otpError} />}

          <TiwloAuthButton disabled={otpLoading}>{otpLoading ? 'Checking...' : 'Verify account'}</TiwloAuthButton>
          <div className="flex items-center justify-center gap-4 text-[13px] font-medium">
            <button type="button" onClick={onResend} disabled={otpLoading || resendSeconds > 0} className="text-[#2563ff] disabled:text-[#999]">
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
            </button>
            <button type="button" onClick={onChangePhone} disabled={otpLoading} className="text-[#2563ff] disabled:text-[#999]">
              Change number
            </button>
          </div>
        </form>
      </section>
    </TiwloAuthShell>
  );
}
