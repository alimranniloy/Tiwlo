<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6e77e873-a1a8-4ffe-98f1-158a0a1e775e

## One Command Local Run

Copy/paste one command from the project root. These scripts target Node.js `24.15.0`, create/update `.env` files, prepare PostgreSQL, run Prisma, seed data, start the backend, build the frontend, and serve the production bundle.

Windows PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-tiwlo.ps1
```

Linux/macOS/server shell:
```bash
bash ./scripts/start-tiwlo.sh
```

Frontend: `http://localhost:3000`
Backend GraphQL: `http://localhost:4000/graphql`

If Node.js is missing or the wrong version, the startup script uses a local copy in `.tools/node`. On Linux servers it installs PostgreSQL with the available package manager when PostgreSQL is missing; on Windows it downloads portable PostgreSQL binaries into `.tools/postgresql`.

The one-command startup uses `npm run serve` after `npm run build`, so browser network tools receive built assets instead of raw `.tsx` source files. Use `npm run dev` only for local development with source maps and hot reload.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Local GraphQL/PostgreSQL backend

The database API lives in [`x`](x). It is a Node.js GraphQL server with Prisma/PostgreSQL models for the cloud dashboard, main admin, ecommerce admin, store admin, and ISP admin modules.

1. `cd x`
2. Copy `.env.example` to `.env` and update `DATABASE_URL`
3. `npm install`
4. `npm run db:push`
5. `npm run db:seed`
6. `npm run dev`

Then run the React app with `VITE_GRAPHQL_URL=http://localhost:4000/graphql`.

Frontend API calls are split by domain in [`src/lib/api`](src/lib/api). [`src/lib/tiwloApi.ts`](src/lib/tiwloApi.ts) only re-exports those modules for older imports.
