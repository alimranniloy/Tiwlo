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

Uploaded media is served through `/api/social/media/files/`. Video uploads are
transcoded asynchronously by FFmpeg to 360p, 480p and 720p HLS renditions, with
an adaptive master playlist.

## Production configuration

Set `SOCIAL_MEDIA_MAX_MB`, `SOCIAL_FFMPEG_PATH`, `SOCIAL_RTMP_URL` and
`SOCIAL_LIVE_PLAYBACK_URL` in `x/.env`. WebRTC calls also need production STUN/TURN
servers entered in **Admin > Social > Settings**. The Ubuntu installer installs
FFmpeg and configures Nginx to proxy all Social API and media routes.

Before deployment, run `npm --prefix x run prisma:generate` and
`npm --prefix x run prisma:push`, then rebuild/restart the backend and frontend.
