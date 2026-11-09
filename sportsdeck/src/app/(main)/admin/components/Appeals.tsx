import { useState, useEffect } from "react";
import { PopupModal } from "@/components/PopupModal";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type AppealQueue = {
    id: number;
    user: {
        id: number;
        username: string;
        isBanned: boolean;
        avatar: number;
    };
    reason: string;
    status: string;
    createdAt: string;
}

const VALID_STATUS = ["APPROVED", "REJECTED"] as const;
type validStatus = typeof VALID_STATUS[number];

export default function Appeals() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [appeals, setAppeals] = useState<AppealQueue[]>([]);
    const [selectedAppealId, setSelectedAppealId] = useState<number | null>(null);
    const [showPopupModal, setShowPopupModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const searchParam = searchParams.get("search") || "";
    const sortOrder = (searchParams.get("sort") as "asc" | "desc") || "desc";
    const page = Number(searchParams.get("page")) || 1;
    const [totalAppeals, setTotalReports] = useState(0);
    const appealsPerPage = 10;

    function showToast(message: string) {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    }

    async function fetchAppeals() {
        try {
            const params = new URLSearchParams(searchParams.toString());
            params.set("limit", String(appealsPerPage));
            const url = `/api/admin/appeal?${params.toString()}`
            const result = await fetchWithAuth(url);
            const data = await result.json();
            setAppeals(data.data ?? []);
            setTotalReports(data.total ?? 0);
        } catch (error) {
            console.error("Failed to fetch appeals:", error)
        }
    }

    async function handleAppealModeration(id: number, status: validStatus) {
        const res = await fetchWithAuth(`/api/admin/appeal/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                statusUpdate: status
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to update appeal");
        }

        fetchAppeals();
    }

    async function banUser(id: number) {
        const result = await fetchWithAuth(`/api/admin/users/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                isBanned: false,
            }),
        });
        if (!result.ok) {
            const err = await result.json();
            throw new Error(err.error || "Failed to unban user");
        }
    }

    useEffect(() => {
        fetchAppeals();
    }, [searchParams]);

    const sortedAppeals = [...appeals].sort((a, b) => {
        if (sortOrder === "desc") {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
    })

    return (
        <div className="min-h-screen px-4 py-2">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-end mb-4 gap-2">
                     {/* Search and filter */}
                    <input
                        type = "text"
                        placeholder = "Search username or reason..."
                        value = {searchParam}
                        onChange = {(e) => {
                            const value = e.target.value;
                            
                            const param = new URLSearchParams(searchParams.toString());
                            if (value) {
                                param.set("search", value);
                            } else {
                                param.delete("search")
                            }

                            // Reset to page 1
                            param.set("page", "1"); 

                            // Update the URL
                            router.replace(`?${param.toString()}`)
                        }}
                        className="w-full max-w-xs px-3 py-1.5 text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] focus:ring-2 focus:ring-[#00a865]/20 dark:focus:ring-[#00e5a0]/20"
                    >
                    </input>

                    <button
                        onClick= {() => {
                            const newSortOrder = sortOrder === "desc" ? "asc" : "desc";

                            const param = new URLSearchParams(searchParams.toString());
                            param.set("sort", newSortOrder);
                            param.set("page", "1");
                            // Update the URL
                            router.replace(`?${param.toString()}`)}
                        }
                        className="text-xs px-3 py-1 rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] cursor-pointer hover:bg-green-100 dark:hover:text-gray-800"
                    >
                        Sort: {sortOrder === "desc" ? "Newest" : "Oldest"}
                    </button>
                </div>
                {sortedAppeals.map((a: AppealQueue) => {
                    return(
                        <div
                            key={a.id}
                            className={`bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 mb-4`}
                        >
                            {/* Display user */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 mt-4">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                                        <img
                                            src={`/avatars/avatar_${a.user.avatar}.png`}
                                            alt="avatar"
                                            className="w-full h-full object-cover"
                                        />
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">
                                        {a.user.username}
                                        </span>
                                </div>

                                <p className="text-xs text-[#8b93a7] dark:text-[#6b6b8a]">
                                    {new Date(a.createdAt).toLocaleString()}
                                </p>
                            </div>

                            <p className="text-[#4b5263] dark:text-[#9090b0] leading-relaxed mb-3">
                                "{a.reason}"
                            </p>

                           <div className="mt-3 border-t border-gray-100 dark:border-[#1e1e2e] pt-3 flex items-center justify-end gap-2">
                                <button 
                                    onClick={async () => {
                                        try{
                                            await handleAppealModeration(a.id, "REJECTED");
                                            showToast("Appeal rejected");
                                        } catch (error: any) {
                                            showToast(error.message || "Failed to reject appeal");
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[rgba(255,76,106,0.2)] bg-[rgba(255,76,106,0.08)] text-red-600 dark:text-[#ff4c6a] hover:bg-[rgba(255,76,106,0.14)]"
                                    >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="6" cy="6" r="4.5"/><path d="M4 4l4 4M8 4l-4 4"/>
                                    </svg>
                                    Reject
                                </button>
                                <button 
                                    onClick={() => {
                                        setSelectedAppealId(a.id)
                                        setSelectedUserId(a.user.id);
                                        setShowPopupModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#00a865]/10 dark:bg-[#00e5a0]/10 border border-[#00a865]/20 dark:border-[#00e5a0]/20 text-[#00a865] dark:text-[#00e5a0] hover:bg-[#00a865]/20 dark:hover:bg-[#00e5a0]/20s"
                                    >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 6l3 3 5-6"/>
                                    </svg>
                                    Approve & unban
                                </button>
                            </div>
                        </div>
                    )
                })}
                {/* Pagination */}
                <div className="flex justify-center items-center gap-3 mt-4">
                    <button
                        onClick={() => {
                            const newPage = Math.max(page - 1, 1);

                            const param = new URLSearchParams(searchParams.toString());
                            param.set("page", String(newPage));
                            router.replace(`?${param.toString()}`)
                        }}
                        disabled={page === 1}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-200 disabled:dark:hover:border-[#1e1e2e]
                        border-gray-200 dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0]
                        hover:border-[#00a865] hover:text-[#00a865] dark:hover:border-[#00e5a0] dark:hover:text-[#00e5a0]"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2L4 6l4 4"/>
                        </svg>
                        Prev
                    </button>

                    <span className="text-sm font-medium text-[#8b93a7] dark:text-[#6b6b8a] min-w-[60px] text-center">
                        Page {page}
                    </span>

                    <button
                        onClick={() => {
                            const newPage = page + 1;

                            const param = new URLSearchParams(searchParams.toString());
                            param.set("page", String(newPage));
                            router.replace(`?${param.toString()}`)
                        }}
                        disabled={page * appealsPerPage >= totalAppeals}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-200 disabled:dark:hover:border-[#1e1e2e]
                        border-gray-200 dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0]
                        hover:border-[#00a865] hover:text-[#00a865] dark:hover:border-[#00e5a0] dark:hover:text-[#00e5a0]"
                    >
                        Next
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 2l4 4-4 4"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Popup modal that requires confirmation from admin before lifting user's ban */}
           <PopupModal isOpen={showPopupModal} onClose={() => setShowPopupModal(false)}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(0,229,160,0.1)] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#00e5a0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 8l5 5 7-9"/>
                    </svg>
                    </div>
                    <div>
                    <p className="text-[14px] font-semibold text-gray-900 dark:text-[#f0f0f8]">
                        Approve & lift ban
                    </p>
                    <p className="text-[12px] text-[#8b93a7] dark:text-[#6b6b8a]">
                        This will unban the user and close the appeal.
                    </p>
                    </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-[#1e1e2e] mb-4" />

                <div className="flex flex-col gap-2">
                    <button 
                        onClick = {async () => {
                            if (selectedAppealId !== null) {
                                try{
                                    await handleAppealModeration(selectedAppealId, "APPROVED");
                                    await banUser(selectedUserId!)
                                    showToast("Appeal approved!")
                                    setShowPopupModal(false)
                                } catch (error: any) {
                                    setShowPopupModal(false)
                                    showToast(error.message || "Failed to approve appeal")
                                }
                            }
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#00a865]/20 dark:border-[#00e5a0]/20 bg-[rgba(0,229,160,0.08)] text-[13px] font-semibold text-[#00a865] dark:text-[#00e5a0] hover:bg-[rgba(0,229,160,0.14)] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 7l4 4 6-7"/>
                    </svg>
                    Confirm — Approve & Unban
                    </button>
                    <button
                        onClick={() => setShowPopupModal(false)}
                        className="w-full px-4 py-2.5 rounded-lg text-[13px] font-medium text-[#8b93a7] dark:text-[#6b6b8a] hover:bg-gray-50 dark:hover:bg-[#1a1a26] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors"
                    >
                    Cancel
                    </button>
                </div>
            </PopupModal>

            {toast && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="flex items-center gap-3 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-2xl px-5 py-4 shadow-2xl max-w-sm w-full mx-4"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
                >
                {/* Accent dot */}
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#00a865] dark:bg-[#00e5a0]" />

                {/* Message */}
                <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">
                    {toast}
                </p>

                {/* Close */}
                <button
                    onClick={() => setToast(null)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#8b93a7] dark:text-[#6b6b8a] hover:bg-gray-100 dark:hover:bg-[#1e1e2e] hover:text-gray-900 dark:hover:text-[#f0f0f8]"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12"/>
                    </svg>
                </button>
                </div>
            </div>
            )}
        </div>
    );
}