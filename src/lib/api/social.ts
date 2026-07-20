import { GRAPHQL_URL, getAuthToken, graphQL, userFields } from './client';

const socialDecorationFields = `
  id slug kind name assetUrl fileName mimeType animated width height priceUsd status sortOrder
  owned applied ownershipSource ownershipCount appliedCount createdAt updatedAt
`;

const socialProfileFields = `
  id userId username bio about category website location coverUrl verified badgeType badgePlan badgeExpiresAt
  privacy preferences followerCount followingCount postCount isFollowing createdAt updatedAt
  user: adminUser { ${userFields} }
`;

const socialPostFields = `
  id authorId type body media thumbnailUrl hlsUrl processingStatus visibility status moderationStatus moderationReason moderationScore location
  durationSeconds aspectRatio viewCount shareCount reactionCount commentCount viewerReaction
  publishedAt deletedAt createdAt updatedAt
  author: adminAuthor { ${userFields} }
  authorProfile { id userId username verified badgeType }
`;

export async function fetchAdminSocialOverviewWithApi() {
  const data = await graphQL<{ adminSocialOverview: any }>(`
    query AdminSocialOverview {
      adminSocialOverview { profiles verifiedProfiles posts reels messages activeLiveStreams openReports }
    }
  `);
  return data.adminSocialOverview;
}

export async function fetchAdminSocialUsersWithApi(search?: string, status?: string, verified?: boolean) {
  const data = await graphQL<{ adminSocialUsers: any[] }>(`
    query AdminSocialUsers($search: String, $status: String, $verified: Boolean) {
      adminSocialUsers(search: $search, status: $status, verified: $verified) { ${socialProfileFields} }
    }
  `, { search, status, verified });
  return data.adminSocialUsers;
}

export async function fetchAdminSocialPostsWithApi(type?: string, status?: string, search?: string) {
  const data = await graphQL<{ adminSocialPosts: any[] }>(`
    query AdminSocialPosts($type: String, $status: String, $search: String) {
      adminSocialPosts(type: $type, status: $status, search: $search, limit: 200) { ${socialPostFields} }
    }
  `, { type, status, search });
  return data.adminSocialPosts;
}

export async function fetchAdminSocialReportsWithApi(status?: string) {
  const data = await graphQL<{ adminSocialReports: any[] }>(`
    query AdminSocialReports($status: String) {
      adminSocialReports(status: $status) {
        id reporterId postId targetType targetId reason details status resolution createdAt updatedAt
      }
    }
  `, { status });
  return data.adminSocialReports;
}

export async function fetchAdminSocialModerationEventsWithApi(decision?: string, userId?: string) {
  const data = await graphQL<{ adminSocialModerationEvents: any[] }>(`
    query AdminSocialModerationEvents($decision: String, $userId: ID) {
      adminSocialModerationEvents(decision: $decision, userId: $userId, limit: 200) {
        id userId postId targetType targetId provider decision category score reason evidence createdAt
      }
    }
  `, { decision, userId });
  return data.adminSocialModerationEvents;
}

const socialAdFields = `
  id advertiserName advertiserAvatarUrl headline body media ctaType destinationUrl placements status
  startAt endAt skipAfterSeconds frequencyCap impressionCount clickCount createdAt updatedAt
`;

export async function fetchAdminSocialAdsWithApi(status?: string) {
  const data = await graphQL<{ adminSocialAds: any[] }>(`
    query AdminSocialAds($status: String) { adminSocialAds(status: $status) { ${socialAdFields} } }
  `, { status });
  return data.adminSocialAds;
}

export async function adminUpsertSocialAdWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ adminUpsertSocialAd: any }>(`
    mutation AdminUpsertSocialAd($input: SocialAdAdminInput!) { adminUpsertSocialAd(input: $input) { ${socialAdFields} } }
  `, { input });
  return data.adminUpsertSocialAd;
}

