import React from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Film,
  Flag,
  Layers3,
  MessageCircle,
  Radio,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users
} from 'lucide-react';
import {
  adminDeleteSocialPostWithApi,
  adminResolveSocialReportWithApi,
  adminUpdateSocialSettingsWithApi,
  adminUpdateSocialUserStatusWithApi,
  adminSetSocialBadgeWithApi,
  adminArchiveSocialProfileDecorationWithApi,
  adminArchiveSocialProfileEffectWithApi,
  adminUpsertSocialProfileDecorationWithApi,
  adminUpsertSocialProfileEffectWithApi,
  deleteUserWithApi,
  fetchAdminSocialAiOverviewWithApi,
  fetchAdminSocialOverviewWithApi,
  fetchAdminSocialModerationEventsWithApi,
  fetchAdminSocialPostsWithApi,
  fetchAdminSocialReportsWithApi,
  fetchAdminSocialUsersWithApi,
  fetchAdminSocialProfileDecorationsWithApi,
  fetchAdminSocialProfileEffectsWithApi,
  fetchSocialSettingsWithApi,
  operateAdminSocialAiWithApi,
  resolveAdminSocialAiCaseWithApi,
  updateAdminSocialAiSettingsWithApi,
  uploadSocialProfileDecorationWithApi,
  uploadSocialProfileEffectWithApi
} from '../../lib/tiwloApi';

type Tab = 'users' | 'posts' | 'reports' | 'automation' | 'ai' | 'decorations' | 'effects' | 'settings';

const emptyDecoration = { id: '', name: '', assetUrl: '', fileName: '', mimeType: 'image/png', animated: false, width: 288, height: 288, priceUsd: 0, status: 'active', sortOrder: 0 };
const emptyEffect = { ...emptyDecoration, width: 450, height: 880 };

const editableDecoration = (item: any = {}) => ({
  ...emptyDecoration,
  id: item.id || '',
  slug: item.slug || '',
  name: item.name || '',
  assetUrl: item.assetUrl || '',
  fileName: item.fileName || '',
  mimeType: item.mimeType || 'image/png',
  animated: Boolean(item.animated),
  width: Number(item.width || 288),
  height: Number(item.height || 288),
  priceUsd: Number(item.priceUsd || 0),
  status: item.status || 'active',
  sortOrder: Number(item.sortOrder || 0)
});

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

// A failed or partially upgraded Social AI response must never blank the
// complete Social administration area. The boundary keeps the remaining
// Social tools usable and gives the administrator an actionable recovery UI.
class SocialAiPanelBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Social AI panel render failed', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="rounded border border-red-200 bg-white p-5 text-[12px] text-slate-700">
          <div className="flex items-center gap-2 font-black text-red-700"><AlertCircle className="h-4 w-4" /> Social AI could not render this response</div>
          <p className="mt-2 leading-5">The Social AI page is isolated so the rest of Social remains available. Refresh this page after the backend deployment completes; no global Admin AI configuration was changed.</p>
        </section>
      );
    }
    return this.props.children;
  }
}

const aiFeatureLabels: Record<string, string> = {
  verification: 'Blue verification & identity review', reportReview: 'Report investigation', postReview: 'Post review', commentReview: 'Comment review', messageModeration: 'Private-message moderation', imageModeration: 'Image moderation', videoCaptionModeration: 'Video & caption moderation', spam: 'Spam detection', scam: 'Scam detection', fakeAccount: 'Fake-account detection', fakeProfile: 'Fake-profile detection', impersonation: 'Impersonation detection', harassment: 'Harassment detection', hateSpeech: 'Hate-speech detection', threat: 'Threat detection', weaponSale: 'Weapon-sale detection', drugSale: 'Drug-sale detection', adultContent: 'Adult-content detection', violence: 'Violence detection', selfHarm: 'Self-harm detection', copyright: 'Copyright & duplicate content', warning: 'Private warnings', strike: 'Strike system', appeal: 'Appeal review', notificationAutomation: 'Notification automation'
};

