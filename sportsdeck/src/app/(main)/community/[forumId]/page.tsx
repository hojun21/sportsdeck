"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useUser } from "@/lib/userContext";
import { useSearchParams } from "next/navigation";
import { PopupModal } from "@/components/PopupModal";

type Tag = { id: number; name: string };

type Poll = {
    id: number;
    question: string;
    deadline: string;
    options: {
        id: number;
        text: string;
        _count: { votes: number };
    }[];
};

type Thread = {
    id: number;
    title: string;
    createdAt: string;
    author: { id: number; username: string; avatar: number } | null;
    tags: Tag[];
    isBanned: boolean;
    matchId: number | null;
    poll: Poll | null;
};

export default function ForumPage(){
    const PAGE_SIZE = 10;    
    
    const router = useRouter();
    const params = useParams();
    const forumId = params?.forumId as string;

    const [forumName, setForumName] = useState("");
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [forumCrest, setForumCrest] = useState("");
    const [myVotes, setMyVotes] = useState<Record<number, number | null>>({});
    const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [showBannedModal, setShowBannedModal] = useState(false);
    const { user } = useUser();
    const currentUserId = user?.id ?? null;
    const [translatedTitles, setTranslatedTitles] = useState<Record<number, string>>({});
    const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
    const [searchType, setSearchType] = useState("Title");
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: "edit" | "delete" | "report" | null;
        threadId: number | null;
        explanation: string;
    }>({ isOpen: false, type: null, threadId: null, explanation: ""});

    function searchTypePlaceholder() {
        switch(searchType) {
            case "Title": 
                return "Search threads by title." 
            case "Author": 
                return "Search threads by author." 
            case "Teams": 
                return "Search threads by teams. Separate teams with comma (,)"
            case "Tags": 
                return "Search threads by tags. Separate tags with comma (,)"
        }
    }

    async function handleVote(pollId: number, optionId: number, threadId: number, e: React.MouseEvent) {
        e.stopPropagation();
        if (user?.isBanned) { setShowBannedModal(true); return; }
        const token = localStorage.getItem("accessToken");
        if (!token) { router.push("/signin"); return; }
        
        const res = await fetchWithAuth(`/api/polls/${pollId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optionId }),
        });

        if (res.ok) {
            setMyVotes(prev => {
                const current = prev[pollId];
                if (current === optionId) {
                    localStorage.removeItem(`vote_${pollId}`); 
                    return { ...prev, [pollId]: null };
                }
                localStorage.setItem(`vote_${pollId}`, String(optionId)); 
                return { ...prev, [pollId]: optionId };
            });

            const p = new URLSearchParams();
            if (filter) p.set("title", filter);
            const title = searchParams.get("title");
            if (title) p.set("title", title);
            fetchWithAuth(`/api/forums/${forumId}/thread?${p.toString()}`)
                .then(r => r.json())
                .then(data => setThreads(data.threads ?? []));
        }
    }

    useEffect(() => {
        const handleClick = () => setMenuOpenId(null);
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    });

    useEffect(() => {
        fetch("/api/community")
        .then(res => res.json())
        .then(data => {
            const forum = data.find((f: any) => f.id === Number(forumId))
            if(forum){
                setForumName(forum.team?.name ?? "General");
                setForumCrest(forum.team?.crest ?? "");
            }
        })
    }, [forumId]);

    const searchParams = useSearchParams();
    
    useEffect(() => {
        setLoading(true);
        const p = new URLSearchParams();
        const title = searchParams.get("title");
        if (title) p.set("title", title);
        const tags = searchParams.get("tags");
        const author = searchParams.get("author");
        const teams = searchParams.get("teams");
        if (tags) p.set("tags", tags);
        if (author) p.set("author", author);
        if (teams) p.set("teams", teams);

        fetchWithAuth(`/api/forums/${forumId}/thread?${p.toString()}`)
            .then(res => res.json())
            .then(data => {
                setThreads(data.threads ?? []);
                setLoading(false);
                setPage(1);
        })
            .catch(() => setLoading(false));
    }, [forumId, searchParams]);

    useEffect(() => {
        if (threads.length === 0) return;
        const savedVotes: Record<number, number | null> = {};
        threads.forEach(t => {
            if (t.poll) {
                const saved = localStorage.getItem(`vote_${t.poll.id}`);
                if (saved) savedVotes[t.poll.id] = Number(saved);
            }
        });
        setMyVotes(savedVotes);
    }, [threads]);

    const paginated = threads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.ceil(threads.length / PAGE_SIZE);

    const openModal = (type: "edit" | "delete" | "report", id: number) => {
        setConfirmModal({isOpen: true, type, threadId: id, explanation: ""})
        setMenuOpenId(null);
    }

    const handleConfirm = async () => {
        const { type, threadId } = confirmModal;
        if (!threadId) return;

        if (type === "edit") {
            router.push(`/community/${forumId}/threads/${threadId}/edit`);
        } else if (type === "delete") {
            const res = await fetchWithAuth(`/api/forums/${forumId}/thread/${threadId}`, {
                method: "DELETE",
            });
            const p = new URLSearchParams();
            if (filter) p.set("title", filter);
            fetchWithAuth(`/api/forums/${forumId}/thread?${p.toString()}`)
                .then(r => r.json())
                .then(data => setThreads(data.threads ?? []));
            if(res.ok){
                setSuccessMessage("Your thread has been deleted successfully.")
            }
        } else if (type === "report") {
            const res = await fetchWithAuth("/api/users/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentId: threadId,
                    contentType: "THREAD",
                    explanation: confirmModal.explanation,
                }),
            });
            const data = await res.json();
            if(res.ok){
                setSuccessMessage("Your report has been submitted.")
            } else {
                setSuccessMessage(data.error || "Failed to submit report.");
            }
        }
        setConfirmModal({ isOpen: false, type: null, threadId: null, explanation: ""});
        setTimeout(() => setSuccessMessage(null), 2000);
    };

    const runSearch = () => {
        const params = new URLSearchParams();
        if (searchInput.trim()) {
            params.set(searchType, searchInput.trim());
            switch (searchType) {
                case "Title": 
                    params.set("title", searchInput);
                    break;
                case "Author": 
                    params.set("author", searchInput);
                    break;
                case "Teams": 
                    params.set("teams", searchInput);
                    break;
                case "Tags": 
                    params.set("tags", searchInput);
            } 
        }
        router.push(`?${params.toString()}`);
    };
    
    return(
        <>
            <div className="w-full lg:w-[60%] mx-auto flex flex-col p-4">
                
                {/* Banned Modal */}
                <PopupModal isOpen={showBannedModal} onClose={() => setShowBannedModal(false)}>
                    <p className="text-center font-semibold text-gray-900 dark:text-[#f0f0f8] mb-2">Action not allowed</p>
                    <p className="text-center text:xs sm:text-sm text-[#6b6b8a] mb-4">Your account has been banned.</p>
                    <button onClick={() => setShowBannedModal(false)} className="w-full py-2.5 rounded-xl bg-[#00e5a0] text-black text-sm font-semibold">OK</button>
                </PopupModal>

                {/* Forum Info */}
                <div className="flex items-center px-2 py-2 sm:px-4 sm:py-4 gap-1 sm:gap-3">
                    {forumCrest && (
                        <img src={forumCrest} alt="Forum Logo" className="object-contain w-[7%]" />
                    )}
                    <div className="flex flex-col flex-1">
                        <span className="text-gray-500 text-sm sm:text-lg">Forum</span>
                        <span className="text-black font-semibold text-md sm:text-xl">{forumName}</span>    
                    </div>
                    <div className="shrink-0">
                        <button onClick={() => router.back()} className="hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors text-sm sm:text-lg">
                            ← Back
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 sm:gap-3 mt-2">
                    <input type="text" value={searchInput} onChange={(e) => {
                        const value = e.target.value;
                        setSearchInput(value)
                        if (value.trim() === "") {
                            router.push("?")
                        }
                    }}
                    placeholder={searchTypePlaceholder()} 
                    onKeyDown={e => e.key === "Enter" && runSearch()}
                    className="flex-1 px-2 py-1 border bg-white dark:bg-[#111118] border-gray-200 rounded-lg dark:border-[#1e1e2e] text-gray-900 dark:text-[#f0f0f8] text-xs sm:text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"></input>
                
                    <select 
                    value={searchType}
                    onChange={e => setSearchType(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] cursor-pointer">
                        <option value="Title">Title</option>
                        <option value="Author">Author</option>
                        <option value="Teams">Teams</option>
                        <option value="Tags">Tags</option>
                    </select>

                    <button onClick={runSearch}
                        className="px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-lg text-sm text-[#00e5a0] font-semibold border border-[#00e5a0] hover:bg-[rgba(0,229,160,0.08)] transition-colors">
                        Search
                    </button>
                    
                    <button
                        onClick={() => {
                            if(user?.isBanned){
                                setShowBannedModal(true);
                                return;
                            }
                            router.push(`/community/${forumId}/create`);
                        }}
                        className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-[#00e5a0] border border-[#00e5a0] hover:bg-[rgba(0,229,160,0.08)] transition-colors">
                        + New Thread
                    </button>
                </div>
                
                { loading ? (<div className="text-[#6b6b8a] text-sm mt-4">Loading...</div>) : (
                    <div className="flex flex-col gap-3 mt-4">
                        {threads.length === 0 && (
                            <div className="text-[#6b6b8a] text-sm">Thread not found.</div>
                        )}
                        {paginated.map(thread => (
                            <div key={thread.id} 
                            onClick={()=> router.push(`/community/${forumId}/threads/${thread.id}`)} 
                            className="bg-white dark:bg-[#111118] border border-gray-200 mb-3 dark:border-[#1e1e2e] rounded-xl p-4 cursor-pointer hover:border-[#00e5a0] transition-colors">

                                <div className="flex items-center gap-2 mb-2" onClick={e => {e.stopPropagation(); thread.author && router.push(`/profile/${thread.author.id}`);}}>
                                    {!thread.matchId && 
                                        <img
                                        src={`/avatars/avatar_${thread.author?.avatar ?? 0}.png`}
                                        alt={thread.author?.username ?? ""}
                                        className="w-7 h-7 rounded-full object-cover"
                                    />}
                                    <span className="text-[11px] text-[#6b6b8a] font-semibold">
                                        {thread.author ? thread.author.username : "Match thread"}
                                    </span>
                                    <span className="text-[#6b6b8a]">·</span>
                                    <span className="text-[11px] text-[#6b6b8a]">
                                        {new Date(thread.createdAt).toLocaleDateString("en-GB", {
                                            day: "numeric", month: "short", year: "numeric"
                                        })}
                                    </span>
                                
                                    {currentUserId && !thread.matchId && (
                                    <div className="relative ml-auto">
                                        <button onClick={e => { 
                                            e.stopPropagation(); 
                                            setMenuOpenId(menuOpenId === thread.id ? null : thread.id); 
                                        }}>
                                        •••
                                        </button>

                                        {menuOpenId === thread.id && (
                                        <div
                                            className="absolute right-0 top-8 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl shadow-lg z-10 min-w-30 overflow-hidden"
                                            onClick={e => e.stopPropagation()}>
                                            
                                            {currentUserId === thread.author?.id ? (
                                            <>
                                                <button
                                                onClick={e => { 
                                                    e.stopPropagation();
                                                    if(user?.isBanned){ setShowBannedModal(true); return; }
                                                    openModal("edit", thread.id);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-50 dark:hover:bg-[#1e1e2e] transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                onClick={e => { 
                                                    e.stopPropagation();
                                                    if(user?.isBanned){ setShowBannedModal(true); return; }
                                                    openModal("delete", thread.id);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-50 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                            ) : (
                                            <button
                                                onClick={e => { 
                                                e.stopPropagation(); 
                                                openModal("report", thread.id);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors">
                                                    Report
                                            </button>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                    )}
                                </div>

                                <div className="mb-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] line-clamp-2">
                                        {translatedTitles[thread.id] ?? thread.title}
                                    </p>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (translatedTitles[thread.id]) {
                                                setTranslatedTitles(prev => { const n = {...prev}; delete n[thread.id]; return n; });
                                                return;
                                            }
                                            setTranslatingIds(prev => new Set(prev).add(thread.id));
                                            try {
                                                const res = await fetch("/api/translate", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ text: thread.title }),
                                                });
                                                const data = await res.json();
                                                if (data.translated_res) setTranslatedTitles(prev => ({ ...prev, [thread.id]: data.translated_res }));
                                            } catch {}
                                            setTranslatingIds(prev => { const n = new Set(prev); n.delete(thread.id); return n; });
                                        }}
                                        className="text-[10px] text-[#6b6b8a] hover:text-[#00e5a0] transition-colors mt-0.5"
                                    >
                                        {translatingIds.has(thread.id) ? "Translating..." : translatedTitles[thread.id] ? "Show Original" : "Translate"}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-1 justify-end mt-1">
                                    {thread.tags?.map(tag => (
                                        <span key={tag.id} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1e1e2e] text-[#6b6b8a]">
                                            #{tag.name}
                                        </span>
                                    ))}
                                </div>

                                {thread.poll && (
                                    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e]" onClick={e => e.stopPropagation()}>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-2">
                                            🗳️ {thread.poll.question}
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            {thread.poll.options.map(option => {
                                                const totalVotes = thread.poll!.options.reduce((sum, o) => sum + o._count.votes, 0);
                                                const pct = totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        onClick={(e) => handleVote(thread.poll!.id, option.id, thread.id, e)}
                                                        className={`relative w-full text-left px-3 py-2 rounded-lg border overflow-hidden ${
                                                            myVotes[thread.poll!.id] === option.id
                                                                ? "border-[#00e5a0] bg-[rgba(0,229,160,0.08)]"
                                                                : "border-gray-200 dark:border-[#1e1e2e] hover:border-[#00e5a0]"
                                                        }`}>
                                                        <div className="absolute inset-0 bg-[rgba(0,229,160,0.1)] transition-all" style={{ width: `${pct}%` }} />
                                                        <div className="relative flex justify-between items-center">
                                                            <span className="text-sm text-gray-900 dark:text-[#f0f0f8]">{option.text}</span>
                                                            <span className="text-[11px] text-[#6b6b8a]">{pct}%</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[11px] text-[#6b6b8a] mt-2">
                                            Closes {new Date(thread.poll.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}  

                {confirmModal.isOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setConfirmModal({ isOpen: false, type: null, threadId: null, explanation: ""})}
                    >
                        <div
                            className="bg-white dark:bg-[#111118] p-6 rounded-2xl border border-gray-200 dark:border-[#1e1e2e] shadow-2xl w-[90%] max-w-sm"
                            style={{ animation: "bounceIn 0.4s ease forwards" }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-[#f0f0f8] mb-2">Confirmation</h3>
                            <p className="text-sm text-[#6b6b8a] mb-6">
                                Are you sure you want to <span className="font-semibold text-red-500">{confirmModal.type}</span> this thread?
                            </p>
                            {confirmModal.type === "report" && (
                                <textarea value={confirmModal.explanation}
                                onChange={e => setConfirmModal(prev => ({ ...prev, explanation: e.target.value }))}
                                placeholder="Please provide specific reason."
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-[#1e1e2e] bg-gray-50 dark:bg-[#0a0a0f] text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors resize-none h-24 mb-4">   
                                </textarea>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal({ isOpen: false, type: null, threadId: null, explanation: ""})}
                                    className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1e1e2e] text-gray-900 dark:text-[#f0f0f8] font-semibold text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmModal.type === "report" && !confirmModal.explanation.trim()) return;
                                        handleConfirm();
                                    }}
                                    disabled={confirmModal.type === "report" && !confirmModal.explanation.trim()}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-opacity ${
                                        confirmModal.type === "report" && !confirmModal.explanation.trim()
                                            ? "bg-[rgba(0,229,160,0.3)] text-[#0a0a0f] cursor-not-allowed"
                                            : "bg-[#00e5a0] text-[#0a0a0f] hover:opacity-90"
                                    }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg ${
                        successMessage.includes("failed") || successMessage.includes("already") || successMessage.includes("can't")
                            ? "bg-[#ff4c6a] text-white"
                            : "bg-[#00e5a0] text-black"
                    }`}>
                        {successMessage}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 mb-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#1e1e2e] text-sm text-[#6b6b8a] hover:border-[#9090b0] disabled:opacity-40 transition-colors"
                        >
                            ←
                        </button>
                        <span className="text-sm text-[#6b6b8a]">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#1e1e2e] text-sm text-[#6b6b8a] hover:border-[#9090b0] disabled:opacity-40 transition-colors"
                        >
                            →
                        </button>
                    </div>
                )}        
            </div>
        </>
    )
}