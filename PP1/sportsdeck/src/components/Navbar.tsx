"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PopupModal } from "./PopupModal";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useUser } from "@/lib/userContext";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const { user, loading, setUser } = useUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextIsDark = savedTheme ? savedTheme === "dark" : prefersDark;
    setIsDarkMode(nextIsDark);
    document.documentElement.classList.toggle("dark", nextIsDark);
  }, []);

  async function handleSignOut() {
    await fetchWithAuth("/api/auth/signout", { method: "POST" });
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
    await signOut({ callbackUrl: "/signin" });
}

  function toggleDarkMode() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    // document.body.classList.toggle("dark", next); 
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  
  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-md px-0.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-sm transition-colors ${
        pathname === href
          ? "bg-green-50 text-green-600"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
    <nav
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "border-b border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-md"
          : "border-b border-gray-100 bg-white dark:border-[#1e1e2e] dark:bg-[#0d0d12]"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-0.5 sm:px-2 py-4">
        <Link href="/home" className="group flex flex-shrink-0 items-center gap-1 sm:gap-2.5">
          <img
            src={isDarkMode ? "/logo-dark.svg": "/logo-light.svg"}
            alt="SportsDeck logo"
            className="w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-200 group-hover:scale-105"
        />
          <span className="text-xs sm:text-lg font-semibold tracking-tight text-gray-900 dark:text-[#f0f0f8]">SportsDeck</span>
        </Link>

        <div className="flex gap-1 sm:gap-6 font-medium overflow-x-auto whitespace-nowrap no-scrollbar max-w-[50vw] sm:max-w-none">
          {navLink("/home", "Home")}
          {navLink("/matches", "Matches")}
          {navLink("/community", "Community")}
          {!user && navLink("/profile", "Profiles")}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-4 text-xs sm:text-sm">
          {!loading && !user && <Link href="/signin" className="text-xs sm:text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-[#6b6b8a] dark:hover:text-[#f0f0f8]">Sign In</Link>}

          {user && (
            <>
        
              <Link href="/profile" className="flex-shrink-0">
                <img
                  src={`/avatars/avatar_${user.avatar}.png`}
                  alt={`${user.username} avatar`}
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full"
                  title={user.username}
                />
              </Link>

              {user.role === "ADMIN" && <Link href="/admin" className = "text-gray-600 transition-colors hover:text-gray-900 dark:text-[#6b6b8a] dark:hover:text-[#f0f0f8] text-[9px] sm:text-sm">Admin</Link>}

              <button
                onClick={() => setShowSignOutModal(true)}
                className="text-[9px] sm:text-sm rounded-lg px-0.5 py-1 sm:px-4 sm:py-2 text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-[#6b6b8a] dark:hover:bg-[rgba(255,76,106,0.1)] dark:hover:text-[#ff4c6a]"
              >
                Sign Out
              </button>
            </>
          )}

          <button
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            className="relative flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
          >
            {isDarkMode ? (
              <svg
                className="size-4 sm:size-5 fill-[#6b6b8a] transition-all duration-300 dark:fill-[#9090b0]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm10-8a1 1 0 010 2h-1a1 1 0 110-2h1zM4 11a1 1 0 110 2H3a1 1 0 110-2h1zm14.95-6.36a1 1 0 010 1.41l-.7.71a1 1 0 11-1.42-1.41l.71-.71a1 1 0 011.41 0zM7.17 16.83a1 1 0 010 1.41l-.71.71a1 1 0 01-1.41-1.41l.7-.71a1 1 0 011.42 0zM19.66 19.66a1 1 0 01-1.41 0l-.71-.7a1 1 0 111.41-1.42l.71.71a1 1 0 010 1.41zM6.46 7.17a1 1 0 01-1.41 0l-.71-.71a1 1 0 011.41-1.41l.71.7a1 1 0 010 1.42zM12 7a5 5 0 110 10 5 5 0 010-10z" />
              </svg>
            ) : (

                <svg
                className="size-4 sm:size-5 fill-gray-600 transition-all duration-300 dark:fill-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
              </svg>
              
            )}
          </button>
        </div>
      </div>
    </nav>
    <PopupModal isOpen={showSignOutModal} onClose={() => setShowSignOutModal(false)}>
        <p className="pb-4 text-center font-sans text-gray-800 dark:text-[#f0f0f8]">Are you sure you want to sign out?</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setShowSignOutModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-green-600 dark:text-[#6b6b8a] dark:hover:text-[#00e5a0]"
          >
            Cancel
          </button>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </PopupModal>
      </>
  );
}
