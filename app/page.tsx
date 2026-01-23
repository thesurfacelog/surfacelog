"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// --------------------
// A) TYPES
// --------------------
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

type LeaderRow = {
  handle_id: string;
  handle: string;
  platform: string | null;
  last_report_at: string | null;
  reports_total?: number;
  reports_7d?: number;
  reports_24h?: number;
  good_count?: number;
  good_pct?: number;
};

export default function Home() {
  // --------------------
  // EXISTING APP STATE
  // --------------------
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // submission form (simple)
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("");
  const [sentiment, setSentiment] = useState<LogRow["sentiment"]>("neutral");
  const [severity, setSeverity] = useState<LogRow["severity"]>("info");
  const [encounter, setEncounter] = useState<LogRow["encounter"]>("other");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");

  // login form (magic link option)
  const [email, setEmail] = useState("");

  // --------------------
  // B) LEADERBOARD STATE
  // --------------------
  const [mostAllTime, setMostAllTime] = useState<LeaderRow[]>([]);
  const [most7d, setMost7d] = useState<LeaderRow[]>([]);
  const [most24h, setMost24h] = useState<LeaderRow[]>([]);
  const [nicest, setNicest] = useState<LeaderRow[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  // --------------------
  // FEED LOADER (PUBLIC)
  // --------------------
  const loadFeed = async () => {
    setLoadingFeed(true);
    setStatus("");

    const { data, error } = await supabase
      .from("logs")
      .select(
        `
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
      `
      )
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<LogRow[]>();

    setLoadingFeed(false);

    if (error) {
      setStatus(`Feed error: ${error.message}`);
      return;
    }

    setLogs(data ?? []);
  };

  // --------------------
  // C) LEADERBOARD LOADER
  // (requires the views you created in Supabase)
  // --------------------
  const loadLeaderboards = async () => {
    setLoadingLeaders(true);

    const topN = 10;

    const [a, b, c, d] = await Promise.all([
      supabase.from("leader_most_reported_all_time").select("*").limit(topN),
      supabase.from("leader_most_reported_7d").select("*").limit(topN),
      supabase.from("leader_most_reported_24h").select("*").limit(topN),
      supabase.from("leader_nicest_all_time").select("*").limit(topN),
    ]);

    setLoadingLeaders(false);

    if (a.error) setStatus(`Leaderboard error: ${a.error.message}`);
    if (b.error) setStatus(`Leaderboard error: ${b.error.message}`);
    if (c.error) setStatus(`Leaderboard error: ${c.error.message}`);
    if (d.error) setStatus(`Leaderboard error: ${d.error.message}`);

    setMostAllTime((a.data ?? []) as LeaderRow[]);
    setMost7d((b.data ?? []) as LeaderRow[]);
    setMost24h((c.data ?? []) as LeaderRow[]);
    setNicest((d.data ?? []) as LeaderRow[]);
  };

  // --------------------
  // AUTH
  // --------------------
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user?.email ?? null);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setStatus("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setStatus(`Google sign-in error: ${error.message}`);
  };

  const sendMagicLink = async () => {
    setStatus("");
    const clean = email.trim();
    if (!clean) return setStatus("Enter an email first.");

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });

    if (error) setStatus(`Email login error: ${error.message}`);
    else setStatus("Magic link sent. Check your inbox.");
  };

  const signOut = async () => {
    setStatus("");
    await supabase.auth.signOut();
  };

  // --------------------
  // D) INITIAL LOADS
  // --------------------
  useEffect(() => {
    loadFeed();
    loadLeaderboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------
  // SUBMIT (requires login)
  // --------------------
  const submitLog = async () => {
    setStatus("");

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) return setStatus("Sign in to submit transmissions.");
    if (!handle.trim()) return setStatus("Handle is required.");
    if (!description.trim()) return setStatus("Description is required.");

    // find or create handle row
    const cleanHandle = handle.trim();
    const cleanPlatform = platform.trim() || null;

    const { data: existing, error: findErr } = await supabase
      .from("handles")
      .select("id, handle")
      .ilike("handle", cleanHandle)
      .limit(20);

    if (findErr) return setStatus(`Handle lookup error: ${findErr.message}`);

    const exact = (existing ?? []).find(
      (h: any) => (h.handle ?? "").toLowerCase() === cleanHandle.toLowerCase()
    );

    let handleId: string;

    if (exact?.id) {
      handleId = exact.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("handles")
        .insert({ handle: cleanHandle, platform: cleanPlatform })
        .select("id")
        .single();

      if (createErr) return setStatus(`Create handle error: ${createErr.message}`);
      handleId = created.id;
    }

    const { error: insertErr } = await supabase.from("logs").insert({
      handle_id: handleId,
      sentiment,
      severity,
      encounter,
      category,
      description: description.trim(),
    });

    if (insertErr) return setStatus(`Submit error: ${insertErr.message}`);

    setStatus("Transmission logged.");
    setDescription("");
    setHandle("");
    setPlatform("");

    await Promise.all([loadFeed(), loadLeaderboards()]);
  };

  // --------------------
  // UI HELPERS
  // --------------------
  const LeaderList = ({
    title,
    rows,
    rightValue,
  }: {
    title: string;
    rows: LeaderRow[];
    rightValue: (r: LeaderRow) => string | number;
  }) => (
    <div className="border border-green-700/30 rounded-md p-3">
      <div className="font-mono text-xs text-green-300/80 mb-2 flex items-center justify-between">
        <span>{title}</span>
        {loadingLeaders ? (
          <span className="text-[11px] text-green-500/60">loading…</span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-green-400/50 font-mono">no data yet</div>
      ) : (
        <ul className="grid gap-1">
          {rows.map((r, i) => (
            <li key={`${r.handle_id}-${i}`} className="flex justify-between gap-3 text-sm">
              <Link
                className="underline underline-offset-4 hover:text-green-100 truncate"
                href={`/handle/${encodeURIComponent(r.handle)}`}
                title={r.handle}
              >
                {i + 1}. {r.handle}
                {r.platform ? <span className="text-green-300/50"> ({r.platform})</span> : null}
              </Link>
              <span className="text-green-200/80 shrink-0">{rightValue(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-green-400 p-6 font-mono">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl tracking-widest text-green-300">THE SURFACE LOG</h1>
            <p className="mt-2 text-sm text-green-300/60">
              public transmissions • private motives • verify nothing
            </p>
          </div>

          <div className="text-right text-sm">
            {userEmail ? (
              <>
                <div className="text-green-200/70">signed in as</div>
                <div className="text-green-200">{userEmail}</div>
                <button
                  onClick={signOut}
                  className="mt-2 border border-green-700/40 rounded px-3 py-1 hover:bg-green-900/20"
                >
                  sign out
                </button>
              </>
            ) : (
              <div className="text-green-200/70">not signed in</div>
            )}
          </div>
        </header>

        {/* Layout: main left, leaderboard right */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          {/* LEFT: main content */}
          <div>
            {/* Login block (only if logged out) */}
            {!userEmail ? (
              <section className="mb-6 border border-green-700/40 rounded-lg p-4 grid gap-3 max-w-xl">
                <div className="text-sm text-green-200/80">access terminal</div>

                <button
                  onClick={signInWithGoogle}
                  className="border border-green-700/40 rounded px-3 py-2 text-sm hover:bg-green-900/20"
                >
                  sign in with google
                </button>

                <div className="text-xs text-green-200/40">or</div>

                <div className="grid gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email for magic link"
                    className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200 placeholder:text-green-200/30"
                  />
                  <button
                    onClick={sendMagicLink}
                    className="border border-green-700/40 rounded px-3 py-2 text-sm hover:bg-green-900/20"
                  >
                    send magic link
                  </button>
                </div>
              </section>
            ) : null}

            {/* New transmission */}
            <section className="mb-6 border border-green-700/40 rounded-lg p-4">
              <div className="text-sm text-green-200/80 mb-3">new transmission</div>

              {!userEmail ? (
                <div className="text-sm text-green-200/50">sign in to submit transmissions.</div>
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
                      onChange={(e) => setSentiment(e.target.value as LogRow["sentiment"])}
                      className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200"
                    >
                      <option value="good">good</option>
                      <option value="neutral">neutral</option>
                      <option value="bad">bad</option>
                    </select>

                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as LogRow["severity"])}
                      className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200"
                    >
                      <option value="info">info</option>
                      <option value="warning">warning</option>
                      <option value="critical">critical</option>
                    </select>

                    <select
                      value={encounter}
                      onChange={(e) => setEncounter(e.target.value as LogRow["encounter"])}
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
                    placeholder="category (e.g., helpful, scam, griefing, etc.)"
                    className="bg-black border border-green-700/40 rounded px-3 py-2 text-green-200 placeholder:text-green-200/30"
                  />

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="details…"
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
                      onClick={() => Promise.all([loadFeed(), loadLeaderboards()])}
                      className="border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20"
                    >
                      refresh
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Feed */}
            <section className="border border-green-700/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-green-200/80">latest logs</div>
                <div className="text-xs text-green-200/50 font-mono">
                  {loadingFeed ? "loading…" : `${logs.length} shown`}
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="text-sm text-green-200/50">no transmissions yet</div>
              ) : (
                <div className="grid gap-3">
                  {logs.map((l) => (
                    <div key={l.id} className="border border-green-700/30 rounded p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-green-200">
                          <Link
                            className="underline decoration-green-700/40 hover:decoration-green-300"
                            href={`/handle/${encodeURIComponent(l.handles?.handle ?? "unknown")}`}
                          >
                            {l.handles?.handle ?? "unknown"}
                          </Link>
                          {l.handles?.platform ? (
                            <span className="text-green-200/50"> • {l.handles.platform}</span>
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

                      <div className="mt-2 text-green-100/90 text-sm">{l.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {status ? <div className="mt-4 text-sm text-green-200/70">{status}</div> : null}
          </div>

          {/* RIGHT: Leaderboard sidebar */}
          <aside className="border border-green-700/40 rounded-lg p-4 sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-green-200/80">watchlist</div>
              <button
                onClick={loadLeaderboards}
                className="text-xs border border-green-700/40 rounded px-2 py-1 hover:bg-green-900/20"
              >
                refresh
              </button>
            </div>

            <div className="grid gap-3">
              <LeaderList
                title="most reported (all time)"
                rows={mostAllTime}
                rightValue={(r) => String(r.reports_total ?? 0)}
              />
              <LeaderList
                title="most new reports (7 days)"
                rows={most7d}
                rightValue={(r) => String(r.reports_7d ?? 0)}
              />
              <LeaderList
                title="today’s heat (24 hours)"
                rows={most24h}
                rightValue={(r) => String(r.reports_24h ?? 0)}
              />
              <LeaderList
                title="nicest (good %)"
                rows={nicest}
                rightValue={(r) => `${r.good_pct ?? 0}%`}
              />

              <div className="text-[11px] text-green-500/60 font-mono">
                note: nicest uses the view’s minimum report rule (ex: 5+).
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
