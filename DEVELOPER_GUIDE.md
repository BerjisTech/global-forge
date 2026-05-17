# GlobalForge — Developer Guide

GlobalForge is a smart international pricing and Delivered-Duty-Paid (DDP) calculator app for Shopify, built on the React Router TypeScript template with Prisma + SQLite for local dev.

This guide walks you through cloning the repo, building it, and installing it on a Shopify development store using the Shopify CLI.

---

## 1. Prerequisites

Install these once on your machine:

- **Node.js** `>=20.19 <22` or `>=22.12` (the engines field in `package.json` enforces this)
- **npm** (ships with Node)
- **Git**
- **Shopify CLI** (global install):
  ```powershell
  npm install -g @shopify/cli@latest
  ```
- A **Shopify Partner account** (free): https://partners.shopify.com
- A **development store** created from the Partner dashboard (Stores → Add store → Development store)
- A **tunnel tool** of your choice — you will run the dev server behind a public HTTPS URL. Pick one:
  - [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (free, recommended)
  - [ngrok](https://ngrok.com/) (free tier works)
  - Or any HTTPS reverse tunnel you already use

> **Windows note:** these instructions assume PowerShell 7+. Commands that set environment variables use PowerShell syntax (`$env:PORT=...`). If you are on macOS/Linux, use the POSIX form already present in `package.json` (`PORT=6500 shopify app dev ...`).

---

## 2. Clone the repo and install dependencies

```powershell
git clone <repo-url> global-forge
cd global-forge
npm install
```

`npm install` also resolves the workspace at `extensions/*` (currently empty — safe to ignore).

---

## 3. Create your own Shopify app in the Partner dashboard

The committed `shopify.app.toml` is bound to **client_id `9ead8be52931337bd341e75d4b919a08`**, which belongs to the original Partner organization. You cannot reuse it — create your own:

1. Go to https://partners.shopify.com → **Apps** → **Create app** → **Create app manually**.
2. Give it any name (e.g. `GlobalForge Dev — <your-name>`).
3. Note the new **Client ID** — you'll use it in the next step.

---

## 4. Link this code to your app

From the repo root:

```powershell
shopify app config link
```

The CLI will:
- Prompt you to log into your Partner account
- Ask which app to link to → pick the one you just created
- Write a new `shopify.app.<name>.toml` and switch the active config to it

> Do **not** commit your linked TOML if you don't want to share your client_id. The default `shopify.app.toml` stays as-is for the original org.

If you ever need to switch configs back:

```powershell
shopify app config use shopify.app.toml
```

---

## 5. Set up the local database

The app uses SQLite via Prisma. Generate the client and run migrations:

```powershell
npx prisma generate
npx prisma migrate deploy
```

This creates `prisma/dev.sqlite`. The Shopify session store lives here, along with the GlobalForge domain tables (shops, pricing rules, country configs, analytics).

---

## 6. Start your tunnel

You need a public HTTPS URL that forwards to **port 6500** on your machine.

### Option A — cloudflared (quick tunnel, throwaway URL)

```powershell
cloudflared tunnel --url http://localhost:6500
```

cloudflared prints a `https://<random>.trycloudflare.com` URL — copy it.

### Option B — ngrok

```powershell
ngrok http 6500
```

Copy the `https://...ngrok-free.app` URL from the ngrok output.

### Option C — your own static subdomain

If you have a named tunnel (cloudflared with a CNAME, ngrok reserved domain, etc.), use that URL instead — having a stable URL means Shopify doesn't change your app URLs every restart.

Keep the tunnel terminal open — you'll need a second terminal for the dev server.

---

## 7. Run the dev server

In a **new terminal** at the repo root:

```powershell
$env:PORT=6500
shopify app dev --tunnel-url=https://<your-tunnel-host>:6500
```

Replace `<your-tunnel-host>` with the hostname from step 6 (no scheme/port duplication — the `:6500` after the host tells Shopify which port to forward to).

On the first run the CLI will:
- Verify your linked app
- Push the `application_url`, redirect URLs, and webhook subscriptions from `shopify.app.toml` to your Partner app
- Build the React Router app via Vite and start watching for changes

When the CLI prints **"Press P to open the URL to your app"**, press **P**. Your browser opens to `https://<your-dev-store>.myshopify.com/admin/oauth/install` — accept the install prompt and the embedded admin UI loads.

> If `automatically_update_urls_on_dev = true` (it is, in `shopify.app.toml`), the CLI rewrites your Partner app's URLs to point at the active tunnel each session. That's why a stable tunnel is nicer than a throwaway one.

---

## 8. Build for production

```powershell
npm run build
```

Outputs to `build/client` and `build/server`. To run the production server locally:

```powershell
npm run start
```

The Dockerfile in the repo wraps `npm run setup && npm run start` for container deploys.

---

## 9. Useful commands

| Command | What it does |
|---|---|
| `npm run dev:local` | Runs `shopify app dev` with no `--tunnel-url` — Shopify CLI picks a Cloudflare tunnel for you. Easiest fallback if you don't want to manage your own tunnel. |
| `npm run typecheck` | `react-router typegen && tsc --noEmit` |
| `npm run lint` | ESLint over the whole repo |
| `npx prisma studio` | Opens the SQLite DB in a browser GUI on port 5555 |
| `shopify app generate extension` | Scaffold a checkout/admin/theme extension into `extensions/` |
| `shopify app env show` | Print the env vars the CLI injects (API key/secret) |

---

## 10. What you can test in a dev store

Once installed on a dev store, exercise:

- **Dashboard** (`/app`) — international order metrics from the local DB
- **Pricing rules** (`/app/pricing-rules`) — create/edit per-country pricing rules (`app.pricing-rules_.new.tsx`, `app.pricing-rules_.$id.tsx`)
- **Countries** (`/app/countries`) — country targeting and exclusions
- **Analytics** (`/app/analytics`) — impact on international sales
- **Settings** (`/app/settings`) — external API keys (duty/tax data), currency config

GlobalForge requests `read_markets` and `read_shipping` scopes, so install it on a dev store that has at least one Market configured and a shipping zone with international rates — otherwise the GraphQL fetchers will return empty payloads.

To seed test data, use Prisma Studio (`npx prisma studio`) or write a script against `app/db.server.ts`.

---

## 11. Troubleshooting

- **"App not approved"** when pressing P → confirm step 4 linked to *your* app, not the original. Re-run `shopify app config link`.
- **OAuth redirect mismatch** → the `redirect_urls` in the active TOML must match the tunnel URL. With `automatically_update_urls_on_dev = true` this is handled, but if you edited URLs manually, run `shopify app deploy` to sync.
- **`PORT` env var ignored on Windows** → use `$env:PORT=6500` *before* `shopify app dev`, not inline. Inline `PORT=6500 shopify app dev` is a bash-only syntax.
- **Prisma "table not found"** → run `npx prisma migrate deploy` again. If you changed the schema, also run `npx prisma migrate dev --name <change>`.
- **Tunnel URL changes every restart** → switch to a stable cloudflared named tunnel or an ngrok reserved domain, or just use `npm run dev:local`.
- **Stuck session after switching stores** → delete `prisma/dev.sqlite` and re-run `npx prisma migrate deploy`.
- **Empty Markets/Shipping data** → make sure the dev store has Markets configured and the access scopes were granted at install time. If you changed scopes in `shopify.app.toml`, run `shopify app deploy` and re-install.
