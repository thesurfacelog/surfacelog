import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// app/layout.tsx
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-green-200 min-h-screen">
        <div className="min-h-screen flex flex-col">
          
          {/* Main site content */}
          <main className="flex-1">
            {children}
          </main>

          <footer className="bg-black border-t border-green-700/40 text-green-300/70 text-xs font-mono px-4 py-3 text-center">
  <div>
    The Surface Log is an independent, community-driven project and is not affiliated with,
    endorsed by, or sponsored by Embark Studios, ARC Raiders, or any associated entities.
    This site does not represent official moderation, enforcement, or player conduct systems.
  </div>

  <div className="mt-2 text-red-200/60">
    If you find it useful and want to help cover hosting and development costs, support is appreciated.&nbsp;
    <a
      href="/support"
      className="underline hover:text-green-200"
    >
      support the project
    </a>
    .
  </div>
</footer>


        </div>
      </body>
    </html>
  );
}