export default function AdminSocial() {
  const [tab, setTab] = React.useState<Tab>('users');
  const [overview, setOverview] = React.useState<any>({});
  const [users, setUsers] = React.useState<any[]>([]);
  const [posts, setPosts] = React.useState<any[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [moderationEvents, setModerationEvents] = React.useState<any[]>([]);
  const [decorations, setDecorations] = React.useState<any[]>([]);
  const [decorationForm, setDecorationForm] = React.useState<any>(emptyDecoration);
  const [decorationFile, setDecorationFile] = React.useState<File | null>(null);
  const [decorationPreview, setDecorationPreview] = React.useState('');
  const [effects, setEffects] = React.useState<any[]>([]);
  const [effectForm, setEffectForm] = React.useState<any>(emptyEffect);
  const [effectFile, setEffectFile] = React.useState<File | null>(null);
  const [effectPreview, setEffectPreview] = React.useState('');
  const [settings, setSettings] = React.useState<any>({});
  const [aiOverview, setAiOverview] = React.useState<any>(null);
  const [aiLogs, setAiLogs] = React.useState<string[]>([]);
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
      const [summary, socialUsers, socialPosts, socialReports, automationEvents, socialDecorations, socialEffects, socialSettings, socialAi] = await Promise.all([
        fetchAdminSocialOverviewWithApi(),
        fetchAdminSocialUsersWithApi(search || undefined),
        fetchAdminSocialPostsWithApi(undefined, undefined, search || undefined),
        fetchAdminSocialReportsWithApi(),
        fetchAdminSocialModerationEventsWithApi(),
        fetchAdminSocialProfileDecorationsWithApi(),
        fetchAdminSocialProfileEffectsWithApi(),
        fetchSocialSettingsWithApi(),
        fetchAdminSocialAiOverviewWithApi()
      ]);
      setOverview(summary || {});
      setUsers(socialUsers || []);
      setPosts(socialPosts || []);
      setReports(socialReports || []);
      setModerationEvents(automationEvents || []);
      setDecorations(socialDecorations || []);
      setEffects(socialEffects || []);
      setSettings(socialSettings || {});
      setAiOverview(socialAi || null);
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
      profileEffects: {
        replayIntervalSeconds: Math.max(0, Math.min(Number(settings.profileEffects?.replayIntervalSeconds) || 0, 3600)),
        loopCount: Math.max(1, Math.min(Number(settings.profileEffects?.loopCount) || 2, 10))
      },
      stunServers,
      verificationPackages: Array.isArray(settings.verificationPackages) ? settings.verificationPackages : []
    }), 'Social settings saved.');
  };

  const saveAiSettings = async (next: Record<string, unknown>) => {
    if (aiOverview?.unavailable) {
      setError(aiOverview.unavailableMessage || 'Social AI is unavailable. Restore the backend connection before changing AI settings.');
      return;
    }
    await perform(async () => {
      const updated = await updateAdminSocialAiSettingsWithApi(next);
      setAiOverview(updated);
    }, 'Social AI settings saved. Required packages and models are queued automatically.');
  };

  const operateAi = async (scope: string, action: string, id?: string) => {
    if (aiOverview?.unavailable) {
      setError(aiOverview.unavailableMessage || 'Social AI is unavailable. Restore the backend connection before running AI actions.');
      return;
    }
    await perform(async () => {
      const result = await operateAdminSocialAiWithApi({ scope, action, id });
      const managerLogs = Array.isArray(result?.logs?.logs) ? result.logs.logs : Array.isArray(result?.health?.logs) ? result.health.logs : [];
      if (managerLogs.length) setAiLogs(managerLogs.map(String));
    }, action === 'logs' ? 'Live package logs loaded.' : 'Social AI operation was added to the persistent queue.');
  };

  const resolveAiCase = async (id: string, action: string) => {
    if (aiOverview?.unavailable) {
      setError(aiOverview.unavailableMessage || 'Social AI is unavailable. Restore the backend connection before resolving AI cases.');
      return;
    }
    await perform(() => resolveAdminSocialAiCaseWithApi(id, { action }), `Social AI case ${action.replace(/_/g, ' ')}.`);
  };

  const chooseDecorationFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      setError('Choose a PNG or animated PNG (APNG) file.');
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const animated = bytes.some((value, index) => value === 0x61 && bytes[index + 1] === 0x63 && bytes[index + 2] === 0x54 && bytes[index + 3] === 0x4c);
    let width = 288;
    let height = 288;
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch { /* dimensions stay at the recommended default */ }
    if (decorationPreview.startsWith('blob:')) URL.revokeObjectURL(decorationPreview);
    const preview = URL.createObjectURL(file);
    setDecorationFile(file);
    setDecorationPreview(preview);
    setDecorationForm((current: any) => ({ ...current, name: current.name || file.name.replace(/\.png$/i, '').replace(/[_-]+/g, ' '), fileName: file.name, mimeType: 'image/png', animated, width, height }));
  };

  const resetDecorationForm = () => {
    if (decorationPreview.startsWith('blob:')) URL.revokeObjectURL(decorationPreview);
    setDecorationForm(emptyDecoration);
    setDecorationFile(null);
    setDecorationPreview('');
  };

  const saveDecoration = async () => {
    if (!decorationForm.name.trim()) { setError('Decoration name is required.'); return; }
    if (!decorationFile && !decorationForm.assetUrl) { setError('Choose a PNG or APNG file.'); return; }
    await perform(async () => {
      const upload = decorationFile ? await uploadSocialProfileDecorationWithApi(decorationFile) : null;
      await adminUpsertSocialProfileDecorationWithApi({
        id: decorationForm.id || undefined,
        slug: decorationForm.slug || undefined,
        name: decorationForm.name.trim(),
        assetUrl: upload?.sourceUrl || decorationForm.assetUrl,
        fileName: decorationFile?.name || decorationForm.fileName,
        mimeType: upload?.mimeType || decorationForm.mimeType || 'image/png',
        animated: Boolean(decorationForm.animated),
        width: Number(decorationForm.width || 288),
        height: Number(decorationForm.height || 288),
        priceUsd: Number(decorationForm.priceUsd || 0),
        status: decorationForm.status || 'active',
        sortOrder: Number(decorationForm.sortOrder || 0)
      });
      resetDecorationForm();
    }, decorationForm.id ? 'Profile decoration updated.' : 'Profile decoration uploaded.');
  };

  const chooseEffectFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      setError('Choose a PNG or animated PNG (APNG) profile effect.');
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const animated = bytes.some((value, index) => value === 0x61 && bytes[index + 1] === 0x63 && bytes[index + 2] === 0x54 && bytes[index + 3] === 0x4c);
    let width = 450;
    let height = 880;
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch { /* dimensions stay at the recommended profile-canvas default */ }
    if (effectPreview.startsWith('blob:')) URL.revokeObjectURL(effectPreview);
    setEffectFile(file);
    setEffectPreview(URL.createObjectURL(file));
    setEffectForm((current: any) => ({ ...current, name: current.name || file.name.replace(/\.png$/i, '').replace(/[_-]+/g, ' '), fileName: file.name, mimeType: 'image/png', animated, width, height }));
  };

  const resetEffectForm = () => {
    if (effectPreview.startsWith('blob:')) URL.revokeObjectURL(effectPreview);
    setEffectForm(emptyEffect);
    setEffectFile(null);
    setEffectPreview('');
  };

  const saveEffect = async () => {
    if (!effectForm.name.trim()) { setError('Profile effect name is required.'); return; }
    if (!effectFile && !effectForm.assetUrl) { setError('Choose a PNG or APNG profile effect.'); return; }
    await perform(async () => {
      const upload = effectFile ? await uploadSocialProfileEffectWithApi(effectFile) : null;
      await adminUpsertSocialProfileEffectWithApi({
        id: effectForm.id || undefined,
        slug: effectForm.slug || undefined,
        name: effectForm.name.trim(),
        assetUrl: upload?.sourceUrl || effectForm.assetUrl,
        fileName: effectFile?.name || effectForm.fileName,
        mimeType: upload?.mimeType || effectForm.mimeType || 'image/png',
        animated: Boolean(effectForm.animated),
        width: Number(effectForm.width || 450),
        height: Number(effectForm.height || 880),
        priceUsd: Number(effectForm.priceUsd || 0),
        status: effectForm.status || 'active',
        sortOrder: Number(effectForm.sortOrder || 0)
      });
      resetEffectForm();
    }, effectForm.id ? 'Profile effect updated.' : 'Profile effect uploaded.');
  };

  const stats = [
    { label: 'Social Users', value: overview.profiles || 0, icon: Users },
    { label: 'Verified', value: overview.verifiedProfiles || 0, icon: BadgeCheck },
    { label: 'Posts', value: overview.posts || 0, icon: Film },
    { label: 'Messages', value: overview.messages || 0, icon: MessageCircle },
    { label: 'Live Now', value: overview.activeLiveStreams || 0, icon: Radio },
    { label: 'Open Reports', value: overview.openReports || 0, icon: Flag }
  ];
  const asRecord = (value: any) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const asArray = (value: any) => Array.isArray(value) ? value : [];
  const ai = asRecord(aiOverview);
  const aiSettings = asRecord(ai.settings);
  const aiHealth = asRecord(ai.health);
  const aiCatalog = asRecord(ai.catalog);
  const aiPackages = asRecord(aiHealth.packages);
  const aiModels = asRecord(aiHealth.models);
  const aiCatalogPackages = asArray(aiCatalog.packages);
  const aiCatalogModels = asArray(aiCatalog.models);
  const aiRunningFeatures = asArray(ai.runningFeatures);
  const aiJobs = asArray(ai.jobs);
  const aiCases = asArray(ai.cases);
  const aiFeatureSettings = asRecord(aiSettings.features);
  const aiSchemaUnavailable = Boolean(ai.schemaUnavailable);
  const aiUnavailable = Boolean(ai.unavailable);

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
            ['automation', 'Automation', Ban],
            ['ai', 'AI', Sparkles],
            ['decorations', 'Profile decor', Sparkles],
            ['effects', 'Profile effects', Layers3],
            ['settings', 'Settings', Settings]
          ] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded px-4 py-2 text-[12px] font-bold ${tab === key ? 'bg-[#0069ff] text-white' : 'text-[#4a4a4a] hover:bg-gray-50'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {tab !== 'settings' && tab !== 'ai' && tab !== 'decorations' && tab !== 'effects' && (
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
                  <td className="p-4"><div className="flex items-center gap-3"><img src={profile.user?.avatar || '/brand/icon.png'} className="h-10 w-10 rounded-full border object-cover" /><div><p className="font-black text-[#2e3d49]">{profile.user?.name} {profile.verified && <BadgeCheck className={`inline h-4 w-4 ${profile.badgeType === 'gold' ? 'text-amber-500' : 'text-[#0069ff]'}`} />}</p><p className="text-gray-500">@{profile.username} · {profile.user?.email}</p></div></div></td>
                  <td className="p-4 text-gray-600"><span className="font-bold">{profile.followerCount}</span> followers · <span className="font-bold">{profile.postCount}</span> posts</td>
                  <td className="p-4"><select value={profile.badgeType || (profile.verified ? 'blue' : 'none')} disabled={saving} onChange={(event) => perform(() => adminSetSocialBadgeWithApi(profile.userId, event.target.value, 'admin'), 'Social badge updated.')} className={`rounded border px-3 py-1.5 font-bold ${profile.badgeType === 'gold' ? 'border-amber-200 bg-amber-50 text-amber-700' : profile.verified ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}><option value="none">No badge</option><option value="blue">Blue badge</option><option value="gold">Gold badge</option></select></td>
                  <td className="p-4"><select value={profile.user?.status || 'active'} disabled={saving} onChange={(event) => perform(() => adminUpdateSocialUserStatusWithApi(profile.userId, event.target.value, event.target.value === 'active' ? 'Restriction cleared by administrator' : `Manually ${event.target.value} by Social administrator`), 'Social user status updated.')} className="rounded border border-[#e5e8ed] bg-white px-2 py-1.5 font-bold"><option value="active">active</option><option value="suspended">suspended</option><option value="banned">banned</option><option value="disabled">disabled</option></select>{profile.user?.socialRestrictionReason && <div className="mt-2 max-w-[260px] rounded border border-red-100 bg-red-50 p-2 text-[10px] font-bold text-red-700"><p>{profile.user.socialRestrictionReason}</p><p className="mt-1 font-normal text-red-500">{profile.user.socialRestrictionCode || 'restriction'} · score {profile.user.socialModerationScore ?? '-'} · {dateLabel(profile.user.socialRestrictedAt)}</p></div>}</td>
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
            <div key={report.id} className="flex flex-col gap-4 rounded border border-[#e5e8ed] bg-white p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Flag className="h-4 w-4 text-amber-600" /><p className="font-bold text-[#2e3d49]">{report.reason}</p><span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-600">{report.status}</span></div><p className="mt-1 text-[12px] text-gray-600">{report.targetType} / {report.targetId}</p><p className="mt-1 text-[11px] text-gray-400">{report.details || 'No additional details'} · {dateLabel(report.createdAt)}</p></div>{report.status === 'open' && <div className="flex flex-wrap gap-2">{report.targetType === 'post' && <button disabled={saving} onClick={() => perform(() => adminDeleteSocialPostWithApi(report.targetId), 'Reported post removed.')} className="rounded border border-red-100 px-3 py-2 text-[12px] font-bold text-red-600">Remove post</button>}{report.targetType === 'profile' && <button disabled={saving} onClick={() => perform(() => adminUpdateSocialUserStatusWithApi(report.targetId, 'suspended'), 'Reported profile suspended.')} className="rounded border border-amber-200 px-3 py-2 text-[12px] font-bold text-amber-700">Suspend profile</button>}{report.targetType === 'verification' && <button disabled={saving} onClick={() => perform(async () => { await adminSetSocialBadgeWithApi(report.targetId, 'gold', 'notable'); await adminResolveSocialReportWithApi(report.id, 'resolved', 'Gold notable badge granted by administrator'); }, 'Gold notable badge granted.')} className="rounded bg-amber-500 px-3 py-2 text-[12px] font-bold text-white">Grant Gold</button>}<button disabled={saving} onClick={() => perform(() => adminResolveSocialReportWithApi(report.id, 'dismissed', 'Dismissed by administrator'), 'Report dismissed.')} className="rounded border px-3 py-2 text-[12px] font-bold text-gray-600">Dismiss</button><button disabled={saving} onClick={() => perform(() => adminResolveSocialReportWithApi(report.id, 'resolved', 'Reviewed and actioned by administrator'), 'Report resolved.')} className="rounded bg-[#0069ff] px-3 py-2 text-[12px] font-bold text-white">Resolve</button></div>}</div>
          ))}
        </div>
      )}

      {tab === 'automation' && (
        <div className="space-y-3">
          <div className="rounded border border-blue-100 bg-blue-50 p-4 text-[12px] text-blue-800">
            <p className="font-black">Server-side Social safety decisions</p>
            <p className="mt-1">Public profile, post, comment and uploaded visual media decisions are recorded here. Private chat messages are not inspected by this pipeline.</p>
          </div>
          {moderationEvents.length === 0 ? <div className="rounded border bg-white p-12 text-center text-sm font-bold text-gray-400">No automated moderation decisions recorded.</div> : moderationEvents.map((event) => (
            <div key={event.id} className={`rounded border bg-white p-5 ${event.decision === 'block' ? 'border-red-200' : event.decision === 'review' ? 'border-amber-200' : 'border-[#e5e8ed]'}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><Ban className={`h-4 w-4 ${event.decision === 'block' ? 'text-red-600' : 'text-amber-600'}`} /><span className="font-black text-[#2e3d49]">{event.reason}</span><span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${event.decision === 'block' ? 'bg-red-50 text-red-700' : event.decision === 'review' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{event.decision}</span></div>
                  <p className="mt-2 text-[11px] text-gray-600">User {event.userId} · {event.targetType}{event.targetId ? ` / ${event.targetId}` : ''}{event.postId ? ` · post ${event.postId}` : ''}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{event.provider} · {event.category || 'unclassified'} · confidence {event.score ?? 0} · {dateLabel(event.createdAt)}</p>
                </div>
                {event.decision === 'block' && <button disabled={saving} onClick={() => perform(() => adminUpdateSocialUserStatusWithApi(event.userId, 'active', `Restriction cleared after reviewing moderation event ${event.id}`), 'User restored after moderation review.')} className="rounded border border-green-200 px-3 py-2 text-[12px] font-bold text-green-700">Review and restore</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'ai' && (
        <SocialAiPanelBoundary>
        <div className="space-y-5">
          <section className="overflow-hidden rounded border border-[#dce5f3] bg-white">
            <div className="grid gap-5 bg-[linear-gradient(115deg,#f8fbff_0%,#eef5ff_52%,#fbfaff_100%)] p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4169e1]">Social module only</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-[#26344a]">Social AI Control Center</h2>
                <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-600">Verification, reports, public content, optional private-message review, warnings, appeals and automation run from a persistent Social-only queue. The platform-wide Admin AI Model is not changed.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${aiUnavailable ? 'bg-red-100 text-red-700' : aiHealth.available ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{aiSchemaUnavailable ? 'Backend deploy required' : aiUnavailable ? 'Overview unavailable' : aiHealth.available ? 'Manager online' : 'Manager needs bootstrap'}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-slate-600">{aiRunningFeatures.length} automation features on</span>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-slate-600">{Number(ai.queue?.queued || 0)} queued</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:max-w-[300px] lg:justify-end">
                <button disabled={saving} onClick={() => operateAi('system', 'install_all')} className="flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2.5 text-[12px] font-black text-white disabled:opacity-50"><Sparkles className="h-4 w-4" /> Install all required</button>
                <button disabled={saving} onClick={() => operateAi('system', 'health_check')} className="flex items-center gap-2 rounded border border-[#cdd9ec] bg-white px-4 py-2.5 text-[12px] font-black text-[#36527c] disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Health check</button>
                <button disabled={saving} onClick={() => operateAi('system', 'repair_all')} className="flex items-center gap-2 rounded border border-[#cdd9ec] bg-white px-4 py-2.5 text-[12px] font-black text-[#36527c] disabled:opacity-50"><Settings className="h-4 w-4" /> Repair all</button>
              </div>
            </div>
            {aiUnavailable && <div className="border-t border-red-100 bg-red-50 px-5 py-4 text-[12px] leading-5 text-red-800"><p className="font-black">{aiSchemaUnavailable ? 'Social AI backend is not deployed on this server yet.' : 'Social AI overview could not be loaded.'}</p><p className="mt-1">{ai.unavailableMessage || 'The model catalog is shown below, but AI controls cannot run until this connection is restored.'}</p></div>}
            <div className="grid divide-y divide-[#e8edf5] border-t border-[#e8edf5] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Package health</p><p className="mt-1 text-lg font-black text-[#26344a]">{Object.values(aiPackages).filter((item: any) => (item as any)?.healthy).length}/{aiCatalogPackages.length}</p></div>
              <div className="p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Model health</p><p className="mt-1 text-lg font-black text-[#26344a]">{Object.values(aiModels).filter((item: any) => (item as any)?.healthy).length}/{aiCatalogModels.length}</p></div>
              <div className="p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Open review cases</p><p className="mt-1 text-lg font-black text-[#26344a]">{aiCases.filter((item: any) => ['open', 'manual_review', 'appeal_pending'].includes(item.status)).length}</p></div>
            </div>
          </section>

          <section className="rounded border border-[#e5e8ed] bg-white p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h3 className="text-[15px] font-black text-[#2e3d49]">Packages</h3><p className="mt-1 text-[11px] text-gray-500">Every action is sent to the persistent server queue. Status is read from the real package health check.</p></div><span className="rounded bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600">AUTO START {aiSettings.autoStart === false ? 'OFF' : 'ON'}</span></div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {aiCatalogPackages.map((item: any) => {
                const state = aiPackages[item.id] || {};
                return <article key={item.id} className="rounded border border-[#e5e8ed] p-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded bg-blue-50 text-[#0069ff]"><Sparkles className="h-4 w-4" /></span><div><h4 className="text-[13px] font-black text-[#2e3d49]">{item.name}</h4><p className="text-[10px] text-gray-500">{item.role}</p></div></div></div><span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${state.healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{state.healthy ? 'healthy' : state.status || 'offline'}</span></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} onClick={() => operateAi('package', 'install', item.id)} className="rounded border border-blue-200 px-2.5 py-1.5 text-[10px] font-black text-blue-700">Install</button><button disabled={saving} onClick={() => operateAi('package', 'enable', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Enable</button><button disabled={saving} onClick={() => operateAi('package', 'disable', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Disable</button><button disabled={saving} onClick={() => operateAi('package', 'update', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Update</button><button disabled={saving} onClick={() => operateAi('package', 'repair', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Repair</button><button disabled={saving} onClick={() => operateAi('package', state.healthy ? 'stop' : 'start', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">{state.healthy ? 'Stop' : 'Start'}</button><button disabled={saving} onClick={() => operateAi('package', 'restart', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Restart</button><button disabled={saving} onClick={() => operateAi('package', 'autostart', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Auto start</button><button disabled={saving} onClick={() => operateAi('package', 'health', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Test</button><button disabled={saving} onClick={() => operateAi('package', 'logs', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Logs</button></div></article>;
              })}
            </div>
          </section>

          <section className="rounded border border-[#e5e8ed] bg-white p-5">
            <div><h3 className="text-[15px] font-black text-[#2e3d49]">Models</h3><p className="mt-1 text-[11px] text-gray-500">Downloads resume on interruption and GGUF files are verified before the model can load.</p></div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {aiCatalogModels.map((item: any) => {
                const state = aiModels[item.id] || {};
                return <article key={item.id} className="rounded border border-[#e5e8ed] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-[#0069ff]">{item.kind} model</p><h4 className="mt-1 text-[13px] font-black text-[#2e3d49]">{item.name}</h4><p className="mt-1 text-[10px] text-gray-500">{item.file}</p></div><span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${state.healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{state.healthy ? 'verified' : state.status || 'missing'}</span></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} onClick={() => operateAi('model', 'download', item.id)} className="rounded border border-blue-200 px-2.5 py-1.5 text-[10px] font-black text-blue-700">Download</button><button disabled={saving} onClick={() => operateAi('model', 'install', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Install</button><button disabled={saving} onClick={() => operateAi('model', 'resume', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Resume</button><button disabled={saving} onClick={() => operateAi('model', 'repair', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Repair</button><button disabled={saving} onClick={() => operateAi('model', item.id === 'moderation-vision' ? 'health' : 'load', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">{item.id === 'moderation-vision' ? 'Verify' : 'Load & run'}</button><button disabled={saving} onClick={() => operateAi('model', 'restart', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Restart</button><button disabled={saving} onClick={() => operateAi('model', 'update', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Update</button>{item.id === 'text-policy' && <button disabled={saving} onClick={() => operateAi('model', 'default', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Set default</button>}<button disabled={saving} onClick={() => operateAi('model', 'autoload', item.id)} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Auto load</button>{!item.default && <button disabled={saving} onClick={() => operateAi('model', 'delete', item.id)} className="rounded border border-red-100 px-2.5 py-1.5 text-[10px] font-black text-red-600">Delete</button>}</div></article>;
              })}
            </div>
          </section>

          <section className="rounded border border-[#e5e8ed] bg-white p-5">
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-[15px] font-black text-[#2e3d49]">Social AI automation</h3><p className="mt-1 text-[11px] text-gray-500">Turning on a feature creates a real dependency-install task before that feature receives queue work. Private message review is off until explicitly enabled.</p></div><label className="flex items-center gap-2 text-[11px] font-black text-[#2e3d49]">System enabled<input type="checkbox" checked={aiSettings.enabled !== false} disabled={saving} onChange={(event) => saveAiSettings({ ...aiSettings, enabled: event.target.checked })} className="h-4 w-4 accent-[#0069ff]" /></label></div>
            <div className="mt-4"><Toggle checked={aiSettings.autoBootstrap !== false} onChange={(checked) => saveAiSettings({ ...aiSettings, autoBootstrap: checked })} label="Bootstrap after backend start" detail="Queue a full Social AI verification and repair pass when the backend starts. Package auto-start and health repair are controlled on each real package." /></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Object.entries(aiFeatureSettings).map(([key, value]) => <Toggle key={key} checked={Boolean(value)} onChange={(checked) => saveAiSettings({ ...aiSettings, features: { ...aiFeatureSettings, [key]: checked } })} label={aiFeatureLabels[key] || key} detail={checked ? 'Enabled — dependencies are enforced by queue.' : 'Off — no new Social data is sent to this feature.'} />)}</div>
            <div className="mt-5 border-t border-[#edf0f4] pt-5"><h4 className="text-[13px] font-black text-[#2e3d49]">Automatic action policy</h4><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Toggle checked={Boolean(aiSettings.automaticActions?.autoApproveVerification)} onChange={(checked) => saveAiSettings({ ...aiSettings, automaticActions: { ...(aiSettings.automaticActions || {}), autoApproveVerification: checked } })} label="Auto-approve verification" detail="Only on high-confidence evidence." /><Toggle checked={Boolean(aiSettings.automaticActions?.autoRejectVerification)} onChange={(checked) => saveAiSettings({ ...aiSettings, automaticActions: { ...(aiSettings.automaticActions || {}), autoRejectVerification: checked } })} label="Auto-reject verification" detail="Low-confidence cases stay manual." /><Toggle checked={Boolean(aiSettings.automaticActions?.removeContent)} onChange={(checked) => saveAiSettings({ ...aiSettings, automaticActions: { ...(aiSettings.automaticActions || {}), removeContent: checked } })} label="Auto-remove violating content" detail="Requires high confidence and policy action." /><Toggle checked={Boolean(aiSettings.automaticActions?.restrictAccount)} onChange={(checked) => saveAiSettings({ ...aiSettings, automaticActions: { ...(aiSettings.automaticActions || {}), restrictAccount: checked } })} label="Auto-restrict account" detail="Only critical high-confidence violations." /></div><label className="mt-4 block max-w-xs text-[10px] font-black uppercase tracking-wide text-gray-500">High confidence threshold<input type="number" min="0.5" max="0.995" step="0.005" value={aiSettings.automaticActions?.highConfidence ?? 0.92} onChange={(event) => saveAiSettings({ ...aiSettings, automaticActions: { ...(aiSettings.automaticActions || {}), highConfidence: Number(event.target.value) } })} className="mt-1 w-full rounded border border-[#dfe4ea] px-3 py-2 text-[12px] normal-case text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label></div>
          </section>

          <div className="grid gap-5 2xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded border border-[#e5e8ed] bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="text-[15px] font-black text-[#2e3d49]">AI queue</h3><p className="mt-1 text-[11px] text-gray-500">Persistent jobs survive backend restarts and deployment.</p></div><button disabled={saving} onClick={() => operateAi('system', 'health_check')} className="rounded border px-3 py-1.5 text-[10px] font-black text-slate-600">Refresh status</button></div><div className="mt-4 space-y-2">{aiJobs.slice(0, 12).map((job: any) => <div key={job.id} className="rounded border border-[#edf0f4] p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[12px] font-black text-[#2e3d49]">{String(job.type || 'job').replace(/_/g, ' ')}</p><p className="mt-1 text-[10px] text-gray-500">{job.phase} · attempt {job.attempts}/{job.maxAttempts}</p></div><span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${job.status === 'failed' ? 'bg-red-50 text-red-700' : job.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{job.status}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-[#0069ff]" style={{ width: `${Math.max(0, Math.min(100, Number(job.progress) || 0))}%` }} /></div>{job.error && <p className="mt-2 text-[10px] text-red-600">{job.error}</p>}</div>)}{!aiJobs.length && <p className="rounded border border-dashed p-6 text-center text-[11px] font-bold text-gray-400">No Social AI job has been queued yet.</p>}</div></section>
            <section className="rounded border border-[#e5e8ed] bg-white p-5"><h3 className="text-[15px] font-black text-[#2e3d49]">Manager logs</h3><p className="mt-1 text-[11px] text-gray-500">Actual service output from the selected package.</p><pre className="mt-4 min-h-[220px] max-h-[360px] overflow-auto rounded bg-[#101828] p-3 text-[10px] leading-5 text-slate-200">{aiLogs.length ? aiLogs.join('\n') : 'Select Logs on any package to load its latest server output.'}</pre></section>
          </div>

          <section className="rounded border border-[#e5e8ed] bg-white p-5"><div><h3 className="text-[15px] font-black text-[#2e3d49]">Warnings, strikes & appeals</h3><p className="mt-1 text-[11px] text-gray-500">Private case records are visible only to the affected user and authorised Social administrators.</p></div><div className="mt-4 space-y-3">{aiCases.slice(0, 30).map((socialCase: any) => { const reportedType = socialCase.evidence?.context?.target?.type; const canRemove = socialCase.sourceType === 'post' || socialCase.sourceType === 'comment' || (socialCase.sourceType === 'report' && ['post', 'comment'].includes(reportedType)); return <article key={socialCase.id} className="flex flex-col gap-3 rounded border border-[#edf0f4] p-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-black text-[#2e3d49]">{socialCase.subjectUser?.name || socialCase.subjectUserId}</p><span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-600">{socialCase.category || 'review'}</span><span className="rounded bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">{socialCase.severity}</span><span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">{socialCase.status}</span></div><p className="mt-1 text-[11px] text-gray-600">{socialCase.warningMessage || socialCase.recommendation || 'Social AI review recorded.'}</p><p className="mt-1 text-[10px] text-gray-400">{socialCase.sourceType} · confidence {Number(socialCase.confidence || 0).toFixed(2)} · strikes {socialCase.strikeCount} · appeal {socialCase.appealStatus}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button disabled={saving} onClick={() => resolveAiCase(socialCase.id, 'manual_review')} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Manual</button><button disabled={saving} onClick={() => resolveAiCase(socialCase.id, 'warn')} className="rounded border border-amber-200 px-2.5 py-1.5 text-[10px] font-black text-amber-700">Warn</button><button disabled={saving} onClick={() => resolveAiCase(socialCase.id, 'strike')} className="rounded border border-orange-200 px-2.5 py-1.5 text-[10px] font-black text-orange-700">Strike</button>{canRemove && <button disabled={saving} onClick={() => resolveAiCase(socialCase.id, 'remove_content')} className="rounded border border-red-100 px-2.5 py-1.5 text-[10px] font-black text-red-600">Remove</button>}<button disabled={saving} onClick={() => resolveAiCase(socialCase.id, 'restrict_account')} className="rounded border border-red-100 px-2.5 py-1.5 text-[10px] font-black text-red-600">Restrict</button><button disabled={saving} onClick={() => resolveAiCase(socialCase.id, 'dismiss')} className="rounded border px-2.5 py-1.5 text-[10px] font-black text-slate-600">Dismiss</button></div></article>; })}{!aiCases.length && <p className="rounded border border-dashed p-6 text-center text-[11px] font-bold text-gray-400">No Social AI warning, strike or appeal is waiting.</p>}</div></section>
        </div>
        </SocialAiPanelBoundary>
      )}

      {tab === 'decorations' && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
            <section className="rounded border border-[#dfe4ea] bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Sparkles className="h-5 w-5" /></span>
                <div><h2 className="text-[15px] font-black text-[#2e3d49]">{decorationForm.id ? 'Edit profile decoration' : 'Upload profile decoration'}</h2><p className="mt-1 text-[11px] leading-5 text-gray-500">Accepted file: <strong>PNG or animated PNG (APNG)</strong>. Transparent 288×288 artwork is recommended. Animation is preserved and delivered through the Social API.</p></div>
              </div>
              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#cdd5df] bg-[#f8fafc] p-5 text-center hover:border-[#0069ff]">
                {(decorationPreview || decorationForm.assetUrl) ? <img src={decorationPreview || decorationForm.assetUrl} className="h-40 w-40 object-contain" /> : <><Upload className="h-8 w-8 text-[#0069ff]" /><span className="mt-2 text-[12px] font-black text-[#344054]">Choose one PNG/APNG file</span></>}
                <input type="file" accept=".png,image/png" className="hidden" onChange={(event) => chooseDecorationFile(event.target.files?.[0])} />
              </label>
              <div className="mt-4 grid gap-3">
                <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Decoration name<input value={decorationForm.name} onChange={(event) => setDecorationForm({ ...decorationForm, name: event.target.value })} placeholder="Example: Spirit Embers" className="mt-1 w-full rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[13px] normal-case text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Price (USD)<input type="number" min={0} step="0.01" value={decorationForm.priceUsd} onChange={(event) => setDecorationForm({ ...decorationForm, priceUsd: Math.max(0, Number(event.target.value)) })} className="mt-1 w-full rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[13px] text-[#2e3d49] outline-none focus:border-[#0069ff]" /><span className="mt-1 block text-[9px] font-normal normal-case">Set 0 to make it Free.</span></label>
                  <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Sort order<input type="number" min={0} value={decorationForm.sortOrder} onChange={(event) => setDecorationForm({ ...decorationForm, sortOrder: Math.max(0, Number(event.target.value)) })} className="mt-1 w-full rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[13px] text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[11px]"><span><strong>{decorationForm.fileName || 'No file selected'}</strong><span className="block text-gray-500">{decorationForm.width}×{decorationForm.height} · {decorationForm.animated ? 'Animated APNG' : 'Static PNG'}</span></span><span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${decorationForm.animated ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>{decorationForm.animated ? 'Animated' : 'PNG'}</span></div>
                <label className="flex items-center justify-between rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[12px] font-bold text-[#344054]">Available in app<input type="checkbox" checked={decorationForm.status !== 'inactive'} onChange={(event) => setDecorationForm({ ...decorationForm, status: event.target.checked ? 'active' : 'inactive' })} className="h-4 w-4 accent-[#0069ff]" /></label>
              </div>
              <div className="mt-5 flex gap-2"><button onClick={saveDecoration} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0069ff] px-4 py-2.5 text-[12px] font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving...' : decorationForm.id ? 'Save changes' : 'Upload decoration'}</button>{decorationForm.id && <button onClick={resetDecorationForm} className="rounded-lg border px-4 py-2.5 text-[12px] font-bold text-gray-600">Cancel</button>}</div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[15px] font-black text-[#2e3d49]">Decoration catalog</h2><p className="text-[11px] text-gray-500">Free and paid items shown by the real Social API.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-gray-600">{decorations.filter((item) => item.status !== 'archived').length} items</span></div>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {decorations.filter((item) => item.status !== 'archived').map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-[#dfe4ea] bg-white">
                    <div className="relative flex h-52 items-center justify-center bg-[radial-gradient(circle_at_center,#eef4ff_0,#f8fafc_62%,#fff_100%)]"><div className="absolute h-28 w-28 rounded-full bg-gradient-to-br from-[#dbeafe] to-[#c4b5fd]" /><img src={item.assetUrl} className="relative h-44 w-44 object-contain" /><span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${item.animated ? 'bg-violet-600 text-white' : 'bg-white text-gray-600'}`}>{item.animated ? 'Animated APNG' : 'PNG'}</span></div>
                    <div className="p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black text-[#2e3d49]">{item.name}</h3><p className="mt-1 text-[10px] text-gray-500">{item.fileName} · {item.width}×{item.height}</p></div><span className={`rounded px-2 py-1 text-[11px] font-black ${Number(item.priceUsd) === 0 ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{Number(item.priceUsd) === 0 ? 'FREE' : `$${Number(item.priceUsd).toFixed(2)}`}</span></div><p className="mt-3 text-[10px] text-gray-500">{item.ownershipCount || 0} owned · {item.appliedCount || 0} currently applied · {item.status}</p><div className="mt-4 flex gap-2"><button onClick={() => { resetDecorationForm(); setDecorationForm(editableDecoration(item)); setDecorationPreview(item.assetUrl); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 rounded-lg border border-[#dfe4ea] px-3 py-2 text-[11px] font-black text-[#344054] hover:bg-gray-50">Edit</button><button disabled={saving} onClick={() => { if (window.confirm(`Archive ${item.name}? It will be removed from profiles using it.`)) perform(() => adminArchiveSocialProfileDecorationWithApi(item.id), 'Profile decoration archived.'); }} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'effects' && (
        <div className="space-y-5">
          <section className="rounded-xl border border-fuchsia-100 bg-gradient-to-r from-fuchsia-50 via-white to-blue-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div><h2 className="text-[15px] font-black text-[#2e3d49]">Effect playback</h2><p className="mt-1 max-w-2xl text-[11px] leading-5 text-gray-500">Control every applied profile effect from the Social API. Set replay to 0 to play only when a profile opens; otherwise the app restarts it after this interval.</p></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:w-[430px]">
                <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Replay every (seconds)<input type="number" min={0} max={3600} value={settings.profileEffects?.replayIntervalSeconds ?? 0} onChange={(event) => setSettings({ ...settings, profileEffects: { ...(settings.profileEffects || {}), replayIntervalSeconds: Math.max(0, Number(event.target.value)) } })} className="mt-1 w-full rounded-lg border border-[#dfe4ea] bg-white px-3 py-2.5 text-[13px] text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label>
                <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Loops each time<input type="number" min={1} max={10} value={settings.profileEffects?.loopCount ?? 2} onChange={(event) => setSettings({ ...settings, profileEffects: { ...(settings.profileEffects || {}), loopCount: Math.max(1, Number(event.target.value)) } })} className="mt-1 w-full rounded-lg border border-[#dfe4ea] bg-white px-3 py-2.5 text-[13px] text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label>
              </div>
              <button onClick={saveSettings} disabled={saving} className="rounded-lg bg-[#101828] px-5 py-2.5 text-[12px] font-black text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save playback'}</button>
            </div>
          </section>
          <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
            <section className="rounded border border-[#dfe4ea] bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-fuchsia-50 p-2.5 text-fuchsia-600"><Layers3 className="h-5 w-5" /></span>
                <div><h2 className="text-[15px] font-black text-[#2e3d49]">{effectForm.id ? 'Edit profile effect' : 'Upload profile effect'}</h2><p className="mt-1 text-[11px] leading-5 text-gray-500">Upload a transparent full-profile <strong>PNG or APNG</strong>. A 450×880 portrait canvas is recommended. Playback timing is controlled above.</p></div>
              </div>
              <label className="mt-5 flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#cdd5df] bg-[#f8fafc] p-4 hover:border-[#0069ff]">
                {(effectPreview || effectForm.assetUrl) ? (
                  <div className="relative h-64 w-32 overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="h-16 bg-gradient-to-r from-blue-200 to-violet-200" /><div className="mx-3 -mt-5 h-10 w-10 rounded-full border-2 border-white bg-slate-300" /><div className="mx-3 mt-2 h-2 w-16 rounded bg-slate-300" /><div className="mx-3 mt-2 h-1.5 w-24 rounded bg-slate-200" /><div className="mx-3 mt-3 h-7 rounded bg-slate-100" />
                    <img src={effectPreview || effectForm.assetUrl} className="pointer-events-none absolute inset-0 h-full w-full object-fill" />
                  </div>
                ) : <div className="py-10 text-center"><Upload className="mx-auto h-8 w-8 text-[#0069ff]" /><span className="mt-2 block text-[12px] font-black text-[#344054]">Choose one full-profile PNG/APNG</span></div>}
                <input type="file" accept=".png,image/png" className="hidden" onChange={(event) => chooseEffectFile(event.target.files?.[0])} />
              </label>
              <div className="mt-4 grid gap-3">
                <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Effect name<input value={effectForm.name} onChange={(event) => setEffectForm({ ...effectForm, name: event.target.value })} placeholder="Example: Flow" className="mt-1 w-full rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[13px] normal-case text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Price (USD)<input type="number" min={0} step="0.01" value={effectForm.priceUsd} onChange={(event) => setEffectForm({ ...effectForm, priceUsd: Math.max(0, Number(event.target.value)) })} className="mt-1 w-full rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[13px] text-[#2e3d49] outline-none focus:border-[#0069ff]" /><span className="mt-1 block text-[9px] font-normal normal-case">Set 0 to make it Free.</span></label>
                  <label className="text-[10px] font-black uppercase tracking-wide text-gray-500">Sort order<input type="number" min={0} value={effectForm.sortOrder} onChange={(event) => setEffectForm({ ...effectForm, sortOrder: Math.max(0, Number(event.target.value)) })} className="mt-1 w-full rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[13px] text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[11px]"><span><strong>{effectForm.fileName || 'No file selected'}</strong><span className="block text-gray-500">{effectForm.width}×{effectForm.height} · {effectForm.animated ? 'Animated APNG' : 'Static PNG'}</span></span><span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${effectForm.animated ? 'bg-fuchsia-50 text-fuchsia-700' : 'bg-gray-100 text-gray-600'}`}>{effectForm.animated ? 'Animated' : 'PNG'}</span></div>
                <label className="flex items-center justify-between rounded-lg border border-[#dfe4ea] px-3 py-2.5 text-[12px] font-bold text-[#344054]">Available in app<input type="checkbox" checked={effectForm.status !== 'inactive'} onChange={(event) => setEffectForm({ ...effectForm, status: event.target.checked ? 'active' : 'inactive' })} className="h-4 w-4 accent-[#0069ff]" /></label>
              </div>
              <div className="mt-5 flex gap-2"><button onClick={saveEffect} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0069ff] px-4 py-2.5 text-[12px] font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving...' : effectForm.id ? 'Save changes' : 'Upload effect'}</button>{effectForm.id && <button onClick={resetEffectForm} className="rounded-lg border px-4 py-2.5 text-[12px] font-bold text-gray-600">Cancel</button>}</div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[15px] font-black text-[#2e3d49]">Profile effect catalog</h2><p className="text-[11px] text-gray-500">Full-page effects delivered by the Social API, separate from avatar decorations.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-gray-600">{effects.filter((item) => item.status !== 'archived').length} items</span></div>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {effects.filter((item) => item.status !== 'archived').map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-[#dfe4ea] bg-white">
                    <div className="relative flex h-72 items-center justify-center bg-[radial-gradient(circle_at_center,#f5eaff_0,#f8fafc_62%,#fff_100%)]">
                      <div className="relative h-64 w-32 overflow-hidden rounded-xl border bg-white shadow-sm"><div className="h-16 bg-gradient-to-r from-blue-200 to-violet-200" /><div className="mx-3 -mt-5 h-10 w-10 rounded-full border-2 border-white bg-slate-300" /><div className="mx-3 mt-2 h-2 w-16 rounded bg-slate-300" /><div className="mx-3 mt-2 h-1.5 w-24 rounded bg-slate-200" /><div className="mx-3 mt-3 h-7 rounded bg-slate-100" /><img src={item.assetUrl} className="pointer-events-none absolute inset-0 h-full w-full object-fill" /></div>
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${item.animated ? 'bg-fuchsia-600 text-white' : 'bg-white text-gray-600'}`}>{item.animated ? 'Animated APNG' : 'PNG'}</span>
                    </div>
                    <div className="p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black text-[#2e3d49]">{item.name}</h3><p className="mt-1 text-[10px] text-gray-500">{item.fileName} · {item.width}×{item.height}</p></div><span className={`rounded px-2 py-1 text-[11px] font-black ${Number(item.priceUsd) === 0 ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{Number(item.priceUsd) === 0 ? 'FREE' : `$${Number(item.priceUsd).toFixed(2)}`}</span></div><p className="mt-3 text-[10px] text-gray-500">{item.ownershipCount || 0} owned · {item.appliedCount || 0} currently applied · {item.status}</p><div className="mt-4 flex gap-2"><button onClick={() => { resetEffectForm(); setEffectForm({ ...editableDecoration(item), width: Number(item.width || 450), height: Number(item.height || 880) }); setEffectPreview(item.assetUrl); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 rounded-lg border border-[#dfe4ea] px-3 py-2 text-[11px] font-black text-[#344054] hover:bg-gray-50">Edit</button><button disabled={saving} onClick={() => { if (window.confirm(`Archive ${item.name}? It will be removed from profiles using it.`)) perform(() => adminArchiveSocialProfileEffectWithApi(item.id), 'Profile effect archived.'); }} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>
                  </article>
                ))}
              </div>
            </section>
          </div>
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
          <section className="rounded border border-[#e5e8ed] bg-white p-4">
            <h2 className="text-[14px] font-black text-[#2e3d49]">Automated public-content moderation</h2>
            <p className="mt-1 text-[11px] text-gray-500">The free local MobileNetV2Mid pipeline blocks high-confidence pornographic or nude media, permanently removes the upload and disables the account for review. Borderline matches stay unpublished.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Toggle checked={settings.moderation?.autoDisableExplicit !== false} onChange={(value) => setSettings({ ...settings, moderation: { ...(settings.moderation || {}), autoDisableExplicit: value } })} label="Auto-disable explicit uploads" detail="Applied by the API before publication." />
              <label className="rounded border border-[#e5e8ed] p-4"><span className="block text-[12px] font-bold">Explicit block threshold</span><input type="number" min={0.6} max={0.95} step={0.01} value={settings.moderation?.explicitThreshold ?? 0.68} onChange={(event) => setSettings({ ...settings, moderation: { ...(settings.moderation || {}), explicitThreshold: Number(event.target.value) } })} className="mt-2 w-full rounded border px-3 py-2" /></label>
              <label className="rounded border border-[#e5e8ed] p-4"><span className="block text-[12px] font-bold">Review threshold</span><input type="number" min={0.25} max={0.8} step={0.01} value={settings.moderation?.reviewThreshold ?? 0.38} onChange={(event) => setSettings({ ...settings, moderation: { ...(settings.moderation || {}), reviewThreshold: Number(event.target.value) } })} className="mt-2 w-full rounded border px-3 py-2" /></label>
              <label className="rounded border border-[#e5e8ed] p-4"><span className="block text-[12px] font-bold">Visible-nudity block</span><input type="number" min={0.72} max={0.98} step={0.01} value={settings.moderation?.sexyBlockThreshold ?? 0.88} onChange={(event) => setSettings({ ...settings, moderation: { ...(settings.moderation || {}), sexyBlockThreshold: Number(event.target.value) } })} className="mt-2 w-full rounded border px-3 py-2" /></label>
            </div>
            <p className="mt-3 rounded bg-blue-50 p-3 text-[11px] font-bold text-blue-800">No paid vision key is required. Classification is serialized, cached and limited to four sampled video frames to keep server CPU and memory bounded. A webhook remains optional as a second opinion.</p>
          </section>
          <label className="block rounded border border-[#e5e8ed] bg-white p-4"><span className="text-[13px] font-bold text-[#2e3d49]">WebRTC STUN/TURN servers</span><p className="mt-1 text-[11px] text-gray-500">JSON array passed to Android PeerConnection configuration. Add production TURN credentials here.</p><textarea rows={8} value={stunJson} onChange={(event) => setStunJson(event.target.value)} className="mt-3 w-full rounded border border-[#e5e8ed] p-3 font-mono text-[12px] outline-none focus:border-[#0069ff]" /></label>
          <section className="rounded border border-[#e5e8ed] bg-white p-4">
            <div className="mb-4"><h2 className="text-[14px] font-black text-[#2e3d49]">Social verification packages</h2><p className="mt-1 text-[11px] text-gray-500">Separate from Tiwlo plans. USD prices are converted by the live platform currency API during checkout.</p></div>
            <div className="grid gap-3 lg:grid-cols-3">
              {(Array.isArray(settings.verificationPackages) ? settings.verificationPackages : []).map((plan: any, index: number) => (
                <div key={plan.id || index} className="rounded border border-[#e5e8ed] p-4">
                  <div className="flex items-center justify-between"><span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${plan.badgeType === 'gold' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{plan.badgeType} badge</span><input type="checkbox" checked={plan.enabled !== false} onChange={(event) => setSettings({ ...settings, verificationPackages: settings.verificationPackages.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, enabled: event.target.checked } : row) })} className="h-4 w-4 accent-[#0069ff]" /></div>
                  <label className="mt-3 block text-[10px] font-black uppercase text-gray-500">Package name<input value={plan.name || ''} onChange={(event) => setSettings({ ...settings, verificationPackages: settings.verificationPackages.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, name: event.target.value } : row) })} className="mt-1 w-full rounded border border-[#e5e8ed] px-3 py-2 text-[12px] normal-case text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label>
                  {plan.badgeType !== 'gold' ? <label className="mt-3 block text-[10px] font-black uppercase text-gray-500">Monthly price (USD)<input type="number" min={1} step="0.01" value={plan.priceUsd || 0} onChange={(event) => setSettings({ ...settings, verificationPackages: settings.verificationPackages.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, priceUsd: Number(event.target.value) } : row) })} className="mt-1 w-full rounded border border-[#e5e8ed] px-3 py-2 text-[12px] text-[#2e3d49] outline-none focus:border-[#0069ff]" /></label> : <p className="mt-3 rounded bg-amber-50 p-2 text-[11px] font-bold text-amber-700">Not for sale · administrator review only</p>}
                </div>
              ))}
            </div>
          </section>
          <div className="flex justify-end"><button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Social Settings'}</button></div>
        </div>
      )}

      {!settings.enabled && <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700"><Ban className="h-4 w-4" /> Social is disabled. Existing database records are preserved.</div>}
    </div>
  );
}
