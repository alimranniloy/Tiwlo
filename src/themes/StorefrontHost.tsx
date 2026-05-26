import React from 'react';
import { useLocation } from 'react-router-dom';
import { fetchStoreThemeRuntime, getAuthToken, type StoreThemeRuntime } from '../lib/tiwloApi';
import { getStorefrontHostContext } from '../lib/storefrontHost';
import { AuraStorefront } from './aura/Preview';
import { EplazaStorefront } from './eplaza/Preview';

const themeKey = (runtime: StoreThemeRuntime | null) => (
  String(runtime?.activeTheme?.key || runtime?.store?.settings?.theme || 'aura').toLowerCase()
);

function StorefrontUnavailable({ hostname, rootDomain }: { hostname: string; rootDomain: string }) {
  const isLoggedIn = Boolean(getAuthToken());
  const protocol = window.location.protocol || 'https:';
  const consoleOrigin = `${protocol}//${rootDomain}`;
  const target = isLoggedIn ? `${consoleOrigin}/store/create` : `${consoleOrigin}/login`;

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f8fa] px-4 py-10 text-[#111827]">
      <div className="w-full max-w-lg rounded-lg border border-[#d9dee7] bg-white p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#d9dee7] bg-[#f3f5f8] text-lg font-black">
          !
        </div>
        <h1 className="text-2xl font-black tracking-tight">This site is not exist or suspended or deleted</h1>
        <p className="mt-3 text-sm leading-6 text-[#64748B]">
          We could not find an active store connected to <span className="font-mono font-bold text-[#111827]">{hostname}</span>.
        </p>
        <p className="mt-2 text-[13px] font-bold text-[#4B5563]">Link to your store now.</p>
        <a
          href={target}
          className="mt-6 inline-flex items-center justify-center rounded-md border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-black"
        >
          Create Store
        </a>
      </div>
    </div>
  );
}

export default function StorefrontHost() {
  const location = useLocation();
  const hostContext = getStorefrontHostContext();
  const [runtime, setRuntime] = React.useState<StoreThemeRuntime | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(location.search);

    async function loadRuntime() {
      if (!hostContext) return;
      setLoading(true);
      setError('');
      try {
        const data = await fetchStoreThemeRuntime({
          slug: hostContext.slug,
          domain: hostContext.domain || hostContext.hostname,
          themeKey: params.get('theme') || undefined,
          templateKey: params.get('template') || undefined,
          preview: params.get('preview') === '1'
        });
        if (mounted) {
          setRuntime(data);
          document.title = `${data.store.name} | Tiwlo Store`;
        }
      } catch (err) {
        if (mounted) {
          setRuntime(null);
          setError(err instanceof Error ? err.message : 'Unable to load storefront');
          document.title = 'Storefront not found | Tiwlo';
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRuntime();
    return () => {
      mounted = false;
    };
  }, [hostContext?.domain, hostContext?.hostname, hostContext?.slug, location.search]);

  if (!hostContext) return null;

  if (loading) {
    return null;
  }

  if (!runtime && error) {
    return <StorefrontUnavailable hostname={hostContext.hostname} rootDomain={hostContext.rootDomain} />;
  }

  return themeKey(runtime) === 'eplaza'
    ? <EplazaStorefront runtime={runtime} error={error} basePath="" allowFallbackData={Boolean(runtime?.preview)} />
    : <AuraStorefront runtime={runtime} error={error} basePath="" allowFallbackData={Boolean(runtime?.preview)} />;
}
