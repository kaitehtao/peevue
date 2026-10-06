import { administratorAccess, failure, json, photoUrls, service, user } from "@/lib/supabase-server";
export async function GET(request: Request) {
  try {
    const who = await user(request, true);
    const db = service();
    const { data, error } = await db
      .from("community_reviews")
      .select(
        "id,venue_id,bathroom_id,proposed_bathroom,proposed_yelp_url,bathrooms(location,gender),display_name,rating,body,passcode,visited,created_at,updated_at,photo_keys,status,moderation_note,proposed_venue,venues(*)",
      )
      .eq("user_id", who!.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return json({
      isAdmin: await administratorAccess(who!),
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
