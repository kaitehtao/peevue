import { failure, service } from "@/lib/supabase-server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    if (!/^[0-9a-f-]{36}\.jpg$/i.test(key))
      return new Response("Not found", { status: 404 });
    const db = service();
    const { data, error } = await db
      .from("community_reviews")
      .select("id")
      .eq("status", "approved")
      .contains("photo_keys", [key])
      .limit(1);
    if (error) throw error;
    if (!data.length) return new Response("Not found", { status: 404 });
    const { data: photo, error: photoError } = await db.storage
      .from("review-photos")
      .download(key);
    if (photoError) throw photoError;
    return new Response(photo, {
      headers: {
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
