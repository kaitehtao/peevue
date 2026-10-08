"use client";
import { PhotoGallery } from "@/components/community/photo-gallery";
import { useEffect, useState } from "react";
import {
  Search,
  ArrowUpRight,
  Toilet,
  PenLine,
  Accessibility,
  Camera,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Header, Footer } from "@/components/community/header";
import { ReviewMap } from "@/components/community/review-map";
import { Submission } from "@/components/community/submission";
import {
  neighborhoods,
  categoryOptions,
  type Venue,
  type Review,
} from "@/lib/community";
export default function Home() {
  const [venues, setVenues] = useState<Venue[]>([]),
    [reviews, setReviews] = useState<Review[]>([]),
    [enabled, setEnabled] = useState(false),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [success, setSuccess] = useState("");
  const [query, setQuery] = useState(""),
    [area, setArea] = useState("All neighborhoods"),
    [type, setType] = useState("All places"),
    [sort, setSort] = useState("cleanest"),
    [accessible, setAccessible] = useState(false),
    [publicOnly, setPublicOnly] = useState(false),
    [detail, setDetail] = useState<Venue | null>(null),
    [selectedBathroom, setSelectedBathroom] = useState("all"),
    [submission, setSubmission] = useState<{ venueId?: string; bathroomId?: string } | null>(null);
  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/reviews");
      const d = (await r.json()) as {
        error?: string;
        venues: Venue[];
        reviews: Review[];
        contributionsEnabled: boolean;
      };
      if (!r.ok) throw new Error(d.error);
      setVenues(d.venues);
      setReviews(d.reviews);
      setEnabled(d.contributionsEnabled);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const latestReview = new Map<string, number>();
  for (const review of reviews) {
    if (!review.venueId) continue;
    const timestamp = Date.parse(review.createdAt) || 0;
    latestReview.set(review.venueId, Math.max(latestReview.get(review.venueId) || 0, timestamp));
  }
  const filtered = venues
    .filter(
      (v) =>
        (v.name + " " + v.area + " " + v.address + " " + v.type)
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (area === "All neighborhoods" || v.area === area) &&
        (type === "All places" || v.type.toLowerCase() === type.toLowerCase()) &&
        (!accessible || v.tags.includes("Accessible")) &&
        (!publicOnly || v.access === "Public access"),
    )
    .sort((a, b) =>
      sort === "recent"
        ? (latestReview.get(b.id) || 0) - (latestReview.get(a.id) || 0) || a.name.localeCompare(b.name)
        : sort === "name" ? a.name.localeCompare(b.name) : b.score - a.score,
    );
  function start(venueId?: string, bathroomId?: string) {
    setDetail(null);
    setSubmission({ venueId, bathroomId });
    setSuccess("");
  }
  return (
    <>
      <Header />
      <main>
        <section className="intro">
          <div>
            <span className="eyebrow">
              <img
                className="location-pin"
                src="/peevue-toilet-pin.png"
                alt=""
                width={22}
                height={22}
              />{" "}
              LAS VEGAS, NEVADA
            </span>
            <h1>
              Good times. <span>Great bathrooms.</span>
            </h1>
            <p>Find a clean bathroom in Las Vegas. Compare restroom cleanliness reviews, photos, locations, and access details before you go.</p>
            <a className="inline-link" href="/las-vegas-bathrooms">Explore the Las Vegas bathroom directory</a>
          </div>
          <button className="primary" onClick={() => start()}>
            <PenLine size={17} />
            Write a review
          </button>
        </section>
        <form
          className="searchbar"
          onSubmit={(e) => {
            e.preventDefault();
            document
              .getElementById("explore")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Search size={22} />
          <input
            aria-label="Search bathrooms"
            placeholder="Search a restaurant, address, or neighborhood"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="clear"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          )}
          <span className="search-location">
            <img
              className="location-pin"
              src="/peevue-toilet-pin.png"
              alt=""
              width={26}
              height={26}
            />
            Las Vegas, NV
          </span>
          <button className="primary">Explore</button>
        </form>
        {success && (
          <div role="status" className="success">
            <Check size={19} />
            {success}
            <button aria-label="Dismiss message" onClick={() => setSuccess("")}>
              <X size={17} />
            </button>
          </div>
        )}
        <section className="workspace" id="explore">
          <div>
            <div className="section-heading">
              <div>
                <h2>A better bathroom break.</h2>
                <p>Real experiences. Cleanliness comes first.</p>
              </div>
              <select
                className="sort-select"
                aria-label="Sort bathrooms"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="cleanest">Cleanest first</option>
                <option value="recent">Most recent reviews</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
            <div className="chips">
              {["All places", ...categoryOptions(venues.map(v=>v.type))].map((t) => (
                <button
                  key={t}
                  className={"chip " + (type === t ? "selected" : "")}
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="filter-row">
              <button
                className={"filter " + (accessible ? "on" : "")}
                aria-pressed={accessible}
                onClick={() => setAccessible(!accessible)}
              >
                <Accessibility size={15} />
                Accessible
              </button>
              <button
                className={"filter " + (publicOnly ? "on" : "")}
                aria-pressed={publicOnly}
                onClick={() => setPublicOnly(!publicOnly)}
              >
                Public access
              </button>
              <span aria-live="polite">{filtered.length} places</span>
            </div>
            {loadError && (
              <div className="load-error" role="alert">
                {loadError}
                <button onClick={() => void load()}>Retry</button>
              </div>
            )}
            {loading ? (
              <p role="status">Loading community reviews…</p>
            ) : (
              !loadError && (
                <>
                  <ReviewMap venues={filtered} onSelect={v=>{setDetail(v);setSelectedBathroom("all");}}/>
                  <div className="cards">
                    {filtered.map((v) => (
                      <button
                        className="venue-card"
                        key={v.id}
                        onClick={() => {setDetail(v);setSelectedBathroom("all");}}
                        aria-label={`View ${v.name}, cleanliness ${v.score.toFixed(1)} out of 5`}
                      >
                        <div className="venue-visual">
                          {v.photos[0] ? (
                            <img
                              src={v.photos[0]}
                              alt={"Community bathroom photo at " + v.name}
                            />
                          ) : (
                            <div className="no-photo">
                              <Camera size={32} />
                              <span>First photo welcome</span>
                            </div>
                          )}
                          <span className="score">
                            <Toilet size={14} />
                            {v.score.toFixed(1)}
                            <small>/ 5</small>
                          </span>
                        </div>
                        <div className="venue-body">
                          <div className="venue-title">
                            <h3>{v.name}</h3>
                            <ArrowUpRight size={18} />
                          </div>
                          <p>
                            {v.type} · {v.area}
                          </p>
                          <p>{v.address}</p>
                          <div className="tags">
                            {v.tags.map((t) => (
                              <span key={t}>{t}</span>
                            ))}
                          </div>
                          <div className="card-footer">
                            <span>
                              {v.bathrooms.length} bathrooms · {v.count} {v.count === 1 ? "review" : "reviews"}
                            </span>
                            <span>{v.access}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!filtered.length && (
                    <div className="empty">
                      <Toilet size={38} />
                      <h3>
                        {venues.length
                          ? "No bathrooms match yet."
                          : "Be the first to put a bathroom on the map."}
                      </h3>
                      <p>
                        {venues.length
                          ? "Try fewer filters or add a bathroom you visited."
                          : enabled
                            ? "Our Las Vegas community starts with your real experiences. Add a review and photos; we’ll check them before publishing."
                            : "We’re preparing the community launch. Real reviews and photos will appear here once submissions open."}
                      </p>
                      <button className="primary" onClick={() => start()}>
                        Add a bathroom review <ArrowUpRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
          <aside>
            <div className="guide">
              <span className="eyebrow">THE LOCAL GUIDE</span>
              <h2>
                Find your
                <br />
                clean corner.
              </h2>
              <div className="guide-pin">
                <img
                  src="/peevue-toilet-pin.png"
                  width={70}
                  height={85}
                  alt="Bathroom location pin"
                />
                <p>
                  Las Vegas first.
                  <br />
                  Your neighborhood next.
                </p>
              </div>
              <div className="neighborhoods">
                {["All neighborhoods", ...neighborhoods].map((a) => (
                  <button
                    key={a}
                    className={area === a ? "area-selected" : ""}
                    aria-pressed={area === a}
                    onClick={() => setArea(a)}
                  >
                    {a}
                    {area === a ? (
                      <Check size={16} />
                    ) : (
                      <ArrowUpRight size={16} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="community" id="community">
              <span className="small-logo">
                <img src="/peevue-seat-p.png" alt="" width={34} height={34} />
              </span>
              <h3>
                Your review.
                <br />
                Someone’s relief.
              </h3>
              <p>
                Clean counters? Stocked soap? Share the details that make a
                difference. An account is optional.
              </p>
              <button className="text-button" onClick={() => start()}>
                Share your experience <ArrowUpRight size={16} />
              </button>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
      <Dialog
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
      >
        <DialogContent className="detail-dialog">
          {detail && (
            <>
              <DialogTitle className="dialog-title">{detail.name}</DialogTitle>
              <DialogDescription>
                {detail.type} · {detail.area}
              </DialogDescription>
              <PhotoGallery key={detail.id+selectedBathroom} photos={selectedBathroom==="all"?detail.photos:detail.bathrooms.find(b=>b.id===selectedBathroom)?.photos || []} label={"Bathroom at "+detail.name}/>
              <p>{detail.address}</p>
              <a className="inline-link" href={"/bathrooms/"+detail.id}>Open permanent bathroom review page</a>
              {detail.yelpUrl && <a className="text-button" href={detail.yelpUrl} target="_blank" rel="noopener noreferrer">View this property on Yelp <ArrowUpRight size={16}/></a>}
              {detail.latitude !== null && (
                <a
                  className="text-button"
                  href={`https://www.openstreetmap.org/?mlat=${detail.latitude}&mlon=${detail.longitude}#map=18/${detail.latitude}/${detail.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src="/peevue-toilet-pin.png"
                    alt=""
                    width={22}
                    height={26}
                  />
                  View bathroom location <ArrowUpRight size={16} />
                </a>
              )}
              <div className="detail-rating">
                <Toilet />
                <strong>{detail.score.toFixed(1)}</strong>
                <span>
                  out of 5 across this property’s bathrooms
                  <br />
                  <small>
                    {detail.count} community{" "}
                    {detail.count === 1 ? "review" : "reviews"}
                  </small>
                </span>
              </div>
              <div className="tags">
                {[...detail.tags, detail.access].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <p className="access-note">
                Community-reported details can change. Confirm access with
                staff.
              </p>
              <button className="primary" onClick={() => start(detail.id)}>
                <PenLine size={17} />
                Add a bathroom or review
              </button>
              <h3 className="subheading">Bathrooms at this property</h3>
              <div className="chips"><button className={"chip " + (selectedBathroom==="all"?"selected":"")} onClick={()=>setSelectedBathroom("all")}>All bathrooms</button>{detail.bathrooms.map(b=><button className={"chip " + (selectedBathroom===b.id?"selected":"")} key={b.id} onClick={()=>setSelectedBathroom(b.id)}>{b.location} · {b.gender} · {b.score.toFixed(1)}/5 ({b.count})</button>)}</div>
              {selectedBathroom!=="all" && <button className="primary" onClick={()=>start(detail.id,selectedBathroom)}>Review this bathroom</button>}
              <h3 className="subheading">{selectedBathroom==="all"?"All bathroom reviews":"Reviews for this bathroom"}</h3>
              {reviews
                .filter((r) => r.venueId === detail.id && (selectedBathroom==="all" || r.bathroomId===selectedBathroom))
                .map((r) => (
                  <article className="review" key={r.id}>
                    <div>
                      <strong>{r.profileId?<a className="inline-link" href={"/members/"+r.profileId}>{r.name}</a>:r.name}</strong>
                      <span>
                        <Toilet size={13} />
                        {r.rating}/5
                      </span>
                    </div>
                    <p><strong>{detail.bathrooms.find(b=>b.id===r.bathroomId)?.location || "Location not specified"} · {detail.bathrooms.find(b=>b.id===r.bathroomId)?.gender || "Not specified"}</strong></p><small>Visited {r.visited}</small>
                    <p>{r.body}</p>
                    {r.passcode && <p>Bathroom passcode: <code className="bathroom-passcode">{r.passcode}</code><small className="passcode-note">Reported for this visit. Codes may change; ask staff if needed.</small></p>}
                    <PhotoGallery photos={r.photos} label={"Bathroom photos by "+r.name}/>
                  </article>
                ))}
            </>
          )}
        </DialogContent>
      </Dialog>
      {submission && (
        <Submission
          venues={venues}
          initialVenue={submission.venueId}
          initialBathroom={submission.bathroomId}
          enabled={enabled}
          onClose={() => setSubmission(null)}
          onSuccess={(id) => {
            setSubmission(null);
            setSuccess(
              "Thank you! Your review is awaiting approval. Reference: " +
                id.slice(0, 8),
            );
            void load();
          }}
        />
      )}
    </>
  );
}
