import { useState, useEffect } from "react";
import { PopupModal } from "@/components/PopupModal";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type ReportQueue = {
  id: number;
  contentType: string;
  contentBody: string;
  reportedId: number;
  reportedUserName: string;
  reportedUserAvatar: number;
  aiScore: number;
  aiLabel: string;
  aiReason: string;
  reportCount: number;
};

function getScoreStyle(label: string) {
  if (label === "SAFE")
    return {
      bg: "bg-[rgba(0,229,160,0.1)] dark:bg-[rgba(0,229,160,0.1)]",
      text: "text-[#00a865] dark:text-[#00e5a0]",
      bar: "bg-[#00a865] dark:bg-[#00e5a0]",
      label: "Safe",
    };
  if (label === "TOXIC")
    return {
      bg: "bg-[rgba(255,210,70,0.1)] dark:bg-[rgba(255,210,70,0.1)]",
      text: "text-amber-600 dark:text-[#ffd246]",
      bar: "bg-amber-400 dark:bg-[#ffd246]",
      label: "Toxic",
    };
  return {
    bg: "bg-[rgba(255,76,106,0.1)] dark:bg-[rgba(255,76,106,0.1)]",
    text: "text-red-600 dark:text-[#ff4c6a]",
    bar: "bg-red-400 dark:bg-[#ff4c6a]",
    label: "Severe",
  };
}

function getContentStyle(contentType: string) {
  if (contentType === "POST")
    return {
      bg: "bg-[rgba(76,142,255,0.1)]",
      text: "text-blue-600 dark:text-[#4c8eff]",
    };
  if (contentType === "REPLY")
    return {
      bg: "bg-[rgba(168,85,247,0.1)]",
      text: "text-purple-600 dark:text-[#c084fc]",
    };
  return {
    bg: "bg-[rgba(251,146,60,0.1)]",
    text: "text-orange-600 dark:text-[#fb923c]",
  };
}

function truncateWords(text: string, limit: number) {
  const words = text.split(" ");
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "...";
}

