import React from 'react';
import { AlertCircle, Fingerprint, ShieldCheck } from 'lucide-react';
import { fetchUsersForAdmin } from '../../lib/tiwloApi';

export default function AdminIdentity() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetchUsersForAdmin()
      .then(setUsers)
      .catch((err) => {
        setUsers([]);
        setError(err instanceof Error ? err.message : 'Unable to load user identity data');
      })
      .finally(() => setLoading(false));
  }, []);

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const pendingUsers = users.filter((user) => user.status === 'pending').length;
  const blockedUsers = users.filter((user) => ['suspended', 'disabled', 'blocked'].includes(user.status)).length;

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
    </div>
  );
}
