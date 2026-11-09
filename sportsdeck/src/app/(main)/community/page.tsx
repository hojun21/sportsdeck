"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Forum = {
    id: number;
    teamId: number | null;
    team: {
        id: number;
        name: string;
        crest: string;
    } | null;
};

export default function CommunityPage() {
    const router = useRouter();
    const [forums, setForums] = useState<Forum[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch forums list 
    useEffect(() => {
        fetch("/api/community")
            .then(res => res.json())
            .then(data => {
                setForums(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen px-4 py-8 relative overflow-hidden">
            <div
                className="absolute -top-32 -right-20 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)" }}
            />
            <div
                className="absolute -bottom-20 -left-24 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(76,142,255,0.06) 0%, transparent 70%)" }}
            />

            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <p className="text-[12px] text-[#6b6b8a] tracking-widest mb-1">FORUMS</p>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-[#f0f0f8]">Community</h1>
                    <p className="text-sm text-[#6b6b8a] mt-1">Pick a forum</p>
                </div>


                {loading ? (
                    <div className="text-[#6b6b8a] text-sm">Loading...</div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {forums.map(forum => (
                            <div
                                key={forum.id}
                                onClick={() => router.push(`/community/${forum.id}`)}
                                className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 cursor-pointer hover:border-[#00e5a0] transition-colors flex items-center gap-4">
                            
                                {/* Add Forum icon */}
                                {forum.team ? (
                                    <img
                                        src={forum.team.crest}
                                        alt={forum.team.name}
                                        className="w-10 h-10 object-contain shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[rgba(0,229,160,0.12)] flex items-center justify-center text-lg shrink-0">
                                        G
                                    </div>
                                )}

                                {/* Forum name card */}
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">
                                        {forum.team ? forum.team.name : "General"} Forum
                                    </p>
                                </div>

                                <span className="text-[#6b6b8a] text-sm">→</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}