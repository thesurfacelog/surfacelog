"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
    id: string;
    handle: string;
    platform: string | null;
    handle_normalized: string | null;
  } | null;
};

function normalizeHandle(input: string) {
  return input.toLowerCase().trim().replace(/[\s._-]+/g, "");
}

export default function SearchPage() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";

  const normalizedKey = useMemo(() => normalizeHandle(q), [q]);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setStatus("");
      setLogs([]);

      const query = q.trim();
if (!query) {
  setStatus("Type a handle to search.");
  setLoading(false);
  return;
}

const normalizedKey = query.toLowerCase().trim().replace(/[\s._-]+/g, "");

// 1) find ALL matching handles first
const { data: handleRows, error: handleErr } = await supabase
  .from("handles")
  .select("id, handle, platform, handle_normalized")
  .or(`handle.ilike.%${query}%,handle_normalized.eq.${normalizedKey}`)
  .limit(50);

if (handleErr) {
  setStatus(`Search error: ${handleErr.message}`);
  setLoading(false);
  return;
}

const handleIds = Array.from(new Set((handleRows ?? []).map((h: any) => h.id)));

if (handleIds.length === 0) {
  setLogs([]);
  setStatus("no matches");
  setLoading(false);
  return;
}

// 2) fetch ALL logs for those handle ids
const { data: logsData, error: logsErr } = await supabase
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
      id,
      handle,
      platform,
      handle_normalized
    )
  `
  )
  .in("handle_id", handleIds)
  .order("created_at", { ascending: false })
  .limit(200);

if (logsErr) {
  setStatus(`Search error: ${logsErr.message}`);
  setLoading(false);
  return;
}

// map into your LogRow[]
const cleaned = (logsData ?? []).map((r: any) => ({
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
        id: r.handles.id,
        handle: r.handles.handle,
        platform: r.handles.platform,
        handle_normalized: r.handles.handle_normalized,
      }
    : null,
}));

setLogs(cleaned);
setStatus("");
setLoading(false);

    };

    run();
  }, [q, normalizedKey]);

  return (
    <main className="min-h-screen bg-black text-green-400 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <Link href="/" className="font-mono text-sm text-green-200/80 hover:text-green-200">
            ← back to feed
          </Link>

          <h1 className="mt-3 text-3xl font-mono tracking-wide">search</h1>
          <p className="mt-2 font-mono text-sm text-green-200/70">
            query: <span className="text-green-200">{q || "—"}</span>
          </p>
        </header>

        {status && (
          <div className="mb-4 font-mono text-sm text-green-200/80 border border-green-700/30 rounded-md p-3">
            {status}
          </div>
        )}

        <section className="border border-green-700/40 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-lg text-green-200">results</h2>
            <div className="font-mono text-sm text-green-200/70">
              {loading ? "loading…" : `${logs.length} found`}
            </div>
          </div>

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
                  </div>

                  <div className="font-mono text-sm text-green-200/80 text-right">
                    {l.severity} • {l.sentiment}
                    <div className="text-green-200/60">{l.encounter} • {l.category}</div>
                  </div>
                </div>

                <p className="mt-3 text-green-200/90 whitespace-pre-wrap">{l.description}</p>
              </article>
            ))}

            {!loading && logs.length === 0 && (
              <div className="font-mono text-green-200/70">no matches</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
