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

## Quick Run

From the project root:

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-tiwlo.ps1
```

Linux, macOS, or Ubuntu server:

```bash
bash ./scripts/start-tiwlo.sh
```

The startup script prepares Node.js `24.15.0`, installs dependencies, prepares PostgreSQL, runs Prisma, seeds demo data, builds the frontend, starts the backend, and serves the production frontend.

After startup:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- GraphQL API: `http://localhost:4000/graphql`
- Logs: `.logs/`

Demo admin login:

- Email: `admin` or `admin@tiwlo.app`
- Password: `admin`

## Run On A Fresh Ubuntu Server

These steps are for a blank Ubuntu VPS.

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
FRONTEND_GRAPHQL_URL="http://YOUR_SERVER_IP:4000/graphql" \
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

## Ubuntu Production With Domain, Nginx, And tPanel Installer

For a real domain, point your DNS `A` record to the server IP first. Then run Tiwlo with same-domain API routing:

```bash
cd /var/www/Tiwlo
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="https://your-domain.com" \
API_BASE_URL="https://your-domain.com" \
bash ./scripts/start-tiwlo.sh
```

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

    location /graphql {
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

For reboot-safe production services, install systemd units after the first successful setup:

```bash
sudo bash ./scripts/install-tiwlo-systemd.sh
```

This runs the backend with `Type=simple`, serves the built frontend through the Node production server, and proxies tPanel installer/API paths through the frontend service.

## tPanel License Install Command

tPanel is the brand. It is a tPanel hosting-management system, not WHM. After a license is active, use this one-line installer:

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

## One-Line Code Update

Update this Tiwlo server without removing PostgreSQL data:

```bash
cd /var/www/Tiwlo && bash ./scripts/update-tiwlo.sh
```

The update command runs `git pull`, installs dependencies, runs Prisma `db:push`, rebuilds the frontend, and restarts systemd services if they exist. It does not run `prisma migrate reset`, `DROP DATABASE`, or delete `.data/postgres`.

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

- `VITE_GRAPHQL_URL`: GraphQL URL used by the browser. Use `http://localhost:4000/graphql` for local development, `/graphql` behind Nginx on a domain.
- `DATABASE_URL`: PostgreSQL database connection for Prisma.
- `JWT_SECRET`: Change this before production.
- `FRONTEND_ORIGIN`: Public frontend URL allowed by backend CORS.
- `API_BASE_URL`: Public backend/callback base URL for payment redirects and webhooks.
- Payment keys: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`.

## Useful Commands

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

If the frontend opens but API calls fail on a domain, rebuild with:

```bash
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="https://your-domain.com" \
API_BASE_URL="https://your-domain.com" \
bash ./scripts/start-tiwlo.sh
```

If PostgreSQL already uses port `5432`, the startup script can use fallback port `55432` for the local project database.

## Repository

GitHub: `https://github.com/alimranniloy/Tiwlo`
