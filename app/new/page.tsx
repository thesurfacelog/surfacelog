"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Sentiment = "good" | "neutral" | "bad" | "rat";
type Severity = "info" | "warning" | "critical"; // stored values (DB-safe)
type Encounter = "spawn_in" | "objective" | "extraction" | "third_party" | "comms" | "other";

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
    const trimmedDescription = description.trim();

    if (!trimmedHandle) {
      setStatus("Handle is required.");
      setSubmitting(false);
      return;
    }
    if (!trimmedDescription) {
      setStatus("Description is required.");
      setSubmitting(false);
      return;
    }

    try {
      // ---- 1) Resolve handle id (safe even if unique constraint is on different columns)
      const normalized = trimmedHandle.toLowerCase();
      const platformClean = platform.trim() || null;

      let handleId: string | null = null;

      // A) Try to find by normalized handle first
      const { data: found, error: findErr } = await supabase
        .from("handles")
        .select("id")
        .eq("handle_normalized", normalized)
        .maybeSingle();

      if (findErr) {
        setStatus(`Handle lookup error: ${findErr.message}`);
        return;
      }

      if (found?.id) {
        handleId = String(found.id);
      } else {
        // B) Try to insert
        const { data: created, error: createErr } = await supabase
          .from("handles")
          .insert({
            handle: trimmedHandle,
            handle_normalized: normalized,
            platform: platformClean,
          })
          .select("id")
          .single();

        if (createErr) {
          // 23505 = unique constraint violation
          if (createErr.code === "23505") {
            // C) Another insert won the race — re-fetch id
            const { data: again, error: againErr } = await supabase
              .from("handles")
              .select("id")
              .or(`handle_normalized.eq.${normalized},handle.eq.${trimmedHandle}`)
              .maybeSingle();

            if (againErr || !again?.id) {
              setStatus(
                `Handle exists but could not re-fetch id: ${
                  againErr?.message ?? "unknown error"
                }`
              );
              return;
            }

            handleId = String(again.id);
          } else {
            setStatus(`Handle create error: ${createErr.message}`);
            return;
          }
        } else {
          handleId = String(created.id);
        }
      }

      if (!handleId) {
        setStatus("Could not resolve handle id.");
        return;
      }

      // ---- 2) Insert log
      const { error: logErr } = await supabase.from("logs").insert({
        handle_id: handleId,
        sentiment,
        severity,
        encounter,
        category,
        description: trimmedDescription,
      });

      if (logErr) {
        setStatus(`Submit error: ${logErr.message}`);
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
              By signing up / signing in, you agree to the site rules and data
              policy.
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
          <div className="text-sm text-green-200/80 mb-3">new report</div>

          {!userEmail ? (
            <div className="text-xs text-green-200/60">
              sign in to submit report.
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

              {/* Dropdown row with helper text */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Sentiment */}
                <div className="flex flex-col gap-1">
                  <div className="text-green-200/70">sentiment</div>
                  <div className="text-[11px] text-green-200/50 leading-snug">
                    How the interaction felt.
                  </div>
                  <select
                    value={sentiment}
                    onChange={(e) =>
                      setSentiment(e.target.value as Sentiment)
                    }
                    className="bg-black border border-green-700/40 rounded px-2 py-2"
                  >
                    <option value="good">good</option>
                    <option value="neutral">neutral</option>
                    <option value="bad">bad</option>
                    <option value="rat">rat</option>
                  </select>
                </div>

                {/* Risk level (Severity) */}
                <div className="flex flex-col gap-1">
                  <div className="text-green-200/70">risk level</div>
                  <div className="text-[11px] text-green-200/50 leading-snug">
                    How serious this is for others.
                  </div>
                  <select
                    value={severity}
                    onChange={(e) =>
                      setSeverity(e.target.value as Severity)
                    }
                    className="bg-black border border-green-700/40 rounded px-2 py-2"
                  >
                    <option value="info">FYI</option>
                    <option value="warning">Caution</option>
                    <option value="critical">High Risk</option>
                  </select>
                </div>

                {/* Encounter */}
                <div className="flex flex-col gap-1">
                  <div className="text-green-200/70">encounter</div>
                  <div className="text-[11px] text-green-200/50 leading-snug">
                    Where it happened.
                  </div>
                  <select
                    value={encounter}
                    onChange={(e) =>
                      setEncounter(e.target.value as Encounter)
                    }
                    className="bg-black border border-green-700/40 rounded px-2 py-2"
                  >
                    <option value="spawn_in">spawn in</option>
                    <option value="objective">objective</option>
                    <option value="extraction">extraction</option>
                    <option value="third_party">third party</option>
                    <option value="comms">comms</option>
                    <option value="other">other</option>
                  </select>
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                  <div className="text-green-200/70">category</div>
                  <div className="text-[11px] text-green-200/50 leading-snug">
                    Short tag (e.g., comms, griefing).
                  </div>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="general"
                    className="bg-black border border-green-700/40 rounded px-2 py-2 outline-none"
                  />
                </div>
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
