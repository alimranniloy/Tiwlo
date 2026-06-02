import React from 'react';
import { Github } from 'lucide-react';
import { Link } from 'react-router-dom';

type ShellProps = {
  children: React.ReactNode;
  maxWidthClass?: string;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  wrapperClassName?: string;
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.8 3-4.4 3-7.3z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.7-2.5L15.5 17c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22z" />
    <path fill="#FBBC05" d="M6.2 13.6a6 6 0 0 1 0-3.2V7.8H2.9a10 10 0 0 0 0 8.4l3.3-2.6z" />
    <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2 10 10 0 0 0 2.9 7.8l3.3 2.6C7 7.9 9.3 6.1 12 6.1z" />
  </svg>
);

export function TiwloAuthShell({ children, maxWidthClass = 'max-w-[360px]' }: ShellProps) {
  React.useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') || document.createElement('meta');
    const previous = meta.getAttribute('content') || '#020707';
    meta.name = 'theme-color';
    if (!meta.parentNode) document.head.appendChild(meta);
    meta.setAttribute('content', '#ffffff');
    return () => meta.setAttribute('content', previous);
  }, []);

  return (
    <main className="min-h-screen bg-white px-4 py-8 font-sans text-black sm:px-6">
      <div className={`mx-auto flex min-h-[calc(100vh-4rem)] w-full ${maxWidthClass} flex-col items-center justify-center`}>
        {children}
      </div>
    </main>
  );
}

export function TiwloAuthLogo() {
  return (
    <Link to="/" className="mb-9 inline-flex justify-center">
      <img src="/brand/logo.png" alt="Tiwlo" className="h-9 w-28 object-contain" />
    </Link>
  );
}

export function TiwloAuthInput({ label, className = '', wrapperClassName = '', ...props }: InputProps) {
  return (
    <label className={`relative block ${wrapperClassName}`}>
      <span className="absolute -top-2 left-5 bg-white px-1 text-[12px] font-medium text-[#2563ff]">{label}</span>
      <input
        {...props}
        className={`h-[54px] w-full rounded-[22px] border border-[#d8d8d8] bg-white px-5 text-[15px] font-medium outline-none transition focus:border-[#2563ff] ${className}`}
      />
    </label>
  );
}

export function TiwloAuthButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-[52px] w-full rounded-[22px] bg-[#111111] px-5 text-[15px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    >
      {children}
    </button>
  );
}

export function TiwloAuthDivider() {
  return (
    <div className="my-7 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 text-[12px] font-semibold text-black">
      <span className="h-px bg-[#e2e2e2]" />
      <span>OR</span>
      <span className="h-px bg-[#e2e2e2]" />
    </div>
  );
}

export function TiwloSocialButtons({ label = 'Continue with' }: { label?: string }) {
  return (
    <div className="grid w-full gap-3">
      <button type="button" className="flex h-[52px] items-center justify-center gap-3 rounded-[22px] border border-[#d8d8d8] bg-white text-[15px] font-medium text-black transition hover:border-[#111]">
        <GoogleIcon />
        {label} Google
      </button>
      <button type="button" className="flex h-[52px] items-center justify-center gap-3 rounded-[22px] border border-[#d8d8d8] bg-white text-[15px] font-medium text-black transition hover:border-[#111]">
        <Github className="h-5 w-5" />
        {label} GitHub
      </button>
    </div>
  );
}

export function TiwloLegalLinks() {
  return (
    <div className="mt-10 flex items-center justify-center gap-3 text-[13px] text-[#4b5563]">
      <Link to="/terms" className="underline underline-offset-2 hover:text-black">Terms of Use</Link>
      <span>|</span>
      <Link to="/privacy" className="underline underline-offset-2 hover:text-black">Privacy Policy</Link>
    </div>
  );
}
