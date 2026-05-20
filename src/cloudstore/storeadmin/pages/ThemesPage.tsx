import React from 'react';
import {
  CheckCircle2,
  DownloadCloud,
  Eye,
  LayoutGrid,
  Palette,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  eraseStoreThemeDemoDataWithApi,
  fetchStoreThemesForAdmin,
  fetchStorefrontThemeCatalog,
  importStoreThemeDemoDataWithApi,
  selectStoreHomepageTemplateWithApi,
  selectStoreThemeWithApi
} from '../../../lib/tiwloApi';
import type { StorefrontThemeCatalogItem, StorefrontThemeTemplate } from '../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../components/ActionConfirmation';

function statusForTheme(themes: any[], key: string) {
  return themes.find((theme) => theme.key === key)?.status || 'available';
}

function settingsForTheme(themes: any[], key: string) {
  return themes.find((theme) => theme.key === key)?.settings || {};
}

function controlLabel(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ThemeCard({
  theme,
  template,
  active,
  busy,
  onSelect,
  onPreview
}: {
  key?: React.Key;
  theme: StorefrontThemeCatalogItem;
  template: StorefrontThemeTemplate;
  active: boolean;
  busy: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={`overflow-hidden border bg-white ${active ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
      <div className="relative aspect-video bg-gray-100">
        {template.previewImage ? (
          <img src={template.previewImage} alt={template.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LayoutGrid className="h-10 w-10 text-gray-300" />
          </div>
        )}
        {active && (
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-blue-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <CheckCircle2 className="h-3 w-3" /> Active
          </div>
        )}
      </div>
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-gray-900">{theme.name}</h4>
              <p className="mt-1 text-xs font-medium text-gray-500">{controlLabel(template.layout)}</p>
            </div>
            <span className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-black uppercase text-gray-500">{template.header}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">{template.sections.length} managed sections from the source homepage structure</p>
        </div>

        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={onPreview}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-gray-200 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            disabled={active || busy}
            onClick={onSelect}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-gray-900 py-2 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            <Palette className="h-3.5 w-3.5" /> {active ? 'Selected' : 'Use'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ThemesPage({ store }: { store: any }) {
  const navigate = useNavigate();
  const [themes, setThemes] = React.useState<any[]>([]);
  const [catalog, setCatalog] = React.useState<StorefrontThemeCatalogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyKey, setBusyKey] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const { confirmDelete } = useActionConfirmation();

  const loadThemes = React.useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchStoreThemesForAdmin(store?.id), fetchStorefrontThemeCatalog()])
      .then(([themeRecords, themeCatalog]) => {
        setThemes(themeRecords);
        setCatalog(themeCatalog);
      })
      .catch((err) => {
        setThemes([]);
        setCatalog([]);
        setError(err instanceof Error ? err.message : 'Unable to load themes');
      })
      .finally(() => setLoading(false));
  }, [store?.id]);

  React.useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const activeThemeRecord = themes.find((theme) => theme.status === 'active');
  const activeCatalogTheme = catalog.find((theme) => theme.key === activeThemeRecord?.key) || catalog[0];
  const activeTemplate = activeCatalogTheme?.templates[0];
  const activeSettings = activeCatalogTheme ? settingsForTheme(themes, activeCatalogTheme.key) : {};
  const selectedTemplate = activeSettings.homepageTemplate || activeCatalogTheme?.defaultTemplate;
  const demoInstalled = Boolean(activeSettings.demoMode || activeSettings.demoImportedAt);

  const selectThemeTemplate = async (themeKey: string, templateKey: string) => {
    setBusyKey(themeKey);
    setError('');
    try {
      await selectStoreThemeWithApi(store.id, themeKey);
      await selectStoreHomepageTemplateWithApi({ storeId: store.id, themeKey, templateKey });
      await loadThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to select theme');
    } finally {
      setBusyKey('');
    }
  };

  const importDemo = async () => {
    if (!activeCatalogTheme) return;
    setBusyKey('demo-import');
    setError('');
    setNotice('');
    try {
      await importStoreThemeDemoDataWithApi(store.id, activeCatalogTheme.key);
      await loadThemes();
      setNotice('Demo data installed for this store.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import demo data');
    } finally {
      setBusyKey('');
    }
  };

  const eraseDemo = async () => {
    if (!activeCatalogTheme) return;
    const confirmed = await confirmDelete({
      title: 'Erase demo data?',
      message: 'Are you sure you want to erase all imported demo data from this store?',
      resourceName: activeCatalogTheme.name,
      confirmLabel: 'Erase demo data'
    });
    if (!confirmed) return;

    setBusyKey('demo-erase');
    setError('');
    setNotice('');
    try {
      await eraseStoreThemeDemoDataWithApi(store.id, activeCatalogTheme.key);
      await loadThemes();
      setNotice('All imported demo data was erased from this store.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to erase demo data');
    } finally {
      setBusyKey('');
    }
  };

  const previewTemplate = (themeKey?: string, templateKey?: string) => {
    const params = new URLSearchParams({
      storeId: store.id,
      preview: '1'
    });
    if (themeKey) params.set('theme', themeKey);
    if (templateKey) params.set('template', templateKey);
    navigate(`/themes/${themeKey || 'aura'}?${params.toString()}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Theme Studio</h2>
          <p className="mt-1 text-sm text-gray-500">Select a branded storefront theme and preview the matching homepage component.</p>
        </div>
        <button onClick={loadThemes} className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
      {notice && <div className="rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}

      {loading ? (
        <div className="grid min-h-[220px] place-items-center rounded-md border border-gray-200 bg-white">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" aria-label="Loading" />
        </div>
      ) : !activeCatalogTheme || !activeTemplate ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-white p-12 text-center">
          <LayoutGrid className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h3 className="text-lg font-black text-gray-900">Theme catalog unavailable</h3>
          <p className="mt-1 text-sm text-gray-400">Refresh after the backend is running with the storefront theme catalog enabled.</p>
        </div>
      ) : (
        <>
          <section className="border border-gray-200 bg-white">
            <div className="grid gap-6 p-5 lg:grid-cols-[280px_1fr]">
              <div>
                <div className="relative aspect-video overflow-hidden bg-gray-100">
                  {activeTemplate.previewImage ? (
                    <img src={activeTemplate.previewImage} alt={activeCatalogTheme.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <LayoutGrid className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-sm bg-green-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Active</span>
                </div>
              </div>
              <div className="flex flex-col justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black text-gray-900">{activeCatalogTheme.name}</h3>
                    <span className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-black uppercase text-gray-500">{activeCatalogTheme.version}</span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Active homepage: <span className="font-bold text-gray-900">{selectedTemplate}</span>. Each card below maps to its own source homepage structure and React component.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeCatalogTheme.modules.map((module) => (
                    <span key={module.key} className="inline-flex items-center gap-1 rounded-sm border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600">
                      <Settings2 className="h-3 w-3" /> {module.name}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex cursor-not-allowed items-center gap-2 rounded-sm bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500">
                    <CheckCircle2 className="h-4 w-4" /> Active Theme
                  </button>
                  <button onClick={() => previewTemplate(activeCatalogTheme.key, activeTemplate.key)} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                  <button
                    disabled={busyKey === 'demo-import'}
                    onClick={importDemo}
                    className="inline-flex items-center gap-2 rounded-sm border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    <DownloadCloud className="h-4 w-4" /> {busyKey === 'demo-import' ? 'Installing...' : demoInstalled ? 'Reinstall Demo Data' : 'Import Demo Data'}
                  </button>
                  <button
                    disabled={busyKey === 'demo-erase'}
                    onClick={eraseDemo}
                    className="inline-flex items-center gap-2 rounded-sm border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> {busyKey === 'demo-erase' ? 'Erasing...' : 'Erase All Demo Data'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Store Themes</h3>
                <p className="mt-1 text-sm text-gray-500">Aura and future cloned themes share the same StoreAdmin runtime controls.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">
                <SlidersHorizontal className="h-3.5 w-3.5" /> {catalog.length} themes
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {catalog.map((theme) => {
                const template = theme.templates[0];
                if (!template) return null;
                const active = statusForTheme(themes, theme.key) === 'active';
                return (
                  <ThemeCard
                    key={theme.key}
                    theme={theme}
                    template={template}
                    active={active}
                    busy={busyKey === theme.key}
                    onSelect={() => selectThemeTemplate(theme.key, template.key)}
                    onPreview={() => previewTemplate(theme.key, template.key)}
                  />
                );
              })}
            </div>
          </section>

          <section className="border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-900">Managed Theme Controls</h3>
            <div className="flex flex-wrap gap-2">
              {activeCatalogTheme.controls.map((control) => (
                <span key={control} className="rounded-sm border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600">
                  {controlLabel(control)}
                </span>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
