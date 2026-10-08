import { withAddressPin } from "@/lib/automatic-location";
import { editReviewSchema } from "@/lib/community";
import { sanitizeJpeg } from "@/lib/photo";
import { administratorAccess, ApiError, boundedBody, failure, json, quota, sameOrigin, service, user } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const uploaded: string[] = [];
  let committed = false;
  try {
    sameOrigin(request);
    const who = await user(request, true);
    const isAdmin = await administratorAccess(who!);
    await quota("edit:" + who!.id, 30, 3600);
    const db = service();
    const form = await (await boundedBody(request)).formData();
    let raw: unknown;
    try { raw = JSON.parse(String(form.get("edit"))); }
    catch { throw new ApiError(400, "Please check your changes."); }
    const parsed = editReviewSchema.safeParse(raw);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
    const input = parsed.data;
    const {data: review,error} = await db.from("community_reviews").select("user_id,updated_at,photo_keys").eq("id",input.id).maybeSingle();
    if(error) throw error;
    if(!review || (!isAdmin && review.user_id !== who!.id)) throw new ApiError(403,"You can only edit your own reviews.");
    if(review.updated_at !== input.updatedAt) throw new ApiError(409,"This review has changed. Refresh the page before editing again.");
    if(input.keepPhotos.some(key=>!review.photo_keys.includes(key))) throw new ApiError(400,"Choose only photos from this review.");
    if(input.venue) input.venue = await withAddressPin(input.venue);
    const files = form.getAll("photos");
    if(files.length + input.keepPhotos.length > 5) throw new ApiError(400,"Keep up to five photos in total.");
    for(const file of files) {
      if(!(file instanceof File) || file.type !== "image/jpeg") throw new ApiError(400,"Choose JPEG photos.");
      let bytes:Uint8Array;
      try { bytes = sanitizeJpeg(new Uint8Array(await file.arrayBuffer())); }
      catch { throw new ApiError(400,"Choose a valid JPEG photo smaller than 2 MB."); }
      const key = crypto.randomUUID() + ".jpg";
      const {error} = await db.storage.from("review-photos").upload(key,bytes,{contentType:"image/jpeg",upsert:false});
      if(error) throw error;
      uploaded.push(key);
    }
    const {data:status,error:editError} = await db.rpc("edit_review",{
      p_id:input.id,p_actor:who!.id,p_expected:input.updatedAt,
      p_content:{name:input.name,rating:input.rating,body:input.body,visited:input.visited,passcode:input.passcode,...(input.venue?{venue:input.venue,bathroom:input.bathroom}: {})},
      p_keep:input.keepPhotos,p_added:uploaded,
    });
    if(editError) {
      if(editError.code === "23505") throw new ApiError(409,"A bathroom with this location and type already exists at this property. Use a distinct location label.");
      if(editError.message.includes("changed")) throw new ApiError(409,"This review has changed. Refresh the page before editing again.");
      if(editError.message.includes("Not allowed")) throw new ApiError(403,"You can only edit your own reviews.");
      throw editError;
    }
    committed = true;
    return json({ok:true,status});
  } catch(e) {
    if(!committed && uploaded.length) {
      try { await service().storage.from("review-photos").remove(uploaded); } catch {}
    }
    return failure(e);
  }
}
