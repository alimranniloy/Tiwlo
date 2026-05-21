# tPanel Pro

tPanel Pro is the licensed server panel installed by the Tiwlo tPanel module. It is intended to run on a customer Ubuntu, AlmaLinux, Rocky, or compatible Linux server after the central Tiwlo license API validates the server IP and fingerprint.

## Install

Create and pay for a tPanel license in the Tiwlo user dashboard, then run the install command shown on the license page:

```bash
curl -fsSL "https://tiwlo.com/tpanel/install.sh" | sudo env TPANEL_LICENSE_KEY="YOUR_LICENSE_KEY" bash
```

The installer clones the Tiwlo repository, builds this app from `src/tPanel`, installs the required server packages, registers the `tpanel` systemd service, and starts a secure remote task agent.

## Runtime

Required environment variables are written by the installer:

- `TIWLO_API_URL`
- `TPANEL_LICENSE_KEY`
- `TPANEL_SERVER_IP`
- `TPANEL_SERVER_FINGERPRINT`
- `TPANEL_ADMIN_USER`
- `TPANEL_ADMIN_PASSWORD`

The admin password is saved on the server at `/root/tpanel-admin-password.txt`.

Optional domain binding:

```bash
curl -fsSL "https://tiwlo.com/tpanel/install.sh" | sudo env TPANEL_LICENSE_KEY="YOUR_LICENSE_KEY" TPANEL_DOMAIN="panel.example.com" bash
```

Inside the admin area, open **Server Configuration -> Domain Settings** to change the default `tiwlo.com`, see the detected server IP, and copy the DNS records. Open **System Health -> Server Status** to see which required ports are listening or still need firewall work.

Update without deleting account/database data:

```bash
sudo tpanel-update
```
