# ML Tracker

Track your Mobile Legends ranked match history with your squad. Log matches, compare stats, climb the leaderboard.

## Tech Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **Supabase** (PostgreSQL + Auth + Row Level Security)
- **Tailwind CSS** + **shadcn/ui** patterns
- **Recharts** for player charts
- **date-fns** for date formatting
- **TypeScript**

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Vercel](https://vercel.com) account (for deployment)

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are found in your Supabase dashboard under **Settings → API**.

---

## Supabase Setup

### 1. Create the schema

Go to **SQL Editor** in your Supabase dashboard and run the full contents of `sql/schema.sql`. This creates:

- Tables: `seasons`, `heroes`, `matches`, `match_players`, `profiles`
- Indexes
- Row Level Security policies
- Auto-profile trigger on new user registration
- Seed data: 39 ML heroes + a default Season 1

### 2. Enable Email Auth

In your Supabase dashboard:
- Go to **Authentication → Providers**
- Ensure **Email** provider is enabled
- Optionally disable "Confirm email" for easier local testing (re-enable for production)

### 3. Set your first admin

After registering your account through the app, open **SQL Editor** and run `sql/set-admin.sql`, replacing `USERNAME_DISINI` with your username:

```sql
UPDATE public.profiles SET is_admin = true WHERE username = 'your_username';
```

### 4. Create a season

Log in as admin, go to **Settings → Manajemen Season**, and create a season with "Aktifkan sekarang" checked. Without an active season, match logging is still possible but the dashboard will show a warning.

---

## Local Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Register an account, set yourself as admin via SQL, then create a season.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create ml-tracker --private --source=. --push
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

### 3. Post-deploy setup

After the first deploy:
1. Register your account at your Vercel URL
2. Set yourself as admin via Supabase SQL Editor
3. Create a season via `/seasons`

---

## RLS Policy Notes

The Row Level Security setup means:

| Table | Read | Write |
|---|---|---|
| `seasons` | Any authenticated user | Admin only |
| `heroes` | Any authenticated user | — (seeded via SQL) |
| `matches` | Any authenticated user | Match creator |
| `match_players` | Any authenticated user | Match creator (for all players in the match) |
| `profiles` | Any authenticated user | Own profile only |

If you need to apply the RLS fix to an existing database (updating the `match_players` INSERT policy), run:

```sql
DROP POLICY IF EXISTS "match_players: owner can insert" ON public.match_players;
CREATE POLICY "match_players: owner can insert"
  ON public.match_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id AND created_by = auth.uid()
    )
  );
```

---

## Project Structure

```
app/
  dashboard/        # Overview: player cards, quick stats, recent activity
  leaderboard/      # Best players, worst awards, hero stats (min 5 games)
  matches/          # Full match history list
  match/
    [id]/           # Match detail view
    new/            # Log a new match
  player/
    [username]/     # Player profile with charts and hero stats
  seasons/          # Admin: create/manage seasons
  login/            # Auth pages
  register/
components/
  ui/               # Shared UI components (ErrorToast, etc.)
lib/
  supabase/         # Supabase client helpers (server + browser)
sql/
  schema.sql        # Full schema, RLS, seed data — run in Supabase SQL Editor
  set-admin.sql     # Snippet to grant admin to a user
```

---

## Features

- **Match logging** — log a match with up to 5 players, hero selection, K/D/A, rating (0–10)
- **Player profiles** — win rate, KDA, hero stats, weekly trend chart, recent matches
- **Leaderboard** — ranked by win rate, KDA, or games (min 5 games); podium view for top 3; worst awards; hero leaderboard
- **Season management** — admin can create seasons, set active, close; all stats filterable by season
- **Responsive** — mobile-first layout throughout
