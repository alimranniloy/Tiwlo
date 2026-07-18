# Tiwlo Social AI infrastructure

This directory is intentionally dedicated to **Social → AI**. It does not read,
write, start or configure the existing platform-wide `Admin → AI Model` service.

`scripts/bootstrap.sh` is called by the secure deployment script. It provisions
the state directories, Docker services, models, health monitor and queue-worker
systemd units. Runtime data stays outside source code in:

```text
.data/social-ai/   models, compose state and queue metadata
.logs/social-ai/   package, health and bootstrap logs
```

The backend only invokes the whitelisted `bin/manager.sh` operations. It never
accepts arbitrary shell input from an administrator.
