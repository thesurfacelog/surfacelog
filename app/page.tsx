"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type FeedRow = {
  id: string;
  sentiment: "good" | "neutral" | "bad";
  severity: "info" | "warning" | "critical";
  encounter: "raid" | "squad" | "trade" | "other";
  category: string;
  description: string;
  created_at: string;
  handle_id: string;
  hidden?: boolean;
  flags_count?: number;
  handles: {
    handle: string;
    platform: string | null;
  } | null;
};

type LeaderRow = {
  handle: string;
  platform: string | null;
  reports_total?: number;
  reports_7d?: number;
  reports_24h?: number;
  good_pct?: number;
};

function LeaderList({
  title,
  rows,
  rightValue,
  accent = "red",
}: {
  title: string;
  rows: LeaderRow[];
  rightValue: (r: LeaderRow) => string;
  accent?: "red" | "green"
}) {
  const titleClass =
    accent === "red" ? "text-red-400/80" : "text-green-200/80";
  const boxClass =
    accent === "red"
      ? "border border-red-700/50 bg-red-950/10 shadow-[0_0_20px_rgba(255,0,0,0.14)]"
      : "border border-green-700/40";

  return (
    //right column
    <div className={`rounded-lg p-3 ${boxClass}`}>
      <div className={`text-xs font-mono mb-2 ${titleClass}`}>{title}</div>

      {rows.length === 0 ? (
        <div className="text-[11px] text-red-400/80">no data yet</div>
      ) : (
        <ol className="text-sm">
          {rows.slice(0, 5).map((r, idx) => (
            <li
              key={`${r.handle}-${idx}`}
              className="flex items-center justify-between gap-3 py-1"
            >
              <span className="truncate">
                {idx + 1}.{" "}
                <Link
                  href={`/handle/${encodeURIComponent(r.handle)}`}
                  className="hover:text-red-300"
                >
                  {r.handle}
                </Link>
                {r.platform ? (
                  <span className="text-xs text-red-400/80">
                    {" "}
                    ({r.platform})
                  </span>
                ) : null}
              </span>
              <span className="text-red-400/80">{rightValue(r)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [logs, setLogs] = useState<FeedRow[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [status, setStatus] = useState("");

  // search
  const [q, setQ] = useState("");

  // leaderboard/watchlist
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [mostAllTime, setMostAllTime] = useState<LeaderRow[]>([]);
  const [most7d, setMost7d] = useState<LeaderRow[]>([]);
  const [most24h, setMost24h] = useState<LeaderRow[]>([]);
  const [nicest, setNicest] = useState<LeaderRow[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [flaggedByMe, setFlaggedByMe] = useState<Set<string>>(new Set());

  const loadMyFlagsForFeed = async (logIds: string[]) => {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;

  if (!uid || logIds.length === 0) {
    setFlaggedByMe(new Set());
    return;
  }

  const { data, error } = await supabase
    .from("log_flags")
    .select("log_id")
    .eq("user_id", uid)
    .in("log_id", logIds);

  if (error) {
    setFlaggedByMe(new Set());
    return;
  }

  setFlaggedByMe(new Set((data ?? []).map((r: any) => String(r.log_id))));
};

  const loadFeed = async () => {
  setLoadingFeed(true);
  setStatus("");

  const { data, error } = await supabase
    .from("logs")
    .select(
      `
      id,
      handle_id,
      sentiment,
      severity,
      encounter,
      category,
      description,
      created_at,
      hidden,
      handles:handle_id (
        handle,
        platform
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(25);

  setLoadingFeed(false);

  if (error) {
    setStatus(`Feed error: ${error.message}`);
    return;
  }

  // ✅ Use a typed variable instead of "as FeedRow[]"
  const rows: FeedRow[] = (data ?? []).map((r: any) => ({
    id: String(r.id),
    handle_id: String(r.handle_id),
    sentiment: r.sentiment,
    severity: r.severity,
    encounter: r.encounter,
    category: String(r.category ?? ""),
    description: String(r.description ?? ""),
    created_at: String(r.created_at),
    hidden: Boolean(r.hidden),
    flags_count: typeof r.flags_count === "number" ? r.flags_count : undefined,
    handles: r.handles
      ? {
          handle: String(r.handles.handle),
          platform: r.handles.platform ? String(r.handles.platform) : null,
        }
      : null,
  }));

  setLogs(rows);
  await loadMyFlagsForFeed(rows.map((x) => x.id));
};

  const loadSession = async () => {
  const { data } = await supabase.auth.getSession();
  setUserEmail(data.session?.user?.email ?? null);
};

  const loadLeaderboards = async () => {
    setLoadingBoards(true);
    setStatus("");


    // NOTE: this assumes you have views/RPCs already wired OR you’re doing these counts elsewhere.
    // If your current build already works, keep these calls consistent with what you have now.
    // I’m using simple query patterns that work with client-side grouping if you don’t have views.

    // ---- A) Most reported (all time)
    const { data: allLogs, error: allErr } = await supabase
      .from("logs")
      .select(
        `
        id,
        created_at,
        sentiment,
        handle_id,
        handles:handle_id ( handle, platform )
      `
      )
      .order("created_at", { ascending: false })
      .limit(5000);

    if (allErr) {
      setStatus(`Watchlist error: ${allErr.message}`);
      setLoadingBoards(false);
      return;
    }

    const rows = (allLogs ?? []) as any[];

    const now = Date.now();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const ms24h = 24 * 60 * 60 * 1000;

    const tallyAll = new Map<string, LeaderRow>();
    const tally7d = new Map<string, LeaderRow>();
    const tally24h = new Map<string, LeaderRow>();
    const niceTally = new Map<
      string,
      { handle: string; platform: string | null; total: number; good: number }
    >();

    for (const r of rows) {
      const h = r.handles?.handle;
      if (!h) continue;
      const p = r.handles?.platform ?? null;
      const key = `${h}|||${p ?? ""}`;

      // all time
      const a = tallyAll.get(key) ?? { handle: h, platform: p, reports_total: 0 };
      a.reports_total = (a.reports_total ?? 0) + 1;
      tallyAll.set(key, a);

      // time windows
      const t = new Date(r.created_at).getTime();
      if (now - t <= ms7d) {
        const b = tally7d.get(key) ?? { handle: h, platform: p, reports_7d: 0 };
        b.reports_7d = (b.reports_7d ?? 0) + 1;
        tally7d.set(key, b);
      }
      if (now - t <= ms24h) {
        const c = tally24h.get(key) ?? { handle: h, platform: p, reports_24h: 0 };
        c.reports_24h = (c.reports_24h ?? 0) + 1;
        tally24h.set(key, c);
      }

      // nicest (good %)
      const n = niceTally.get(key) ?? { handle: h, platform: p, total: 0, good: 0 };
      n.total += 1;
      if (r.sentiment === "good") n.good += 1;
      niceTally.set(key, n);
    }

    const sortedAll = [...tallyAll.values()].sort(
      (x, y) => (y.reports_total ?? 0) - (x.reports_total ?? 0)
    );
    const sorted7d = [...tally7d.values()].sort(
      (x, y) => (y.reports_7d ?? 0) - (x.reports_7d ?? 0)
    );
    const sorted24h = [...tally24h.values()].sort(
      (x, y) => (y.reports_24h ?? 0) - (x.reports_24h ?? 0)
    );

    // “nicest”: only include players with at least 5 reports
    const niceRows: LeaderRow[] = [...niceTally.values()]
      .filter((x) => x.total >= 5)
      .map((x) => ({
        handle: x.handle,
        platform: x.platform,
        good_pct: Math.round((x.good / x.total) * 100),
      }))
      .sort((a, b) => (b.good_pct ?? 0) - (a.good_pct ?? 0));

    setMostAllTime(sortedAll);
    setMost7d(sorted7d);
    setMost24h(sorted24h);
    setNicest(niceRows);

    setLoadingBoards(false);
  };

  useEffect(() => {
    loadFeed();
    loadLeaderboards();
    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange(() => loadSession());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = () => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const feedCountLabel = useMemo(() => `${logs.length} shown`, [logs.length]);

  const flagLog = async (logId: string) => {
  setStatus("");

  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;

  if (!uid) {
    setStatus("Sign in to flag posts.");
    return;
  }

  // UI guard
  if (flaggedByMe.has(logId)) {
    setStatus("You already flagged this post.");
    return;
  }

  const { error } = await supabase.from("log_flags").insert({
    log_id: logId,   // ✅ string
    user_id: uid,
  });

  if (error) {
    if (error.code === "23505") {
      setFlaggedByMe(new Set([...Array.from(flaggedByMe), logId]));
      setStatus("You already flagged this post.");
      return;
    }
    setStatus(`Flag error: ${error.message}`);
    return;
  }

  setFlaggedByMe(new Set([...Array.from(flaggedByMe), logId]));
  await loadFeed();
};

const openDispute = async (logId: string) => {
  setStatus("");

  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;

  if (!uid) {
    setStatus("Sign in to dispute/correct a post.");
    return;
  }

  const msg = window.prompt(
    "What’s wrong with this post, and what should be corrected?"
  );
  if (!msg || !msg.trim()) return;

  const { error } = await supabase.from("log_disputes").insert({
    log_id: logId,   // ✅ string
    user_id: uid,
    message: msg.trim(),
  });

  if (error) {
    setStatus(`Dispute error: ${error.message}`);
    return;
  }

  setStatus("Dispute submitted. Thank you.");
};



  return (
    <main className="min-h-screen bg-black text-green-300 font-mono px-4 py-10">
      <div className="mx-auto max-w-6xl">
        {/* TOP HEADER */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl tracking-widest">THE SURFACE LOG</h1>
            <div className="text-xs text-green-200/70 mt-2">
              community-reported player interactions • verify nothing • log everything
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
  <Link
    href="/new"
    className="text-[16px] font-mono border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20 transition"
  >
    + new transmission
  </Link>

  <div className="text-[11px] text-yellow-400/70 text-right max-w-[160px] leading-snug">
    By posting, you agree to the sites rules and data policy.
    <br />
    <Link
      href="/rules"
      className="underline hover:text-green-300"
    >
      view rules →
    </Link>
  </div>
</div>

        </div>
    
        {/* SEARCH BAR (restored) */}
        <div className="mt-6 max-w-2xl">
          <div className="text-xs text-green-200/70 mb-2">search player handle</div>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
              placeholder="type any part of a name..."
              className="flex-1 bg-black border border-green-700/40 rounded px-3 py-2 outline-none"
            />
            <button
              onClick={doSearch}
              className="border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20"
            >
              search
            </button>
          </div>
        </div>

        {/* ANIMATED DIVIDER (restored) */}
        <div className="my-8 relative overflow-visible">
          <div className="w-full border-t border-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-green-100 blur-[2px] scan-glow" />
        </div>

        {/* MAIN GRID: Latest logs left, watchlist right (same width, aligned) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
          {/* LATEST LOGS */}
          <section className="border border-green-700/40 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-green-200/80">latest logs</div>
              <div className="text-xs text-green-200/60">{feedCountLabel}</div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={loadFeed}
                disabled={loadingFeed}
                className="text-xs border border-green-700/40 rounded px-2 py-1 hover:bg-green-900/20 disabled:opacity-50"
              >
                {loadingFeed ? "loading..." : "refresh feed"}
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-sm text-red-200/60">no transmissions yet</div>
            ) : (
              <div className="grid gap-3">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className="border border-green-700/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate">
                        <Link
                          href={`/handle/${encodeURIComponent(l.handles?.handle ?? "unknown")}`}
                          className="hover:text-green-100"
                        >
                          {l.handles?.handle ?? "unknown"}
                        </Link>
                        {l.handles?.platform ? (
                          <span className="text-xs text-green-200/60">
                            {" "}
                            • {l.handles.platform}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-xs text-green-200/50">
                        {new Date(l.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-green-200/70 flex flex-wrap gap-2">
                      <span>[{l.sentiment}]</span>
                      <span>[{l.severity}]</span>
                      <span>[{l.encounter}]</span>
                      <span>[{l.category}]</span>
                    </div>

                    <div className="mt-2 text-green-100/90 text-sm">
                      {l.description}
                    </div>
                    {/* flag + dispute actions */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <button
                        onClick={() => flagLog(l.id)}
                        disabled={!userEmail || flaggedByMe.has(l.id)}
                        className={`border rounded px-2 py-1 transition
                          ${
                            flaggedByMe.has(l.id)
                              ? "border-red-700/30 text-red-300/40 cursor-not-allowed"
                              : "border-red-700/60 text-red-200 hover:bg-red-900/20"
                          }
                          ${!userEmail ? "opacity-60 cursor-not-allowed" : ""}
                        `}
                          title={
                          !userEmail
                            ? "Sign in to flag"
                            : flaggedByMe.has(l.id)
                            ? "You already flagged this post"
                            : "Flag this post"
                        }
                     >
                        {flaggedByMe.has(l.id) ? "flagged" : "flag"}
                      </button>

                      <button
                        onClick={() => openDispute(l.id)}
                        disabled={!userEmail}
                        className="border border-green-700/40 rounded px-2 py-1 hover:bg-green-900/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        title={!userEmail ? "Sign in to dispute/correct" : "Request correction"}
                      >
                        dispute
                     </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          
          {/*right block */}
          {/* Seperate mini "today's heat" block ABOVE the watchlist */}
            <aside className="border border-red-800/80 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="grid gap-3 text-xs text-red-400/80">{feedCountLabel}</div>
            </div>
            <div className="font-semibold text-[24px] text-red-400/80 gap-2 mb-4"> 
                  🔥 Today's Heat (24 hours)
                  <LeaderList
                    title="today’s heat (24 hours)"
                    rows={most24h}
                    rightValue={(r) => String(r.reports_24h ?? 0)}
                  />
                  </div>
          {/* WATCHLIST (renamed + aligned + same width) */}
          <div className="flex items-center justify-between">
              <div className="font-semibold text-[24px] text-red-400/80 gap-2 mb-2">
              ⚠ Speranza Watchlist
          </div>
          <button onClick={loadLeaderboards}
          disabled={loadingBoards}
          className="text-red-300/60 border border-red-800/80 rounded px-2 py-1 hover:bg-red-300/80 disabled:opacity-50">
            {loadingBoards ? "loading..." : "refresh"}
          </button>
          </div>

            <div className="grid gap-3 text-red-400/60">
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
                title="nicest (good %)"
                rows={nicest}
                rightValue={(r) => `${r.good_pct ?? 0}%`}
              />

              <div className="text-[11px] text-red-300/80">
                note: “nicest” requires at least 5 reports.
              </div>
            </div>
            </aside>
            </div>
        </div>

        {status ? (
          <div className="mt-6 text-xs text-red-300/80">{status}</div>
        ) : null}
    </main>
  );
}
