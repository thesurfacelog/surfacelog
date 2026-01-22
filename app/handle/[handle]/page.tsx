"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type HandleRow = {
  id: string;
  handle: string;
  platform: string | null;
  handle_normalized: string | null;
};

type LogRow = {
  id: string;
  handle_id: string;
  sentiment: "good" | "neutral" | "bad";
  severity: "info" | "warning" | "critical";
  encounter: "raid" | "squad" | "trade" | "other";
  category: string;
  description: string;
  created_at: string;
  handles: HandleRow | null;
};

function normalizeHandle(input: string) {
  // lower + trim + remove spaces/._- (keeps letters/numbers/# etc)
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s._-]+/g, "");
}

export default function HandlePage() {
  const params = useParams<{ handle: string }>();
  const rawHandle = params?.handle ?? "";

  const decodedHandle = useMemo(() => {
    try {
      return decodeURIComponent(rawHandle);
    } catch {
      return rawHandle;
    }
  }, [rawHandle]);

  const normalizedKey = useMemo(() => normalizeHandle(decodedHandle), [decodedHandle]);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setStatus("");
      setLogs([]);

      if (!decodedHandle || !normalizedKey) {
        setStatus("No handle provided.");
        setLoading(false);
        return;
      }

      // Pull logs by joining handles and matching handle_normalized
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
          handles:handle_id!inner (
            id,
            handle,
            platform,
            handle_normalized
          )
        `
        )
        .eq("handles.handle_normalized", normalizedKey)
        .order("created_at", { ascending: false });

      if (error) {
        setStatus(`Logs error: ${error.message}`);
        setLoading(false);
        return;
      }

      const cleaned: LogRow[] = (data ?? []).map((r: any) => ({
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
      setLoading(false);
    };

    run();
  }, [decodedHandle, normalizedKey]);

  const displayName = useMemo(() => {
    // show the most common exact handle spelling from returned logs, otherwise the URL handle
    if (logs.length === 0) return decodedHandle || "unknown";

    const counts = new Map<string, number>();
    for (const l of logs) {
      const name = l.handles?.handle ?? decodedHandle;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    let best = decodedHandle;
    let bestCount = 0;
    for (const [name, c] of counts.entries()) {
      if (c > bestCount) {
        best = name;
        bestCount = c;
      }
    }
    return best || decodedHandle || "unknown";
  }, [logs, decodedHandle]);

  const platformLabel = useMemo(() => {
    const platforms = Array.from(
      new Set(logs.map((l) => l.handles?.platform).filter(Boolean))
    ) as string[];

    if (platforms.length === 0) return null;
    if (platforms.length === 1) return platforms[0];
    return "multiple";
  }, [logs]);

  return (
    <main className="min-h-screen bg-black text-green-400 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <Link href="/" className="font-mono text-sm text-green-200/80 hover:text-green-200">
            ← back to feed
          </Link>

          <h1 className="mt-3 text-4xl font-mono tracking-wide">{displayName}</h1>

          <div className="mt-2 font-mono text-sm text-green-200/70">
            {platformLabel ? `platform: ${platformLabel} • ` : ""}
            sightings: {loading ? "…" : logs.length}
            {" • "}
            signature: {normalizedKey || "—"}
          </div>
        </header>

        {status && (
          <div className="mb-4 font-mono text-sm text-green-200/80 border border-green-700/30 rounded-md p-3">
            {status}
          </div>
        )}

        <section className="border border-green-700/40 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-lg text-green-200">transmissions</h2>
            <div className="font-mono text-sm text-green-200/70">
              {loading ? "loading…" : `${logs.length} shown`}
            </div>
          </div>

          <div className="grid gap-3">
            {logs.map((l) => (
              <article key={l.id} className="border border-green-700/30 rounded-md p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-mono text-sm text-green-200/80">
                    {new Date(l.created_at).toLocaleString()}
                    {l.handles?.platform ? (
                      <span className="text-green-200/60"> • {l.handles.platform}</span>
                    ) : null}
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
              <div className="font-mono text-green-200/70">
                no transmissions found for “{decodedHandle}”
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
