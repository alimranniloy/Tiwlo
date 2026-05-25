import React from 'react';
import { AlertCircle, CheckCircle2, Eye, Fingerprint, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import {
  adminUpdateTiwloPayProfileStatusWithApi,
  fetchAdminTiwloPayOverviewWithApi,
  fetchUsersForAdmin
} from '../../lib/tiwloApi';

export default function AdminIdentity() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [payProfiles, setPayProfiles] = React.useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const loadIdentity = React.useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchUsersForAdmin(), fetchAdminTiwloPayOverviewWithApi()])
      .then(([nextUsers, payOverview]) => {
        setUsers(nextUsers);
        setPayProfiles(payOverview?.profiles || []);
      })
      .catch((err) => {
        setUsers([]);
        setPayProfiles([]);
        setError(err instanceof Error ? err.message : 'Unable to load user identity data');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const updatePayProfile = async (id: string, status: string) => {
    setSavingId(id);
    setError('');
    setNotice('');
    try {
      await adminUpdateTiwloPayProfileStatusWithApi(id, status);
      setNotice(`Tiwlo Pay profile marked ${status}.`);
      await loadIdentity();
      setSelectedProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update verification profile');
    } finally {
      setSavingId('');
    }
  };

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const pendingUsers = users.filter((user) => user.status === 'pending').length;
  const blockedUsers = users.filter((user) => ['suspended', 'disabled', 'blocked'].includes(user.status)).length;
  const pendingPayProfiles = payProfiles.filter((profile) => {
    const status = String(profile.settings?.verification?.status || profile.status || '').toLowerCase();
    return ['pending', 'submitted', 'needs_review', 'review'].includes(status);
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">User Identity & Verification</h1>
        <p className="text-[13px] text-[#4a4a4a] mt-1">Identity status is derived from user records in the database.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-6 w-6 text-[#0069ff]" />
            <h3 className="font-bold text-[#2e3d49] text-[15px]">Account Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-400">Active Users</span>
              <span className="font-bold text-[#24ad5f]">{activeUsers}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-400">Pending Review</span>
              <span className="font-bold text-amber-500">{pendingUsers}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-400">Blocked</span>
              <span className="font-bold text-red-500">{blockedUsers}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white border border-[#e5e8ed] rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#f3f5f9] bg-[#f8f9fa]">
            <h3 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Pending User Records</h3>
          </div>
          <div className="flex-1 divide-y divide-[#e5e8ed]">
            {loading ? (
              <div className="p-10 text-center text-gray-400 text-sm font-bold">Loading users from API...</div>
            ) : users.filter((user) => user.status === 'pending').length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm font-bold">No pending user records found.</div>
            ) : users.filter((user) => user.status === 'pending').map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#f3f5f9] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                    <Fingerprint className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#2e3d49]">{user.name}</p>
                    <p className="text-[11px] text-gray-500">{user.email} / ID: {user.id}</p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#f3f5f9] bg-[#f8f9fa] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Tiwlo Pay ID Verification</h3>
            <p className="mt-1 text-[12px] text-[#4a4a4a]">Review merchant identity data before approving payment collection.</p>
          </div>
          <button onClick={loadIdentity} className="inline-flex items-center justify-center gap-2 rounded border border-[#d8dee9] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] hover:border-blue-400">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="divide-y divide-[#e5e8ed]">
          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">Loading Tiwlo Pay verification records...</div>
          ) : pendingPayProfiles.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">No Tiwlo Pay ID verification needs review.</div>
          ) : pendingPayProfiles.map((profile) => {
            const verification = profile.settings?.verification || {};
            return (
              <div key={profile.id} className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-black text-[#2e3d49]">{verification.legalName || verification.businessName || profile.companyName || profile.displayName}</p>
                    <span className="rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">{verification.status || profile.status}</span>
                  </div>
                  <p className="mt-1 break-all text-[12px] font-medium text-gray-500">{profile.owner?.email || profile.ownerId} / {verification.documentType || 'No document type'} / {verification.country || 'No country'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedProfile(profile)} className="inline-flex items-center justify-center gap-2 rounded border border-[#d8dee9] px-3 py-2 text-[12px] font-bold text-[#374151] hover:bg-[#f8f9fa]">
                    <Eye className="h-4 w-4" /> View
                  </button>
                  <button onClick={() => updatePayProfile(profile.id, 'active')} disabled={savingId === profile.id} className="inline-flex items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => updatePayProfile(profile.id, 'inactive')} disabled={savingId === profile.id} className="inline-flex items-center justify-center gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="bg-white border border-[#e5e8ed] rounded-lg p-6">
        <h3 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide mb-4">Identity Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e5e8ed]">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">User</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Role</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-[13px] font-bold text-[#2e3d49]">{user.email}</td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">{user.role}</td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">{user.status}</td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg border border-[#e5e8ed] bg-white sm:rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-[#f3f5f9] px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-[#2e3d49]">Verification Details</h3>
                <p className="mt-1 text-[12px] text-gray-500">{selectedProfile.owner?.email || selectedProfile.ownerId}</p>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="rounded border border-[#d8dee9] px-3 py-2 text-[12px] font-bold text-[#374151]">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              {Object.entries(selectedProfile.settings?.verification || {}).map(([key, value]) => (
                <div key={key} className="rounded border border-[#e5e8ed] bg-[#f8f9fa] p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-1 break-words text-[13px] font-bold text-[#2e3d49]">{typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-[#f3f5f9] p-5 sm:flex-row sm:justify-end">
              <button onClick={() => updatePayProfile(selectedProfile.id, 'suspended')} disabled={savingId === selectedProfile.id} className="rounded border border-red-100 bg-red-50 px-4 py-2 text-[12px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">Suspend</button>
              <button onClick={() => updatePayProfile(selectedProfile.id, 'inactive')} disabled={savingId === selectedProfile.id} className="rounded border border-[#d8dee9] px-4 py-2 text-[12px] font-bold text-[#374151] hover:bg-[#f8f9fa] disabled:opacity-60">Reject</button>
              <button onClick={() => updatePayProfile(selectedProfile.id, 'active')} disabled={savingId === selectedProfile.id} className="rounded bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
