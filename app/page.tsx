"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type HandleRow = {
  id: string;
  handle: string;
  platform: string | null;
};

type LogRow = {
  id: string;
  sentiment: "good" | "neutral" | "bad";
  severity: "info" | "warning" | "critical";
  encounter: "raid" | "squad" | "trade" | "other";
  category: string;
  description: string;
  created_at: string;
  handle_id: string;
  handles: {
    handle: string;
    platform: string | null;
  } | null;
};

export default function Home() {
  // auth
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // login form
  const [email, setEmail] = useState("");

  // submit form
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [sentiment, setSentiment] = useState<LogRow["sentiment"]>("neutral");
  const [severity, setSeverity] = useState<LogRow["severity"]>("info");
  const [encounter, setEncounter] = useState<LogRow["encounter"]>("other");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");

  // feed
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // ui status
  const [status, setStatus] = useState("");

  const trimmedHandle = useMemo(() => handle.trim(), [handle]);

  // ---- auth bootstrap ----
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!mounted) return;
      setUserEmail(session?.user?.email ?? null);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ---- public feed ----
  const loadFeed = async () => {
    setLoadingFeed(true);
    setStatus("");

    const { data, error } = await supabase
  .from("logs")
  .select(`
    id,
    sentiment,
    severity,
    encounter,
    category,
    description,
    created_at,
    handle_id,
    handles:handle_id (
      handle,
      platform
    )
  `)
  .order("created_at", { ascending: false })
  .limit(25)
  .returns<LogRow[]>();   // ✅ add this

if (error) {
  setStatus(`Feed error: ${error.message}`);
  return;
}

setLogs(data ?? []);      // ✅ no cast needed

  };

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- auth actions ----
  const signInWithGoogle = async () => {
    setStatus("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // return to current origin (localhost or thesurfacelog.com)
        redirectTo: `${window.location.origin}/`,
      },
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
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) setStatus(`Email login error: ${error.message}`);
    else setStatus("Magic link sent. Check your inbox.");
  };

  const signOut = async () => {
    setStatus("");
    await supabase.auth.signOut();
  };

  // ---- submit log (requires auth) ----
  const submitLog = async () => {
    setStatus("Submitting...");

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) {
      setStatus("You must be signed in to submit.");
      return;
    }

    if (!trimmedHandle) {
      setStatus("Handle is required.");
      return;
    }

    if (!description.trim()) {
      setStatus("Description is required.");
      return;
    }

    const cleanHandle = trimmedHandle;
    const cleanPlatform = platform.trim() || null;

    // 1) Find existing handle rows (case-insensitive, partial match)
    const { data: matches, error: findErr } = await supabase
      .from("handles")
      .select("id, handle, platform")
      .ilike("handle", cleanHandle) // exact-ish, but case-insensitive
      .limit(10);

    if (findErr) {
      setStatus(`Handle lookup error: ${findErr.message}`);
      return;
    }

    // Prefer an exact normalized match if it exists, otherwise create.
    // (If you later add handle_normalized, we can tighten this further.)
    const existingExact = (matches ?? []).find(
      (h: HandleRow) => h.handle.toLowerCase() === cleanHandle.toLowerCase()
    );

    let handleId: string;

    if (existingExact?.id) {
      handleId = existingExact.id;
    } else {
      // 2) Create handle row
      const { data: created, error: createErr } = await supabase
        .from("handles")
        .insert({
          handle: cleanHandle,
          platform: cleanPlatform,
        })
        .select("id")
        .single();

      if (createErr) {
        setStatus(`Create handle error: ${createErr.message}`);
        return;
      }

      handleId = created.id;
    }

    // 3) Create log row
    const { error: logErr } = await supabase.from("logs").insert({
      handle_id: handleId,
      sentiment,
      severity,
      encounter,
      category,
      description: description.trim(),
      // If you have a user_id column, add it here:
      // user_id: userId,
    });

    if (logErr) {
      setStatus(`Submit error: ${logErr.message}`);
      return;
    }

    setStatus("Transmission logged.");
    setDescription("");
    setHandle("");
    setPlatform("");
    await loadFeed();
  };

  return (
    <main className="min-h-screen bg-black text-green-400 p-6 font-mono">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl tracking-widest text-green-300">
              THE SURFACE LOG
            </h1>
            <p className="mt-2 text-sm text-green-300/60">
              community transmissions • verify nothing • log everything
            </p>
          </div>

          <div className="text-right">
            {userEmail ? (
              <div className="text-sm text-green-200/80">
                <div>signed in as</div>
                <div className="text-green-200">{userEmail}</div>
                <button
                  onClick={signOut}
                  className="mt-2 border border-green-700/40 rounded px-3 py-1 hover:bg-green-900/20"
                >
                  sign out
                </button>
              </div>
            ) : (
              <div className="text-sm text-green-200/80">not signed in</div>
            )}
          </div>
        </header>

        {/* Divider spacer */}
        <div className="my-8 relative overflow-visible">
          <div className="w-full border-t border-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-green-100 blur-[2px] scan-glow" />
        </div>

        {/* Login block (only when logged out) */}
        {!userEmail && (
          <section className="mb-8 grid gap-3 max-w-md border border-green-700/40 rounded-lg p-4">
            <div className="font-mono text-sm text-green-200/80">
              access terminal
            </div>

            <button
              onClick={signInWithGoogle}
              className="border border-green-700/40 rounded px-3 py-2 font-mono text-sm hover:bg-green-900/20"
            >
              sign in with google
            </button>

            <div className="text-green-200/40 text-xs">or</div>

            <div className="grid gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200 placeholder:text-green-200/30"
              />
              <button
                onClick={sendMagicLink}
                className="border border-green-700/40 rounded px-3 py-2 font-mono text-sm hover:bg-green-900/20"
              >
                send magic link
              </button>
            </div>
          </section>
        )}

        {/* Submission block (requires login) */}
        <section className="mb-8 border border-green-700/40 rounded-lg p-4">
          <div className="text-green-200/80 text-sm mb-3">new transmission</div>

          {!userEmail ? (
            <div className="text-green-200/50 text-sm">
              sign in to submit transmissions.
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="handle"
                  className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200 placeholder:text-green-200/30"
                />

                <input
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="platform (optional)"
                  className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200 placeholder:text-green-200/30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={sentiment}
                  onChange={(e) =>
                    setSentiment(e.target.value as LogRow["sentiment"])
                  }
                  className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200"
                >
                  <option value="good">good</option>
                  <option value="neutral">neutral</option>
                  <option value="bad">bad</option>
                </select>

                <select
                  value={severity}
                  onChange={(e) =>
                    setSeverity(e.target.value as LogRow["severity"])
                  }
                  className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200"
                >
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                </select>

                <select
                  value={encounter}
                  onChange={(e) =>
                    setEncounter(e.target.value as LogRow["encounter"])
                  }
                  className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200"
                >
                  <option value="raid">raid</option>
                  <option value="squad">squad</option>
                  <option value="trade">trade</option>
                  <option value="other">other</option>
                </select>
              </div>

              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="category (e.g., Griefing, Helpful, Scam, etc.)"
                className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200 placeholder:text-green-200/30"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="details..."
                rows={4}
                className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200 placeholder:text-green-200/30"
              />

              <div className="flex gap-3">
                <button
                  onClick={submitLog}
                  className="border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20"
                >
                  submit
                </button>
                <button
                  onClick={loadFeed}
                  className="border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20"
                >
                  refresh feed
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Feed (public) */}
        <section className="border border-green-700/40 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-green-200/80 text-sm">latest logs</div>
            <div className="text-green-200/50 text-xs">
              {loadingFeed ? "loading..." : `${logs.length} shown`}
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="text-green-200/50 text-sm">no transmissions yet</div>
          ) : (
            <div className="grid gap-3">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="border border-green-700/30 rounded p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-green-200">
                      <Link
                        className="underline decoration-green-700/40 hover:decoration-green-400"
                        href={`/handle/${encodeURIComponent(
                          l.handles?.handle ?? "unknown"
                        )}`}
                      >
                        {l.handles?.handle ?? "unknown"}
                      </Link>
                      {l.handles?.platform ? (
                        <span className="text-green-200/50">
                          {" "}
                          • {l.handles.platform}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-green-200/40 text-xs">
                      {new Date(l.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-green-200/60 flex flex-wrap gap-2">
                    <span>[{l.sentiment}]</span>
                    <span>[{l.severity}]</span>
                    <span>[{l.encounter}]</span>
                    <span>[{l.category}]</span>
                  </div>

                  <div className="mt-2 text-green-100/90 text-sm">
                    {l.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {status ? (
          <div className="mt-4 text-sm text-green-200/70">{status}</div>
        ) : null}
      </div>
    </main>
  );
}
