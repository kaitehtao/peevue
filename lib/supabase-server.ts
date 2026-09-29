import { env } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function configured() {
  return !!(
    env.SUPABASE_URL &&
    env.SUPABASE_PUBLISHABLE_KEY &&
    env.SUPABASE_SECRET_KEY
  );
}
export function service() {
  if (!configured())
    throw new ApiError(
      503,
      "Community submissions are being connected. Please try again soon.",
    );
  return createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function publicConfig() {
  return {
    enabled: configured(),
    url: env.SUPABASE_URL || "",
    key: env.SUPABASE_PUBLISHABLE_KEY || "",
  };
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(e: unknown) {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  console.error(
    "Community service error",
    e instanceof Error ? e.message : "Unknown error",
  );
  return json(
    {
      error:
        "Could not complete this request. Please try again; your form has not been cleared.",
    },
    503,
  );
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new ApiError(403, "Please submit from this website.");
}
export async function user(request: Request, required = false) {
  const header = request.headers.get("authorization");
  if (!header) {
    if (required) throw new ApiError(401, "Sign in to continue.");
    return null;
  }
  if (!header.startsWith("Bearer "))
    throw new ApiError(401, "Please sign in again.");
  const { data, error } = await service().auth.getUser(header.slice(7));
  if (error || !data.user)
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  return data.user;
}
export async function admin(request: Request) {
  const who = await user(request, true);
  const { data, error } = await service()
    .from("administrators")
    .select("user_id")
    .eq("user_id", who!.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !who!.email_confirmed_at)
    throw new ApiError(403, "This account does not have administrator access.");
  return who!;
}
export async function quota(key: string, limit: number, seconds: number) {
  const { data, error } = await service().rpc("consume_quota", {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw error;
  if (!data)
    throw new ApiError(
      429,
      "Too many requests. Please wait a little before trying again.",
    );
}
export async function ipQuota(
  request: Request,
  kind: string,
  limit: number,
  seconds: number,
) {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const secret = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.SUPABASE_SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", secret, new TextEncoder().encode(ip)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await quota(kind + ":" + hash, limit, seconds);
}
export async function boundedBody(request: Request, max = 7 * 1024 * 1024) {
  if (Number(request.headers.get("content-length")) > max)
    throw new ApiError(413, "Your submission is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Your submission is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(413, "Your submission is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let i = 0;
  for (const c of chunks) {
    bytes.set(c, i);
    i += c.length;
  }
  return new Response(bytes, {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  });
}
export async function photoUrls(keys: string[]) {
  if (!keys.length) return [];
  const { data, error } = await service()
    .storage.from("review-photos")
    .createSignedUrls(keys, 300);
  if (error) throw error;
  return data.map((p) => p.signedUrl || "");
}
