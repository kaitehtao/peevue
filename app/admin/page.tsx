"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Header, Footer } from "@/components/community/header";
import { VenueFields } from "@/components/community/venue-fields";
import { memberFetch } from "@/lib/supabase-browser";
import { BathroomFields } from "@/components/community/bathroom-fields";
import type { BathroomInput, VenueInput } from "@/lib/community";
type Entry = {
  id: string;
  bathrooms: BathroomInput | null;
  proposed_bathroom: BathroomInput | null;
  updated_at: string;
  display_name: string;
  rating: number;
  body: string;
  passcode: string;
  visited: string;
  created_at: string;
  status: string;
  moderation_note: string;
  photo_keys: string[];
  photos: string[];
  proposed_venue: VenueInput;
  venues:
    | (VenueInput & { location_source: VenueInput["locationSource"] })
    | null;
};
function QueueCard({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const initial = entry.venues
    ? { ...entry.venues, locationSource: entry.venues.location_source }
    : entry.proposed_venue;
  const [bathroom,setBathroom] = useState<BathroomInput>(entry.bathrooms || entry.proposed_bathroom || {location:"Location not specified",gender:"Not specified"});
  const [venue, setVenue] = useState<VenueInput>(initial),
    [photos, setPhotos] = useState(entry.photo_keys),
    [note, setNote] = useState(entry.moderation_note),
    [passcode, setPasscode] = useState(entry.passcode || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function decide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const status = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value",
    );
    if (!status) return;
    setBusy(true);
    setError("");
    try {
      const r = await memberFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          updatedAt: entry.updated_at,
          status,
          note,
          passcode,
          photos,
          venue,
          bathroom,
        }),
      });
      const d = (await r.json()) as { error?: string; reviews: Entry[] };
      if (!r.ok) throw new Error(d.error);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="moderation-card">
      <div className="section-heading">
        <h2>{initial.name}</h2>
        <span className={"status " + entry.status}>{entry.status}</span>
      </div>
      <p>
        <strong>{entry.display_name}</strong> · {entry.rating}/5 cleanliness ·
        Visited {entry.visited}
      </p>
      <p className="review-text">{entry.body}</p>
      <form className="review-form" onSubmit={decide}>
        <BathroomFields value={bathroom} onChange={setBathroom}/>
        <label>Bathroom passcode <small>(optional)</small><input type="text" maxLength={40} autoComplete="off" value={passcode} onChange={e=>setPasscode(e.target.value)}/><small className="photo-rule">Published with this review. Clear the field to withhold the code.</small></label>
        <details>
          <summary>Verify or correct property details</summary>
          <VenueFields value={venue} onChange={setVenue} />
          <p className="photo-rule">
            Property changes apply to the whole facility. Bathroom changes apply only to this bathroom.
          </p>
        </details>
        {entry.photos.length > 0 && (
          <fieldset>
            <legend>Photos to keep with this review</legend>
            <p className="photo-rule">
              Open each photo and check for people or private information before
              approving. Uncheck any photo that should be excluded.
            </p>
            <div className="moderation-photos">
              {entry.photos.map((src, i) => (
                <div key={entry.photo_keys[i]}>
                  <a href={src} target="_blank" rel="noreferrer">
                    <img
                      src={src}
                      alt={"Submitted bathroom photo " + (i + 1)}
                    />
                  </a>
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={photos.includes(entry.photo_keys[i])}
                      onChange={(e) =>
                        setPhotos((old) =>
                          e.target.checked
                            ? [...old, entry.photo_keys[i]]
                            : old.filter((k) => k !== entry.photo_keys[i]),
                        )
                      }
                    />
                    Keep photo {i + 1}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        )}
        <label>
          Note to contributor
          <textarea
            maxLength={500}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional explanation or correction"
          />
        </label>
        <label className="consent">
          <input type="checkbox" required />I reviewed the text, photos, and
          bathroom address.
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="account-actions">
          <button className="primary" value="approved" disabled={busy}>
            {busy ? "Saving…" : "Approve and publish"}
          </button>
          <button className="secondary" value="rejected" disabled={busy}>
            {entry.status === "approved"
              ? "Remove from public site"
              : "Reject submission"}
          </button>
        </div>
      </form>
    </article>
  );
}
export default function Admin() {
  const [status, setStatus] = useState("pending"),
    [entries, setEntries] = useState<Entry[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [allowed, setAllowed] = useState(false),
    [message, setMessage] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await memberFetch("/api/admin?status=" + status);
      const d = (await r.json()) as { error?: string; reviews: Entry[] };
      if (!r.ok) throw new Error(d.error);
      setEntries(d.reviews);
      setAllowed(true);
    } catch (e) {
      setAllowed(false);
      setEntries([]);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [status]);
  return (
    <>
      <Header />
      <main className="portal">
        <span className="eyebrow">PEEVUE ADMIN</span>
        <h1>Keep the community clean.</h1>
        <p>
          Review submissions, verify locations, and publish helpful experiences.
        </p>
        {error && (
          <div className="form-error" role="alert">
            {error}{" "}
            <a className="inline-link" href="/account">
              Sign in
            </a>{" "}
            <button className="inline-link" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
        {allowed && (
          <div className="chips">
            {["pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                className={"chip " + (status === s ? "selected" : "")}
                onClick={() => {
                  setStatus(s);
                  setMessage("");
                }}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
        {busy ? (
          <p role="status">Loading moderation queue…</p>
        ) : (
          allowed &&
          (entries.length ? (
            entries.map((entry) => (
              <QueueCard
                key={entry.id + entry.updated_at}
                entry={entry}
                onDone={() => {
                  setMessage(
                    "Decision saved. The public site reflects the approved reviews.",
                  );
                  void load();
                }}
              />
            ))
          ) : (
            <div className="empty">
              <h3>No {status} submissions.</h3>
              <p>New community contributions will appear here.</p>
            </div>
          ))
        )}
      </main>
      <Footer />
    </>
  );
}
