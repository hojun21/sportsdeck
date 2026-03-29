"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    async function handleSignIn() {
        setError("");
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);

        try {

            const res = await fetch("/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || "Sign in failed.");
                return;
            }

            // Stores access token to local storage
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("user", JSON.stringify(data.user));
            window.dispatchEvent(new Event("auth-change"));
            // Redirects to main page
            window.location.href = "/home";

        } catch {
            setError("Unexpected error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const nextIsDark = savedTheme ? savedTheme === "dark" : prefersDark;
        setIsDarkMode(nextIsDark);
        document.documentElement.classList.toggle("dark", nextIsDark);
    }, []);
    
    return (
        <>
        <div className="min-h-screen flex items-center justify-center bg-[#f7faf9] dark:bg-[#0a0a0f] px-4 py-8 relative overflow-hidden font-sans">
            {/* BG decorations */}
            <div
                className="absolute -top-32 -right-20 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)" }}
            />
            <div
                className="absolute -bottom-20 -left-24 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(76,142,255,0.06) 0%, transparent 70%)" }}
            />

            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2.5 mb-2">
                        <img
                            src={isDarkMode ? "/logo-dark.svg": "/logo-light.svg"}
                            alt="SportsDeck logo"
                            className="w-8 h-8 transition-transform duration-200 group-hover:scale-105"
                        />
                        <span className="text-[28px] font-sans font-bold tracking-[2px] text-[#0f1117] dark:text-[#f0f0f8] text-gray-800">
                            SPORTS DECK
                        </span>
                    </div>
                    <p className="text-[#6b6b8a] text-[13px]">Your home for EPL discourse</p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-[#111118] border border-[#e4e6eb] dark:border-[#1e1e2e] rounded-xl p-6"
                style={{
                        boxShadow: isDarkMode
                            ? "0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)"
                            : "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
                    }}
                >
                    {/* Tabs */}
                    <div className="flex bg-gray-100 dark:bg-[#0a0a0f] rounded-lg p-[py-1.75] mb-6">
                        <button className="flex-1 py-1.5 rounded-md text-sm font-semibold bg-white dark:bg-[#111118] text-[#0f1117] dark:text-[#f0f0f8] shadow-sm transition-all">
                            Sign In
                        </button>
                        <button
                            onClick={() => router.push("/signup")}
                            className="flex-1 py-1.75 rounded-md text-sm font-semibold text-[#6b6b8a] hover:text-[#9090b0] transition-all"
                        >
                            Sign Up
                        </button>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        {/* Email */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                EMAIL
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0f] border border-[#e4e6eb] dark:border-[#1e1e2e] rounded-lg text-[#0f1117] dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                PASSWORD
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                onKeyDown={e => e.key === "Enter" && handleSignIn()}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0f] border border-[#e4e6eb] dark:border-[#1e1e2e] rounded-lg text-[#0f1117] dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                            />
                        </div>

                        {/* Show error message */}
                        {error && (
                            <div className="px-3.5 py-2.5 rounded-lg bg-[rgba(255,76,106,0.12)] border border-[rgba(255,76,106,0.3)] text-[#ff4c6a] text-[13px]">
                                {error}
                            </div>
                        )}

                        {/* Sign In Button */}
                        <button
                            onClick={handleSignIn}
                            disabled={loading}
                            className="w-full py-3 mt-1 rounded-lg font-bold text-[15px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
                            style={{
                                background: loading ? "rgba(0,229,160,0.12)" : "#00e5a0",
                                color: loading ? "#00e5a0" : "#000",
                                boxShadow: loading ? "none" : "0 4px 16px rgba(0,229,160,0.25)",
                            }}
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-px bg-[#e4e6eb] dark:bg-[#1e1e2e]" />
                            <span className="text-[12px] text-[#adb4c2] dark:text-[#6b6b8a]">or</span>
                            <div className="flex-1 h-px bg-[#e4e6eb] dark:bg-[#1e1e2e]" />
                        </div>

                        {/* Google Sign in */}
                        <button
                            onClick={() => signIn("google", { callbackUrl: "/home" })}
                            className="w-full py-2.5 rounded-lg border border-[#e4e6eb] dark:border-[#1e1e2e] bg-transparent text-[#0f1117] dark:text-[#f0f0f8] text-sm flex items-center justify-center gap-2 hover:border-[#9090b0] transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.3 0 6.2 1.1 8.5 3.2l6.4-6.4C34.9 2.3 29.8 0 24 0 14.6 0 6.6 5.6 2.6 13.7l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
                                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 2.8-2.1 5.1-4.4 6.7l6.8 5.3c4-3.7 6.4-9.2 6.4-16.5z"/>
                                <path fill="#FBBC05" d="M10.4 28.1c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.3l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.6l7.8-6.5z"/>
                                <path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-6.8-5.3c-1.9 1.3-4.4 2.1-9.2 2.1-6.3 0-11.6-4.2-13.5-10l-7.8 6.5C6.6 42.4 14.6 48 24 48z"/>
                            </svg>
                            Continue with Google
                        </button>

                        <button
                            onClick={() => router.push("/home")}
                            className="w-full py-2.5 rounded-lg border border-[#e4e6eb] dark:border-[#1e1e2e] bg-transparent text-[#0f1117] dark:text-[#f0f0f8] text-sm hover:border-[#9090b0] transition-colors">
                            Continue as Guest
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}