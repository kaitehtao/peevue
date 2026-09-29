"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Camera, Toilet, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ratingLabels, todayInVegas, type Venue } from "@/lib/community";
import { browserClient, sessionHeaders } from "@/lib/supabase-browser";
import { blankVenue, VenueFields } from "./venue-fields";
async function compress(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Choose JPEG, PNG, or WebP photos smaller than 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Photo processing is unavailable in this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not prepare photo."))),
        "image/jpeg",
        0.8,
      ),
    );
    if (blob.size > 2 * 1024 * 1024) throw new Error("Choose a smaller photo.");
    return new File([blob], "bathroom.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
export function Submission({
  venues,
  initialVenue,
  enabled,
  onClose,
  onSuccess,
}: {
  venues: Venue[];
  initialVenue?: string;
  enabled: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const [venueId, setVenueId] = useState(initialVenue || "new"),
    [venue, setVenue] = useState({ ...blankVenue }),
    [rating, setRating] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [busy, setBusy] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false),
    [error, setError] = useState(""),
    [identity, setIdentity] = useState("Guest"),
    [identityReady, setIdentityReady] = useState(false);
  const [id] = useState(() => crypto.randomUUID()),
    [receipt] = useState(() => crypto.randomUUID());
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  useEffect(() => {
    if (!enabled) return;
    browserClient()
      .then((c) => c.auth.getSession())
      .then(({ data, error }) => {
        if (error) throw error;
        setIdentity(data.session?.user.email || "Guest");
        setIdentityReady(true);
      })
      .catch(() =>
        setError(
          "Unable to check your account. Close and reopen the form to try again.",
        ),
      );
  }, [enabled]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) {
      setError("Choose a cleanliness rating.");
      return;
    }
    setBusy(true);
    setError("");
    const fields = new FormData(e.currentTarget);
    const body = new FormData();
    body.set(
      "submission",
      JSON.stringify({
        id,
        venueId: venueId === "new" ? null : venueId,
        venue: venueId === "new" ? venue : null,
        name: fields.get("name"),
        rating: Number(rating),
        body: fields.get("body"),
        passcode: fields.get("passcode") || "",
        visited: fields.get("visited"),
        consent: fields.get("consent") === "on",
        website: fields.get("website") || "",
      }),
    );
    body.set("receipt", receipt);
    files.forEach((f) => body.append("photos", f));
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: await sessionHeaders(),
        body,
      });
      const result = (await response.json()) as { error?: string; id: string };
      if (!response.ok) throw new Error(result.error);
      onSuccess(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !photoBusy) onClose();
      }}
    >
      <DialogContent
        className="review-dialog"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="dialog-title">
          Share a better bathroom break.
        </DialogTitle>
        <DialogDescription>
          {enabled
            ? "Your review and photos appear after an administrator approves them."
            : "Community submissions are being connected. Please check back soon."}
        </DialogDescription>
        {enabled && (
          <form className="review-form" onSubmit={submit}>
            <p className="identity-note">
              Submitting as <strong>{identity}</strong>.{" "}
              {identity === "Guest" && (
                <>
                  No account required. <a href="/account">Sign in first</a> to
                  track your submissions.
                </>
              )}
            </p>
            <label>
              Bathroom
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
              >
                <option value="new">Add a new bathroom</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.area}
                  </option>
                ))}
              </select>
            </label>
            {venueId === "new" ? (
              <VenueFields value={venue} onChange={setVenue} />
            ) : (
              <p>{venues.find((v) => v.id === venueId)?.address}</p>
            )}
            <fieldset>
              <legend>How clean was it?</legend>
              <RadioGroup
                className="rating-options"
                value={rating}
                onValueChange={setRating}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    key={n}
                    className={
                      "rating-option " + (rating === String(n) ? "checked" : "")
                    }
                  >
                    <RadioGroupItem
                      value={String(n)}
                      aria-label={`${n}: ${ratingLabels[n]}`}
                    />
                    <span>{n}</span>
                    <Toilet size={16} />
                  </label>
                ))}
              </RadioGroup>
              <p className="rating-help">
                {rating
                  ? ratingLabels[Number(rating)]
                  : "1 · Needs attention — 5 · Spotless"}
              </p>
            </fieldset>
            <div className="form-two">
              <label>
                Public display name
                <input
                  required
                  name="name"
                  minLength={2}
                  maxLength={50}
                  placeholder="e.g. Alex"
                  autoComplete="nickname"
                />
              </label>
              <label>
                Date visited
                <input
                  required
                  name="visited"
                  type="date"
                  min="2000-01-01"
                  max={todayInVegas()}
                  defaultValue={todayInVegas()}
                />
              </label>
            </div>
            <label>
              Bathroom passcode <small>(optional)</small>
              <input name="passcode" type="text" maxLength={40} autoComplete="off" placeholder="e.g. 0123#" aria-describedby="passcode-help"/>
              <small id="passcode-help" className="photo-rule">Share a bathroom door code if one is needed. It will appear with your review after approval.</small>
            </label>
            <label>
              Your review
              <textarea
                name="body"
                required
                minLength={10}
                maxLength={1500}
                rows={4}
                placeholder="Clean floors? Stocked soap? Tell others what to expect."
              />
            </label>
            <div>
              <span className="field-label">
                Bathroom photos <small>Optional · up to 3</small>
              </span>
              <label className="upload">
                <Camera size={22} />
                <span>
                  {photoBusy ? "Preparing photos…" : "Choose photos"}
                  <small>JPEG, PNG, WebP · 10 MB each before resizing</small>
                </span>
                <input
                  aria-label="Upload bathroom photos"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy || photoBusy}
                  onChange={async (e) => {
                    const selected = Array.from(e.target.files || []);
                    e.target.value = "";
                    if (selected.length + files.length > 3) {
                      setError("Choose up to three photos.");
                      return;
                    }
                    setPhotoBusy(true);
                    setError("");
                    try {
                      const ready = await Promise.all(selected.map(compress));
                      setFiles((old) => [...old, ...ready]);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setPhotoBusy(false);
                    }
                  }}
                />
              </label>
              <p className="photo-rule">
                Empty spaces only. No people, reflections of people, or personal
                information. Use photos you took.
              </p>
              <div className="upload-previews">
                {previews.map((p, i) => (
                  <div key={p}>
                    <img src={p} alt={"Selected bathroom photo " + (i + 1)} />
                    <button
                      type="button"
                      aria-label={"Remove photo " + (i + 1)}
                      onClick={() =>
                        setFiles((old) => old.filter((_, j) => i !== j))
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <label className="honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <label className="consent">
              <input name="consent" type="checkbox" required />I confirm this is
              my own experience, the bathroom address is correct, and my review,
              photos, display name, and venue location may be published after
              moderation.
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              className="primary submit"
              disabled={busy || photoBusy || !identityReady}
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
            <p className="form-footnote">
              Photo metadata is removed. Your account email stays private. Guest
              submissions cannot be tracked after you leave.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
