import { Suspense } from "react";
import SupportClient from "././/SupportClient";

export default function SupportPage() {
  return (
    <Suspense fallback={<SupportFallback />}>
      <SupportClient />
    </Suspense>
  );
}

function SupportFallback() {
  return (
    <main className="min-h-screen bg-black text-green-300 font-mono px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl tracking-widest">SUPPORT THE PROJECT</h1>

        <div className="mt-4 rounded border border-green-700/30 bg-black/60 p-4 text-sm text-green-200/70">
          Loading…
        </div>
      </div>
    </main>
  );
}
