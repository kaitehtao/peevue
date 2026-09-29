"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let promise: Promise<SupabaseClient> | undefined;
export function browserClient() {
  if (!promise)
    promise = (async () => {
      const response = await fetch("/api/config");
      const config = (await response.json()) as {
        enabled: boolean;
        url: string;
        key: string;
      };
      if (!response.ok || !config.enabled)
        throw new Error(
          "Accounts are being connected. Please check back soon.",
        );
      return createClient(config.url, config.key);
    })().catch((e) => {
      promise = undefined;
      throw e;
    });
  return promise;
}
export async function sessionHeaders(): Promise<Record<string, string>> {
  const client = await browserClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session
    ? { Authorization: "Bearer " + data.session.access_token }
    : {};
}
export async function memberFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  for (const [key, value] of Object.entries(await sessionHeaders()))
    headers.set(key, value);
  return fetch(url, { ...options, headers });
}
