# Tiwlo

Tiwlo is a full-stack cloud platform and business management system built for cloud hosting, ecommerce, ISP billing, domains, payments, automation, and admin operations. It includes a React dashboard frontend, a Node.js GraphQL backend, PostgreSQL/Prisma data models, storefront themes, and management panels for platform admins, store admins, ISP admins, and end users.

Developed by **Al Imran Niloy** for **Tiwlo Company**.

## What This Project Includes

- Cloud dashboard for droplets, volumes, networking, DNS, domains, billing, teams, support, and marketplace modules.
- Main management/admin panel for users, resources, plans, payments, security, logs, ecommerce, ISP, and platform settings.
- Ecommerce system with stores, products, themes, plugins, orders, customers, POS, and storefront runtime.
- ISP management system with routers, plans, subscribers, invoices, RADIUS records, and ISP storefront flow.
- Tiwlo Pay and billing flows with support for credit balance, Stripe, PayPal, and bKash configuration.
- GraphQL API backend with PostgreSQL, Prisma schema, seeded demo data, role-based access, audit records, and automation endpoints.
- One-command local/server startup scripts for Windows, Linux, macOS, and Ubuntu servers.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS, React Router, Recharts, Framer Motion, Lucide icons.
- Backend: Node.js, Express, Apollo GraphQL, Prisma, PostgreSQL.
- Runtime ports: frontend `3000`, backend GraphQL `4000`, PostgreSQL `5432` or fallback `55432`.

## Quick Run For Local Development

Use these commands only from a readable local or development checkout. Production servers should use the secure update commands in the next section.

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-tiwlo.ps1
```

Linux or macOS development:

```bash
bash ./scripts/start-tiwlo.sh
```

The startup script prepares Node.js `24.15.0`, installs dependencies, prepares PostgreSQL, runs Prisma, seeds demo data, builds the frontend, starts the backend, and serves the frontend from the local checkout.

After startup:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- GraphQL API: `http://localhost:4000/graphql`
- Logs: `.logs/`

Demo admin login:

- Email: `admin` or `admin@tiwlo.app`
- Password: `admin`

## Production Install And Secure Update

Use this section for the real production server. Production deploys are source-wiped and obfuscated: the server does not keep a readable Git checkout in `/var/www/Tiwlo` after a secure update.

First-time Ubuntu install with domain, SSL, and auto-start:

Point your domain DNS `A` record to the Ubuntu server IP first, then run this single command:

```bash
curl -fsSL https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/install-tiwlo-ubuntu.sh | sudo env TIWLO_DOMAIN="your-domain.com" TIWLO_EMAIL="admin@your-domain.com" bash
```

This installs server packages, prepares `/var/www/Tiwlo`, builds Tiwlo, enables services, configures Nginx, opens firewall ports, and requests SSL with Certbot. After the first install, use the secure update command below for code updates.

IP-only install without SSL:

```bash
curl -fsSL https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/install-tiwlo-ubuntu.sh | sudo bash
```

### Secure Production Update

Use this single command on the production server. It cleans old failed deploy temp files, moves deploy work out of `/tmp`, checks out source in a temporary folder, installs dependencies, runs Prisma safely, builds the frontend, obfuscates backend and `tSecurity`, wipes readable source from production, and restarts the app.

```bash
curl -fsSL "https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/update-tiwlo.sh?fresh=$(date +%s)" | sudo env TIWLO_INSTALL_DIR=/var/www/Tiwlo bash
```

If a very small VPS still kills `npm install` because of low memory, run the same update command with a larger deploy swap:

```bash
curl -fsSL "https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/update-tiwlo.sh?fresh=$(date +%s)" | sudo env TIWLO_INSTALL_DIR=/var/www/Tiwlo TIWLO_DEPLOY_SWAP_MB=6144 TIWLO_KEEP_DEPLOY_SWAP=1 bash
```

The deploy script skips the heavy local AI runtime package by default so small VPS installs do not run out of memory. To install the local `node-llama-cpp` AI runtime on a larger server, add `TIWLO_INSTALL_AI_MODEL_RUNTIME=1` to the command.

