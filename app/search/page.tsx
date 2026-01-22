import { Suspense } from "react";
import SearchClient from "./search-client";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-green-400 p-6 font-mono">
          <div className="mx-auto max-w-5xl">scanning transmissions…</div>
        </main>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
