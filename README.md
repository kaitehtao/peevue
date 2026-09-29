# PEEVUE

Bathroom discovery and community cleanliness reviews, starting with Las Vegas.

The public site runs on Cloudflare Workers with React/Vinext. Supabase provides accounts, PostgreSQL, and private photo storage. This repository is separate from the old private ChatGPT Sites prototype.

## Community release

- Real venue listings and approved community reviews; no fictional ratings or placeholder venue photos.
- Guest or signed-in submissions with one-to-five toilet ratings and up to three photos.
- Optional GPS, manual addresses, explicit address lookup, and editable neighborhood tags.
- Email/password account page with verification, password reset, and own submission history.
- Protected admin portal for venue corrections, photo selection, approval, rejection, and removal from public results.
- Server-side quotas, JPEG metadata removal, private storage, and transactional moderation audit records.

**Activation:** accounts and submissions remain closed until the dedicated Supabase project is provisioned and Worker bindings are configured. Public signup also requires an email sender. Follow [the deployment runbook](docs/community-setup.md); do not treat a successful code deployment as proof of a working account/email/storage setup.

## Development and validation

Node 22.13 or newer:

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Tests run isolated PostgreSQL using PGlite; they never modify a hosted database. Use a separate Supabase development project for full integration testing. Never point previews at production data.

## Production

Repository: `kaitehtao/peevue`. Worker: `peevue`. Domain registration stays at GoDaddy; Cloudflare serves `peevue.com` and `www.peevue.com`. Preserve the custom-domain routes in `wrangler.jsonc`.

GitHub Actions validates pushes and pull requests. Cloudflare deployment is manual unless Workers Builds is configured separately. Keep Supabase server secrets in Cloudflare secret bindings, never source control. Existing D1 data remains untouched and is no longer used by the community API. R2 activation is not required because new photos use Supabase Storage.
