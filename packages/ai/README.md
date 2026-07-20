# Tiwlo Social AI infrastructure

This directory is intentionally dedicated to **Social → AI**. It does not read,
write, start or configure the existing platform-wide `Admin → AI Model` service.

`scripts/bootstrap.sh` is called by the secure deployment script. It provisions
the state directories, SearXNG/Crawl4AI services, the Gemini connection check,
health monitor and queue-worker systemd units. Gemini is hosted: no GGUF,
TensorFlow, NSFW, or llama.cpp model is downloaded to the server.

Set the protected server environment values (outside Git) to change the hosted
provider later:

```text
SOCIAL_GEMINI_API_KEY=...
SOCIAL_GEMINI_MODEL=gemini-flash-latest
```

Runtime data stays outside source code in:

```text
.data/social-ai/   compose state, crawler secrets and queue metadata
.logs/social-ai/   package, health and bootstrap logs
```

The backend only invokes the whitelisted `bin/manager.sh` operations. It never
accepts arbitrary shell input from an administrator.
