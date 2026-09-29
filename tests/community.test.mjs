import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { submissionSchema, areaFor, inVegas, todayInVegas } from "../lib/community.ts";
import { sanitizeJpeg } from "../lib/photo.ts";
const db = new PGlite();
const actor = "11111111-1111-4111-8111-111111111111";
const reviewer = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const photo = "55555555-5555-4555-8555-555555555555.jpg";
const venue = {
  name: "Test venue",
  address: "123 Test Street, Las Vegas, NV",
  area: "Las Vegas area",
  type: "Restaurant",
  access: "Ask staff",
  tags: [],
  latitude: null,
  longitude: null,
  locationSource: "manual",
};
const input = {
  id,
  venueId: null,
  venue,
  name: "Reviewer",
  rating: 4,
  body: "Clean sinks and stocked soap.",
  visited: "2026-01-01",
  consent: true,
  website: "",
};
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema public to service_role,anon,authenticated;`,
);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20260929034126_community_accounts.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.query("insert into auth.users(id) values($1),($2)", [actor, reviewer]);
await db.query("insert into administrators(user_id) values($1)", [actor]);
after(() => db.close());
async function asRole(role, sql, params = []) {
  await db.exec("set role " + role);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
async function insert(reviewId = id) {
  await db.query(
    "insert into community_reviews(id,receipt_hash,user_id,proposed_venue,display_name,rating,body,visited,photo_keys) values($1,$2,$3,$4,$5,4,$6,$7,$8)",
    [
      reviewId,
      "a".repeat(64),
      reviewer,
      JSON.stringify(venue),
      "Reviewer",
      "Clean sinks and stocked soap.",
      "2026-01-01",
      [photo],
    ],
  );
}
async function current(reviewId = id) {
  return (
    await db.query("select * from community_reviews where id=$1", [reviewId])
  ).rows[0];
}
async function moderate(reviewId, who, status, expected, photos = [photo]) {
  return asRole(
    "service_role",
    "select moderate_review($1,$2,$3,$4,$5,$6,$7)",
    [reviewId, who, expected, status, "Checked", photos, JSON.stringify(venue)],
  );
}
test("submission validation rejects forged ratings, future dates, missing consent and invalid GPS", () => {
  assert.equal(submissionSchema.safeParse(input).success, true);
  for (const change of [
    { rating: 0 },
    { rating: 6 },
    { visited: "2999-01-01" },
    { visited: "2026-02-30" },
    { consent: false },
    { venue: null },
    { venue: { ...venue, latitude: 36.1, longitude: null } },
    { venue: { ...venue, latitude: 90, longitude: 0 } },
    { website: "spam" },
  ])
    assert.equal(
      submissionSchema.safeParse({ ...input, ...change }).success,
      false,
      JSON.stringify(change),
    );
  assert.equal(inVegas(36.12, -115.17), true);
  assert.equal(inVegas(NaN, -115.17), false);
  assert.equal(areaFor(36.12, -115.17), "The Strip");
});
test("server removes EXIF GPS and trailing JPEG payloads", () => {
  const bytes = new Uint8Array([
    255, 216, 255, 225, 0, 8, 69, 120, 105, 102, 0, 0, 255, 192, 0, 11, 8, 0, 1,
    0, 1, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 23, 255, 0, 34, 255,
    217, 65, 66,
  ]);
  const sanitized = sanitizeJpeg(bytes);
  assert.equal(Buffer.from(sanitized).includes(Buffer.from("Exif")), false);
  assert.equal(sanitized.at(-1), 217);
  assert.equal(sanitized.length, bytes.length - 12);
  assert.throws(() => sanitizeJpeg(bytes.slice(0, -4)));
  assert.throws(() => sanitizeJpeg(new Uint8Array([1, 2, 3, 4])));
});
test("database permissions, approval, privacy and optimistic moderation", async () => {
  await insert();
  let row = await current();
  assert.equal(row.status, "pending");
  assert.equal(
    (await db.query("select * from community_reviews where status='approved'"))
      .rows.length,
    0,
  );
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(
      asRole(role, "select * from community_reviews"),
      /permission denied/,
    );
    await assert.rejects(
      asRole(role, "update community_reviews set status='approved'"),
      /permission denied/,
    );
    await assert.rejects(
      asRole(role, "select * from administrators"),
      /permission denied/,
    );
    await assert.rejects(
      asRole(role, "select consume_quota($1,2,3600)", ["bad"]),
      /permission denied/,
    );
  }
  await assert.rejects(
    moderate(id, reviewer, "approved", row.updated_at),
    /Administrator required/,
  );
  await assert.rejects(
    moderate(id, actor, "approved", row.updated_at, ["other.jpg"]),
    /Invalid photos/,
  );
  const before = row.updated_at;
  await moderate(id, actor, "approved", before);
  row = await current();
  assert.equal(row.status, "approved");
  assert.ok(row.venue_id);
  assert.equal(
    (await db.query("select * from moderation_events")).rows.length,
    1,
  );
  await assert.rejects(moderate(id, actor, "rejected", before), /changed/);
  const second = "44444444-4444-4444-8444-444444444444";
  await insert(second);
  await moderate(second, actor, "approved", (await current(second)).updated_at);
  assert.equal((await db.query("select * from venues")).rows.length, 1);
  await moderate(id, actor, "rejected", row.updated_at, []);
  assert.equal((await current()).status, "rejected");
  assert.deepEqual((await current()).photo_keys, []);
  assert.equal(
    (await db.query("select public from storage.buckets")).rows[0].public,
    false,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from pg_class where relname in ('administrators','venues','community_reviews','moderation_events','request_quotas','geocode_cache') and relrowsecurity",
      )
    ).rows[0].n,
    6,
  );
});
test("persistent quotas reject excess requests and reset after expiry", async () => {
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await asRole(
          "service_role",
          "select consume_quota('test',2,3600) as ok",
        )
      ).rows[0].ok,
      true,
    );
  assert.equal(
    (await asRole("service_role", "select consume_quota('test',2,3600) as ok"))
      .rows[0].ok,
    false,
  );
  await db.exec(
    "update request_quotas set expires_at=now()-interval '1 second' where key='test'",
  );
  assert.equal(
    (await asRole("service_role", "select consume_quota('test',2,3600) as ok"))
      .rows[0].ok,
    true,
  );
});

test("visit dates use Las Vegas time around midnight UTC", () => {
  assert.equal(todayInVegas(new Date("2026-09-29T03:00:00Z")), "2026-09-28");
  assert.equal(todayInVegas(new Date("2026-09-29T10:00:00Z")), "2026-09-29");
});
