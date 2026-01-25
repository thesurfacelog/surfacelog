"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Sentiment = "good" | "neutral" | "bad";
type Severity = "info" | "warning" | "critical";
type Encounter = "raid" | "squad" | "trade" | "other";

export default function NewTransmissionPage() {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [sentiment, setSentiment] = useState<Sentiment>("neutral");
  const [severity, setSeverity] = useState<Severity>("info");
  const [encounter, setEncounter] = useState<Encounter>("other");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setStatus("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/new` },
    });
    if (error) setStatus(`Google sign-in error: ${error.message}`);
  };

  const sendMagicLink = async () => {
    setStatus("");
    const clean = email.trim();
    if (!clean) {
      setStatus("Enter an email first.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: `${window.location.origin}/new` },
    });

    if (error) setStatus(`Magic link error: ${error.message}`);
    else setStatus("Check your email for the magic link.");
  };

  const signOut = async () => {
    setStatus("");
    await supabase.auth.signOut();
  };

  const submitTransmission = async () => {
    setSubmitting(true);
    setStatus("");

    const trimmedHandle = handle.trim();
    if (!trimmedHandle) {
      setStatus("Handle is required.");
      setSubmitting(false);
      return;
    }
    if (!description.trim()) {
      setStatus("Description is required.");
      setSubmitting(false);
      return;
    }

    try {
      // 1) upsert/find handle row
      const { data: existing, error: findErr } = await supabase
        .from("handles")
        .select("id, handle, platform")
        .eq("handle_normalized", trimmedHandle.toLowerCase())
        .maybeSingle();

      if (findErr) {
        setStatus(`Handle lookup error: ${findErr.message}`);
        setSubmitting(false);
        return;
      }

      let handleId = existing?.id as string | undefined;

      if (!handleId) {
        const { data: created, error: createErr } = await supabase
          .from("handles")
          .insert({
            handle: trimmedHandle,
            handle_normalized: trimmedHandle.toLowerCase(),
            platform: platform.trim() || null,
          })
          .select("id")
          .single();

        if (createErr) {
          setStatus(`Handle create error: ${createErr.message}`);
          setSubmitting(false);
          return;
        }

        handleId = created.id;
      }

      // 2) insert log
      const { error: logErr } = await supabase.from("logs").insert({
        handle_id: handleId,
        sentiment,
        severity,
        encounter,
        category,
        description: description.trim(),
      });

      if (logErr) {
        setStatus(`Submit error: ${logErr.message}`);
        setSubmitting(false);
        return;
      }

      setStatus("Transmission submitted.");
      setHandle("");
      setPlatform("");
      setSentiment("neutral");
      setSeverity("info");
      setEncounter("other");
      setCategory("general");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-green-300 font-mono px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/" className="text-green-200/80 hover:text-green-200">
            ← back to feed
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-3 text-xs text-green-200/70">
              <span>signed in as {userEmail}</span>
              <button
                onClick={signOut}
                className="border border-green-700/40 rounded px-2 py-1 hover:bg-green-900/20"
              >
                sign out
              </button>
            </div>
          ) : null}
        </div>

        {!userEmail ? (
          <section className="grid gap-3 border border-green-700/40 rounded-lg p-4 mb-6">
            <div className="text-sm text-green-200/80">access terminal</div>

            <button
              onClick={signInWithGoogle}
              className="border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20"
            >
              sign in with google
            </button>

            <div className="text-xs text-green-200/60">or</div>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email for magic link"
              className="bg-black border border-green-700/40 rounded px-3 py-2 outline-none"
            />
            <button
              onClick={sendMagicLink}
              className="border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20"
            >
              send magic link
            </button>
            <div className="mt-2 text-[16px] text-red-300/90">
  By signing up / signing in, you agree to the site rules and data policy.
</div>

<Link
  href="/rules"
  className="inline-flex items-center justify-center text-xs border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20"
>
  view rules & disclaimers →
</Link>

          </section>
        ) : null}

        <section className="border border-green-700/40 rounded-lg p-4">
          <div className="text-sm text-green-200/80 mb-3">new transmission</div>

          {!userEmail ? (
            <div className="text-xs text-green-200/60">
              sign in to submit transmissions.
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="player handle"
                  className="bg-black border border-green-700/40 rounded px-3 py-2 outline-none"
                />
                <input
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="platform (optional)"
                  className="bg-black border border-green-700/40 rounded px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <select
                  value={sentiment}
                  onChange={(e) => setSentiment(e.target.value as Sentiment)}
                  className="bg-black border border-green-700/40 rounded px-2 py-2"
                >
                  <option value="good">good</option>
                  <option value="neutral">neutral</option>
                  <option value="bad">bad</option>
                </select>

                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="bg-black border border-green-700/40 rounded px-2 py-2"
                >
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                </select>

                <select
                  value={encounter}
                  onChange={(e) => setEncounter(e.target.value as Encounter)}
                  className="bg-black border border-green-700/40 rounded px-2 py-2"
                >
                  <option value="raid">raid</option>
                  <option value="squad">squad</option>
                  <option value="trade">trade</option>
                  <option value="other">other</option>
                </select>

                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="category"
                  className="bg-black border border-green-700/40 rounded px-2 py-2 outline-none"
                />
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="describe the interaction..."
                rows={5}
                className="bg-black border border-green-700/40 rounded px-3 py-2 outline-none"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={submitTransmission}
                  disabled={submitting}
                  className="border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20 disabled:opacity-50"
                >
                  {submitting ? "submitting..." : "submit"}
                </button>
              </div>
            </div>
          )}
        </section>

        {status ? (
          <div className="mt-4 text-xs text-green-200/70">{status}</div>
        ) : null}
      </div>
    </main>
  );
}
