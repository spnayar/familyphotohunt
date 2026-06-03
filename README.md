# Vacation Photo Contest App

A fun family vacation photo contest app that helps families create togetherness during trips by organizing photo contests with categories.

## Features

### Admin/Planner Section
- **Create Contests**: Set up photo contests with location and date (month/year)
- **Manage Categories**: Add and remove photo categories (e.g., Animal, Flora, Architecture, etc.)
- **Add Participants**: Invite family members with email/phone, generate unique login codes
- **Email Notifications**: Automatically sends login codes via email when participants are added
- **Track Status**: Monitor contest status (draft, active, voting, completed)
- **View Results**: See winners and vote counts for each category

### Participant Section
- **Login System**: Simple login code-based authentication
- **Category Overview**: See all categories for the contest
- **Photo Upload**: Upload multiple photos per category during the trip
- **Photo Ranking**: Rank photos within each category (1 = best)
- **Submission Tracking**: See which categories you haven't submitted photos for yet
- **Final Submission**: Submit exactly one photo per category when ready
- **Submission Status**: View who has submitted and who hasn't

### Voting System
- **Automatic Activation**: Voting mode activates when all participants have submitted
- **Anonymous Voting**: Photos are displayed randomly and anonymously
- **One Vote Per Category**: Each participant picks their favorite photo in each category
- **Most Votes Wins**: The photo with the most votes wins (ties are supported)
- **Self-Vote Prevention**: Users cannot vote for their own photos (but their photos are still displayed)
- **Results Display**: View winners and vote counts

### Winner Reveal
- **TV-Friendly Presentation**: Fullscreen reveal mode for displaying winners
- **Category-by-Category**: Reveals winners one category at a time
- **All Winners Summary**: Final view showing all winners with photos
- **Collage View**: Beautiful grid of all winning photos

## Getting Started

### Installation

```bash
npm install
```

### Email Configuration

