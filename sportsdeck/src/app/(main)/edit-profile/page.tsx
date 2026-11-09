"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useUser } from "@/lib/userContext";
import { PopupModal } from "@/components/PopupModal";
const AVATAR_COUNT = 5;

type Team = {
    id: number;
    name: string;
    crest: string;
};

export default function EditProfilePage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [avatar, setAvatar] = useState<number | null>(null);
    const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);

    const [teams, setTeams] = useState<Team[]>([]);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showConfirmLeaveModal, setShowConfirmLeaveModal] = useState(false);

    // Keep track of changes
    const [original, setOriginal] = useState({
        username: "",
        avatar: null as number | null,
        favoriteTeamId: null as number | null,
    })
    
    const isChanged = username!== original.username || avatar !== original.avatar || favoriteTeamId !== original.favoriteTeamId;

    const {user} = useUser();

    useEffect(() => {
        if (!user) return;
        setUsername(user.username);
        setAvatar(user.avatar);
        setFavoriteTeamId(user.favoriteTeamId);

        setOriginal({
            username: user.username,
            avatar: user.avatar,
            favoriteTeamId: user.favoriteTeamId
        });
    }, [user]);

    useEffect(() => {
        fetch("/api/teams")
            .then(res => res.json())
            .then(data => setTeams(data))
            .catch(() => {});
    }, []);

    async function handleSave() {
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            const res = await fetchWithAuth("/api/users/me", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, avatar, favoriteTeamId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to update profile.");
                return;
            } else {
                if (res.ok) {
                    window.dispatchEvent(new Event("auth-change"));
                    setSuccess("Profile updated!");
                    setTimeout(() => router.push("/profile"), 1000);
                }
            }
            setSuccess("Profile updated!");
            setTimeout(() => router.push("/profile"), 1000);
        } catch {
            setError("Unexpected error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
        <div className="min-h-screen px-4 py-8 relative overflow-hidden flex justify-center items-center font-sans">
            {/* BG decorations */}
            <div
                className="absolute -top-32 -right-20 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)" }}
            />
            <div
                className="absolute -bottom-20 -left-24 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(76,142,255,0.06) 0%, transparent 70%)" }}
            />

            <div className="w-full max-w-sm mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => {
                            if (isChanged) {
                                setShowConfirmLeaveModal(true);
                                return;
                            }
                            router.back()
                        }}
                        className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors text-sm flex items-center gap-1"
                    >
                        ← Back
                    </button>
                    <span className="text-[11px] text-[#6b6b8a] tracking-widest">EDIT PROFILE</span>
                    <div className="w-12" />
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-6">
                    <div className="flex flex-col gap-4">

                        {/* Username */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                USERNAME
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                            />
                        </div>

                        {/* Avatar */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                AVATAR
                            </label>
                            <button
                                onClick={() => setShowAvatarModal(true)}
                                className="flex items-center gap-3 w-full p-2 rounded-lg border border-gray-200 dark:border-[#1e1e2e] hover:border-[#9090b0] transition-colors"
                            >
                                {avatar !== null ? (
                                    <img src={`/avatars/avatar_${avatar}.png`} className="w-10 h-10 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] text-lg">?</div>
                                )}
                                <span className="text-sm text-[#9090b0]">
                                    {avatar !== null ? `Avatar ${avatar + 1} selected` : "Select an avatar"}
                                </span>
                            </button>
                        </div>

                        {/* Favourite Team */}
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">
                                FAVOURITE TEAM
                            </label>
                            <button
                                onClick={() => setShowTeamModal(true)}
                                className="flex items-center gap-3 w-full p-2 rounded-lg border border-gray-200 dark:border-[#1e1e2e] hover:border-[#9090b0] transition-colors"
                            >
                                {favoriteTeamId !== null ? (
                                    <img
                                        src={teams.find(t => t.id === favoriteTeamId)?.crest}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] text-lg">?</div>
                                )}
                                <span className="text-sm text-[#9090b0]">
                                    {favoriteTeamId !== null ? teams.find(t => t.id === favoriteTeamId)?.name : "Select a team"}
                                </span>
                            </button>
                        </div>

                        {/* Error / Success */}
                        {error && (
                            <div className="px-3.5 py-2.5 rounded-lg bg-[rgba(255,76,106,0.12)] border border-[rgba(255,76,106,0.3)] text-[#ff4c6a] text-[13px]">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="px-3.5 py-2.5 rounded-lg bg-[rgba(0,229,160,0.12)] border border-[rgba(0,229,160,0.3)] text-[#00e5a0] text-[13px]">
                                {success}
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full py-3 mt-1 rounded-lg font-bold text-[15px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
                            style={{
                                background: loading ? "rgba(0,229,160,0.12)" : "#00e5a0",
                                color: loading ? "#00e5a0" : "#000",
                                animation: loading ? "none" : "glow 3s ease infinite",
                            }}
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Avatar Modal */}
            {showAvatarModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowAvatarModal(false)}
                >
                    <div
                        className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-2xl p-8 w-[95%] max-w-lg mx-4"
                        style={{ animation: "bounceIn 0.4s ease forwards" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-gray-900 dark:text-[#f0f0f8] font-semibold text-base tracking-widest">CHOOSE AVATAR</span>
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors text-xl"
                            >
                                ✕
                            </button>
                        </div>
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
                                        <img src={`/avatars/avatar_${i}.png`} alt={`avatar ${i}`} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[11px] text-[#6b6b8a]">Avatar {i + 1}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Team Modal */}
            {showTeamModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowTeamModal(false)}
                >
                    <div
                        className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-2xl p-6 w-[95%] max-w-3xl mx-4 max-h-[80vh] overflow-y-auto"
                        style={{ animation: "bounceIn 0.4s ease forwards" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-gray-900 dark:text-[#f0f0f8] font-semibold text-base tracking-widest">CHOOSE YOUR TEAM</span>
                            <button
                                onClick={() => setShowTeamModal(false)}
                                className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                            {teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => { setFavoriteTeamId(team.id); setShowTeamModal(false); }}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl p-2 flex items-center justify-center transition-all duration-200 border ${
                                        favoriteTeamId === team.id
                                            ? "border-[#00e5a0] bg-[rgba(0,229,160,0.08)] scale-110"
                                            : "border-gray-200 dark:border-[#1e1e2e] opacity-60 group-hover:opacity-100 group-hover:scale-110 group-hover:border-[#9090b0]"
                                    }`}>
                                        <img src={team.crest} alt={team.name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="text-[9px] text-[#6b6b8a] text-center leading-tight line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-[#f0f0f8] transition-colors">
                                        {team.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
        <PopupModal isOpen={showConfirmLeaveModal} onClose={() => setShowConfirmLeaveModal(false)}>
            <p className="pb-4 text-center font-sans text-gray-800 dark:text-[#f0f0f8]">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="flex justify-center gap-3">
                <button
                onClick={() => setShowConfirmLeaveModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-green-600 dark:text-[#6b6b8a] dark:hover:text-[#00e5a0]"
                >
                Stay
                </button>
                <button
                onClick={() => {
                    setShowConfirmLeaveModal(false)
                    router.back();
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                >
                Leave
                </button>
            </div>
        </PopupModal>
        </>
    );
}