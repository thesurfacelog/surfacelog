"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SupportClient() {
  const searchParams = useSearchParams();
  const showThanks = searchParams.get("thanks") === "1";

  return (
    <main className="min-h-screen bg-black text-green-300 font-mono px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl tracking-widest">SUPPORT THE PROJECT</h1>

        {showThanks && (
          <div className="mt-4 border border-green-700/40 rounded bg-green-900/10 p-4 text-sm text-green-200">
            Support received.
            <br />
            The Surface Log remains active and community-driven.
            <br />
            Thank you.
          </div>
        )}

        <div className="mt-4 rounded border border-green-700/30 bg-black/60 p-4 text-sm text-green-200/70 leading-relaxed">
          <p>
            The Surface Log is an independent community project. If you find it useful and want to
            help cover hosting and development, support is appreciated — never required.
          </p>

          <div className="mt-4 flex gap-2 flex-wrap">
            <a
              href="https://ko-fi.com/thesurfacelog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20 transition"
            >
              support the project →
            </a>

            <Link
              href="/rules"
              className="inline-block border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20 transition"
            >
              view rules →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
