import React from 'react';
import {
  Archive,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Save,
  Upload,
  XCircle
} from 'lucide-react';
import {
  BackupConfig,
  BackupFile,
  SystemJob,
  downloadBackup,
  fetchBackupJob,
  fetchBackupOverview,
  importBackup,
  saveBackupConfig,
  startBackup
} from '../../lib/tiwloApi';

const defaultConfig: BackupConfig = {
  autoEnabled: false,
  intervalMinutes: 360,
  localRetention: 1,
  googleDriveEnabled: false,
  googleDriveFolderId: '',
  googleServiceAccountPath: '',
  googleServiceAccountJson: '',
  driveRetention: 1,
  uploadManualToDrive: false
};

const bytes = (value = 0) => {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

function ProgressPanel({ job, uploadProgress }: { job?: SystemJob | null; uploadProgress?: number }) {
  const progress = job?.progress ?? uploadProgress ?? 0;
  const statusTone = job?.status === 'failed'
    ? 'text-red-600 bg-red-50 border-red-100'
    : job?.status === 'completed'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
      : 'text-blue-700 bg-blue-50 border-blue-100';

  if (!job && uploadProgress === undefined) return null;

  return (
    <div className={`rounded-md border px-4 py-3 ${statusTone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold">{job?.message || 'Uploading backup file'}</p>
          {job?.fileName && <p className="mt-0.5 text-[11px] font-medium opacity-80">{job.fileName} · {bytes(job.fileSize)}</p>}
        </div>
        <span className="shrink-0 text-[12px] font-black tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <div className="h-full rounded-full bg-current transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </div>
  );
}

export default function AdminBackup() {
  const [config, setConfig] = React.useState<BackupConfig>(defaultConfig);
  const [files, setFiles] = React.useState<BackupFile[]>([]);
  const [job, setJob] = React.useState<SystemJob | null>(null);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await fetchBackupOverview();
      setConfig({ ...defaultConfig, ...overview.config });
      setFiles(overview.files || []);
      setJob((overview.jobs || [])[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load backup settings');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  React.useEffect(() => {
    if (!job || !['queued', 'running'].includes(job.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const next = await fetchBackupJob(job.id);
        setJob(next);
        if (['completed', 'failed'].includes(next.status)) {
          setUploadProgress(undefined);
          loadOverview();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to read job progress');
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [job, loadOverview]);

  const createBackup = async () => {
    setError('');
    setSaved(false);
    try {
      setJob(await startBackup(config.uploadManualToDrive));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup could not start');
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await saveBackupConfig(config);
      setConfig(result.config);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup settings could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const restoreBackup = async () => {
    if (!importFile) return;
    setError('');
    setSaved(false);
    setUploadProgress(0);
    try {
      setJob(await importBackup(importFile, setUploadProgress));
      setImportFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import could not start');
      setUploadProgress(undefined);
    }
  };

  const busy = job && ['queued', 'running'].includes(job.status);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Backup</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Database, uploads, imports, local retention, and optional Google Drive automation.</p>
        </div>
        <button onClick={loadOverview} className="inline-flex items-center gap-2 rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[12px] font-bold text-[#2e3d49] hover:bg-[#f8f9fa]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}
      {saved && <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">Settings saved.</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#f3f5f9] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-[#0069ff]">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-black uppercase tracking-wide text-[#2e3d49]">Backup File</h2>
                <p className="text-[12px] font-medium text-gray-500">PostgreSQL export and uploaded assets in one zip.</p>
              </div>
            </div>
            <button disabled={Boolean(busy)} onClick={createBackup} className="inline-flex items-center gap-2 rounded-md bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white hover:bg-[#0056cc] disabled:cursor-not-allowed disabled:opacity-60">
              <Download className="h-4 w-4" /> Backup file download
            </button>
          </div>
          <div className="space-y-5 p-6">
            <ProgressPanel job={job} uploadProgress={uploadProgress} />

            <div className="overflow-hidden rounded-md border border-[#e5e8ed]">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-[#f8f9fa] px-4 py-3 text-[11px] font-black uppercase tracking-wide text-gray-500">
                <span>File</span>
                <span>Size</span>
                <span>Action</span>
              </div>
              {files.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] font-bold text-gray-400">No backup file yet.</div>
              ) : files.map((file) => (
                <div key={file.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-[#eef2f7] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-[#2e3d49]">{file.name}</p>
                    <p className="text-[11px] font-medium text-gray-400">{new Date(file.updatedAt).toLocaleString()}</p>
                  </div>
                  <span className="text-[12px] font-bold text-gray-500">{bytes(file.size)}</span>
                  <button onClick={() => downloadBackup(file.name).catch((err) => setError(err.message))} className="rounded border border-[#d8dee9] px-3 py-1.5 text-[12px] font-bold text-[#0069ff] hover:bg-blue-50">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-black uppercase tracking-wide text-[#2e3d49]">Import</h2>
                <p className="text-[12px] font-medium text-gray-500">Restore a Tiwlo zip into the active database.</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <label className="block rounded-md border border-dashed border-[#cfd8e3] bg-[#f8f9fa] px-4 py-5 text-center">
              <input type="file" accept=".zip" className="hidden" onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
              <Database className="mx-auto h-7 w-7 text-[#0069ff]" />
              <span className="mt-2 block text-[13px] font-bold text-[#2e3d49]">{importFile?.name || 'Choose backup zip'}</span>
            </label>
            <button disabled={!importFile || Boolean(busy)} onClick={restoreBackup} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1f2937] px-4 py-2.5 text-[12px] font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60">
              <Upload className="h-4 w-4" /> Import backup
            </button>
            <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">
              Import replaces current PostgreSQL data. Current uploads are copied to `.data/restore-safety` first.
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-[#e5e8ed] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#f3f5f9] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[14px] font-black uppercase tracking-wide text-[#2e3d49]">Auto Backup & Google Drive</h2>
              <p className="text-[12px] font-medium text-gray-500">Interval, retention, Drive folder, and service-account credentials.</p>
            </div>
          </div>
          <button disabled={saving} onClick={saveConfig} className="inline-flex items-center gap-2 rounded-md bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white hover:bg-[#0056cc] disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          <label className="flex items-center justify-between gap-4 rounded-md border border-[#e5e8ed] px-4 py-3">
            <span className="text-[13px] font-bold text-[#2e3d49]">Auto backup</span>
            <button onClick={() => setConfig((value) => ({ ...value, autoEnabled: !value.autoEnabled }))} className={`relative h-6 w-11 rounded-full ${config.autoEnabled ? 'bg-[#0069ff]' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${config.autoEnabled ? 'right-1' : 'left-1'}`} />
            </button>
          </label>
          <label className="space-y-2">
            <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Every minutes</span>
            <input type="number" min="5" value={config.intervalMinutes} onChange={(event) => setConfig((value) => ({ ...value, intervalMinutes: Number(event.target.value || 5) }))} className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <label className="space-y-2">
            <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Local files kept</span>
            <input type="number" min="1" value={config.localRetention} onChange={(event) => setConfig((value) => ({ ...value, localRetention: Number(event.target.value || 1) }))} className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-[#e5e8ed] px-4 py-3">
            <span className="text-[13px] font-bold text-[#2e3d49]">Google Drive upload</span>
            <button onClick={() => setConfig((value) => ({ ...value, googleDriveEnabled: !value.googleDriveEnabled }))} className={`relative h-6 w-11 rounded-full ${config.googleDriveEnabled ? 'bg-[#0069ff]' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${config.googleDriveEnabled ? 'right-1' : 'left-1'}`} />
            </button>
          </label>
          <label className="space-y-2">
            <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Drive folder ID</span>
            <input value={config.googleDriveFolderId} onChange={(event) => setConfig((value) => ({ ...value, googleDriveFolderId: event.target.value }))} className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <label className="space-y-2">
            <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Drive files kept</span>
            <input type="number" min="1" value={config.driveRetention} onChange={(event) => setConfig((value) => ({ ...value, driveRetention: Number(event.target.value || 1) }))} className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <label className="space-y-2 lg:col-span-1">
            <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Service account JSON path</span>
            <input value={config.googleServiceAccountPath} onChange={(event) => setConfig((value) => ({ ...value, googleServiceAccountPath: event.target.value }))} placeholder="/etc/tiwlo/google-drive.json" className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Service account JSON</span>
            <textarea value={config.googleServiceAccountJson} onChange={(event) => setConfig((value) => ({ ...value, googleServiceAccountJson: event.target.value }))} rows={3} className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[12px] font-mono outline-none focus:border-[#0069ff]" />
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={config.uploadManualToDrive} onChange={(event) => setConfig((value) => ({ ...value, uploadManualToDrive: event.target.checked }))} className="h-4 w-4" />
            <span className="text-[13px] font-bold text-[#2e3d49]">Upload manual backups to Drive</span>
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'PostgreSQL', icon: Database, ok: true },
          { label: 'Uploads', icon: HardDrive, ok: true },
          { label: 'Automation', icon: config.autoEnabled ? CheckCircle2 : XCircle, ok: config.autoEnabled }
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg border border-[#e5e8ed] bg-white px-4 py-3">
            <item.icon className={`h-5 w-5 ${item.ok ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span className="text-[13px] font-black text-[#2e3d49]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
