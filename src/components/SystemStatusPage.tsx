import React from 'react';

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-5 font-sans text-[#111827] sm:px-6">
      {topAction && (
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          {topAction}
        </div>
      )}

      <main className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-4xl flex-col items-center justify-center">
        <div
          className="flex w-full justify-center"
          onContextMenu={(event) => event.preventDefault()}
        >
          <img
            src={`/api/system-assets/${assetKey}`}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none max-h-[54vh] w-[min(86vw,560px)] select-none object-contain sm:max-h-[58vh]"
          />
        </div>

        {children && (
          <section className="mt-6 w-full max-w-md rounded-lg border border-[#e5e8ed] bg-white px-5 py-4 text-center sm:mt-7 sm:px-6">
            {children}
          </section>
        )}
      </main>
    </div>
  );
}
