import { submissionSchema } from "@/lib/community";
import { sanitizeJpeg } from "@/lib/photo";
import {
  ApiError,
  boundedBody,
  configured,
  failure,
  ipQuota,
  json,
  sameOrigin,
  service,
  user,
} from "@/lib/supabase-server";
export async function GET() {
  try {
    if (!configured())
      return json({ reviews: [], venues: [], contributionsEnabled: false });
    const db = service();
    const { data: reviews, error } = await db
      .from("community_reviews")
      .select(
        "id,venue_id,bathroom_id,display_name,rating,body,passcode,visited,created_at,photo_keys",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    const ids = [...new Set(reviews.map((r) => r.venue_id))];
    const { data: venues, error: venueError } = ids.length
      ? await db.from("venues").select("*").in("id", ids)
      : { data: [], error: null };
    if (venueError) throw venueError;
    const bathroomIds = [...new Set(reviews.map(r => r.bathroom_id).filter(Boolean))];
    const {data: bathrooms, error: bathroomError} = bathroomIds.length ? await db.from("bathrooms").select("*").in("id",bathroomIds) : {data:[],error:null};
    if (bathroomError) throw bathroomError;
    return json({
      contributionsEnabled: true,
      reviews: reviews.map((r) => ({
        id: r.id,
        venueId: r.venue_id,
        bathroomId: r.bathroom_id,
        name: r.display_name,
        rating: r.rating,
        body: r.body,
        passcode: r.passcode,
        visited: r.visited,
        createdAt: r.created_at,
        photos: r.photo_keys.map((k: string) => "/api/photos/" + k),
      })),
      venues: venues!.map((v) => {
        const rs = reviews.filter((r) => r.venue_id === v.id);
        return {
          ...v,
          yelpUrl: v.yelp_url,
          bathrooms: bathrooms!.filter(b=>b.venue_id===v.id).map(b=>{
            const br = rs.filter(r=>r.bathroom_id===b.id);
            return {id:b.id,venueId:v.id,location:b.location,gender:b.gender,count:br.length,score:br.reduce((n,r)=>n+r.rating,0)/br.length,photos:br.flatMap(r=>r.photo_keys.map((k:string)=>"/api/photos/"+k))};
          }),
          locationSource: v.location_source,
          score: rs.reduce((n, r) => n + r.rating, 0) / rs.length,
          count: rs.length,
          photos: rs.flatMap((r) =>
            r.photo_keys.map((k: string) => "/api/photos/" + k),
          ),
        };
      }),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  const uploaded: string[] = [];
  try {
    sameOrigin(request);
    const db = service();
    await ipQuota(request, "submit", 8, 3600);
    const who = await user(request);
    const form = await (await boundedBody(request)).formData();
    let raw: unknown;
    try {
      raw = JSON.parse(String(form.get("submission")));
    } catch {
      throw new ApiError(400, "Please check your submission.");
    }
    const parsed = submissionSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const input = parsed.data;
    const receipt = String(form.get("receipt") || "");
    if (!/^[0-9a-f-]{36}$/i.test(receipt))
      throw new ApiError(400, "Please reopen the review form.");
    const receiptHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(receipt),
        ),
      ),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const { data: existing, error: existingError } = await db
      .from("community_reviews")
      .select("receipt_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.receipt_hash !== receiptHash)
        throw new ApiError(409, "Please reopen the review form.");
      return json({ id: input.id, status: "received" });
    }
    if (input.venueId) {
      const { data, error } = await db
        .from("venues")
        .select("id")
        .eq("id", input.venueId)
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new ApiError(
          400,
          "Please choose an existing bathroom or add a new one.",
        );
    }
    if (input.bathroomId) {
      const {data,error} = await db.from("bathrooms").select("id").eq("id",input.bathroomId).eq("venue_id",input.venueId!).maybeSingle();
      if(error) throw error;
      if(!data) throw new ApiError(400,"Choose a bathroom within the selected property.");
    }
    const files = form.getAll("photos");
    if (files.length > 5) throw new ApiError(400, "Choose up to five photos.");
    const clean = await Promise.all(
      files.map(async (f) => {
        if (!(f instanceof File) || f.type !== "image/jpeg")
          throw new ApiError(400, "Choose JPEG photos.");
        try {
          return sanitizeJpeg(new Uint8Array(await f.arrayBuffer()));
        } catch (e) {
          throw new ApiError(400, (e as Error).message);
        }
      }),
    );
    for (const bytes of clean) {
      const key = crypto.randomUUID() + ".jpg";
      const { error } = await db.storage
        .from("review-photos")
        .upload(key, bytes, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      uploaded.push(key);
    }
    const { error } = await db
      .from("community_reviews")
      .insert({
        id: input.id,
        receipt_hash: receiptHash,
        user_id: who?.id || null,
        venue_id: input.venueId,
        bathroom_id: input.bathroomId,
        proposed_bathroom: input.bathroom,
        proposed_yelp_url: input.yelpUrl || null,
        proposed_venue: input.venueId ? null : input.venue,
        display_name: input.name,
        rating: input.rating,
        body: input.body,
        passcode: input.passcode,
        visited: input.visited,
        photo_keys: uploaded,
        status: "pending",
      });
    if (error) throw error;
    return json({ id: input.id, status: "pending" }, 201);
  } catch (e) {
    if (uploaded.length)
      await service().storage.from("review-photos").remove(uploaded);
    return failure(e);
  }
}
