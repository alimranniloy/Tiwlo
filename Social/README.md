# Tiwlo Social

Tiwi uses this Social service with the existing Tiwlo `User`, authentication,
tSecurity login, email/OTP password reset and PostgreSQL database. No demo users,
posts, messages, calls or streams are seeded.

## Runtime layout

- GraphQL schema: `x/graphql/schema.graphql`
- API/resolvers: `x/src/modules/social/`
- Prisma models: `x/prisma/schema.prisma`
- Admin console: `src/pages/management/AdminSocial.tsx`
- Per-user uploads: `public/uploads/social/<user-id>/`
- Android API origin: `https://tiwlo.com/`
- Android source: `Social/android/`

The Android project keeps the original Tiwi Compose UI and binds it to the
real Social API. Profile, feed, reels and chats are persisted locally and shown
cache-first while fresh data syncs in the background. WebRTC signaling uses the
same authenticated GraphQL API and reads STUN/TURN configuration from Social
settings.

Social v2 also provides comment reactions, repost counters, message-request
approval for new direct conversations, content/profile reporting, and enriched
feed follow state. Reports remain available to administrators under
**Admin > Social > Reports**.

Social v2.1 keeps media upload authorization aligned with account restrictions
and adds Android post privacy, upload progress notifications, profile covers,
clickable post/video discovery, swipeable Reels, and lifecycle-aware playback.

Social v2.2 adds sequential 768 KiB chunk uploads for large media (up to 2 GiB
by default), verified app links for profiles/posts, native sharing, shared-post
snapshot cards, and disabled-account recovery/export screens. Settings, privacy,
verified and reporting surfaces use clean white containers in the Android app.

Social v2.3 uses a dedicated lightweight Android signup mutation. App-created
accounts receive zero signup credit, require email verification, and are limited
to one account per device or exact IP. Billing fields remain incomplete until
the user opens `tiwlo.com`, where dashboard access is gated by email and billing
profile completion. FFmpeg now creates automatic video thumbnails and Android
falls back from unavailable HLS to the original uploaded video.

Uploaded media is served through `/api/social/media/files/`. Video uploads are
transcoded asynchronously by FFmpeg to 360p, 480p and 720p HLS renditions, with
an adaptive master playlist. Large Android uploads use
`/api/social/media/chunks/*`, so individual requests stay below common reverse
proxy body limits.

## Production configuration

Set `SOCIAL_MEDIA_MAX_MB`, `SOCIAL_FFMPEG_PATH`, `SOCIAL_RTMP_URL` and
`SOCIAL_LIVE_PLAYBACK_URL` in `x/.env`. WebRTC calls also need production STUN/TURN
servers entered in **Admin > Social > Settings**. The Ubuntu installer installs
FFmpeg and configures Nginx to proxy all Social API and media routes.

Before deployment, run `npm --prefix x run db:generate` and
`npm --prefix x run db:push`, then rebuild/restart the backend and frontend.
