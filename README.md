# PEEVUE

Bathroom discovery and cleanliness reviews, starting with Las Vegas.

This is the standalone Cloudflare deployment of the PEEVUE prototype. It uses React, Vinext, Cloudflare Workers, and D1. The original private ChatGPT Sites preview remains separate.

## Current release

- Fictional sample venues and sample ratings are explicitly labeled.
- Public visitors can browse, search, filter, and inspect bathroom details.
- Community submissions are disabled on both the server and the interface until contributor accounts and moderation are implemented.
- Photo upload and retrieval code is retained, but the R2 binding is intentionally absent until R2 is activated on the owner's Cloudflare account.
- Existing private prototype reviews and photos have not been migrated.

## Development

Use Node 22.13 or newer.

```sh
npm ci
npm run db:migrate:local
npm run dev
```

## Validate and deploy

```sh
npm run typecheck
npm run deploy
```

The deployment command builds the app, applies pending D1 migrations, and deploys the generated Worker. Authenticate with `npx wrangler login` first. The committed account ID and database ID are resource identifiers, not credentials. Never commit API tokens, cookies, local databases, or uploaded user files.

## GitHub and automatic deployment

GitHub Actions validates pushes and pull requests. For automatic production deployment, connect this repository to the `peevue` Worker using Cloudflare Workers Builds:

- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npm run db:migrate:remote && npx wrangler deploy --config dist/server/wrangler.json`

Do not connect preview branch deployments to the production database; give previews separate resources. Automatic deployment must be configured in the Cloudflare dashboard; it is not established by this repository alone.

## Domain: peevue.com

The domain is registered at GoDaddy. Add it to the same Cloudflare account, preserve every existing DNS record (including email-related records), and replace its GoDaddy nameservers with the exact pair Cloudflare assigns. Once the zone is active, add `peevue.com` and `www.peevue.com` as custom domains for the Worker. Registration can stay at GoDaddy.

## Before opening contributions

1. Activate R2 in the Cloudflare dashboard, create the `peevue-photos` bucket, and add `{"binding":"BUCKET","bucket_name":"peevue-photos"}` to `r2_buckets` in `wrangler.jsonc`.
2. Implement contributor authentication and enforce review ownership on the server.
3. Add moderation, reporting, abuse controls, and deletion workflows for reviews and photos.
4. Replace fictional venues with verified listings. Keep ratings empty until genuine reviews exist.
5. Decide whether to migrate data from the private prototype.
6. Only after these steps, enable `CONTRIBUTIONS_ENABLED` and verify the complete user journey in the public deployment.