export async function adminDeleteSocialAdWithApi(id: string) {
  const data = await graphQL<{ adminDeleteSocialAd: boolean }>(`
    mutation AdminDeleteSocialAd($id: ID!) { adminDeleteSocialAd(id: $id) }
  `, { id });
  return data.adminDeleteSocialAd;
}

export async function fetchSocialSettingsWithApi() {
  const data = await graphQL<{ socialSettings: Record<string, any> }>(`query SocialSettings { socialSettings }`);
  return data.socialSettings;
}

const socialAiBundleModels = [
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    kind: 'Hosted multimodal',
    file: 'Google Gemini API · no model download on this server',
    runtime: 'Google Gemini API',
    default: true
  }
];

const isSocialAiSchemaUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /Cannot query field\s+["']adminSocialAiOverview["']/i.test(message);
};

export async function fetchAdminSocialAiOverviewWithApi() {
  try {
    const data = await graphQL<{ adminSocialAiOverview: Record<string, any> }>(`
      query AdminSocialAiOverview { adminSocialAiOverview }
    `);
    return data.adminSocialAiOverview;
  } catch (error) {
    // Keep Social administration and the model catalog visible if the AI
    // endpoint is temporarily unavailable. This is a real unavailable state,
    // not a fake service status, and prevents one failed AI query from taking
    // down the whole Social admin page.
    const message = error instanceof Error ? error.message : 'Social AI overview is unavailable.';
    const schemaUnavailable = isSocialAiSchemaUnavailable(error);
    return {
      schemaUnavailable,
      unavailable: true,
      unavailableMessage: schemaUnavailable
        ? 'The running GraphQL schema does not contain adminSocialAiOverview. Deploy the Social AI backend release.'
        : message,
      settings: {},
      runningFeatures: [],
      queue: { queued: 0 },
      jobs: [],
      cases: [],
      health: {
        available: false,
        packages: {},
        models: Object.fromEntries(socialAiBundleModels.map((model) => [model.id, {
          healthy: false,
          status: 'backend deployment required'
        }]))
      },
      catalog: {
        packages: [],
        models: socialAiBundleModels
      }
    };
  }
}

export async function updateAdminSocialAiSettingsWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ adminUpdateSocialAiSettings: Record<string, any> }>(`
    mutation UpdateAdminSocialAiSettings($input: JSON!) {
      adminUpdateSocialAiSettings(input: $input)
    }
  `, { input });
  return data.adminUpdateSocialAiSettings;
}

export async function operateAdminSocialAiWithApi(input: { scope: string; action: string; id?: string }) {
  const data = await graphQL<{ adminOperateSocialAi: Record<string, any> }>(`
    mutation OperateAdminSocialAi($input: JSON!) {
      adminOperateSocialAi(input: $input)
    }
  `, { input });
  return data.adminOperateSocialAi;
}

export async function resolveAdminSocialAiCaseWithApi(id: string, input: Record<string, unknown>) {
  const data = await graphQL<{ adminResolveSocialAiCase: any }>(`
    mutation ResolveAdminSocialAiCase($id: ID!, $input: JSON) {
      adminResolveSocialAiCase(id: $id, input: $input) {
        id status actionTaken decision severity category warningMessage strikeCount appealStatus updatedAt
      }
    }
  `, { id, input });
  return data.adminResolveSocialAiCase;
}

export async function adminVerifySocialProfileWithApi(userId: string, verified: boolean) {
  const data = await graphQL<{ adminVerifySocialProfile: any }>(`
    mutation AdminVerifySocialProfile($userId: ID!, $verified: Boolean!) {
      adminVerifySocialProfile(userId: $userId, verified: $verified) { ${socialProfileFields} }
    }
  `, { userId, verified });
  return data.adminVerifySocialProfile;
}

export async function adminSetSocialBadgeWithApi(userId: string, badgeType: string, badgePlan?: string) {
  const data = await graphQL<{ adminSetSocialBadge: any }>(`
    mutation AdminSetSocialBadge($userId: ID!, $badgeType: String!, $badgePlan: String) {
      adminSetSocialBadge(userId: $userId, badgeType: $badgeType, badgePlan: $badgePlan) { ${socialProfileFields} }
    }
  `, { userId, badgeType, badgePlan });
  return data.adminSetSocialBadge;
}

