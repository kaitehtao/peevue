declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CONTRIBUTIONS_ENABLED?: string;
    BUCKET?: R2Bucket;
  }
}
