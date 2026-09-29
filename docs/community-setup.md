# Community deployment runbook

## Provisioning status (2026-09-28)

- Organization: PEEVUE, `fhoqlbbpqhkjubkwecxe`, Free plan.
- Project: PEEVUE, `tiadxpijawiiljzybydl`, US West (us-west-1), Free project quote $0/month confirmed by owner.
- API URL: `https://tiadxpijawiiljzybydl.supabase.co`.
- `community_accounts` migration applied successfully through the Supabase connector.
- Browser roles lack direct review read/write and moderation privileges. Security advisor reports only the expected six INFO notices for server-only tables with RLS and no client policies.
- Still pending: confirmed admin email/account; Auth URL and email sender configuration; server secret binding in Cloudflare; hosted end-to-end validation; merge/deploy PR #1.
- Dashboard setup was interrupted by an unavailable browser security check. Retry normal dashboard access when available; do not bypass the security control.

## Resources

Create a dedicated PEEVUE Supabase organization and project. Do not install this schema in the LearnWhatYouOwn project. Cloudflare continues to serve peevue.com and www.peevue.com. Supabase handles Auth, PostgreSQL, and private photo storage; activating Cloudflare R2 is no longer needed for this implementation.

The app deliberately returns an empty, closed-submission state until all three Supabase bindings exist. A deployed interface alone is not evidence that accounts or uploads are live.

## Database and private photos

1. Apply `supabase/migrations/20260929034126_community_accounts.sql` to the dedicated project with the Supabase migration tool.
2. Verify RLS is enabled on all six tables and browser roles have no grants. This application uses a server-only data API; `anon` and `authenticated` are intentionally denied direct table and storage access.
3. Verify `review-photos` is a private bucket, JPEG-only, 2 MB maximum. Never turn it public. The Worker serves a photo only while an approved review references it. Account and admin pages receive private URLs that expire after five minutes.
4. Run the Supabase security advisor. RLS-with-no-policy notices are expected for these server-only tables; investigate other warnings.

## Supabase Auth

- Site URL: `https://peevue.com`.
- Redirect allowlist: `https://peevue.com/account`, `https://www.peevue.com/account`.
- Email/password authentication with email confirmation enabled. Minimum password length 12.
- Configure a verified custom SMTP sender before opening public registration. Supabase's default mail sender only delivers to project-team members. Do not disable confirmation to bypass this restriction.
- Retain Auth rate limits. Add Supabase CAPTCHA/Turnstile if sign-up abuse requires it. Guest review submissions use a separate server-side persistent quota (8 attempts/IP/hour) and moderation.
- No anonymous Auth sessions are created; a guest review has a null owner and cannot read a private submission later. A UUID and separate receipt nonce make retries idempotent without granting private-read access.

## Administrator

The owner must specify an administrator email. Have that person create and verify their PEEVUE account. Assign the role by verified user ID, never user-editable metadata or the first person to sign up:

```sql
-- Substitute the explicitly authorized email and inspect this result first.
select id, email, email_confirmed_at from auth.users where lower(email) = lower('OWNER_EMAIL');
-- Only after checking identity and email confirmation:
insert into public.administrators(user_id) values ('VERIFIED_USER_UUID');
```

The `/admin` API verifies the access token with Supabase and checks the administrator table for every request. Decisions are transactional, audited, and protected against stale approvals. Removing an approved review immediately removes its public API access; previously issued private image URLs expire within five minutes.

## Cloudflare bindings

Store these with Wrangler's secret commands or the Worker settings. Never commit a secret key or paste it into a public client variable:

- `SUPABASE_URL`: project's HTTPS URL.
- `SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key.
- `SUPABASE_SECRET_KEY`: server-only Supabase secret key (legacy service_role supported).

For local work use an ignored `.dev.vars` file. Production secret bindings persist across code deploys. The public config endpoint exposes only the URL and publishable key.

## Location

- Users must explicitly press Use my current location and grant browser permission.
- GPS is captured once, checked against the Las Vegas area, and shown for confirmation. No background tracking.
- Manual address works without GPS or successful geocoding. An admin verifies it.
- Address searches are explicit, not autocomplete. The server uses Nominatim with attribution, a 30-day cache, a global two-second request gate, and a per-IP quota. No names, emails, or review text are sent to the geocoder. Address or rounded coordinates are sent only to locate the bathroom.
- Neighborhoods from GPS use approximate local bounds and can be corrected before submission or moderation.
- Replace the geocoding provider if traffic outgrows the public Nominatim policy. Do not remove the global request gate.

## Validate and release

```sh
npm ci
npm run typecheck
npm test
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

GitHub Actions runs the same type, database-permission, validation, photo-metadata and build checks. Production deployment is manual unless Workers Builds is separately configured.

After provisioning, verify using disposable test records: guest review with photo; registered-user review; pending invisibility in public endpoints and image URLs; owner-only history; denied non-admin moderation; approve/reject with photos; wrong-origin writes; invalid coordinates; password reset; public email confirmation delivery. Remove test records before accepting genuine submissions. Never publish invented test reviews to the public site.

## Initial scope and operating limits

The public response currently includes up to 1,000 newest approved reviews; account/admin views include 100 newest records. Add pagination and database aggregates before those limits are reached. Signed private photos may need a page refresh after five minutes. Admins can correct venue details, reject reviews, and exclude photos; account deletion, appeals/reporting, venue merging beyond exact normalized name/address matching, and retained-photo cleanup are follow-up operations. Excluded images remain private and require a retention cleanup policy. Historic sample D1/R2 data is not imported or deleted.
