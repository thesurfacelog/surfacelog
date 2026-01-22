"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type LogRow = {
  id: string;
  handle_id: string;
  sentiment: "good" | "neutral" | "bad";
  severity: "info" | "warning" | "critical";
  encounter: "raid" | "squad" | "trade" | "other";
  category: string;
  description: string;
  created_at: string;
  handles: {
    handle: string;
    platform: string | null;
  } | null;
};

export default function Page() {
  // auth
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // feed
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [status, setStatus] = useState("");

  // credibility markers
  const [isFirstTimePoster, setIsFirstTimePoster] = useState(false);
  const [sightingsByHandleId, setSightingsByHandleId] = useState<Record<string, number>>({});

  // login form
  const [email, setEmail] = useState("");

  // search
  const [searchHandle, setSearchHandle] = useState("");

  // new transmission form
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<string>("PC");
  const [sentiment, setSentiment] = useState<"good" | "neutral" | "bad">("neutral");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");
  const [encounter, setEncounter] = useState<"raid" | "squad" | "trade" | "other">("other");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const prettyEmail = useMemo(() => (userEmail ? `signed in as ${userEmail}` : "public feed"), [userEmail]);

  const loadPosterStats = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setIsFirstTimePoster(false);
      return;
    }

    const { count, error } = await supabase
      .from("logs")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);

    if (error) {
      setIsFirstTimePoster(false);
      return;
    }

    setIsFirstTimePoster((count ?? 0) === 0);
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

    const rows: LogRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      handle_id: r.handle_id,
      sentiment: r.sentiment,
      severity: r.severity,
      encounter: r.encounter,
      category: r.category,
      description: r.description,
      created_at: r.created_at,
      handles: r.handles
        ? {
            handle: r.handles.handle,
            platform: r.handles.platform,
          }
        : null,
    }));

    setLogs(rows);

    // repeat sightings counts
    const handleIds = Array.from(new Set(rows.map((r) => r.handle_id).filter(Boolean)));

    if (handleIds.length > 0) {
      const { data: countsData } = await supabase
        .from("handle_counts")
        .select("handle_id, sightings")
        .in("handle_id", handleIds);

      const map: Record<string, number> = {};
      (countsData ?? []).forEach((c: any) => {
        map[c.handle_id] = c.sightings;
      });

      setSightingsByHandleId(map);
    }
  };

  useEffect(() => {
    // initial session check
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
    });

    // listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      // refresh badge + feed on auth transitions
      loadPosterStats();
      loadFeed();
    });

    // initial data load
    loadFeed();
    loadPosterStats();

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMagicLink = async () => {
    setStatus("");
    const e = email.trim();
    if (!e) return;

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        // IMPORTANT: set this to your deployed domain later
        // For local dev, omit it so Supabase uses its default
      },
    });

    if (error) {
      setStatus(`Login error: ${error.message}`);
      return;
    }

    setStatus("Check your email for the login link.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const submitLog = async () => {
    setStatus("");

    const h = handle.trim();
    if (!h) {
      setStatus("Handle is required.");
      return;
    }
    if (!description.trim()) {
      setStatus("Description is required.");
      return;
    }

    setSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setSubmitting(false);
      setStatus("You must be signed in to transmit.");
      return;
    }

    // 1) ensure handle exists (case-insensitive match)
    const { data: existingHandle, error: handleErr } = await supabase
      .from("handles")
      .select("id, handle, platform")
      .ilike("handle", h)
      .maybeSingle();

    if (handleErr) {
      setSubmitting(false);
      setStatus(`Handle lookup error: ${handleErr.message}`);
      return;
    }

    let handleId = existingHandle?.id as string | undefined;

    if (!handleId) {
      const { data: newHandle, error: createHandleErr } = await supabase
        .from("handles")
        .insert([{ handle: h, platform }])
        .select("id")
        .single();

      if (createHandleErr) {
        setSubmitting(false);
        setStatus(`Handle create error: ${createHandleErr.message}`);
        return;
      }

      handleId = newHandle.id;
    }

    // 2) insert log
    const { error: logErr } = await supabase.from("logs").insert([
      {
        handle_id: handleId,
        sentiment,
        severity,
        encounter,
        category: category.trim(),
        description: description.trim(),
        created_by: userId,
      },
    ]);

    setSubmitting(false);

    if (logErr) {
      setStatus(`Transmit error: ${logErr.message}`);
      return;
    }

    // reset
    setHandle("");
    setCategory("");
    setDescription("");
    setSentiment("neutral");
    setSeverity("info");
    setEncounter("other");

    setStatus("Transmission sent.");

    // refresh markers + feed
    loadPosterStats();
    loadFeed();
  };

  const goSearch = () => {
    const q = searchHandle.trim();
    if (!q) return;
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  };

  return (
    <main className="min-h-screen bg-black text-green-400 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-mono tracking-wide">THE SURFACE LOG</h1>
            <p className="mt-2 font-mono text-sm text-green-200/70">{prettyEmail}</p>
          </div>

          <div className="flex items-center gap-3">
            {userEmail ? (
              <button
                onClick={signOut}
                className="font-mono text-sm border border-green-700/50 rounded-md px-3 py-2 hover:bg-green-900/20 transition"
              >
                sign out
              </button>
            ) : null}
          </div>
        </header>

        {/* Search */}
        <div className="mt-4 max-w-md">
          <div className="flex gap-2">
            <input
              value={searchHandle}
              onChange={(e) => setSearchHandle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goSearch();
              }}
              placeholder="search handle…"
              className="flex-1 bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
            />
            <button
              onClick={goSearch}
              className="border border-green-700/50 rounded-md px-4 py-2 font-mono hover:bg-green-900/20 transition"
            >
              search
            </button>
          </div>
        </div>

        {/* Divider (space + scan-glow) */}
        <div className="my-8 h-8 relative overflow-visible">
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 border-t border-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-[2px] bg-green-100 blur-[2px] scan-glow" />
        </div>

        {/* Login / Access terminal */}
        {!userEmail && (
          <section className="mb-8 grid gap-3 max-w-md border border-green-700/40 rounded-lg p-4">
            <div className="font-mono text-sm text-green-200/80">access terminal</div>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email address"
              className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
            />

            <button
              onClick={sendMagicLink}
              className="border border-green-700/50 rounded-md px-4 py-2 font-mono hover:bg-green-900/20 transition"
            >
              send login link
            </button>

            <div className="font-mono text-xs text-green-200/60">
              logs are public • transmitting requires login
            </div>
          </section>
        )}

        {/* New Transmission */}
        {userEmail && (
          <section className="mb-10 border border-green-700/40 rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-mono text-xl text-green-200">new transmission</h2>
                {isFirstTimePoster && (
                  <p className="mt-1 font-mono text-xs text-green-200/70">
                    first transmission • keep it factual
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="handle"
                className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
                >
                  <option value="PC">PC</option>
                  <option value="PS">PS</option>
                  <option value="XBOX">XBOX</option>
                  <option value="OTHER">OTHER</option>
                </select>

                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
                >
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={sentiment}
                  onChange={(e) => setSentiment(e.target.value as any)}
                  className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
                >
                  <option value="good">good</option>
                  <option value="neutral">neutral</option>
                  <option value="bad">bad</option>
                </select>

                <select
                  value={encounter}
                  onChange={(e) => setEncounter(e.target.value as any)}
                  className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
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
                placeholder="category (short label)"
                className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="describe what happened…"
                rows={4}
                className="bg-black border border-green-700/50 rounded-md p-2 text-green-200 font-mono"
              />

              <button
                onClick={submitLog}
                disabled={submitting}
                className="border border-green-700/50 rounded-md px-4 py-2 font-mono hover:bg-green-900/20 transition disabled:opacity-50"
              >
                {submitting ? "transmitting…" : "transmit"}
              </button>
            </div>
          </section>
        )}

        {/* Feed */}
        <section className="border border-green-700/40 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-lg text-green-200">live feed</h2>
            <div className="font-mono text-sm text-green-200/70">
              {loadingFeed ? "loading…" : `${logs.length} shown`}
            </div>
          </div>

          {status && <p className="font-mono text-sm text-green-200/80 mb-4">{status}</p>}

          <div className="grid gap-3">
            {logs.map((l) => (
              <article key={l.id} className="border border-green-700/30 rounded-md p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-mono">
                    <div className="text-green-200">
                      <Link
                        href={`/handle/${encodeURIComponent(l.handles?.handle ?? "unknown")}`}
                        className="hover:underline"
                      >
                        {l.handles?.handle ?? "unknown"}
                      </Link>
                      {l.handles?.platform ? (
                        <span className="text-green-200/60"> • {l.handles.platform}</span>
                      ) : null}
                    </div>
                    <div className="text-green-200/60 text-sm">
                      {new Date(l.created_at).toLocaleString()}
                    </div>
                    <div className="font-mono text-xs text-green-200/60 mt-1">
                      sightings: {sightingsByHandleId[l.handle_id] ?? 1}
                    </div>
                  </div>

                  <div className="font-mono text-sm text-green-200/80 text-right">
                    {l.severity} • {l.sentiment}
                    <div className="text-green-200/60">{l.encounter} • {l.category}</div>
                  </div>
                </div>

                <p className="mt-3 text-green-200/90 whitespace-pre-wrap">{l.description}</p>
              </article>
            ))}

            {!loadingFeed && logs.length === 0 && (
              <div className="font-mono text-green-200/70">no transmissions yet</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