After one successful secure deploy, future updates can use the installed update command:

```bash
sudo TIWLO_INSTALL_DIR=/var/www/Tiwlo /usr/local/bin/tiwlo-secure-update
```

Production command rules:

- Use `update-tiwlo.sh` or `/usr/local/bin/tiwlo-secure-update` for production code updates.
- Do not use `git pull` inside `/var/www/Tiwlo`; the secure production folder is not meant to keep `.git`.
- Do not run `bash ./scripts/start-tiwlo.sh` inside the wiped production folder; that command is for readable local/dev checkouts.
- Do not run `scripts/deploy-obfuscated.sh` directly unless debugging the deploy pipeline. The update command fetches and runs it with the right temp, swap, env, and cleanup settings.
- The updater preserves `.env`, `x/.env`, `public/uploads`, `.data`, `.logs`, and `.tools`. It does not run `prisma migrate reset`, `DROP DATABASE`, or delete PostgreSQL data.

## Manual Fresh Server Run For Testing

These steps are for a blank Ubuntu VPS when you want a readable test/dev checkout. For the real production server, use **Production Install And Secure Update** instead.

1. Update the server and install basic tools:

```bash
sudo apt update
sudo apt install -y git curl wget ca-certificates xz-utils build-essential python3 make g++ postgresql postgresql-contrib nginx
```

2. Clone the project:

```bash
cd /var/www
sudo git clone https://github.com/alimranniloy/Tiwlo.git
sudo chown -R $USER:$USER /var/www/Tiwlo
cd /var/www/Tiwlo
```

3. Run Tiwlo:

```bash
chmod +x ./scripts/start-tiwlo.sh
bash ./scripts/start-tiwlo.sh
```

If you want to open the app from another computer using the server IP, run it with public IP values instead:

```bash
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="http://YOUR_SERVER_IP:3000" \
API_BASE_URL="http://YOUR_SERVER_IP:4000" \
bash ./scripts/start-tiwlo.sh
```

4. Test from the server:

```bash
curl http://localhost:3000
curl http://localhost:4000/health
```

For direct IP testing, open the ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000
sudo ufw allow 4000
sudo ufw enable
```

Then visit:

- `http://YOUR_SERVER_IP:3000`
- `http://YOUR_SERVER_IP:4000/graphql`

## Manual Domain And Nginx Setup

The one-line production installer is the recommended path. Use this manual section only when you intentionally keep a readable checkout for setup/testing.

For a real domain, point your DNS `A` record to the server IP first. In a readable checkout, run Tiwlo with same-domain API routing:

```bash
cd /var/www/Tiwlo
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="https://your-domain.com" \
API_BASE_URL="https://your-domain.com" \
bash ./scripts/start-tiwlo.sh
```

For the automated domain + SSL + reboot-safe setup, use the one-line installer above instead of these manual Nginx steps.

Create an Nginx site:

```bash
sudo nano /etc/nginx/sites-available/tiwlo
```

