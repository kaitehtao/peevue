import test from "node:test";
import assert from "node:assert/strict";
import { googleSignInAvailable } from "../lib/supabase-browser.ts";

test("Google login is offered only when the connected project enables it", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const enabled of [true, false, undefined]) {
      const calls = [];
      globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        return Response.json(url === "/api/config"
          ? { enabled: true, url: "https://example.supabase.co", key: "public-test-key" }
          : { external: { google: enabled } });
      };
      assert.equal(await googleSignInAvailable(), enabled === true);
      assert.equal(calls[1].url, "https://example.supabase.co/auth/v1/settings");
      assert.deepEqual(calls[1].options.headers, { apikey: "public-test-key" });
      assert.equal(calls[1].options.cache, "no-store");
    }
    globalThis.fetch = async () => Response.json({ enabled: false });
    assert.equal(await googleSignInAvailable(), false);
    globalThis.fetch = async (url) => url === "/api/config"
      ? Response.json({ enabled: true, url: "https://example.supabase.co", key: "public-test-key" })
      : new Response("Unavailable", { status: 503 });
    assert.equal(await googleSignInAvailable(), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
