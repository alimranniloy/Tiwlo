import React from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Film,
  Flag,
  MessageCircle,
  Radio,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  Users
} from 'lucide-react';
import {
  adminDeleteSocialPostWithApi,
  adminResolveSocialReportWithApi,
  adminUpdateSocialSettingsWithApi,
  adminUpdateSocialUserStatusWithApi,
  adminVerifySocialProfileWithApi,
  deleteUserWithApi,
  fetchAdminSocialOverviewWithApi,
  fetchAdminSocialPostsWithApi,
  fetchAdminSocialReportsWithApi,
  fetchAdminSocialUsersWithApi,
  fetchSocialSettingsWithApi
} from '../../lib/tiwloApi';

type Tab = 'users' | 'posts' | 'reports' | 'settings';

const dateLabel = (value?: string) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '-';
};

const Toggle = ({ checked, onChange, label, detail }: { checked: boolean; onChange: (value: boolean) => void; label: string; detail: string }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 rounded border border-[#e5e8ed] bg-white p-4">
    <span>
      <span className="block text-[13px] font-bold text-[#2e3d49]">{label}</span>
      <span className="mt-1 block text-[11px] text-gray-500">{detail}</span>
    </span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#0069ff]" />
  </label>
);

export default function AdminSocial() {
  const [tab, setTab] = React.useState<Tab>('users');
  const [overview, setOverview] = React.useState<any>({});
  const [users, setUsers] = React.useState<any[]>([]);
  const [posts, setPosts] = React.useState<any[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [settings, setSettings] = React.useState<any>({});
  const [stunJson, setStunJson] = React.useState('[]');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summary, socialUsers, socialPosts, socialReports, socialSettings] = await Promise.all([
        fetchAdminSocialOverviewWithApi(),
        fetchAdminSocialUsersWithApi(search || undefined),
        fetchAdminSocialPostsWithApi(undefined, undefined, search || undefined),
        fetchAdminSocialReportsWithApi(),
        fetchSocialSettingsWithApi()
      ]);
      setOverview(summary || {});
      setUsers(socialUsers || []);
      setPosts(socialPosts || []);
      setReports(socialReports || []);
      setSettings(socialSettings || {});
      setStunJson(JSON.stringify(socialSettings?.stunServers || [], null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Social controls');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const perform = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social action failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = (profile: any) => {
    if (!window.confirm(`Permanently delete ${profile.user?.email || profile.username} and all related Social data?`)) return;
    perform(() => deleteUserWithApi(profile.userId), 'User and related Social data deleted.');
  };

  const deletePost = (post: any) => {
    if (!window.confirm('Delete this post from every feed?')) return;
    perform(() => adminDeleteSocialPostWithApi(post.id), 'Post removed from Social feeds.');
  };

  const saveSettings = async () => {
    let stunServers: unknown;
    try {
      stunServers = JSON.parse(stunJson);
      if (!Array.isArray(stunServers)) throw new Error('STUN/TURN configuration must be a JSON array.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid STUN/TURN JSON');
      return;
    }
    await perform(() => adminUpdateSocialSettingsWithApi({
      enabled: Boolean(settings.enabled),
      registrationsEnabled: Boolean(settings.registrationsEnabled),
      postingEnabled: Boolean(settings.postingEnabled),
      messagingEnabled: Boolean(settings.messagingEnabled),
      callsEnabled: Boolean(settings.callsEnabled),
      liveEnabled: Boolean(settings.liveEnabled),
      mediaMaxMb: Number(settings.mediaMaxMb || 500),
      autoTranscode: Boolean(settings.autoTranscode),
      moderation: settings.moderation || {},
      stunServers
    }), 'Social settings saved.');
  };

  const stats = [
    { label: 'Social Users', value: overview.profiles || 0, icon: Users },
    { label: 'Verified', value: overview.verifiedProfiles || 0, icon: BadgeCheck },
    { label: 'Posts', value: overview.posts || 0, icon: Film },
    { label: 'Messages', value: overview.messages || 0, icon: MessageCircle },
    { label: 'Live Now', value: overview.activeLiveStreams || 0, icon: Radio },
    { label: 'Open Reports', value: overview.openReports || 0, icon: Flag }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Social</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Control users, verified badges, content, reports, calls, live streaming and media processing.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center justify-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {notice && <div className="flex items-center gap-2 rounded border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700"><CheckCircle2 className="h-4 w-4" /> {notice}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded border border-[#e5e8ed] bg-white p-4">
            <div className="flex items-center justify-between text-gray-400"><span className="text-[9px] font-black uppercase tracking-widest">{label}</span><Icon className="h-4 w-4" /></div>
            <p className="mt-2 text-2xl font-black text-[#2e3d49]">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded border border-[#e5e8ed] bg-white p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            ['users', 'Users', Users],
            ['posts', 'Posts & Reels', Film],
            ['reports', 'Reports', Flag],
            ['settings', 'Settings', Settings]
          ] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded px-4 py-2 text-[12px] font-bold ${tab === key ? 'bg-[#0069ff] text-white' : 'text-[#4a4a4a] hover:bg-gray-50'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {tab !== 'settings' && (
          <label className="flex min-w-[260px] items-center gap-2 rounded border border-[#e5e8ed] px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search real database records" className="w-full text-[12px] outline-none" />
          </label>
        )}
      </div>

      {tab === 'users' && (
        <div className="overflow-x-auto rounded border border-[#e5e8ed] bg-white">
          <table className="w-full min-w-[900px] text-left text-[12px]">
            <thead className="bg-[#f8f9fa] text-[10px] font-black uppercase tracking-wider text-gray-500"><tr><th className="p-4">Profile</th><th className="p-4">Reach</th><th className="p-4">Badge</th><th className="p-4">Account status</th><th className="p-4">Created</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading ? <tr><td colSpan={6} className="p-12 text-center font-bold text-gray-400">Loading Social users...</td></tr> : users.length === 0 ? <tr><td colSpan={6} className="p-12 text-center font-bold text-gray-400">No Social profiles yet.</td></tr> : users.map((profile) => (
                <tr key={profile.id} className="hover:bg-[#f8f9fa]">
                  <td className="p-4"><div className="flex items-center gap-3"><img src={profile.user?.avatar || '/brand/icon.png'} className="h-10 w-10 rounded-full border object-cover" /><div><p className="font-black text-[#2e3d49]">{profile.user?.name} {profile.verified && <BadgeCheck className="inline h-4 w-4 text-[#0069ff]" />}</p><p className="text-gray-500">@{profile.username} · {profile.user?.email}</p></div></div></td>
                  <td className="p-4 text-gray-600"><span className="font-bold">{profile.followerCount}</span> followers · <span className="font-bold">{profile.postCount}</span> posts</td>
                  <td className="p-4"><button disabled={saving} onClick={() => perform(() => adminVerifySocialProfileWithApi(profile.userId, !profile.verified), profile.verified ? 'Verified badge removed.' : 'Verified badge granted.')} className={`rounded border px-3 py-1.5 font-bold ${profile.verified ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>{profile.verified ? 'Verified' : 'Not verified'}</button></td>
                  <td className="p-4"><select value={profile.user?.status || 'active'} disabled={saving} onChange={(event) => perform(() => adminUpdateSocialUserStatusWithApi(profile.userId, event.target.value), 'Social user status updated.')} className="rounded border border-[#e5e8ed] bg-white px-2 py-1.5 font-bold"><option value="active">active</option><option value="suspended">suspended</option><option value="banned">banned</option><option value="disabled">disabled</option></select></td>
                  <td className="p-4 text-gray-500">{dateLabel(profile.createdAt)}</td>
                  <td className="p-4 text-right"><button disabled={saving} onClick={() => deleteUser(profile)} className="rounded border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete user"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'posts' && (
        <div className="space-y-3">
          {loading ? <div className="rounded border bg-white p-12 text-center text-sm font-bold text-gray-400">Loading content...</div> : posts.length === 0 ? <div className="rounded border bg-white p-12 text-center text-sm font-bold text-gray-400">No posts or reels found.</div> : posts.map((post) => (
            <div key={post.id} className="flex flex-col gap-4 rounded border border-[#e5e8ed] bg-white p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">{post.type}</span><span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-black uppercase text-gray-600">{post.status}</span><span className="text-[11px] text-gray-400">{dateLabel(post.createdAt)}</span></div><p className="mt-2 truncate text-[13px] font-bold text-[#2e3d49]">{post.body || '(media only)'}</p><p className="mt-1 text-[11px] text-gray-500">{post.author?.name} · {post.author?.email} · {post.reactionCount} reactions · {post.commentCount} comments · {post.viewCount} views</p></div>
              <button disabled={saving || post.status === 'deleted'} onClick={() => deletePost(post)} className="flex shrink-0 items-center justify-center gap-2 rounded border border-red-100 px-3 py-2 text-[12px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? <div className="rounded border bg-white p-12 text-center text-sm font-bold text-gray-400">No moderation reports.</div> : reports.map((report) => (
            <div key={report.id} className="flex flex-col gap-4 rounded border border-[#e5e8ed] bg-white p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Flag className="h-4 w-4 text-amber-600" /><p className="font-bold text-[#2e3d49]">{report.reason}</p><span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-600">{report.status}</span></div><p className="mt-1 text-[12px] text-gray-600">{report.targetType} / {report.targetId}</p><p className="mt-1 text-[11px] text-gray-400">{report.details || 'No additional details'} · {dateLabel(report.createdAt)}</p></div>{report.status === 'open' && <div className="flex gap-2"><button disabled={saving} onClick={() => perform(() => adminResolveSocialReportWithApi(report.id, 'dismissed', 'Dismissed by administrator'), 'Report dismissed.')} className="rounded border px-3 py-2 text-[12px] font-bold text-gray-600">Dismiss</button><button disabled={saving} onClick={() => perform(() => adminResolveSocialReportWithApi(report.id, 'resolved', 'Reviewed and actioned by administrator'), 'Report resolved.')} className="rounded bg-[#0069ff] px-3 py-2 text-[12px] font-bold text-white">Resolve</button></div>}</div>
          ))}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-5 rounded border border-[#e5e8ed] bg-[#f8f9fa] p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle checked={Boolean(settings.enabled)} onChange={(value) => setSettings({ ...settings, enabled: value })} label="Social service" detail="Master switch for every Social API and app screen." />
            <Toggle checked={Boolean(settings.registrationsEnabled)} onChange={(value) => setSettings({ ...settings, registrationsEnabled: value })} label="New Social profiles" detail="Allow platform users to activate their Social profile." />
            <Toggle checked={Boolean(settings.postingEnabled)} onChange={(value) => setSettings({ ...settings, postingEnabled: value })} label="Posts, news and reels" detail="Allow publishing, comments and reactions." />
            <Toggle checked={Boolean(settings.messagingEnabled)} onChange={(value) => setSettings({ ...settings, messagingEnabled: value })} label="SMS-style chat" detail="Allow conversations, delivery receipts and media messages." />
            <Toggle checked={Boolean(settings.callsEnabled)} onChange={(value) => setSettings({ ...settings, callsEnabled: value })} label="WebRTC audio/video calls" detail="Enable signaling and call sessions." />
            <Toggle checked={Boolean(settings.liveEnabled)} onChange={(value) => setSettings({ ...settings, liveEnabled: value })} label="Live streaming" detail="Enable RTMP ingest and HLS playback sessions." />
            <Toggle checked={Boolean(settings.autoTranscode)} onChange={(value) => setSettings({ ...settings, autoTranscode: value })} label="Automatic FFmpeg quality" detail="Create 360p, 480p and 720p HLS variants after video upload." />
            <label className="rounded border border-[#e5e8ed] bg-white p-4"><span className="block text-[13px] font-bold text-[#2e3d49]">Maximum upload size (MB)</span><input type="number" min={1} max={2048} value={settings.mediaMaxMb || 500} onChange={(event) => setSettings({ ...settings, mediaMaxMb: Number(event.target.value) })} className="mt-3 w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm outline-none focus:border-[#0069ff]" /></label>
          </div>
          <label className="block rounded border border-[#e5e8ed] bg-white p-4"><span className="text-[13px] font-bold text-[#2e3d49]">WebRTC STUN/TURN servers</span><p className="mt-1 text-[11px] text-gray-500">JSON array passed to Android PeerConnection configuration. Add production TURN credentials here.</p><textarea rows={8} value={stunJson} onChange={(event) => setStunJson(event.target.value)} className="mt-3 w-full rounded border border-[#e5e8ed] p-3 font-mono text-[12px] outline-none focus:border-[#0069ff]" /></label>
          <div className="flex justify-end"><button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Social Settings'}</button></div>
        </div>
      )}

      {!settings.enabled && <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700"><Ban className="h-4 w-4" /> Social is disabled. Existing database records are preserved.</div>}
    </div>
  );
}
