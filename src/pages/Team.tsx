import React from 'react';
import {
  AlertCircle,
  Check,
  Edit3,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { deleteUserWithApi, fetchUsersForAdmin, updateUserWithApi } from '../lib/tiwloApi';
import { User } from '../types';
import { useActionConfirmation } from '../components/ActionConfirmation';

function roleLabel(role: string) {
  if (role === 'super_admin') return 'Owner';
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Manager';
  if (role === 'staff') return 'Developer';
  return role || 'User';
}

interface TeamPageProps {
  user?: User;
}

export default function TeamPage({ user }: TeamPageProps) {
  const isAdminUser = ['admin', 'super_admin'].includes(String(user?.role || ''));
  const [members, setMembers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [editing, setEditing] = React.useState<any>(null);
  const [form, setForm] = React.useState({ name: '', email: '', role: 'user', status: 'active' });
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadMembers = React.useCallback(() => {
    if (!isAdminUser) {
      setMembers([]);
      setError('');
      setIsLoading(false);
      return;
    }
    setError('');
    setIsLoading(true);
    fetchUsersForAdmin(search || undefined)
      .then(setMembers)
      .catch((err) => {
        setMembers([]);
        setError(err instanceof Error ? err.message : 'Unable to load team members');
      })
      .finally(() => setIsLoading(false));
  }, [isAdminUser, search]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadMembers, 200);
    return () => window.clearTimeout(timer);
  }, [loadMembers]);

  const openEdit = async (member: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit team member?',
      message: 'Are you sure you want to edit this team member?',
      resourceName: member.email || member.name
    });
    if (!confirmed) return;

    setEditing(member);
    setForm({
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'user',
      status: member.status || 'active'
    });
  };

  const saveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setError('');
    setSuccess('');
    try {
      const updated = await updateUserWithApi({ id: editing.id, ...form });
      setMembers((current) => current.map((member) => member.id === updated.id ? updated : member));
      setEditing(null);
      setSuccess('Team member updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update member');
    }
  };

  const deleteMember = async (member: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete team member?',
      message: 'Are you sure you want to delete this team member?',
      resourceName: member.email || member.name
    });
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await deleteUserWithApi(member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setSuccess('Team member deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete member');
    }
  };

  if (!isAdminUser) {
    return (
      <div className="mx-auto max-w-[1220px] space-y-8 pb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">Team Access</h1>
          <p className="mt-1 text-sm font-medium text-[#52637a]">Your user dashboard does not include administrator user-management controls.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { title: 'Account Profile', description: 'Update your own profile, phone, and region from account settings.', icon: ShieldCheck },
            { title: 'Billing Access', description: 'Add credit, pay invoices, and review usage from the billing dashboard.', icon: Shield },
            { title: 'Need More Access?', description: 'Open a support ticket if you need team or organization features enabled.', icon: Users }
          ].map((item) => (
            <div key={item.title} className="space-y-4 rounded-md border border-[#d9e1ec] bg-white p-6 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">Team Management</h1>
          <p className="mt-1 text-sm font-medium text-[#52637a]">Users and roles are loaded from the real users API.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-[#cdd6e3] bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-[#0069ff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10 md:w-72"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600 shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700 shadow-sm">
          <Check className="mt-0.5 h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e4e9f1] bg-[#f7f9fc]">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Member</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Role</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Updated</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading && <tr><td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-gray-400">Loading team from API...</td></tr>}
              {!isLoading && members.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No team members found.</td></tr>}
              {!isLoading && members.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-[#f7faff]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#111827] text-sm font-bold text-white">
                        {(member.name || member.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#111827]">{member.name}</p>
                        <p className="text-[12px] text-[#6B7280]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {member.role === 'super_admin' && <ShieldCheck className="h-4 w-4 text-blue-600" />}
                      {member.role === 'admin' && <Shield className="h-4 w-4 text-orange-500" />}
                      {member.role === 'manager' && <ShieldAlert className="h-4 w-4 text-green-500" />}
                      <span className="text-[13px] font-medium capitalize text-[#374151]">{roleLabel(member.role)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      member.status === 'active' ? 'border-green-100 bg-green-50 text-green-600' : 'border-yellow-100 bg-yellow-50 text-yellow-600'
                    }`}>
                      {member.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[#6B7280]">{member.updatedAt ? new Date(member.updatedAt).toLocaleString() : 'Not available'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(member)} className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-[#111827]" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMember(member)} className="rounded p-2 text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { title: 'Admin', description: 'Full platform access for system operations.', icon: ShieldCheck },
          { title: 'Manager', description: 'Operational access for resource and account handling.', icon: ShieldAlert },
          { title: 'Developer', description: 'Limited technical access for infrastructure work.', icon: Users }
        ].map((item) => (
          <div key={item.title} className="space-y-4 rounded-md border border-[#d9e1ec] bg-white p-6 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Role: {item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveMember} className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-[#111827]">Edit Team Member</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Name</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Email</span>
                <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Role</span>
                  <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none">
                    <option value="user">User</option>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none">
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => setEditing(null)} className="rounded border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button className="rounded bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
