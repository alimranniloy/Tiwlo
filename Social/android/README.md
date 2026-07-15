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
