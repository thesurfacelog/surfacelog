import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-black text-green-300 font-mono px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl tracking-widest">SUPPORT THE PROJECT</h1>

        <div className="mt-4 rounded border border-green-700/30 bg-black/60 p-4 text-sm text-green-200/70 leading-relaxed">
          <p>
            The Surface Log is an independent community project. If you find it useful and want to
            help cover hosting and development, support is appreciated — never required.
          </p>

          <div className="mt-4 flex gap-2">
            <a
              href="#"
              className="inline-block border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20 transition"
            >
              support link placeholder
            </a>

            <Link
              href="/rules"
              className="inline-block border border-green-700/40 rounded px-3 py-2 hover:bg-green-900/20 transition"
            >
              view rules →
            </Link>
          </div>

          <div className="mt-3 text-xs text-green-200/50">
            (You can swap the placeholder with Ko-fi/Stripe when you’re ready.)
          </div>
        </div>
      </div>
    </main>
  );
}