export default function Reports() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reports, setReports] = useState<ReportQueue[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [expandedCardId, setExpandedCardId] = useState<Set<number>>(new Set());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedReportedUser, setSelectedReportedUser] = useState<
    number | null
  >(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filter for username, content type, score label
  const searchParam = searchParams.get("search") || "";
  const selectedContentType = searchParams.get("type") || "";
  const selectedScoreLabel = searchParams.get("label") || "";

  // Add pagination
  const page = Number(searchParams.get("page")) || 1;

  const reportsPerPage = 10;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchReports() {
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", String(reportsPerPage));

      const url = `/api/admin/report?${params.toString()}`;
      const result = await fetchWithAuth(url);
      const data = await result.json();
      console.log(data.data);
      setReports(data.data ?? []);
      setTotalReports(data.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    }
  }

  // Get report when filter changes
  useEffect(() => {
    fetchReports();
  }, [searchParams]);

  function toggleCard(cardId: number) {
    setExpandedCardId((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }

  async function handleReportModeration(id: number, isApproved: boolean) {
    const res = await fetchWithAuth(`/api/admin/report/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusUpdate: isApproved ? "APPROVED" : "DISMISSED",
      }),
    });

    if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to update report");
        }

    // Update report queue
    fetchReports();
  }

  async function banUser(id: number) {
    const result = await fetchWithAuth(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isBanned: true,
      }),
    });

    if (!result.ok) {
        const err = await result.json();
        throw new Error(err.error || "Failed to ban user");
    }
  }

  return (
    <div className="min-h-screen px-4 py-2">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4 gap-2">
          {/* Search and filter */}
          <input
            type="text"
            placeholder="Search username or content..."
            value={searchParam}
            onChange={(e) => {
              const value = e.target.value;
              const param = new URLSearchParams(searchParams.toString());
              if (value) {
                param.set("search", value);
              } else {
                param.delete("search");
              }

              param.set("page", "1");
              router.replace(`?${param.toString()}`);
            }}
            className="w-full max-w-xs px-3 py-1.5 text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] focus:ring-2 focus:ring-[#00a865]/20 dark:focus:ring-[#00e5a0]/20"
          ></input>

          <select
            value={selectedContentType ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;

              const param = new URLSearchParams(searchParams.toString());
              if (value) {
                param.set("type", value);
              } else {
                param.delete("type");
              }

              param.set("page", "1");
              router.replace(`?${param.toString()}`);
            }}
            className="px-3 py-1.5 text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] cursor-pointer"
          >
            <option value="">All</option>
            <option value="THREAD">Thread</option>
            <option value="POST">Post</option>
            <option value="REPLY">Reply</option>
          </select>

          <select
            value={selectedScoreLabel ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              const param = new URLSearchParams(searchParams.toString());
              if (value) {
                param.set("label", value);
              } else {
                param.delete("label");
              }

              param.set("page", "1");
              router.replace(`?${param.toString()}`);
            }}
            className="px-3 py-1.5 text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] cursor-pointer"
          >
            <option value="">All</option>
            <option value="SAFE">Safe</option>
            <option value="TOXIC">Toxic</option>
            <option value="SEVERE">Severe</option>
          </select>
        </div>
        {reports.map((r: ReportQueue) => {
          const scoreStyle = getScoreStyle(r.aiLabel);
          const contentTypeStyle = getContentStyle(r.contentType);
          const isExpanded = expandedCardId.has(r.id);
          return (
            <div
              key={r.id}
              className={`bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 mb-4`}
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {/* AI SCORE */}
                  <span
                    className={`${scoreStyle.bg} ${scoreStyle.text} px-2 py-1 rounded text-sm`}
                  >
                    {scoreStyle.label}:{" "}
                    {r.aiScore !== null && r.aiScore !== undefined
                      ? r.aiScore + "%"
                      : "N/A"}
                  </span>

                  {/* TYPE */}
                  <span
                    className={`${contentTypeStyle.bg} ${contentTypeStyle.text} px-2 py-1 rounded text-sm`}
                  >
                    {r.contentType}
                  </span>
                </div>

                <button
                  onClick={() => toggleCard(r.id)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#1e1e2e] items-end"
                >
                  <svg
                    className={`cursor-pointer w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 7l5 5 5-5H5z" />
                  </svg>
                </button>
              </div>

              {/* USER */}
              <div className="flex items-center gap-2 mt-4 mb-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                  <img
                    src={`/avatars/avatar_${r.reportedUserAvatar}.png`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">
                  {r.reportedUserName}
                </span>
              </div>

              <p className="text-md font-normal italic text-[#8b93a7] dark:text-[#6b6b8a] leading-relaxed mb-2">
                "{truncateWords(r.contentBody, 7)}"
              </p>

              {/* REPORT COUNT */}
              <div className="flex items-center gap-1.5 text-[#8b93a7] dark:text-[#6b6b8a]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
                <span className="text-sm">
                  {r.reportCount} user report{r.reportCount !== 1 ? "s" : ""}
                </span>
              </div>

              {/* If toggled */}
              {isExpanded && (
                <div className="mt-4 border-t border-gray-200 dark:border-[#1e1e2e] pt-4 flex flex-col gap-3">
                  {/* FULL POST */}
                  <p className="text-sm uppercase tracking-wide text-[#8b93a7] dark:text-[#6b6b8a] mb-1.5">
                    Full post:
                  </p>
                  <p className="text-[#4b5263] dark:text-[#9090b0] leading-relaxed bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-lg px-3 py-2.5">
                    "{r.contentBody}"
                  </p>

                  {/* TOXICITY SCORE */}
                  <p className="text-sm text-gray-400 mb-1">TOXICITY SCORE:</p>
                  <div className="w-full bg-gray-200 dark:bg-[#1e1e2e] rounded-full h-2 mb-2">
                    <div
                      className={`${scoreStyle.bar} h-2 rounded-full`}
                      style={{ width: `${r.aiScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mb-1">
                    Score: {r.aiScore}/100
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    <span className="font-medium text-gray-400">AI Reason:</span>{" "}
                    {r.aiReason}
                  </div>

                  {/* Buttons to DISMISS/APPROVE report */}
                  <div className="flex gap-8 pt-2 w-full justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReportedUser(r.reportedId);
                        setSelectedReportId(r.id);
                        setShowApproveModal(true);
                      }}
                      className=" cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[rgba(255,210,70,0.1)] border border-[rgba(255,210,70,0.2)] text-amber-600 dark:text-[#ffd246] hover:bg-[rgba(255,210,70,0.18)] transition-colors"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1.5 6.5h10M6.5 1.5v2M6.5 9.5v2M3 3l1.5 1.5M8.5 8.5L10 10M3 10l1.5-1.5M8.5 4.5L10 3" />
                      </svg>
                      Approve Report
                    </button>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await handleReportModeration(r.id, false);
                          showToast("Report dismissed");
                        } catch(error: any) {
                          showToast(error.message || "Failed to dismiss report");
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[rgba(0,229,160,0.08)] border border-[rgba(0,229,160,0.15)] text-[#00a865] dark:text-[#00e5a0] hover:bg-[rgba(0,229,160,0.15)] transition-colors"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 6.5l3.5 3.5 5.5-6" />
                      </svg>
                      Dismiss Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            onClick={() => {
              const newPage = Math.max(page - 1, 1);

              const param = new URLSearchParams(searchParams.toString());
              param.set("page", String(newPage));
              router.replace(`?${param.toString()}`);
            }}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-200 disabled:dark:hover:border-[#1e1e2e]
                        border-gray-200 dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0]
                        hover:border-[#00a865] hover:text-[#00a865] dark:hover:border-[#00e5a0] dark:hover:text-[#00e5a0]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2L4 6l4 4" />
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
              router.replace(`?${param.toString()}`);
            }}
            disabled={page * reportsPerPage >= totalReports}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-200 disabled:dark:hover:border-[#1e1e2e]
                        border-gray-200 dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0]
                        hover:border-[#00a865] hover:text-[#00a865] dark:hover:border-[#00e5a0] dark:hover:text-[#00e5a0]"
          >
            Next
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 2l4 4-4 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confirmation pop up when admin wants to ban user */}
      <PopupModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[rgba(255,210,70,0.1)] flex items-center justify-center flex-shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#ffd246"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v5l3 3" />
              <circle cx="8" cy="8" r="6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">
              Valid report — take action
            </p>
            <p className="text-sm text-[#8b93a7] dark:text-[#6b6b8a]">
              Choose how to handle this report
            </p>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-[#1e1e2e] mb-4" />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={async () => {
              if (selectedReportedUser !== null) {
                try {
                  await handleReportModeration(selectedReportId!, true);
                  showToast("Report approved!");
                  setShowApproveModal(false);
                } catch (error: any) {
                  showToast(error.message || "Failed to approve report");
                  setShowApproveModal(false);
                }
              }
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#e4e6eb] dark:border-[#1e1e2e] bg-transparent text-[13px] font-semibold text-[#00a865] dark:text-[#00e5a0] hover:bg-[rgba(0,229,160,0.06)] hover:border-[#00a865]/30 dark:hover:border-[#00e5a0]/30"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 7l4 4 6-7" />
            </svg>
            Approve report
          </button>

          <button
            onClick={async () => {
              if (selectedReportedUser !== null) {
                try {
                  await handleReportModeration(selectedReportId!, true);
                  await banUser(selectedReportedUser);
                  showToast("Successfully approved and banned user!");
                  setShowApproveModal(false);
                } catch (error: any) {
                  showToast(error.message || "Failed to approve report and ban user");
                  setShowApproveModal(false);
                }
              }
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-[rgba(255,76,106,0.25)] bg-[rgba(255,76,106,0.08)] text-[13px] font-semibold text-red-600 dark:text-[#ff4c6a] hover:bg-[rgba(255,76,106,0.14)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7" cy="7" r="5.5" />
              <path d="M5 5l4 4M9 5l-4 4" />
            </svg>
            Approve & ban user
          </button>

          <button
            onClick={() => setShowApproveModal(false)}
            className="w-full px-4 py-2.5 rounded-lg text-[13px] font-medium text-[#8b93a7] dark:text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] hover:bg-gray-50 dark:hover:bg-[#1a1a26]"
          >
            Cancel
          </button>
        </div>
      </PopupModal>

      {toast && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="flex items-center gap-3 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-2xl px-5 py-4 shadow-2xl max-w-sm w-full mx-4"
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
