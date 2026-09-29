import { failure, json, photoUrls, service, user } from "@/lib/supabase-server";
export async function GET(request: Request) {
  try {
    const who = await user(request, true);
    const db = service();
    const { data, error } = await db
      .from("community_reviews")
      .select(
        "id,venue_id,display_name,rating,body,visited,created_at,photo_keys,status,moderation_note,proposed_venue,venues(name)",
      )
      .eq("user_id", who!.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const { data: role, error: roleError } = await db
      .from("administrators")
      .select("user_id")
      .eq("user_id", who!.id)
      .maybeSingle();
    if (roleError) throw roleError;
    return json({
      isAdmin: !!role,
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
