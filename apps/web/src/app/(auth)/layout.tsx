import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-between selection:bg-white/20 selection:text-white">
      {/* Top Bar */}
      <header className="w-full px-6 h-16 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/20">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-950 font-bold text-lg">
            1
          </div>
          <span className="font-bold text-lg tracking-tight">OneLink</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Secure Connection</span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-zinc-600 border-t border-white/5">
        © 2026 OneLink. Sub-50ms Edge Performance.
      </footer>
    </div>
  );
}
