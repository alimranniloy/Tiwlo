import React from 'react';
import BrandLogo from './BrandLogo';

type SystemStatusVariant = 'disabled' | 'maintenance' | 'not-found';

type SystemStatusPageProps = {
  variant: SystemStatusVariant;
  title: string;
  children?: React.ReactNode;
  topAction?: React.ReactNode;
};

const assetKeyByVariant: Record<SystemStatusVariant, string> = {
  disabled: 'disabled',
  maintenance: 'maintenance',
  'not-found': 'not-found'
};

const copyByVariant: Record<SystemStatusVariant, { label: string; heading: string; description: string }> = {
  disabled: {
    label: 'Account status',
    heading: 'Account disabled',
    description: 'Contact support and our team will review the account.'
  },
  maintenance: {
    label: 'Maintenance',
    heading: 'Website under maintenance',
    description: 'Only administrators can sign in while maintenance mode is active.'
  },
  'not-found': {
    label: 'Error 404',
    heading: 'Page not found',
    description: 'The page you requested is unavailable or has moved.'
  }
};

function useNoIndex(title: string) {
  React.useEffect(() => {
    document.title = title;
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const meta = existing || document.createElement('meta');
    const previousContent = existing?.getAttribute('content') || '';
    meta.name = 'robots';
    meta.content = 'noindex, nofollow, noarchive, noimageindex';
    if (!existing) document.head.appendChild(meta);

    return () => {
      if (existing) {
        existing.setAttribute('content', previousContent);
      } else {
        meta.remove();
      }
    };
  }, [title]);
}

export default function SystemStatusPage({ variant, title, children, topAction }: SystemStatusPageProps) {
  useNoIndex(title);
  const assetKey = assetKeyByVariant[variant];
  const copy = copyByVariant[variant];

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-4 font-sans text-[#111827] sm:px-6">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-lg border border-[#eef2f7] bg-white px-3 py-2 sm:px-4">
        <BrandLogo className="h-10 w-28 sm:w-32" />
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden rounded-full border border-[#dbeafe] bg-[#eff6ff] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#1d4ed8] sm:inline-flex">
            {copy.label}
          </span>
          {topAction}
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-5xl flex-col items-center justify-center pt-5">
        <div className="max-w-xl text-center">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#0069ff] sm:hidden">{copy.label}</p>
          <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">{copy.heading}</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b]">{copy.description}</p>
        </div>

        <div
          className="mt-4 flex w-full justify-center sm:mt-5"
          onContextMenu={(event) => event.preventDefault()}
        >
          <img
            src={`/api/system-assets/${assetKey}?v=20260601b`}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            width={1536}
            height={864}
            className="pointer-events-none max-h-[52vh] w-[min(92vw,760px)] select-none object-contain sm:max-h-[56vh]"
          />
        </div>

        {children && (
          <section className="mt-5 w-full max-w-md rounded-lg border border-[#e5e8ed] bg-white px-5 py-4 text-center sm:mt-6 sm:px-6">
            {children}
          </section>
        )}
      </main>
    </div>
  );
}