export async function adminUpdateSocialUserStatusWithApi(userId: string, status: string, reason?: string) {
  const data = await graphQL<{ adminUpdateSocialUserStatus: any }>(`
    mutation AdminUpdateSocialUserStatus($userId: ID!, $status: String!, $reason: String) {
      adminUpdateSocialUserStatus(userId: $userId, status: $status, reason: $reason) { ${socialProfileFields} }
    }
  `, { userId, status, reason });
  return data.adminUpdateSocialUserStatus;
}

export async function adminDeleteSocialPostWithApi(id: string) {
  const data = await graphQL<{ adminDeleteSocialPost: boolean }>(`
    mutation AdminDeleteSocialPost($id: ID!) { adminDeleteSocialPost(id: $id) }
  `, { id });
  return data.adminDeleteSocialPost;
}

export async function adminResolveSocialReportWithApi(id: string, status: string, resolution?: string) {
  const data = await graphQL<{ adminResolveSocialReport: any }>(`
    mutation AdminResolveSocialReport($id: ID!, $status: String!, $resolution: String) {
      adminResolveSocialReport(id: $id, status: $status, resolution: $resolution) {
        id status resolution updatedAt
      }
    }
  `, { id, status, resolution });
  return data.adminResolveSocialReport;
}

export async function adminUpdateSocialSettingsWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ adminUpdateSocialSettings: Record<string, any> }>(`
    mutation AdminUpdateSocialSettings($input: SocialAdminSettingsInput!) {
      adminUpdateSocialSettings(input: $input)
    }
  `, { input });
  return data.adminUpdateSocialSettings;
}

export async function fetchAdminSocialProfileDecorationsWithApi() {
  const data = await graphQL<{ adminSocialProfileDecorations: any[] }>(`
    query AdminSocialProfileDecorations { adminSocialProfileDecorations { ${socialDecorationFields} } }
  `);
  return data.adminSocialProfileDecorations;
}

export async function adminUpsertSocialProfileDecorationWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ adminUpsertSocialProfileDecoration: any }>(`
    mutation AdminUpsertSocialProfileDecoration($input: SocialProfileDecorationAdminInput!) {
      adminUpsertSocialProfileDecoration(input: $input) { ${socialDecorationFields} }
    }
  `, { input });
  return data.adminUpsertSocialProfileDecoration;
}

export async function adminArchiveSocialProfileDecorationWithApi(id: string) {
  const data = await graphQL<{ adminArchiveSocialProfileDecoration: boolean }>(`
    mutation AdminArchiveSocialProfileDecoration($id: ID!) { adminArchiveSocialProfileDecoration(id: $id) }
  `, { id });
  return data.adminArchiveSocialProfileDecoration;
}

export async function fetchAdminSocialProfileEffectsWithApi() {
  const data = await graphQL<{ adminSocialProfileEffects: any[] }>(`
    query AdminSocialProfileEffects { adminSocialProfileEffects { ${socialDecorationFields} } }
  `);
  return data.adminSocialProfileEffects;
}

export async function adminUpsertSocialProfileEffectWithApi(input: Record<string, unknown>) {
  const data = await graphQL<{ adminUpsertSocialProfileEffect: any }>(`
    mutation AdminUpsertSocialProfileEffect($input: SocialProfileDecorationAdminInput!) {
      adminUpsertSocialProfileEffect(input: $input) { ${socialDecorationFields} }
    }
  `, { input });
  return data.adminUpsertSocialProfileEffect;
}

export async function adminArchiveSocialProfileEffectWithApi(id: string) {
  const data = await graphQL<{ adminArchiveSocialProfileEffect: boolean }>(`
    mutation AdminArchiveSocialProfileEffect($id: ID!) { adminArchiveSocialProfileEffect(id: $id) }
  `, { id });
  return data.adminArchiveSocialProfileEffect;
}

