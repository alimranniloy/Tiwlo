import React from 'react';
import { AlertCircle, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  deleteEcommerceControlRecordWithApi,
  fetchEcommerceControlSection,
  runEcommerceControlActionWithApi,
  upsertEcommerceControlRecordWithApi
} from '../../../lib/tiwloApi';
import type { EcommerceControlAction, EcommerceControlRecord, EcommerceControlSection } from '../../../lib/api/ecommerce';
import ModuleWorkspace from './components/ModuleWorkspace';
import { getModuleWorkspace } from './moduleWorkspaceCatalog';
import { getSectionBlueprint } from './sectionBlueprints';
import { useActionConfirmation } from '../../../components/ActionConfirmation';

const statusClass = (status?: string) => {
  if (status === 'active') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'inactive' || status === 'disabled') return 'border-rose-100 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

export default function EcommerceControlPage() {
  const location = useLocation();
  const [section, setSection] = React.useState<EcommerceControlSection | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<EcommerceControlRecord | null>(null);
  const [busyAction, setBusyAction] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadSection = React.useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const data = await fetchEcommerceControlSection(location.pathname);
      setSection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load ecommerce control section');
      setSection(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    setNotice('');
    setComposerOpen(false);
    setEditingRecord(null);
    loadSection();
  }, [loadSection]);

  const runAction = async (action: EcommerceControlAction, targetId?: string) => {
    if (!section || action.key === 'create_record') return;
    if (action.intent === 'danger' || /delete|remove|revoke|clear/i.test(action.key)) {
      const confirmed = await confirmDelete({
        title: `${action.label || 'Run action'}?`,
        message: `Are you sure you want to run ${action.label || action.key}?`,
        resourceName: targetId || section.label,
        confirmLabel: action.label || 'Run action'
      });
      if (!confirmed) return;
    }

    setBusyAction(action.key);
    setError('');
    setNotice('');
    try {
      const result = await runEcommerceControlActionWithApi({
        sectionKey: section.key,
        actionKey: action.key,
        targetId,
        payload: action.payload
      });
      setSection(result.section);
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run ecommerce control action');
    } finally {
      setBusyAction('');
    }
  };

  const runRecordAction = async (actionKey: string, record: EcommerceControlRecord) => {
    await runAction({ key: actionKey, label: actionKey, intent: 'neutral' }, record.id);
  };

  const saveRecord = async (input: { id?: string; title: string; status: string; owner: string; summary: string; data?: Record<string, unknown> }) => {
    if (!section) return;
    setSaving(true);
    setError('');
    try {
      await upsertEcommerceControlRecordWithApi({
        sectionKey: section.key,
        ...input,
        data: input.data || { source: 'operator-console', section: section.label }
      });
      setComposerOpen(false);
      setEditingRecord(null);
      setNotice(input.id ? 'Control record updated.' : 'Control record saved.');
      await loadSection(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save control record');
    } finally {
      setSaving(false);
    }
  };

  const editRecord = async (record: EcommerceControlRecord) => {
    if (record.id.includes(':')) {
      setNotice('API-generated records are controlled from their source module. Add a manual control record if you need operator notes.');
      return;
    }
    const confirmed = await confirmEdit({
      title: 'Edit control record?',
      message: 'Are you sure you want to edit this control record?',
      resourceName: record.title
    });
    if (!confirmed) return;

    setEditingRecord(record);
    setComposerOpen(true);
  };

  const deleteRecord = async (record: EcommerceControlRecord) => {
    if (!section || record.id.includes(':')) return;
    const confirmed = await confirmDelete({
      title: 'Delete control record?',
      message: 'Are you sure you want to delete this control record?',
      resourceName: record.title
    });
    if (!confirmed) return;

    setBusyAction(`delete:${record.id}`);
    setError('');
    try {
      await deleteEcommerceControlRecordWithApi(section.key, record.id);
      setNotice('Control record deleted.');
      await loadSection(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete control record');
    } finally {
      setBusyAction('');
    }
  };

  const deleteAllManualRecords = async () => {
    if (!section) return;
    const manualRecords = section.records.filter((record) => !record.id.includes(':'));
    if (manualRecords.length === 0) return;
    const confirmed = await confirmDelete({
      title: 'Clear manual records?',
      message: `Are you sure you want to delete ${manualRecords.length} manual control records from this page?`,
      resourceName: section.label,
      confirmLabel: 'Clear records'
    });
    if (!confirmed) return;

    setBusyAction('delete:manual-all');
    setError('');
    try {
      for (const record of manualRecords) {
        await deleteEcommerceControlRecordWithApi(section.key, record.id);
      }
      setNotice(`${manualRecords.length} manual control records deleted.`);
      await loadSection(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete manual control records');
    } finally {
      setBusyAction('');
    }
  };

  const exportSection = () => {
    if (!section) return;
    const blob = new Blob([JSON.stringify(section, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${section.key.replace(/\./g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[420px] rounded-sm border border-slate-200 bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-3 text-sm font-bold text-gray-500">Loading ecommerce controls...</p>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="rounded-sm border border-slate-200 bg-white p-8">
        <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
          <AlertCircle className="h-4 w-4" />
          {error || 'Ecommerce control section was not found.'}
        </div>
      </div>
    );
  }

  const blueprint = getSectionBlueprint(section.key);
  const workspace = getModuleWorkspace(section.key);
  const HeroIcon = blueprint.icon;

  return (
    <div className="space-y-5">
      <div className="rounded-sm border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${blueprint.accent}`}>
                <HeroIcon className="h-3.5 w-3.5" />
                {section.group}
              </span>
              <span className={`inline-flex rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(section.status)}`}>
                {section.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{section.label}</h1>
            {section.description && <p className="mt-1 text-sm text-gray-500 max-w-4xl">{section.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
                Focus: {blueprint.focus}
              </span>
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
                Entity: {blueprint.noun}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadSection(false)}
              disabled={Boolean(busyAction)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${busyAction ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportSection}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-slate-900 bg-slate-900 px-3.5 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-sm border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">
          {notice}
        </div>
      )}

      <ModuleWorkspace
        section={section}
        blueprint={blueprint}
        workspace={workspace}
        busyAction={busyAction}
        saving={saving}
        composerOpen={composerOpen}
        editingRecord={editingRecord}
        onAction={(action) => runAction(action)}
        onCreate={() => {
          setEditingRecord(null);
          setComposerOpen(true);
        }}
        onCloseComposer={() => {
          setComposerOpen(false);
          setEditingRecord(null);
        }}
        onSaveRecord={saveRecord}
        onEditRecord={editRecord}
        onDeleteRecord={deleteRecord}
        onDeleteAllRecords={deleteAllManualRecords}
        onRecordAction={runRecordAction}
      />
    </div>
  );
}
