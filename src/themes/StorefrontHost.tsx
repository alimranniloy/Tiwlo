import React from 'react';
import { useLocation } from 'react-router-dom';
import { fetchStoreThemeRuntime, type StoreThemeRuntime } from '../lib/tiwloApi';
import { getStorefrontHostContext } from '../lib/storefrontHost';
import SystemStatusPage from '../components/SystemStatusPage';
import { AuraStorefront } from './aura/Preview';
import { EplazaStorefront } from './eplaza/Preview';

const themeKey = (runtime: StoreThemeRuntime | null) => (
  String(runtime?.activeTheme?.key || runtime?.store?.settings?.theme || 'aura').toLowerCase()
);

function StorefrontUnavailable() {
  return <SystemStatusPage variant="not-found" title="404 | Tiwlo Store" />;
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
    return <StorefrontUnavailable />;
  }

  return themeKey(runtime) === 'eplaza'
    ? <EplazaStorefront runtime={runtime} error={error} basePath="" allowFallbackData={Boolean(runtime?.preview)} />
    : <AuraStorefront runtime={runtime} error={error} basePath="" allowFallbackData={Boolean(runtime?.preview)} />;
}
