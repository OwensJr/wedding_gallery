# Wedding Photos MVP

Mobile-first wedding photo sharing MVP built with Next.js (App Router), Tailwind CSS and Supabase.

Environment variables (set in Vercel or .env.local):

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (for client)
- `SUPABASE_URL` — same Supabase URL (server)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role key (server only)

Supabase setup:

1. Create a project and a storage bucket named `wedding-photos` (private).
2. Create a `photos` table with columns: `id` (uuid primary key), `event_id` (text), `image_url` (text), `created_at` (timestamp default now()).
3. Ensure upload policy allows server (service role) to write to storage.

Run locally:

```bash
npm install
npm run dev
```

Deployment: push to Vercel and add the environment variables listed above.

PWA & Offline

- Manifest is at `/public/manifest.json`. Replace icons at `/public/icons/*`.
- A basic service worker is at `/public/sw.js` and registers automatically.

Supabase policies

- See `supabase_policies.sql` for suggested RLS policies and admin table setup.

