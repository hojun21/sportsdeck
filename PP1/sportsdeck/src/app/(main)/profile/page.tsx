"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

function searchUser(searchInput: string, router: AppRouterInstance) {
    if (searchInput === "") {
        alert("Please enter a username.");
        return;
    }
    fetch("/api/users?username="+searchInput, {}).then(res => res.json()).then(data => {data.error === undefined ? router.push('/profile/'+data.user.id) : alert("User not found. Please ensure the username is spelled correctly and capitialized properly.")})
}

export default function ToOwnProfilePage() {

    const router = useRouter();
    const {user, loading} = useUser();
    const [searchInput, setSearchInput] = useState("");

    useEffect(() => {
        if (!loading && user) {
            router.push("/profile/" + user.id);
        }
    }, [user, loading]);

    if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-top bg-[#0a0a0f]">
                    <div className="text-[#6b6b8a] text-sm">Loading...</div>
                </div>
            );
        }

    if (!loading && !user) {
        return (
            <>
                <div className="min-h-screen px-4 py-8 relative overflow-hidden flex justify-center items-center">
                    {/* BG decorations */}
                    <div
                        className="absolute -top-32 -right-20 w-96 h-96 rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)" }}
                    />
                    <div
                        className="absolute -bottom-20 -left-24 w-80 h-80 rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(76,142,255,0.06) 0%, transparent 70%)" }}
                    />

                    <div className="w-full max-w-lg mx-auto">
                        <p className="text-gray-900 dark:text-[#f0f0f8] font-semibold text-lg">
                            Search Users:
                        </p>
                        <div className="flex gap-3 mt-2">
                            
                            {/* Search Users */}
                            <input type="text" value={searchInput} onChange={(e) => {setSearchInput(e.target.value)}}
                            placeholder="Search user by username" onKeyDown={e => e.key === "Enter" && searchUser(searchInput, router)}
                            className="flex-1 p-2.5 border bg-white dark:bg-[#111118] border-gray-200 rounded-lg dark:border-[#1e1e2e] text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"></input>
                        
                            {/* Search Button */}
                            <button onClick={() => searchUser(searchInput, router)}
                                className="p-2.5 rounded-lg text-sm  text-[#00e5a0] font-semibold border border-[#00e5a0] hover:bg-[rgba(0,229,160,0.08)] transition-colors">
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    
    return redirect("/profile/"+user!.id);
}