import { areaFor, inVegas } from "@/lib/community";
import {
  ApiError,
  failure,
  ipQuota,
  json,
  quota,
  service,
} from "@/lib/supabase-server";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const address = (params.get("address") || "").trim();
    const lat = Number(params.get("lat")),
      lng = Number(params.get("lng"));
    const reverse = params.has("lat") && params.has("lng");
    if (
      reverse ? !inVegas(lat, lng) : address.length < 8 || address.length > 250
    )
      throw new ApiError(
        400,
        "Enter a Las Vegas area address or use a location in the Las Vegas area.",
      );
    await ipQuota(request, "location", 30, 3600);
    const key = reverse
      ? `reverse:${lat.toFixed(4)},${lng.toFixed(4)}`
      : `address:${address.toLowerCase()}`;
    const db = service();
    const { data: cached, error } = await db
      .from("geocode_cache")
      .select("result")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    if (cached) return json(cached.result);
    await quota("geocoding-global", 1, 2);
    const url = new URL(
      reverse
        ? "https://nominatim.openstreetmap.org/reverse"
        : "https://nominatim.openstreetmap.org/search",
    );
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    if (reverse) {
      url.searchParams.set("lat", lat.toFixed(4));
      url.searchParams.set("lon", lng.toFixed(4));
      url.searchParams.set("zoom", "18");
    } else {
      url.searchParams.set("q", address);
      url.searchParams.set("countrycodes", "us");
      url.searchParams.set("viewbox", "-115.6,36.5,-114.8,35.8");
      url.searchParams.set("bounded", "1");
      url.searchParams.set("limit", "3");
    }
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "PEEVUE/1.0 (https://peevue.com; bathroom address lookup)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new ApiError(
        503,
        "Address lookup is unavailable. You can enter the address manually.",
      );
    const result = (await response.json()) as any;
    const list = (reverse ? [result] : result)
      .filter(
        (v: any) => v.lat && v.lon && inVegas(Number(v.lat), Number(v.lon)),
      )
      .map((v: any) => ({
        address: v.display_name,
        latitude: Number(v.lat),
        longitude: Number(v.lon),
        area: areaFor(Number(v.lat), Number(v.lon)),
      }));
    const payload = {
      results: list,
      attribution: "© OpenStreetMap contributors",
      approximate: reverse,
    };
    const { error: cacheError } = await db
      .from("geocode_cache")
      .upsert({
        key,
        result: payload,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
    if (cacheError) throw cacheError;
    return json(payload);
  } catch (e) {
    return failure(e);
  }
}
