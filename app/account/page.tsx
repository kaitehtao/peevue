"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Header, Footer } from "@/components/community/header";
import { browserClient, memberFetch } from "@/lib/supabase-browser";
type OwnReview = {
  id: string;
  display_name: string;
  rating: number;
  body: string;
  visited: string;
  status: string;
  moderation_note: string;
  photos: string[];
  proposed_venue?: { name: string };
  venues?: { name: string };
};
export default function Account() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [enabled, setEnabled] = useState(true),
    [mode, setMode] = useState("signin"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reviews, setReviews] = useState<OwnReview[]>([]),
    [isAdmin, setIsAdmin] = useState(false);
  async function load() {
    try {
      const r = await memberFetch("/api/me");
      const d = (await r.json()) as {
        error?: string;
        reviews: OwnReview[];
        isAdmin: boolean;
      };
      if (!r.ok) throw new Error(d.error);
      setReviews(d.reviews);
      setIsAdmin(d.isAdmin);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let unsubscribe = () => {};
    let live = true;
    browserClient()
      .then(async (client) => {
        const { data: listener } = client.auth.onAuthStateChange(
          (event, session) => {
            if (!live) return;
            setUser(session?.user || null);
            if (event === "PASSWORD_RECOVERY") setMode("recovery");
            setReady(true);
          },
        );
        unsubscribe = () => listener.subscription.unsubscribe();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (live) {
          setUser(data.session?.user || null);
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setEnabled(false);
          setReady(true);
        }
      });
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (user) void load();
    else {
      setReviews([]);
      setIsAdmin(false);
    }
  }, [user?.id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget),
      email = String(form.get("email") || ""),
      password = String(form.get("password") || "");
    try {
      const client = await browserClient();
      if (mode === "signup") {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/account" },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then sign in.");
      } else if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/account",
        });
        if (error) throw error;
        setMessage(
          "If an account exists, a password reset link has been sent.",
        );
      } else if (mode === "recovery") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setMode("signin");
        setMessage("Your password has been updated.");
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main className="portal">
        <span className="eyebrow">YOUR PEEVUE</span>
        <h1>
          {user && mode !== "recovery"
            ? "Your contributions."
            : "A little more community."}
        </h1>
        {!ready && <p role="status">Checking your account…</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
        {ready &&
          enabled &&
          (user && mode !== "recovery" ? (
            <>
              <div className="account-actions">
                <p>Signed in as {user.email}</p>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      const { error } = await (
                        await browserClient()
                      ).auth.signOut();
                      if (error) throw error;
                      setUser(null);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Sign out
                </button>
                {isAdmin && (
                  <a className="primary" href="/admin">
                    Open admin portal
                  </a>
                )}
              </div>
              <h2>My reviews</h2>
              <p>Track your submissions and moderation decisions here.</p>
              {reviews.length === 0 ? (
                <div className="empty">
                  <h3>Your first review starts here.</h3>
                  <p>Share a bathroom you have actually visited.</p>
                  <a className="primary" href="/">
                    Explore and add a review
                  </a>
                </div>
              ) : (
                reviews.map((r) => (
                  <article className="moderation-card" key={r.id}>
                    <div className="section-heading">
                      <h3>
                        {r.venues?.name ||
                          r.proposed_venue?.name ||
                          "Bathroom review"}
                      </h3>
                      <span className={"status " + r.status}>{r.status}</span>
                    </div>
                    <p>
                      {r.rating}/5 cleanliness · Visited {r.visited}
                    </p>
                    <p>{r.body}</p>
                    {r.moderation_note && (
                      <p className="location-message">
                        Moderator note: {r.moderation_note}
                      </p>
                    )}
                    <div className="review-photos">
                      {r.photos.map((src) => (
                        <a
                          href={src}
                          key={src}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img src={src} alt="Your submitted bathroom photo" />
                        </a>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </>
          ) : (
            <section className="account-box">
              <div className="chips">
                {[
                  ["signin", "Sign in"],
                  ["signup", "Create account"],
                  ["reset", "Reset password"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={"chip " + (mode === key ? "selected" : "")}
                    onClick={() => {
                      setMode(key);
                      setError("");
                      setMessage("");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form className="review-form" onSubmit={submit}>
                {mode !== "recovery" && (
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                    />
                  </label>
                )}
                {mode !== "reset" && (
                  <label>
                    {mode === "recovery" ? "New password" : "Password"}
                    <input
                      name="password"
                      type="password"
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      required
                      minLength={mode === "signin" ? 1 : 12}
                      maxLength={128}
                    />
                    {mode !== "signin" && (
                      <small>Use at least 12 characters.</small>
                    )}
                  </label>
                )}
                <button className="primary" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "reset"
                        ? "Send reset link"
                        : mode === "recovery"
                          ? "Save new password"
                          : "Sign in"}
                </button>
              </form>
              <p>
                Prefer to stay a guest?{" "}
                <a className="inline-link" href="/">
                  Submit a review without an account.
                </a>
              </p>
            </section>
          ))}
      </main>
      <Footer />
    </>
  );
}
