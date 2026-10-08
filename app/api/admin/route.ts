import { withAddressPin } from "@/lib/automatic-location";
import { z } from "zod";
import { venueSchema, bathroomSchema } from "@/lib/community";
import {
  admin,
  ApiError,
  boundedBody,
  failure,
  json,
  photoUrls,
  sameOrigin,
  service,
} from "@/lib/supabase-server";
export async function GET(request: Request) {
  try {
    await admin(request);
    const status = new URL(request.url).searchParams.get("status") || "pending";
    if (!["pending", "approved", "rejected"].includes(status))
      throw new ApiError(400, "Choose a valid status.");
    const { data, error } = await service()
      .from("community_reviews")
      .select(
        "id,venue_id,bathroom_id,proposed_bathroom,proposed_yelp_url,bathrooms(location,gender),display_name,rating,body,passcode,visited,created_at,updated_at,photo_keys,status,moderation_note,proposed_venue,venues(*)",
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return json({
      reviews: await Promise.all(
        data.map(async (r) => ({
          ...r,
          photos: await photoUrls(r.photo_keys),
        })),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
const action = z.object({
  id: z.string().uuid(),
  updatedAt: z.string().max(100),
  status: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500),
  passcode: z.string().trim().max(40).optional(),
  photos: z.array(z.string().regex(/^[0-9a-f-]{36}\.jpg$/i)).max(5),
  venue: venueSchema,
  bathroom: bathroomSchema,
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const who = await admin(request);
    const raw = await (await boundedBody(request, 12000)).json();
    const parsed = action.safeParse(raw);
    if (!parsed.success)
      throw new ApiError(
        400,
        "Check the venue details and moderation decision.",
      );
    const p = parsed.data;
    if(p.status === "approved") p.venue = await withAddressPin(p.venue);
    const { error } = await service().rpc("moderate_review", {
      p_id: p.id,
      p_actor: who.id,
      p_expected: p.updatedAt,
      p_status: p.status,
      p_note: p.note,
      p_photos: p.photos,
      p_venue: p.venue,
      p_bathroom: p.bathroom,
      p_passcode: p.passcode ?? null,
    });
    if (error) {
      if (error.message.includes("changed"))
        throw new ApiError(409, "This review has changed. Refresh the queue.");
      throw error;
    }
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
