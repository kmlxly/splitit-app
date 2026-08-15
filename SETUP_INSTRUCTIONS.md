# SETUP INSTRUCTIONS — Neon Migration

This app has been migrated from Supabase to **Neon Postgres + Neon Auth (Better Auth) + Vercel Blob**.

## 1. Setup Neon Database

1. Go to [console.neon.tech](https://console.neon.tech) and create a project.
2. From the **Dashboard**, copy the connection string under **Connection Details** (use the **Pooled** connection).
3. Open **SQL Editor** in the Neon dashboard.
4. Copy the entire content of `neon_setup.sql` (root of this repo) and paste into the editor.
5. Click **Run**. This creates all tables (budget, subscriptions, sessions, bills, session_members, trips, trip_members, trip_items, trip_personal_expenses, trip_documents, trip_checklists, trip_checklist_items) plus the `join_trip_by_token` function.

## 2. Enable Neon Auth

1. In your Neon project sidebar, click **Auth** → **Enable Neon Auth**.
2. Open the **Configuration** tab and copy the **Auth URL** from the **Project Info** card. It looks like:
   ```
   https://ep-xxxxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
   ```
3. Under **Authentication**, toggle on **Sign-up with Email** and **Sign-in with Email**.
4. Under **OAuth providers**, click **Add OAuth provider** → **Google** (Neon provides shared keys out of the box).
5. Under **Domains**, keep **Allow Localhost** on for development. When you deploy, add your production domain (e.g. `https://your-app.vercel.app`).
6. Generate a cookie secret locally:
   ```bash
   openssl rand -base64 32
   ```

## 3. Setup Vercel Blob (File Uploads)

1. In your Vercel project dashboard, go to **Storage** → **Create Blob Store**.
2. Copy the `BLOB_READ_WRITE_TOKEN` it generates.

## 4. Create `.env.local`

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required keys:
- `DATABASE_URL` — pooled connection string from Neon
- `NEON_AUTH_BASE_URL` — Auth URL from Neon Console → Auth → Configuration
- `NEON_AUTH_COOKIE_SECRET` — random string from `openssl rand -base64 32` (≥ 32 chars)
- `BLOB_READ_WRITE_TOKEN` — from Vercel Blob
- `OPENROUTER_API_KEY` — for AI features

## 5. Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Architecture Notes

- **Auth** — `@neondatabase/auth` (Better Auth under the hood). Server actions read the session via `getServerUser()` / `requireServerUser()` from `lib/auth/server.ts`. Client components use `useUser()` from `lib/auth/client.ts`.
- **Auth API route** — `app/api/auth/[...path]/route.ts` proxies all auth traffic to your Neon Auth instance.
- **User table** — Neon Auth creates and manages a `neon_auth.user` table automatically (you can introspect it from the SQL Editor or via Drizzle). Our application tables store the user id in a plain `TEXT` column (`user_id`, `owner_id`, `auth_id`) — we do **not** enforce a foreign key so Neon Auth can manage its own schema independently.
- **Authorization** — RLS has been removed. Server actions use the helpers in `lib/authorization.ts` to enforce resource ownership or trip roles (`owner`, `editor`, `viewer`).
- **Realtime** — Supabase Realtime has been replaced with simple polling (`setInterval`) every 5–15 seconds in dashboards/lists.
- **Storage** — Supabase Storage has been replaced with Vercel Blob. Trip documents are uploaded as private blobs and served through the authorized `/api/documents/[id]` proxy.
