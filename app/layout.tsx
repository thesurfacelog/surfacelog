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

          {/* Single footer disclaimer */}
          <footer className="bg-black border-t border-green-700/40 text-green-300/70 text-xs font-mono px-4 py-3 text-center">
            The Surface Log is an independent, community-driven project and is not affiliated with,
            endorsed by, or sponsored by Embark Studios, ARC Raiders, or any associated entities.
            This site does not represent official moderation, enforcement, or player conduct systems.
          </footer>

        </div>
      </body>
    </html>
  );
}