To enable email notifications when participants are added:

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. For Gmail:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Enable 2-Step Verification
   - Generate an App Password at [App Passwords](https://myaccount.google.com/apppasswords)
   - Use your Gmail address and the generated App Password

3. Update `.env.local`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. For other email providers (SendGrid, Mailgun, etc.), update the transporter configuration in `app/api/send-email/route.ts`

**Note**: If email is not configured, the app will still work but will show the login code to the admin instead of sending an email.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

### Deploying (e.g. Railway)

If the app shows "Application failed to respond":

1. **Check deploy logs** in your host’s dashboard (e.g. Railway → your project → Deployments → View logs). Look for `[db] Using DATABASE_URL=...` and `[db] Records: N users, M contests`. If counts drop to zero after a deploy, stop and check `DATABASE_URL` and the volume mount before creating new data.
2. **Database**: Production uses **SQLite on a Railway volume** — not PostgreSQL. Keep `DATABASE_URL=file:../data/dev.db` and the volume at `/app/data`. See [Production data safety](#production-data-safety-railway) below.
3. **Start script**: `npm start` runs `scripts/ensure-db.mjs` (schema sync + safety checks) then Next.js. **Do not** change it to use `--force-reset` or point at a different database path.

### Site owner console (super admin)

Hidden console for the site owner only — **not linked from the public app**. Separate login from participant/organizer accounts.

| URL | Purpose |
|-----|---------|
| `/super-admin/login` | Site owner sign-in |
| `/super-admin` | All users and all contests site-wide |

Set these **Railway Variables** (never commit real values):

| Variable | Purpose |
|----------|---------|
| `SUPER_ADMIN_USERNAME` | Login username |
| `SUPER_ADMIN_PASSWORD` | Login password |
| `SUPER_ADMIN_SESSION_SECRET` | Random string (32+ chars) used to sign session cookies |

After deploy, bookmark `https://familyphotohunt.com/super-admin/login`. The console shows registered users (with last login and contest roles) and all contests (creator, participants, photo counts).

### Production data safety (Railway)

Production runs at [familyphotohunt.com](https://www.familyphotohunt.com) with **SQLite on a persistent Railway volume**. Contests, participants, votes, and **photos** (stored in the database) all live in a single file: `/app/data/dev.db`.

**Normal code deploys do not delete your data.** Railway replaces the app container; the volume keeps the database file.

#### Critical: one database path everywhere

Prisma resolves SQLite paths **relative to `prisma/schema.prisma`**, not the project root:

| `DATABASE_URL` | Resolves to | Persists? |
|----------------|-------------|-----------|
| `file:../data/dev.db` | `/app/data/dev.db` (volume) | **Yes** |
| `file:./data/dev.db` | `/app/prisma/data/dev.db` (container) | **No — wiped every deploy** |

Both the running app and startup `prisma db push` must use:

- **`DATABASE_URL`** = **`file:../data/dev.db`**
- Volume mount = **`/app/data`**

On startup, `scripts/ensure-db.mjs`:

- **Refuses to start in production** if `DATABASE_URL` is missing, uses `file:./data/dev.db`, or does not point at `data/dev.db`
- **Never copies** `prisma/dev.db` over the volume database
- **Backs up** `data/dev.db` before schema sync, and **aborts + restores** if user or contest counts drop to zero
- Logs the resolved database path, file size, and user/contest counts before and after sync
- Runs `prisma db push` (never `--force-reset`) to apply schema changes without wiping rows

**Never commit `*.db` files to git.** A tracked `prisma/dev.db` in the repo was also overwriting the live database on deploy.


| Setting | Value | Why |
|--------|--------|-----|
| Volume mount | `/app/data` only | Persists the database across redeploys |
| `DATABASE_URL` | `file:../data/dev.db` | Points at the volume file via Prisma’s path rules |
| Start script | `node scripts/ensure-db.mjs && next start` | Validates DB path, syncs schema without reset |

**Do not** mount a volume at `/app/prisma`. That overwrites the built-in Prisma schema and breaks deploys.

#### What would wipe contests and photos

Avoid these in production:

- Deleting the volume (`familyphotohunt-data`) in Railway
- Changing `DATABASE_URL` to a different path (creates a new empty database)
- Adding a volume at `/app/prisma`
- Running `prisma migrate reset` or `prisma db push --force-reset`
- Schema changes that drop tables or columns without a careful migration

Routine UI and feature changes (like copy or layout updates) are safe.

#### Checklist before each deploy

1. **Variables**: `DATABASE_URL` is **`file:../data/dev.db`** (not `file:./data/dev.db`)
2. **Volumes**: only `/app/data` is mounted; the volume was not deleted
3. **Start script**: no reset flags added to `npm start` in `package.json`
4. **After deploy**: open Railway logs and confirm `[db] Records: …` shows your expected user/contest counts; spot-check that an existing contest still appears in the app

#### Startup safeguards (automatic)

Every deploy runs `scripts/ensure-db.mjs` before the app starts. In production it **exits with an error** (deploy fails) if:

- `DATABASE_URL` is not set
- `DATABASE_URL` is `file:./data/dev.db` (ephemeral path)
- `DATABASE_URL` does not point at `data/dev.db` on the volume

That prevents the app from silently switching to an empty ephemeral database. Logs always include the path, file size, and record counts so you can catch problems immediately.

#### Reverting code without losing data

- **Railway → Deployments → Redeploy** an older deployment rolls back **app code only**; the database on the volume is unchanged.
- **Git revert/reset** and push rolls back code; data is still on the volume unless you also change `DATABASE_URL` or delete the volume.

#### Optional backup before risky changes

Before large schema changes, verify the DB file exists in the Railway service shell:

```bash
ls -la /app/data/
```

You should see `dev.db` with a non-zero size. Copy or export it if your Railway plan supports volume backups.

See also [DEPLOYMENT.md](./DEPLOYMENT.md) for full deploy steps.

## How to Use

### For Planners/Admins

1. Go to **Admin Dashboard** from the home page
2. Click **"Create New Contest"**
3. Enter the location and date (month/year)
4. Add categories for the contest
5. Add participants (they'll receive login codes via email)
6. Monitor submission status
7. View results once voting is complete
8. Use **Winner Reveal** mode for the final presentation

### For Participants

1. Check your email for your login code
2. Go to **Participant Login** from the home page
3. Enter your login code (received via email)
4. View all categories for your contest
5. Upload photos to each category throughout the trip
6. Rank your photos (1 = best)
7. Submit your best photo for each category when ready
8. Once all participants submit, voting mode activates
9. Vote for your favorite photo in each category (can't vote for your own)
10. View results

## Data Storage

The app currently uses **localStorage** for data persistence. This means:
- Data persists in your browser
- Data is local to each device/browser
- For production use, you'd want to replace this with a proper database

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **localStorage** - Data persistence (client-side)
- **Nodemailer** - Email sending

## Mobile Optimizations

- Fully responsive design
- iPhone-optimized with direct camera access
- Touch-friendly interface
- PWA support (can be added to home screen)
- Large, readable text throughout

## Future Enhancements

- SMS notifications when participants are added
- Real database backend (PostgreSQL, MongoDB, etc.)
- User authentication system
- Photo storage (cloud storage like S3, Cloudinary)
- Real-time updates
- Mobile app version
- Social sharing of winners

## License

MIT
