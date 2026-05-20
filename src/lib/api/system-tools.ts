import { GRAPHQL_URL, getAuthToken } from './client';

const apiBase = () => GRAPHQL_URL.replace(/\/graphql\/?$/, '').replace(/\/$/, '');

export type SystemJob = {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
  error?: string;
  pollToken?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  domains?: string[];
  log?: Array<{ at: string; message: string }>;
  createdAt: string;
  updatedAt: string;
};

export type BackupConfig = {
  autoEnabled: boolean;
  intervalMinutes: number;
  localRetention: number;
  googleDriveEnabled: boolean;
  googleDriveFolderId: string;
  googleServiceAccountPath: string;
  googleServiceAccountJson: string;
  driveRetention: number;
  uploadManualToDrive: boolean;
};

export type BackupFile = {
  name: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {})
      }
    });
  } catch {
    throw new Error('Backup API connection failed. Open Tiwlo through the public proxy and make sure the backend is running.');
  }
  const text = await response.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!response.ok) {
    throw new Error(json?.error || text || `Request failed: ${response.status}`);
  }
  return json as T;
}

export async function fetchBackupOverview(): Promise<{
  config: BackupConfig;
  files: BackupFile[];
  jobs: SystemJob[];
  state: Record<string, unknown>;
}> {
  return apiFetch('/admin/backups');
}

export async function saveBackupConfig(config: BackupConfig): Promise<{ ok: boolean; config: BackupConfig }> {
  return apiFetch('/admin/backups/config', {
    method: 'PUT',
    body: JSON.stringify(config)
  });
}

export async function startBackup(uploadToDrive = false): Promise<SystemJob> {
  const result = await apiFetch<{ job: SystemJob }>('/admin/backups/create', {
    method: 'POST',
    body: JSON.stringify({ uploadToDrive })
  });
  return result.job;
}

export async function fetchBackupJob(id: string, pollToken?: string): Promise<SystemJob> {
  const result = await apiFetch<{ job: SystemJob }>(`/admin/backups/jobs/${id}`, {
    headers: pollToken ? { 'X-Tiwlo-Job-Token': pollToken } : {}
  });
  return result.job;
}

export async function downloadBackup(fileName: string) {
  const token = getAuthToken();
  const response = await fetch(`${apiBase()}/admin/backups/download/${encodeURIComponent(fileName)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File, onProgress?: (progress: number) => void): Promise<SystemJob> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('backup', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase()}/admin/backups/import`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json.job as SystemJob);
        } else {
          reject(new Error(json.error || `Import failed: ${xhr.status}`));
        }
      } catch (error) {
        reject(error);
      }
    };
    xhr.send(formData);
  });
}

export async function fetchSslStatus(): Promise<{ installed: boolean; output: string }> {
  return apiFetch('/admin/ssl/status');
}

export async function startSslJob(input: {
  mode: 'main' | 'all';
  domain?: string;
  email: string;
  staging?: boolean;
  forceRenewal?: boolean;
}): Promise<SystemJob> {
  const result = await apiFetch<{ job: SystemJob }>('/admin/ssl/apply', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return result.job;
}

export async function fetchSslJob(id: string): Promise<SystemJob> {
  const result = await apiFetch<{ job: SystemJob }>(`/admin/ssl/jobs/${id}`);
  return result.job;
}
