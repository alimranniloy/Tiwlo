import React from 'react';

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

type AuthCardProps = {
  logo?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  socialLabel?: string;
  showSocial?: boolean;
};

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12.001 2C6.47813 2 2.00098 6.47715 2.00098 12C2.00098 16.9913 5.65783 21.1283 10.4385 21.8785V14.8906H7.89941V12H10.4385V9.79688C10.4385 7.29063 11.9314 5.90625 14.2156 5.90625C15.3097 5.90625 16.4541 6.10156 16.4541 6.10156V8.5625H15.1931C13.9509 8.5625 13.5635 9.33334 13.5635 10.1242V12H16.3369L15.8936 14.8906H13.5635V21.8785C18.3441 21.1283 22.001 16.9913 22.001 12C22.001 6.47715 17.5238 2 12.001 2Z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M11.6734 7.2221C10.7974 7.2221 9.44138 6.2261 8.01338 6.2621C6.12938 6.2861 4.40138 7.3541 3.42938 9.0461C1.47338 12.4421 2.92538 17.4581 4.83338 20.2181C5.76938 21.5621 6.87338 23.0741 8.33738 23.0261C9.74138 22.9661 10.2694 22.1141 11.9734 22.1141C13.6654 22.1141 14.1454 23.0261 15.6334 22.9901C17.1454 22.9661 18.1054 21.6221 19.0294 20.2661C20.0974 18.7061 20.5414 17.1941 20.5654 17.1101C20.5294 17.0981 17.6254 15.9821 17.5894 12.6221C17.5654 9.8141 19.8814 8.4701 19.9894 8.4101C18.6694 6.4781 16.6414 6.2621 15.9334 6.2141C14.0854 6.0701 12.5374 7.2221 11.6734 7.2221ZM14.7934 4.3901C15.5734 3.4541 16.0894 2.1461 15.9454 0.850098C14.8294 0.898098 13.4854 1.5941 12.6814 2.5301C11.9614 3.3581 11.3374 4.6901 11.5054 5.9621C12.7414 6.0581 14.0134 5.3261 14.7934 4.3901Z" />
  </svg>
);

export function AuthShell({ children, className = '' }: AuthShellProps) {
  React.useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') || document.createElement('meta');
    meta.name = 'theme-color';
    if (!meta.parentNode) document.head.appendChild(meta);
    meta.setAttribute('content', '#f3f5f9');
  }, []);

  return (
    <div className={`flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4 py-8 font-sans text-[#212121] sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

export function AuthSocialButtons({ label = 'Sign in with' }: { label?: string }) {
  return (
    <div className="mb-5 flex flex-col items-center justify-center gap-3">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-[#1778f2] px-4 py-3 font-inherit text-sm text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] active:scale-95"
      >
        <FacebookIcon />
        <span>{label} Facebook</span>
      </button>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-[#212121] px-4 py-3 font-inherit text-sm text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] active:scale-95"
      >
        <AppleIcon />
        <span>{label} Apple</span>
      </button>
    </div>
  );
}

export function AuthDivider() {
  return <div className="h-px w-full bg-[#212121] opacity-10" />;
}

export function authInputClass(extra = '') {
  return `w-full rounded-md border border-[#cccccc] px-4 py-3 font-inherit text-sm outline-none placeholder:opacity-50 focus:border-[#1778f2] ${extra}`;
}

export default function AuthCard({
  logo,
  title,
  children,
  footer,
  wide = false,
  socialLabel = 'Sign in with',
  showSocial = true
}: AuthCardProps) {
  return (
    <div
      className={`box-border flex w-full ${wide ? 'max-w-[520px]' : 'max-w-[350px]'} flex-col gap-6 rounded-[10px] bg-white px-6 py-8 text-sm text-[#212121] shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] sm:px-6`}
    >
      <div className="mb-3 text-center text-xl font-bold">
        {logo && <div className="mb-4 flex justify-center">{logo}</div>}
        <div>{title}</div>
      </div>
      {showSocial && <AuthSocialButtons label={socialLabel} />}
      {showSocial && <AuthDivider />}
      {children}
      {footer && <div className="text-center text-sm font-medium">{footer}</div>}
    </div>
  );
}
