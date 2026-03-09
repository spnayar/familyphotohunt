# Deploying to familyphotohunt.com

Your app uses **Next.js** and **SQLite** (via Prisma). To put it on the web and use your GoDaddy domain, you need to:

1. **Host the app** on a platform that supports Node.js (and SQLite, or a hosted database).
2. **Point your GoDaddy domain** to that host.

---

## Option A: Railway (recommended — keeps SQLite)

[Railway](https://railway.app) can run your app as-is with SQLite (using a persistent volume).

### 1. Push your code to GitHub

If you haven’t already:

```bash
cd /path/to/vacation-photo-contest
git add .
git commit -m "Prepare for deployment"
git remote add origin https://github.com/YOUR_USERNAME/vacation-photo-contest.git
git push -u origin main
```

(Use your real GitHub repo URL and branch name.)

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. **New Project** → **Deploy from GitHub repo** → select `vacation-photo-contest`.
3. Railway will detect Next.js and build/run it.
4. Add a **Volume** (so the SQLite file persists):
   - In the project, click your service → **Variables** tab.
   - Go to **Volumes** → **Add Volume** → mount path: `/app/prisma` (or where `prisma/dev.db` lives relative to app root).  
   - Or in **Settings**, add a volume and set mount path to the folder that contains `dev.db` (e.g. `prisma`).
5. **Settings** → **Networking** → **Generate domain** so Railway gives you a URL like `xxx.up.railway.app`.
6. **Custom domain**: Add `familyphotohunt.com` and `www.familyphotohunt.com`. Railway will show the DNS records to use.

### 3. Point GoDaddy to Railway

In [GoDaddy DNS](https://dcc.godaddy.com/) for `familyphotohunt.com`:

- **A record**:  
  - Name: `@` (or leave blank for root)  
  - Value: the **IPv4** Railway gives you for your service (or the CNAME target if they use a shared IP).
- **CNAME** (if Railway asks for it):  
  - Name: `www`  
  - Value: the Railway hostname (e.g. `xxx.up.railway.app`).

Use exactly what Railway shows in “Custom domain” (they may prefer CNAME for root; follow their instructions).

### 4. Environment variables on Railway

In Railway → your service → **Variables**, add (if you use them):

- `NEXT_PUBLIC_APP_URL` = `https://familyphotohunt.com`
- Email (if you use send-email): `EMAIL_USER`, `EMAIL_PASSWORD` (or `EMAIL_APP_PASSWORD`), `EMAIL_SERVICE`

Redeploy after changing variables.

---

## Option B: Render

[Render](https://render.com) can also run Next.js. SQLite on the free tier is not persistent (disk is ephemeral). For a real deployment you’d use a **PostgreSQL** database on Render and switch Prisma to Postgres (see Option C for the idea).

- **New** → **Web Service** → connect GitHub repo.
- Build: `npm install && npx prisma generate && npm run build`
- Start: `npm run start`
- Add custom domain: `familyphotohunt.com` and `www.familyphotohunt.com` in Render, then in GoDaddy set the CNAME/A records Render tells you.

---

## Option C: Vercel + hosted database (no SQLite)

[Vercel](https://vercel.com) is great for Next.js but doesn’t support SQLite (serverless = no persistent disk). You’d:

1. Create a **PostgreSQL** database (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com)).
2. Change `prisma/schema.prisma` to use `postgresql` and `url = env("DATABASE_URL")`.
3. Run migrations and point `DATABASE_URL` in Vercel to the new DB.
4. Deploy the repo on Vercel and add **Custom domain** `familyphotohunt.com`.
5. In GoDaddy, set the DNS records Vercel shows (usually CNAME for `www` and A or CNAME for root).

This is the most “scalable” but requires a small Prisma/DB migration.

---

## After deployment: set production URL

So links in emails (e.g. “Log in”) use your real domain:

- Set **`NEXT_PUBLIC_APP_URL`** = **`https://familyphotohunt.com`** in your host’s environment variables.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Push code to GitHub |
| 2 | Create project on Railway (or Render/Vercel) and connect repo |
| 3 | Add env vars (at least `NEXT_PUBLIC_APP_URL=https://familyphotohunt.com`) |
| 4 | Add custom domain `familyphotohunt.com` (and `www`) in the host’s dashboard |
| 5 | In GoDaddy DNS, add the A/CNAME records the host tells you |
| 6 | Wait 5–60 minutes for DNS to propagate, then open https://familyphotohunt.com |

If you tell me which option you prefer (Railway, Render, or Vercel + Postgres), I can give step-by-step clicks and exact Prisma changes for that path.
