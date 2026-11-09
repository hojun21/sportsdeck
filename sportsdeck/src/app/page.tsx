"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;

    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4
      bg-[#f7faf9] dark:bg-[#0a0a0f] transition-colors">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] sm:w-[700px] h-[200px] sm:h-[380px] rounded-full opacity-20"
        style={{ background:"radial-gradient(ellipse at center,#00e5a0 0%,transparent 70%)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">

        {/* Logo */}
        <div className="mb-6 sm:mb-8 animate-[logoFloat_3s_ease-in-out_infinite]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center
          bg-[#e6f7f1] dark:bg-[#0d1a14]
          shadow-[0_0_40px_rgba(0,229,160,0.12)]">
            <img
              src={dark ? "/logo-dark.svg" : "/logo-light.svg"}
              alt="SportsDeck"
              className="w-8 h-8"
            />
          </div>
        </div>

        {/* Badge */}
        <div className="mb-4 px-3 py-1 rounded-full text-[11px] font-semibold
        bg-green-100 text-green-700
        dark:bg-[rgba(0,229,160,0.08)] dark:text-[#00e5a0]">
          Premier League Forum
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-4xl font-bold mb-3 text-[#0d1117] dark:text-[#f0f0f8]">
          Welcome to <span className="text-[#00a865] dark:text-[#00e5a0]">SportsDeck</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-xs sm:max-w-sm mb-6 sm:mb-10 text-gray-600 dark:text-gray-400 text-xs sm:text-base">
          Discuss matches, follow your club, and stay across every result — all in one place.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">

          <Link
            href="/signup"
            className="px-7 py-3 rounded-xl text-sm font-semibold text-black
            bg-[#00c47a] dark:bg-[#00e5a0]
            hover:scale-[1.02] transition"
          >
            Create account
          </Link>

          <Link
            href="/signin"
            className="px-7 py-3 rounded-xl text-sm font-semibold
            border border-black/10 dark:border-white/10
            text-gray-700 dark:text-gray-300
            hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            Sign in
          </Link>

        </div>

        {/* Guest */}
        <Link
          href="/home"
          className="mt-5 text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          Continue as guest →
        </Link>

        {/* Feature pills */}
        <div className="mt-14 flex flex-wrap justify-center gap-2">
          {[
            { icon: "⚽", label: "Live match scores" },
            { icon: "💬", label: "Fan discussions" },
            { icon: "📊", label: "League standings" },
            { icon: "🔔", label: "Team updates" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px]
              bg-black/5 dark:bg-white/5
              border border-black/10 dark:border-white/10
              text-gray-600 dark:text-gray-400"
            >
              <span>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes logoFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

    </div>
  );
}