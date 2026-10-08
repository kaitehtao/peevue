import { z } from "zod";
export const placeTypes = [
  "Restaurant",
  "Café",
  "Hotel & lounge",
  "Condo",
  "Apartment",
  "Home",
  "School",
  "Public building",
  "Public restroom",
  "Other",
] as const;
export const neighborhoods = [
  "The Strip",
  "Chinatown / Spring Mountain Corridor",
  "Arts District",
  "Downtown",
  "Summerlin",
  "Henderson",
  "North Las Vegas",
  "Las Vegas area",
] as const;
export const amenities = [
  "Accessible",
  "Changing table",
  "All-gender",
] as const;
export const ratingLabels = [
  "",
  "Needs attention",
  "Could be cleaner",
  "Mostly clean",
  "Very clean",
  "Spotless",
];
export function todayInVegas(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const yelpUrlSchema = z.string().trim().max(500).default("").refine(value => {
  if (!value) return true;
  try { const u = new URL(value); return u.protocol === "https:" && ["yelp.com", "www.yelp.com", "m.yelp.com"].includes(u.hostname) && !u.username && !u.password && !u.port && /^\/biz\/[a-zA-Z0-9_%~-]+\/?$/.test(u.pathname); } catch { return false; }
}, "Use a full Yelp business profile link, such as https://www.yelp.com/biz/business-name.").transform(value => value ? "https://www.yelp.com" + new URL(value).pathname.replace(/\/$/, "") : "");
export const categorySchema = z.string().trim().transform(v=>v.replace(/\s+/g," ")).pipe(z.string().min(2,"Enter a category with at least 2 characters.").max(60,"Keep the category under 61 characters.").refine(v=>v.toLowerCase()!=="all places","Choose a specific category." )).transform(v=>placeTypes.find(t=>t.toLowerCase()===v.toLowerCase()) || v);
export function categoryOptions(values: string[] = []) {
  const options: string[] = [...placeTypes];
  for (const value of values) {
    const parsed=categorySchema.safeParse(value);
    if(parsed.success && !options.some(t=>t.toLowerCase()===parsed.data.toLowerCase())) options.push(parsed.data);
  }
  return options;
}
export const venueSchema = z
  .object({
    name: text(2, 120),
    address: text(8, 250),
    yelpUrl: yelpUrlSchema,
    area: z.enum(neighborhoods),
    type: categorySchema,
    access: z.enum(["Public access", "Customers only", "Ask staff"]),
    tags: z.array(z.enum(amenities)).max(3),
    latitude: z.number().min(35.8).max(36.5).nullable(),
    longitude: z.number().min(-115.6).max(-114.8).nullable(),
    locationSource: z.enum(["gps", "address", "manual"]),
  })
  .refine(
    (v) => (v.latitude === null) === (v.longitude === null),
    "Supply both location coordinates.",
  )
  .refine(
    (v) => v.locationSource !== "gps" || v.latitude !== null,
    "GPS location is missing.",
  );
export const bathroomTypes = ["Men’s", "Women’s", "Unisex", "Family", "Not specified"] as const;
export const bathroomSchema = z.object({ location: text(2, 120), gender: z.enum(bathroomTypes) });
export type BathroomInput = z.infer<typeof bathroomSchema>;
export type Bathroom = BathroomInput & { id: string; venueId: string; score: number; count: number; photos: string[] };
export const reviewContentSchema = z.object({
    name: text(2, 50),
    rating: z.number().int().min(1).max(5),
    body: text(10, 1500),
    passcode: z.string().trim().max(40, "Bathroom passcodes must be 40 characters or fewer.").default(""),
    visited: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => {
        const t = new Date(d + "T12:00:00Z");
        return (
          Number.isFinite(t.getTime()) &&
          t.toISOString().slice(0, 10) === d &&
          d <= todayInVegas() &&
          d >= "2000-01-01"
        );
      }, "Choose a valid visit date, today or earlier."),
});
export const editReviewSchema = reviewContentSchema.extend({id:z.string().uuid(),updatedAt:z.string().datetime({offset:true}),venue:venueSchema.optional(),bathroom:bathroomSchema.optional(),keepPhotos:z.array(z.string().regex(/^[0-9a-f-]{36}\.jpg$/i)).max(5)});
export const submissionSchema = z
  .object({
    id: z.string().uuid(),
    venueId: z.string().uuid().nullable(),
    venue: venueSchema.nullable(),
    yelpUrl: yelpUrlSchema,
    bathroomId: z.string().uuid().nullable().default(null),
    bathroom: bathroomSchema.nullable().default(null),
    ...reviewContentSchema.shape,
    consent: z.literal(true),
    website: z.string().max(0),
  })
  .refine(
    (v) => v.venueId !== null || v.venue !== null,
    "Add the property address.",
  ).refine(v => !!v.bathroomId !== !!v.bathroom, "Choose a bathroom or describe a new one.")
  .refine(v => !v.bathroomId || !!v.venueId, "Choose the bathroom’s property.");
export type VenueInput = z.infer<typeof venueSchema>;
export type Venue = VenueInput & {
  id: string;
  bathrooms: Bathroom[];
  score: number;
  count: number;
  photos: string[];
};
export type Review = {
  profileId?: string | null;
  id: string;
  venueId: string | null;
  bathroomId: string | null;
  name: string;
  rating: number;
  body: string;
  passcode: string;
  visited: string;
  createdAt: string;
  photos: string[];
  status?: string;
  moderationNote?: string;
  venue?: VenueInput;
  venueName?: string;
};
export function inVegas(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 35.8 &&
    latitude <= 36.5 &&
    longitude >= -115.6 &&
    longitude <= -114.8
  );
}
export function areaFor(
  latitude: number,
  longitude: number,
): (typeof neighborhoods)[number] {
  // Approximate Spring Mountain corridor west of I-15 toward Rainbow.
  // This is a suggested neighborhood, not an official boundary; users can correct it.
  if (latitude >= 36.121 && latitude <= 36.134 && longitude >= -115.245 && longitude <= -115.185)
    return "Chinatown / Spring Mountain Corridor";
  if (longitude < -115.25) return "Summerlin";
  if (latitude < 36.08 && longitude > -115.13) return "Henderson";
  if (latitude > 36.23) return "North Las Vegas";
  if (
    latitude >= 36.157 &&
    latitude <= 36.185 &&
    longitude >= -115.16 &&
    longitude <= -115.125
  )
    return "Downtown";
  if (
    latitude >= 36.143 &&
    latitude < 36.157 &&
    longitude >= -115.16 &&
    longitude <= -115.125
  )
    return "Arts District";
  if (
    latitude >= 36.075 &&
    latitude < 36.143 &&
    longitude >= -115.185 &&
    longitude <= -115.15
  )
    return "The Strip";
  return "Las Vegas area";
}