Paste this and replace `your-domain.com`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    if ($host = "www.your-domain.com") {
        return 301 $scheme://your-domain.com$request_uri;
    }

    location /graphql {
        proxy_pass http://127.0.0.1:4000;
    }

    location /admin {
        proxy_pass http://127.0.0.1:4000;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000;
    }

    location /payments {
        proxy_pass http://127.0.0.1:4000;
    }

    location /webhooks {
        proxy_pass http://127.0.0.1:4000;
    }

    location = /api {
        return 301 /developers;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
    }

    location /automation {
        proxy_pass http://127.0.0.1:4000;
    }

    location /ai {
        proxy_pass http://127.0.0.1:4000;
    }

    location /tpanel/install.sh {
        proxy_pass http://127.0.0.1:4000;
    }

    location /tpanel/api/ {
        proxy_pass http://127.0.0.1:4000;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/tiwlo /etc/nginx/sites-enabled/tiwlo
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Install SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

After SSL, open:

```text
https://your-domain.com
```

For reboot-safe services in a readable checkout, install systemd units after the first successful setup:

```bash
sudo bash ./scripts/install-tiwlo-systemd.sh
```

This runs the backend with `Type=simple`, serves the built frontend through the Node server, and proxies tPanel installer/API paths through the frontend service. On source-wiped production servers, prefer the secure update shortcut instead of rebuilding from this readable checkout.

## tPanel License Install Command

tPanel is the brand. It is a Tiwlo hosting-management system. After a license is active, use this one-line installer:

```bash
curl -fsSL "https://tiwlo.com/tpanel/install.sh" | sudo env TPANEL_LICENSE_KEY="YOUR_LICENSE_KEY" bash
```

Optional custom panel domain:

```bash
curl -fsSL "https://tiwlo.com/tpanel/install.sh" | sudo env TPANEL_LICENSE_KEY="YOUR_LICENSE_KEY" TPANEL_DOMAIN="panel.example.com" bash
```

The old `?license=...` backend route still works when `/tpanel/install.sh` is proxied to the backend, but the env-based command also survives static frontend fallback and avoids Bash trying to run HTML.

Required public ports for a full hosting node are shown in **Management -> tPanel -> System Status**. At minimum allow `22`, `80`, `443`, and the tPanel app port `2086`; mail/DNS/database ports depend on which services you enable.

Update an installed tPanel server without deleting user data:

```bash
sudo tpanel-update
```

## Installed Update Shortcut

After one successful secure production update, the updater installs a shortcut. Use it for normal future updates:

```bash
sudo TIWLO_INSTALL_DIR=/var/www/Tiwlo /usr/local/bin/tiwlo-secure-update
```

If the shortcut is not installed yet, run the single command from **Secure Production Update** once. The update process preserves `.env`, uploaded files, PostgreSQL data, PM2 data, and other runtime state. It does not run `prisma migrate reset`, `DROP DATABASE`, or delete `.data/postgres`.

## Tiwlo SSL And Let's Encrypt Troubleshooting

The admin SSL page is available at **Management -> SSL**. It uses the server's real Certbot/Nginx installation; it does not mark SSL as successful unless Certbot succeeds or the renew command completes.

Recommended DNS for the main Tiwlo server:

```text
tiwlo.com       A     153.75.245.4
www.tiwlo.com   A     153.75.245.4
tmail.tiwlo.com A     153.75.245.4
email.tiwlo.com A     153.75.245.4
mail.tiwlo.com  A     153.75.245.4
*.tiwlo.com     A     153.75.245.4
```

Install and enable the SSL stack:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx ca-certificates openssl cron pdns-server pdns-backend-pgsql dnsutils
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 53/tcp
sudo ufw allow 53/udp
sudo systemctl enable --now certbot.timer
sudo systemctl enable --now pdns
```

For normal domains and known subdomains, Tiwlo writes authoritative A/AAAA/CNAME/MX/TXT records into PowerDNS, then uses Certbot HTTP-01 through Nginx:

```bash
sudo certbot --nginx -d tiwlo.com -d www.tiwlo.com -d tmail.tiwlo.com -d mail.tiwlo.com --redirect
```

Wildcard SSL for `*.tiwlo.com` is different. Let's Encrypt wildcard certificates require DNS-01 TXT validation. Tiwlo now manages explicit subdomain certificates automatically through PowerDNS; keep wildcard mode off unless a PowerDNS ACME hook is configured for DNS-01 TXT validation.

If the SSL page reports an error:

- DNS error: point the A record to the VPS public IP and wait for propagation.
- Port 80 blocked: open `80/tcp` in UFW, provider firewall, and any upstream firewall.
- Nginx server name error: add the domain to the Tiwlo Nginx `server_name`, run `sudo nginx -t`, then `sudo systemctl reload nginx`.
- HTTPS certificate mismatch: port `443` is open, but Nginx is serving a certificate that does not include that hostname. Reissue SSL for that hostname from Management -> SSL or run the Certbot command with every hostname.
- Proxy warning: HTTP-01 works best when PowerDNS A/AAAA records point directly to this server.
- Rate limit: enable test mode first, or wait before retrying production issuance.

Quick checks:

```bash
dig +short tiwlo.com
dig +short tmail.tiwlo.com
nc -vz tiwlo.com 80
nc -vz tiwlo.com 443
sudo certbot certificates
sudo systemctl status certbot.timer --no-pager
sudo journalctl -u nginx -n 80 --no-pager
```

## Tiwlo Mail And SMTP Troubleshooting

Tiwlo uses `nodemailer` for real outgoing email. If SMTP is not configured, configured incorrectly, or the mail server rejects the message, Tiwlo login and signup must still continue. Email verification links are sent only when SMTP works; if verification email cannot be sent, the user is not blocked from signing in.

Recommended DNS for `tiwlo.com`:

```text
tiwlo.com       A     153.75.245.4
www.tiwlo.com   A     153.75.245.4
mail.tiwlo.com  A     153.75.245.4
tmail.tiwlo.com A     153.75.245.4
tiwlo.com       MX    10 mail.tiwlo.com
tiwlo.com       TXT   "v=spf1 ip4:153.75.245.4 -all"
```

Keep mail records authoritative in PowerDNS and point them directly to the mail server. `tmail.tiwlo.com` is the TMail web login, while `mail.tiwlo.com` should be the SMTP/IMAP host. If both MX records point to the same server it can still work, but `mail.tiwlo.com` as the single MX is cleaner.

Required mail ports on the VPS firewall and provider firewall:

```bash
sudo ufw allow 25/tcp
sudo ufw allow 110/tcp
sudo ufw allow 143/tcp
sudo ufw allow 465/tcp
sudo ufw allow 587/tcp
sudo ufw allow 993/tcp
sudo ufw allow 995/tcp
sudo systemctl enable --now postfix dovecot opendkim rspamd
```

If the admin email test fails, read the exact stage:

- `dns`: `mail.tiwlo.com` does not resolve from the backend server.
- `tcp`: the backend cannot connect to the SMTP port; fix firewall, security group, or service listener.
- `smtp-send` with `EAUTH` or `535`: username/password is wrong, or that mailbox does not exist on the mail server.
- `smtp-send` with TLS/SSL wording: use port `465` with SSL enabled, or port `587` with SSL disabled so STARTTLS can be negotiated.
- `smtp-send` with sender/recipient rejection: check `fromEmail`, SPF, DKIM, DMARC, and relay permissions.

Quick server checks:

```bash
dig +short mail.tiwlo.com
nc -vz mail.tiwlo.com 25
nc -vz mail.tiwlo.com 465
nc -vz mail.tiwlo.com 587
nc -vz mail.tiwlo.com 993
sudo journalctl -u postfix -n 100 --no-pager
sudo journalctl -u dovecot -n 100 --no-pager
```

## Manual Development Setup

Use this when you want separate frontend/backend terminals instead of the one-command script.

1. Install frontend dependencies:

```bash
npm install
```

2. Install backend dependencies:

```bash
npm --prefix x install
```

3. Create backend env:

```bash
cp x/.env.example x/.env
```

Set `DATABASE_URL` in `x/.env`, for example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tiwlo?schema=public"
JWT_SECRET="change-this-before-production"
PORT=4000
FRONTEND_ORIGIN="http://localhost:3000"
API_BASE_URL="http://localhost:4000"
```

4. Prepare the database:

```bash
npm --prefix x run db:generate
npm --prefix x run db:push
npm --prefix x run db:seed
```

5. Start backend:

```bash
npm --prefix x run dev
```

6. Start frontend in another terminal:

```bash
VITE_GRAPHQL_URL="http://localhost:4000/graphql" npm run dev
```

## Environment Notes

Root `.env` is used by the frontend build. Backend `.env` lives in `x/.env`.

Important variables:

- `VITE_GRAPHQL_URL`: GraphQL URL used by the browser. Keep `/graphql` for server/IP/domain installs so the frontend and Nginx proxy the API on the same origin.
- `DATABASE_URL`: PostgreSQL database connection for Prisma.
- `JWT_SECRET`: Change this before production.
- `FRONTEND_ORIGIN`: Public frontend URL allowed by backend CORS. You may use comma-separated values for multiple domains/IPs.
- `CORS_ORIGINS`: Optional comma-separated extra browser origins that may call the GraphQL API directly.
- `CORS_ALLOW_ALL`: Emergency switch for direct API testing only. Set `true` only when you understand the security tradeoff.
- `API_BASE_URL`: Public backend/callback base URL for payment redirects and webhooks.
- Payment keys: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`.

## Useful Commands

Production:

```bash
sudo TIWLO_INSTALL_DIR=/var/www/Tiwlo /usr/local/bin/tiwlo-secure-update
pm2 status
pm2 logs tiwlo-backend-obfuscated --lines 100
curl http://127.0.0.1:4000/health
```

Readable local/development checkout:

```bash
npm run build
npm run dev
npm run serve
npm run lint
npm --prefix x run dev
npm --prefix x run db:studio
```

## Logs And Troubleshooting

- Backend logs: `.logs/backend.out.log` and `.logs/backend.err.log`
- Frontend logs: `.logs/frontend.out.log` and `.logs/frontend.err.log`
- PostgreSQL logs: `.logs/postgres.log`
- Setup log: `.logs/setup.log`

On production, if the frontend opens but API calls fail after changing domain/env values, run a secure update with the correct public URLs:

```bash
curl -fsSL "https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/update-tiwlo.sh?fresh=$(date +%s)" | sudo env TIWLO_INSTALL_DIR=/var/www/Tiwlo FRONTEND_GRAPHQL_URL="/graphql" FRONTEND_ORIGIN="https://your-domain.com" API_BASE_URL="https://your-domain.com" bash
```

In a readable development checkout only, rebuild with:

```bash
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="https://your-domain.com" \
API_BASE_URL="https://your-domain.com" \
bash ./scripts/start-tiwlo.sh
```

If the frontend opens by server IP but login/API calls fail, production should use:

```bash
curl -fsSL "https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/update-tiwlo.sh?fresh=$(date +%s)" | sudo env TIWLO_INSTALL_DIR=/var/www/Tiwlo FRONTEND_GRAPHQL_URL="/graphql" FRONTEND_ORIGIN="http://YOUR_SERVER_IP:3000" API_BASE_URL="http://YOUR_SERVER_IP:4000" bash
```

In a readable development checkout only, rebuild with same-origin GraphQL:

```bash
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="http://YOUR_SERVER_IP:3000" \
API_BASE_URL="http://YOUR_SERVER_IP:4000" \
bash ./scripts/start-tiwlo.sh
```

Check CORS and service health:

```bash
curl http://127.0.0.1:4000/health
curl -i -X OPTIONS "http://127.0.0.1:4000/graphql" \
  -H "Origin: http://YOUR_SERVER_IP:3000" \
  -H "Access-Control-Request-Method: POST"
sudo systemctl status tiwlo-backend tiwlo-frontend nginx --no-pager
sudo journalctl -u tiwlo-backend -n 100 --no-pager
```

If Nginx shows `502 Bad Gateway` after a reboot, first check the secure runtime services:

```bash
pm2 status
pm2 logs tiwlo-backend-obfuscated --lines 100
sudo systemctl status tiwlo-frontend nginx --no-pager
```

If system packages or Nginx need a full repair, rerun the installer to refresh Node, PostgreSQL, Nginx, and auto-start:

```bash
curl -fsSL https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/install-tiwlo-ubuntu.sh | sudo env TIWLO_DOMAIN="tiwlo.com" TIWLO_EMAIL="admin@tiwlo.com" bash
```

Install or refresh reboot-safe services in a readable checkout:

```bash
cd /var/www/Tiwlo && sudo FRONTEND_GRAPHQL_URL="/graphql" FRONTEND_ORIGIN="https://your-domain.com" API_BASE_URL="https://your-domain.com" bash ./scripts/install-tiwlo-systemd.sh
```

If PostgreSQL already uses port `5432`, the startup script can use fallback port `55432` for the local project database.

## Repository

GitHub: `https://github.com/alimranniloy/Tiwlo`
