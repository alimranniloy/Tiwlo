# Tiwlo X Backend

Node.js GraphQL backend for the Tiwlo cloud, ecommerce, store admin, and ISP admin dashboards.

The API is organized around production domains:

- Auth and role based users
- RBAC roles, permission groups, staff/user access scopes
- Cloud resources and connected management servers
- Domains, DNS records, and automatic subdomain provisioning
- Billing, invoices, payment gateways, and payout settings
- Global platform settings and audit logs
- Admin module registry for every menu/category
- Ecommerce stores, themes, plugins, products, orders, customers
- ISP sites, routers, RADIUS, packages, clients, and invoices
- Integrations/API credentials for automation
- Notifications and live alert records

## Folder Structure

```text
x/src/core/                  shared auth, validation, audit, formatting, resolver merge
x/src/modules/auth/          login, signup, profile
x/src/modules/users/         user search, status/role control
x/src/modules/rbac/          roles, permission groups, scoped assignments
x/src/modules/cloud/         droplets, volumes, system servers, plans
x/src/modules/domains/       domains and DNS records
x/src/modules/billing/       invoices and payment gateways
x/src/modules/settings/      editable/readonly scoped settings
x/src/modules/admin/         module registry, audit logs, API credentials
x/src/modules/integrations/  plugins, external services, provider health
x/src/modules/notifications/ alerts and read state
x/src/modules/ecommerce/     SaaS stores, products, orders, themes, plugins
x/src/modules/isp/           ISP sites, clients, packages, routers, RADIUS
```

## Setup

From the project root, this one command installs/downloads missing local tools, creates PostgreSQL DB, runs Prisma, seeds data, and starts backend/frontend:

Windows:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-tiwlo.ps1
```

Linux/macOS/server:
```bash
bash ./scripts/start-tiwlo.sh
```

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create the PostgreSQL tables:
   ```bash
   npm run db:push
   ```
4. Seed demo data:
   ```bash
   npm run db:seed
   ```
5. Start the GraphQL server:
   ```bash
   npm run dev
   ```

GraphQL runs at `http://localhost:4000/graphql`.

## Payment setup

The billing module supports credit balance payments plus hosted checkout redirects for bKash, Stripe, and PayPal. Configure credentials either from **Management -> Payments** or in `x/.env`:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_BASE_URL`
- `API_BASE_URL` for provider callbacks and `FRONTEND_ORIGIN` for payment result redirects
- `PAYMENT_RATE_USD_BDT` when a USD invoice is paid through bKash in BDT

Payment callbacks are exposed at `/payments/bkash/callback`, `/payments/paypal/return`, `/payments/stripe/return`, and `/webhooks/stripe`.

## Credit automation

- New signup credit is controlled by the platform setting `accountCreditPolicy.newAccountCredit`; the seeded/default value is `0`.
- Users with `0` credit cannot place cloud, domain, ecommerce, or ISP provisioning orders.
- When credit is empty, credit automation turns owned cloud resources off and suspends owned ecommerce/ISP services. Adding credit through billing or admin user credit updates resumes services that were suspended by this automation.
- GraphQL: `runCreditAutomation(input: { ownerId })`
- REST: `POST /automation/credit-sync` with `Authorization: Bearer $AUTOMATION_API_TOKEN` or `x-automation-token`.

## Provisioning behavior

- Creating a store creates the store row, a `slug.tiwlo.store` domain, DNS record, default themes, starter plugins, and provisioning settings.
- Creating an ISP site creates the ISP site row, a `code.connectivity.hub` control-panel domain, DNS record, and provisioning settings.
- Connecting a system server stores it as a `system_server` cloud resource with panel/provider metadata.
- Admin side menu categories are seeded as `AdminModule` records so incomplete UI routes can still resolve to real module data.

Demo admin login:

- email: `admin` or `admin@tiwlo.app`
- password: `admin`

The schema keeps the current UI data shapes, so the React app can move from dummy data to PostgreSQL without changing the design.
