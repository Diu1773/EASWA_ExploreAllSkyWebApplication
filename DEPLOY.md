# EASWA Deployment Notes

This app can be deployed behind a single public URL and used from a poster QR code.

## Why the current app is deployable as-is

- The frontend already calls the API with a relative base path: `/api`.
- The backend already serves the built frontend from `frontend/dist`.
- This means the simplest production shape is one hostname, one process, one QR target.

## Recommended deployment shape

Use the root `Dockerfile` on a platform such as Railway, Render, Fly.io, or a small VPS.
This repo also includes a starter `render.yaml` for Render Blueprints.

- Build command: handled by Docker
- Start command: handled by Docker
- Public URL example: `https://easwa.example.com`
- QR code target: the same public URL
- The Docker image now listens on `${PORT:-5895}`, which matches platforms that inject a `PORT` variable.

## Required environment variables

Set these in the hosting platform.

> **`render.yaml` is not the source of truth for the live service.** The Render
> service was created by hand, not from a Blueprint, so it never reads
> `render.yaml` — the dashboard's Environment tab is the only thing that takes
> effect. `render.yaml` is a reference list of what the service *should* have;
> when you add a variable there, add it in the dashboard too. Symptom that
> caught this on 2026-07-17: rows arrived in the sheet with `app_version=dev`
> even though `render.yaml` sets `VITE_APP_VERSION=render`.

- `EASWA_BASE_URL=https://your-public-domain`

  **Do not omit this.** It sets the OAuth callback, but it also decides whether
  the process thinks it is a dev box: `config.py` reads a `localhost` BASE_URL as
  "development" and hands out development defaults. On a 512 MB Render instance
  that silently meant a **96 MB cutout cache (vs 16 MB)** and **2 preview / 4
  frame-count workers (vs 1 each)** — the OOM guards were effectively off, with
  nothing in the logs to say so. Only the variables you set explicitly were
  production-shaped; everything left to its default was not.

- `EASWA_SESSION_SECRET=<long-random-secret>`

If you want Google sign-in:

- `GOOGLE_CLIENT_ID=<google-oauth-client-id>`
- `GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>`
- `EASWA_ADMIN_EMAILS=teacher@example.com,admin@example.com`

If you use Google sign-in, register this callback URL in Google Cloud:

- `https://your-public-domain/api/auth/callback`

## Frontend (`VITE_*`) variables — baked in at build time

These are read by Vite while the bundle is compiled, not by the server at
runtime. Two consequences:

- **Changing one needs a re-deploy, not a restart.** A restart re-runs the same
  image and the old value is still inside the JS.
- **They must reach the Docker build.** Render passes service env vars to the
  build as build args, but only if the Dockerfile declares a matching `ARG` —
  see the `frontend-build` stage. Without that the dashboard value is silently
  dropped and the bundle ships with the fallback.

- `VITE_RECORD_SINK_URL=https://script.google.com/macros/s/.../exec`
  Apps Script Web App that receives anonymous records (`docs/survey/easwa_record_sink.gs`).
  Unset → the app keeps records in the browser only and never uploads.

- `VITE_APP_VERSION=render`
  Tagged onto every row. This is how real classroom data is told apart from
  local test rows in the sheet — leave it unset and everything reads `dev`.

## Optional environment variables

- `EASWA_TRANSIT_CUTOUT_MAX_DOWNLOAD_BYTES=629145600`
  Hard cap on the TESSCut ZIP download (600 MB). Pair it with
  `EASWA_TRANSIT_MAX_CUTOUT_SIZE_PX`: raising the pixel cap to 99 without this
  lets a 99 px cutout of a 200 s-cadence sector fill the ephemeral disk instead
  of failing fast with a clear message. Default is `0` = unlimited.

- `EASWA_RECORD_REQUIRE_LOGIN=false`
  Use this if poster visitors should be able to submit records without logging in.
  Note that `/my` and `/drafts/*` still require login because they are user-specific.
  The admin dashboard always requires Google sign-in and an email listed in `EASWA_ADMIN_EMAILS`.

- `EASWA_DB_PATH=/var/data/easwa.db`
- `EASWA_EXPORT_DIR=/var/data/submissions`
  Recommended when you attach a persistent disk on Render or another host.
  Without these, the app uses local paths under `backend/`.

- `EASWA_TRANSIT_PREVIEW_WORKERS=1`
- `EASWA_TRANSIT_FRAME_COUNT_WORKERS=1`
- `EASWA_TRANSIT_CUTOUT_MEMORY_CACHE_MAX_ITEMS=1`
- `EASWA_TRANSIT_CUTOUT_MEMORY_CACHE_MAX_BYTES=16777216`
- `EASWA_TRANSIT_CUTOUT_HOT_CACHE_MAX_ITEMS=0`
  Useful on Render free instances if the transit lab preview hits the 512 MB memory cap.
  The current code already defaults to conservative values outside local development, but these let you tighten or relax them explicitly.

- `EASWA_CORS_ORIGINS=https://your-public-domain`
  Only needed if you later split frontend and backend across different origins.
  With the current single-origin deployment, relative `/api` requests are simpler.

## Important operational note

The backend currently stores data in local files:

- SQLite database: `backend/easwa.db`
- Exported submissions: `backend/submissions/`

That is fine for a quick demo, but many hosted containers have ephemeral storage.
If you redeploy or the instance is replaced, stored records may be lost unless you attach persistent storage or move to an external database/object store.

## Render quick start

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and point it at this repo.
3. Render will read `render.yaml` and create a Docker-based web service.
4. For the first trial deploy, the Blueprint sets `EASWA_RECORD_REQUIRE_LOGIN=false` so visitors can submit records without Google login.
5. If you later want Google sign-in, add these in the Render dashboard and set the callback to `https://your-domain/api/auth/callback`:
   - `EASWA_BASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
6. If you later move off the free plan, attach a persistent disk and set:
   - `EASWA_DB_PATH=/var/data/easwa.db`
   - `EASWA_EXPORT_DIR=/var/data/submissions`

## Local production-like check

```bash
npm --prefix frontend run build
python -m uvicorn main:app --host 0.0.0.0 --port 5895 --app-dir backend
```

Then open:

- `http://localhost:5895/`
- `http://localhost:5895/api/health`

## Poster QR recommendation

Use the root URL, not a deep link, unless you are deliberately demonstrating a specific page.

- Good: `https://your-public-domain/`
- Good: `https://your-public-domain/target/WASP-43b`
- Avoid: temporary LAN IPs such as `http://192.168.x.x:5895`

For a conference poster, keep the final URL short and stable. If possible, use a custom domain or a short redirect domain that you control.