type SocialMediaUpload = {
  sourceUrl: string;
  mimeType: string;
  size: number;
  hlsUrl?: string | null;
  thumbnailUrl?: string | null;
  processingStatus?: string | null;
};

const socialMediaUrl = (suffix = '') => {
  const path = `/api/social/media${suffix}`;
  return GRAPHQL_URL.startsWith('http') ? new URL(path, GRAPHQL_URL).toString() : path;
};

const socialUploadHeaders = (headers: Record<string, string> = {}) => {
  const token = getAuthToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

const socialUploadPayload = async (response: Response) => {
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(payload.error || `Decoration upload failed: ${response.status}`);
  return payload;
};

async function uploadSocialProfileDecorationInChunks(file: File, kind = 'profile-decoration'): Promise<SocialMediaUpload> {
  const started = await fetch(socialMediaUrl('/chunks/start'), {
    method: 'POST',
    headers: socialUploadHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      name: file.name,
      mimeType: file.type || 'image/png',
      size: file.size,
      kind
    })
  }).then(socialUploadPayload);

  const uploadId = String(started.uploadId || '');
  if (!uploadId) throw new Error('Decoration upload did not start');
  // Keep every request below the common 1 MB reverse-proxy default.
  const chunkSize = Math.min(900 * 1024, Math.max(64 * 1024, Number(started.chunkSize) || 768 * 1024));
  let offset = 0;
  let index = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
    await fetch(socialMediaUrl(`/chunks/${encodeURIComponent(uploadId)}/${index}`), {
      method: 'POST',
      headers: socialUploadHeaders({ 'Content-Type': 'application/octet-stream' }),
      body: chunk
    }).then(socialUploadPayload);
    offset += chunk.size;
    index += 1;
  }

  return fetch(socialMediaUrl(`/chunks/${encodeURIComponent(uploadId)}/complete`), {
    method: 'POST',
    headers: socialUploadHeaders()
  }).then(socialUploadPayload) as Promise<SocialMediaUpload>;
}

export async function uploadSocialProfileDecorationWithApi(file: File) {
  // APNG files can easily exceed Nginx/CDN single-request limits. Use the
  // resumable media API before reaching that boundary.
  if (file.size > 512 * 1024) return uploadSocialProfileDecorationInChunks(file);

  const body = new FormData();
  body.append('file', file);
  body.append('kind', 'profile-decoration');
  const response = await fetch(socialMediaUrl(), {
    method: 'POST',
    headers: socialUploadHeaders(),
    body
  });
  if (response.status === 413) return uploadSocialProfileDecorationInChunks(file);
  return socialUploadPayload(response) as Promise<SocialMediaUpload>;
}

export async function uploadSocialProfileEffectWithApi(file: File) {
  if (file.size > 512 * 1024) return uploadSocialProfileDecorationInChunks(file, 'profile-effect');

  const body = new FormData();
  body.append('file', file);
  body.append('kind', 'profile-effect');
  const response = await fetch(socialMediaUrl(), {
    method: 'POST',
    headers: socialUploadHeaders(),
    body
  });
  if (response.status === 413) return uploadSocialProfileDecorationInChunks(file, 'profile-effect');
  return socialUploadPayload(response) as Promise<SocialMediaUpload>;
}

export async function uploadSocialAdMediaWithApi(file: File) {
  // Campaign media uses the same resumable, server-moderated upload route as
  // member media. This prevents 413 errors and makes image/video ads subject
  // to the same file validation and transcode pipeline.
  if (file.size > 512 * 1024) return uploadSocialProfileDecorationInChunks(file, 'ad-media');
  const body = new FormData();
  body.append('file', file);
  body.append('kind', 'ad-media');
  const response = await fetch(socialMediaUrl(), { method: 'POST', headers: socialUploadHeaders(), body });
  if (response.status === 413) return uploadSocialProfileDecorationInChunks(file, 'ad-media');
  return socialUploadPayload(response) as Promise<SocialMediaUpload>;
}
