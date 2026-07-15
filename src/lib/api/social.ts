import { graphQL, userFields } from './client';

const socialProfileFields = `
  id userId username bio about category website location coverUrl verified badgeType badgePlan badgeExpiresAt
  privacy preferences followerCount followingCount postCount isFollowing createdAt updatedAt
  user: adminUser { ${userFields} }
`;

const socialPostFields = `
  id authorId type body media thumbnailUrl hlsUrl processingStatus visibility status location
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

export async function fetchSocialSettingsWithApi() {
  const data = await graphQL<{ socialSettings: Record<string, any> }>(`query SocialSettings { socialSettings }`);
  return data.socialSettings;
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

export async function adminUpdateSocialUserStatusWithApi(userId: string, status: string) {
  const data = await graphQL<{ adminUpdateSocialUserStatus: any }>(`
    mutation AdminUpdateSocialUserStatus($userId: ID!, $status: String!) {
      adminUpdateSocialUserStatus(userId: $userId, status: $status) { ${socialProfileFields} }
    }
  `, { userId, status });
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
