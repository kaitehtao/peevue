# Community deployment runbook

## Provisioning status (2026-09-28)

- Organization: PEEVUE, `fhoqlbbpqhkjubkwecxe`, Free plan.
- Project: PEEVUE, `tiadxpijawiiljzybydl`, US West (us-west-1), Free project quote $0/month confirmed by owner.
- API URL: `https://tiadxpijawiiljzybydl.supabase.co`.
- `community_accounts` migration applied successfully through the Supabase connector.
- Browser roles lack direct review read/write and moderation privileges. Security advisor reports only the expected six INFO notices for server-only tables with RLS and no client policies.
- Two owner-specified administrator email reservations are stored privately in Supabase. Neither account exists yet. Still pending: verified admin accounts; Auth URL and email sender configuration; Auth/email and submission end-to-end validation; merge/deploy PR #1.
- Dashboard setup was interrupted by an unavailable browser security check. Retry normal dashboard access when available; do not bypass the security control.

## Cloudflare connection verification

All three Supabase bindings are now saved on the `peevue` Worker, including the server secret entered by the owner. Preview version `1d8db4dd-5b9d-4aa7-9ddc-0175a16e4e26` (release code commit `5300736`) successfully returned HTTP 200 from `/api/reviews` with an empty real database and contributions enabled. `/api/config` confirms the dedicated PEEVUE project; `/api/admin` and `/api/me` return HTTP 401 without a session. No credentials were printed or committed.

This version is uploaded but has not been promoted to production. Account email delivery, Auth redirect URLs, administrator verification, and full hosted write/upload/moderation testing remain pending. The dashboard browser security check was still unavailable at verification time.

## Resources

Create a dedicated PEEVUE Supabase organization and project. Do not install this schema in the LearnWhatYouOwn project. Cloudflare continues to serve peevue.com and www.peevue.com. Supabase handles Auth, PostgreSQL, and private photo storage; activating Cloudflare R2 is no longer needed for this implementation.

The app deliberately returns an empty, closed-submission state until all three Supabase bindings exist. A deployed interface alone is not evidence that accounts or uploads are live.

## Database and private photos

1. Apply `supabase/migrations/20260929034126_community_accounts.sql` to the dedicated project with the Supabase migration tool.
2. Verify RLS is enabled on all seven tables and browser roles have no grants. This application uses a server-only data API; `anon` and `authenticated` are intentionally denied direct table and storage access.
3. Verify `review-photos` is a private bucket, JPEG-only, 2 MB maximum. Never turn it public. The Worker serves a photo only while an approved review references it. Account and admin pages receive private URLs that expire after five minutes.
4. Run the Supabase security advisor. RLS-with-no-policy notices are expected for these server-only tables; investigate other warnings.

## Supabase Auth

### Google sign-in (activation pending)

The account page supports Continue with Google. It checks the project's public Auth settings and only enables the button when the Google provider is enabled. Google OAuth client credentials must remain in Supabase, never in website source or public variables. Provider enablement is not proof of a successful end-to-end login; verify the full redirect flow before declaring it ready.

Create a dedicated PEEVUE Web application OAuth client in Google Auth Platform. Configure the consent screen for public users and basic identity only. Use origins `https://peevue.com` and `https://www.peevue.com`, and the authorized redirect URI `https://tiadxpijawiiljzybydl.supabase.co/auth/v1/callback`. Enter the client ID and secret in the dedicated PEEVUE Supabase project's Google provider settings. Complete Google's publishing requirements so sign-in is not restricted to test users. Keep nonce and email verification protections enabled.

Supabase Site URL and both `/account` return URLs below were saved and verified in the dashboard. Google setup and end-to-end login remain pending; dashboard network access failed during setup. Google sign-in does not require the app to send a signup confirmation email. Password signup and password reset still need working email delivery.

- Site URL: `https://peevue.com`.
- Redirect allowlist: `https://peevue.com/account`, `https://www.peevue.com/account`.
- Email/password authentication with email confirmation enabled. Minimum password length 12.
- Configure a verified custom SMTP sender before opening public registration. Supabase's default mail sender only delivers to project-team members. Do not disable confirmation to bypass this restriction.
- Retain Auth rate limits. Add Supabase CAPTCHA/Turnstile if sign-up abuse requires it. Guest review submissions use a separate server-side persistent quota (8 attempts/IP/hour) and moderation.
- No anonymous Auth sessions are created; a guest review has a null owner and cannot read a private submission later. A UUID and separate receipt nonce make retries idempotent without granting private-read access.

## Administrator

The owner has specified two administrator email addresses, stored only in the private `administrator_reservations` table. The `administrator_email_reservations` migration has been applied. Do not commit personal email addresses to this repository.

After signing up and verifying an authorized email, the account claims its one-time reservation on `/account` or `/admin`. The Worker verifies the identity with Supabase `getUser`, requires `email_confirmed_at`, rejects anonymous identities, and then invokes a service-role-only transaction that creates membership and consumes the reservation. User metadata never grants authority. Consuming the reservation ensures deleting an admin membership does not re-grant access at the next login.

Additional reservations require explicit owner authorization and server-side insertion. Browser roles cannot list or modify reservations or call the claim function. Existing administrator memberships remain keyed to the verified user ID.

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
