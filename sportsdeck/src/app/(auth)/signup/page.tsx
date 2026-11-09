"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

const AVATAR_COUNT = 5;

type Team = {
    id: number;
    name: string;
    crest: string;
}

export default function SignUpPage(){

    const router = useRouter();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [avatar, setAvatar] = useState<number | null>(null);
    const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);

    const [teams, setTeams] = useState<Team[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    async function handleSignUp() {
        setError("");

        if (!username || !email || !password || favoriteTeamId === null || avatar === null) {
            setError("Please fill in all fields.");
            return;
        }

        setLoading(true);

        try {

            const res = await fetch("/api/auth/signup", 
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({username, email, password, favoriteTeamId, avatar}),
                }
            );

            const data = await res.json();

            if(!res.ok){
                setError(data.error || "Sign up failed");
                return;
            }
            
            // Stores access token to local storage 
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("user", JSON.stringify(data.user));
            
            window.location.href = "/home";

        } catch(error){
            setError("Unexpected Error occured while signing up.")
        } finally {
            setLoading(false);
        }
    }

    // Fetch team list when loading
    useEffect(
        () => {
            fetch("/api/teams")
            .then(res => res.json())
            .then(data => setTeams(data))
            .catch(() => setError("Failed to load teams"));
        }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme === "dark") {
            document.documentElement.classList.add("dark");
            setIsDarkMode(true);
        } 
        else if (savedTheme === "light") {
            document.documentElement.classList.remove("dark");
            setIsDarkMode(false);
        }
    }, []);
``
    return (
        <>
        <div className="min-h-screen flex items-center justify-center bg-[#f7faf9] dark:bg-[#0a0a0f] px-4 py-8 relative overflow-hidden font-sans">

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
                        <button
                            onClick={() => router.push("/signin")}
                            className="flex-1 py-1.75 rounded-md text-sm font-semibold text-[#6b6b8a] hover:text-[#9090b0] transition-all"
                        >
                            Sign In
                        </button>
                        <button className="flex-1 py-1.5 rounded-md text-sm font-semibold bg-white dark:bg-[#111118] text-[#0f1117] dark:text-[#f0f0f8] shadow-sm transition-all">
                            Sign Up
                        </button>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        {/* Username */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                USERNAME
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter username"
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0f] border border-[#e4e6eb] dark:border-[#1e1e2e] rounded-lg text-[#0f1117] dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                            />
                        </div>

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
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0f] border border-[#e4e6eb] dark:border-[#1e1e2e] rounded-lg text-[#0f1117] dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                            />
                        </div>

                        {/* Avatar Selector */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                CHOOSE AVATAR
                            </label>
                            <button
                                onClick={() => setShowAvatarModal(true)}
                                className="flex items-center gap-3 w-full p-2 rounded-lg border border-[#e4e6eb] dark:border-[#1e1e2e] hover:border-[#9090b0] transition-colors"
                            >
                                {avatar !== null ? (
                                    <img src={`/avatars/avatar_${avatar}.png`} className="w-10 h-10 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[#e4e6eb] dark:bg-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] text-lg">?</div>
                                )}
                                <span className="text-sm text-[#6b6b8a] dark:text-[#9090b0]">
                                    {avatar !== null ? `Avatar ${avatar + 1}` : "Select an avatar"}
                                </span>
                            </button>
                        </div>

                        {/* Favorite Team */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                FAVOURITE TEAM
                            </label>
                            <button
                                onClick={() => setShowTeamModal(true)}
                                className="flex items-center gap-3 w-full p-2 rounded-lg border border-[#e4e6eb] dark:border-[#1e1e2e] hover:border-[#9090b0] transition-colors"
                            >
                                {favoriteTeamId !== null ? (
                                    <img
                                        src={teams.find(t => t.id === favoriteTeamId)?.crest}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[#e4e6eb] dark:bg-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] text-lg">?</div>
                                )}
                                <span className="text-sm text-[#6b6b8a] dark:text-[#9090b0]">
                                    {favoriteTeamId !== null ? teams.find(t => t.id === favoriteTeamId)?.name : "Select your favorite team"}
                                </span>
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="px-3.5 py-2.5 rounded-lg bg-[rgba(255,76,106,0.12)] border border-[rgba(255,76,106,0.3)] text-[#ff4c6a] text-[13px]">
                                {error}
                            </div>
                        )}

                        {/* Sign Up Button */}
                        <button
                            onClick={handleSignUp}
                            disabled={loading}
                            className="w-full py-3 mt-1 rounded-lg font-bold text-[15px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
                            style={{
                                background: loading ? "rgba(0,229,160,0.12)" : "#00e5a0",
                                color: loading ? "#00e5a0" : "#000",
                                animation: loading ? "none" : "glow 3s ease infinite",
                            }}>
                            {loading ? "Creating account..." : "Create Account"}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Select Avatar */}
            {showAvatarModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowAvatarModal(false)}
                >
                    <div
                        className="bg-white dark:bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6 w-[95%] max-w-lg mx-4"
                        style={{ animation: "bounceIn 0.4s ease forwards" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-[#0f1117] dark:text-[#f0f0f8] font-semibold text-base tracking-widest">CHOOSE AVATAR</span>
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="text-[#8b93a7] dark:text-[#6b6b8a] hover:text-[#0f1117] dark:hover:text-[#f0f0f8] transition-colors text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Avatars */}
                        <div className="flex flex-wrap justify-center gap-4">
                            {Array.from({ length: AVATAR_COUNT }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setAvatar(i); setShowAvatarModal(false); }}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden transition-all duration-200 ${
                                        avatar === i
                                            ? "ring-2 ring-[#00e5a0] scale-110"
                                            : "opacity-50 group-hover:opacity-100 group-hover:scale-110"
                                    }`}>
                                        <img
                                            src={`/avatars/avatar_${i}.png`}
                                            alt={`avatar ${i}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="text-[11px] text-[#6b6b8a] group-hover:text-[#0f1117] dark:group-hover:text-[#f0f0f8] transition-colors">
                                        Avatar {i + 1}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Select favorite Team */}
            {/* Select Team Modal */}
            {showTeamModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowTeamModal(false)}
                >
                    <div
                        className="bg-white dark:bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6 w-[95%] max-w-3xl mx-4 max-h-[80vh] overflow-y-auto"
                        style={{ animation: "bounceIn 0.4s ease forwards" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-[#0f1117] dark:text-[#f0f0f8] font-semibold text-base tracking-widest">CHOOSE YOUR TEAM</span>
                            <button
                                onClick={() => setShowTeamModal(false)}
                                className="text-[#8b93a7] dark:text-[#6b6b8a] hover:text-[#f0f0f8] transition-colors text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-8 gap-4">
                            {teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => { setFavoriteTeamId(team.id); setShowTeamModal(false); }}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl p-2 flex items-center justify-center transition-all duration-200 border ${
                                        favoriteTeamId === team.id
                                            ? "border-[#00e5a0] bg-[rgba(0,229,160,0.08)] scale-110"
                                            : "border-[#e4e6eb] dark:border-[#1e1e2e] opacity-60 group-hover:opacity-100 group-hover:scale-110 group-hover:border-[#9090b0]"
                                    }`}>
                                        <img
                                            src={team.crest}
                                            alt={team.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="text-[9px] text-[#8b93a7] dark:text-[#6b6b8a] text-center leading-tight line-clamp-2 group-hover:text-[#0f1117] dark:group-hover:text-[#f0f0f8] transition-colors">
                                        {team.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}

