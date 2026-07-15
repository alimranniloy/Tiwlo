# Tiwi Social Android

This is the original Tiwi Jetpack Compose design connected to the real Tiwlo
Social GraphQL API. The app uses the existing Tiwlo user/authentication schema;
it does not seed demo users, posts, reels, chats or calls.

## Open and build

1. Open this folder in Android Studio.
2. Use JDK 17 and an Android SDK containing API 36.
3. Build the `debug` variant. It defaults to `https://tiwlo.com/`.

For another server, set Gradle property `TIWLO_API_BASE_URL`, for example:

```properties
TIWLO_API_BASE_URL=https://staging.tiwlo.com/
```

The app renders cached profile/feed/chat data first and refreshes it in the
background. HTTP responses and media are disk-cached. Login/signup use Tiwlo
tSecurity, password reset uses the Tiwlo OTP flow, and audio/video calls use
WebRTC with the STUN/TURN servers configured in Tiwlo Admin > Social.

Version 2.0 adds multi-photo/video composer previews, post detail with threaded
replies and reactions, edit/delete/report controls, reposts, compact profiles,
verified-account information, suggested people, and chat message requests.

Version 2.1 adds corrected system-bar spacing, internal hardware-Back behavior,
profile covers, privacy-aware posting, upload progress notifications, clickable
search media, vertical Reels paging, and automatic lifecycle-aware video pause.

Version 2.2 adds resumable chunked media uploads to avoid proxy 413 failures,
cover/avatar editing, profile and post deep links, native share targets,
Facebook-style repost cards and view metrics, a white full-page privacy/settings
experience, and account-disabled recovery with information export.

Version 2.3 separates Social-app registration from website tSecurity signup.
Social signup grants no free credit, requires email verification, allows no more
than one account per device/IP, and defers billing details until the user opens
the Tiwlo website. Uploaded videos now receive server thumbnails, poll processing
state, show a poster while loading, and fall back to the original video if HLS
is not ready.
