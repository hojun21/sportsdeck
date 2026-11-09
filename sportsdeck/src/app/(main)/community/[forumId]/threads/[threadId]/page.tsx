"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { PopupModal } from "@/components/PopupModal";

type Tag = { id: number; name: string };
type PollOption = { id: number; text: string; _count: { votes: number } };
type Poll = {
  id: number;
  question: string;
  deadline: string;
  options: PollOption[];
};
type Author = { id: number; username: string; avatar: number };
type FlatReply = {
  id: number;
  content: string;
  createdAt: string;
  author: Author;
  poll: Poll | null;
  parentId: number | null;
  isBanned: boolean;
};
type Reply = FlatReply & { children: Reply[] };
type Post = {
  id: number;
  content: string;
  createdAt: string;
  author: Author | null;
  replies: FlatReply[];
};
type Thread = {
  id: number;
  title: string;
  createdAt: string;
  author: Author | null;
  tags: Tag[];
  isBanned: boolean;
  matchId: number | null;
  isClosed: boolean;
  poll: Poll | null;
  post: Post | null;
};

const REPLIES_PER_PAGE = 5;

function buildTree(replies: FlatReply[]): Reply[] {
  const map: Record<number, Reply> = {};
  const roots: Reply[] = [];
  replies.forEach((r) => {
    map[r.id] = { ...r, children: [] };
  });
  replies.forEach((r) => {
    if (r.parentId === null) roots.push(map[r.id]);
    else if (map[r.parentId]) map[r.parentId].children.push(map[r.id]);
  });
  return roots;
}

function PollBlock({
  poll,
  myVotes,
  onVote,
}: {
  poll: Poll;
  myVotes: Record<number, number | null>;
  onVote: (pollId: number, optionId: number) => void;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);
  const isExpired = new Date(poll.deadline) <= new Date();
  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e]">
      <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-2">
        🗳️ {poll.question}
      </p>
      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const pct =
            totalVotes > 0
              ? Math.round((option._count.votes / totalVotes) * 100)
              : 0;
          const isVoted = myVotes[poll.id] === option.id;
          return (
            <button
              key={option.id}
              onClick={() => !isExpired && onVote(poll.id, option.id)}
              disabled={isExpired}
              className={`relative w-full text-left px-3 py-2 rounded-lg border overflow-hidden transition-colors ${isVoted ? "border-[#00e5a0] bg-[rgba(0,229,160,0.08)]" : "border-gray-200 dark:border-[#1e1e2e] hover:border-[#00e5a0]"} ${isExpired ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <div
                className="absolute inset-0 bg-[rgba(0,229,160,0.1)] transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex justify-between items-center">
                <span className="text-sm text-gray-900 dark:text-[#f0f0f8]">
                  {option.text}
                </span>
                <span className="text-[11px] text-[#6b6b8a]">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[#6b6b8a] mt-2">
        {isExpired ? "Closed" : "Closes"}{" "}
        {new Date(poll.deadline).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

function HistoryPanel({
  isOpen,
  onClose,
  type,
  targetId,
  poll,
  forumId,
  postId,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: "thread" | "reply" | null;
  targetId: number | null;
  poll?: Poll | null;
  forumId?: string;
  postId?: number | null;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !targetId || !type) return;
    setLoading(true);
    setHistory([]);
    if (type === "thread") {
      Promise.all([
        fetch(`/api/forums/${forumId}/thread/${targetId}/history`).then((r) =>
          r.json(),
        ),
        postId
          ? fetch(`/api/posts/${postId}/history`).then((r) => r.json())
          : Promise.resolve({ post_history: [] }),
      ])
        .then(([threadData, postData]) => {
          const combined = [
            ...(threadData.thread_history ?? []).map((h: any) => ({
              ...h,
              historyType: "Title",
            })),
            ...(postData.post_history ?? []).map((h: any) => ({
              ...h,
              historyType: "Content",
            })),
          ].sort(
            (a, b) =>
              new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime(),
          );
          setHistory(combined);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      fetch(`/api/replies/${targetId}/history`)
        .then((r) => r.json())
        .then((data) => {
          setHistory(data.reply_history ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, targetId, type]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      )}
      {isOpen && (
        <div className="fixed top-0 right-0 h-full w-[340px] max-w-[90vw] z-50 bg-white dark:bg-[#111118] border-l border-gray-200 dark:border-[#1e1e2e] shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#1e1e2e]">
            <span className="text-sm font-bold text-gray-900 dark:text-[#f0f0f8] tracking-widest">
              {type === "thread" ? "THREAD HISTORY" : "REPLY HISTORY"}
            </span>
            <button
              onClick={onClose}
              className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] text-lg px-1"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)] px-5 py-4 flex flex-col gap-4">
            {loading && <p className="text-[#6b6b8a] text-sm">Loading...</p>}
            {!loading && history.length === 0 && (
              <p className="text-[#6b6b8a] text-sm">No edit history found.</p>
            )}
            {history.map((item, i) => (
              <div
                key={i}
                className="bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  {item.historyType && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[rgba(0,229,160,0.12)] text-[#00e5a0]">
                      {item.historyType}
                    </span>
                  )}
                  <p className="text-[11px] text-[#6b6b8a]">
                    {new Date(item.editedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {item.title && (
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-1">
                    {item.title}
                  </p>
                )}
                {item.content && (
                  <p className="text-sm text-gray-700 dark:text-[#9090b0] leading-relaxed">
                    {item.content}
                  </p>
                )}
              </div>
            ))}
            {type === "reply" && poll && (
              <div className="mt-2">
                <p className="text-[11px] text-[#6b6b8a] tracking-widest mb-2">
                  CURRENT POLL
                </p>
                <div className="bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-2">
                    🗳️ {poll.question}
                  </p>
                  <div className="flex flex-col gap-1">
                    {poll.options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex justify-between text-sm text-gray-700 dark:text-[#9090b0] px-2 py-1 rounded bg-white dark:bg-[#111118]"
                      >
                        <span>{opt.text}</span>
                        <span className="text-[#6b6b8a] text-[11px]">
                          {opt._count.votes} votes
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#6b6b8a] mt-2">
                    Closes{" "}
                    {new Date(poll.deadline).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PollEditSection({
  initialPoll,
  hadPoll,
  hasPoll,
  setHasPoll,
  question,
  setQuestion,
  options,
  setOptions,
  deadline,
  setDeadline,
}: {
  initialPoll?: Poll | null;
  hadPoll: boolean;
  hasPoll: boolean;
  setHasPoll: (v: boolean) => void;
  question: string;
  setQuestion: (v: string) => void;
  options: string[];
  setOptions: (v: string[]) => void;
  deadline: string;
  setDeadline: (v: string) => void;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 mb-2">
        <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
          {hadPoll ? "POLL (turning off will delete)" : "ADD POLL"}
        </label>
        <button
          onClick={() => setHasPoll(!hasPoll)}
          className={`w-12 h-6 rounded-full transition-colors ${hasPoll ? "bg-[#00e5a0]" : "bg-gray-200 dark:bg-[#1e1e2e]"}`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${hasPoll ? "translate-x-6" : "translate-x-0"}`}
          />
        </button>
      </div>
      {hasPoll && (
        <div
          className={`flex flex-col gap-3 p-3 rounded-xl border bg-[rgba(0,229,160,0.04)] ${hadPoll ? "border-[#ff4c6a]" : "border-[#00e5a0]"}`}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question"
            className="w-full px-3 py-2 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0]"
          />
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    if (!hadPoll)
                      setOptions(
                        options.map((o, idx) =>
                          idx === i ? e.target.value : o,
                        ),
                      );
                  }}
                  disabled={hadPoll}
                  placeholder={`Option ${i + 1}`}
                  className={`flex-1 px-3 py-2 bg-white dark:bg-[#111118] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none transition-colors ${hadPoll ? "border border-[#ff4c6a] opacity-50 cursor-not-allowed" : "border border-gray-200 dark:border-[#1e1e2e] focus:border-[#00e5a0]"}`}
                />
                {!hadPoll && options.length > 2 && (
                  <button
                    onClick={() =>
                      setOptions(options.filter((_, idx) => idx !== i))
                    }
                    className="text-[#ff4c6a] px-2 text-lg"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {!hadPoll && options.length < 10 && (
              <button
                onClick={() => setOptions([...options, ""])}
                className="text-sm text-[#00e5a0] text-left"
              >
                + Add option
              </button>
            )}
          </div>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => {
              if (!hadPoll) setDeadline(e.target.value);
            }}
            disabled={hadPoll}
            className={`w-full px-3 py-2 bg-white dark:bg-[#111118] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none transition-colors ${hadPoll ? "border border-[#ff4c6a] opacity-50 cursor-not-allowed" : "border border-gray-200 dark:border-[#1e1e2e] focus:border-[#00e5a0]"}`}
          />
        </div>
      )}
    </div>
  );
}

function ReplyCard({ reply, postId, depth, isClosed, userId, userIsBanned,
     myVotes, onVote, onSubmitReply, onDelete, onReport, onRefresh, 
     replyingToId, setReplyingToId, replyInputs, setReplyInputs,
      submitting, onNavigate, onBanned }: any) {
  const isOwn = userId === reply.author?.id;
  const maxDepthPx = Math.min(depth * 20, 60);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [translatedReply, setTranslatedReply] = useState<string | null>(null);
  const [isTranslatingReply, setIsTranslatingReply] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hadPoll = !!reply.poll;
  const [hasPoll, setHasPoll] = useState(hadPoll);
  const [pollQuestion, setPollQuestion] = useState(reply.poll?.question ?? "");
  const [pollOptions, setPollOptions] = useState<string[]>(
    reply.poll?.options.map((o: any) => o.text) ?? ["", ""],
  );
  const [pollDeadline, setPollDeadline] = useState(
    reply.poll?.deadline?.slice(0, 16) ?? "",
  );
  const isReplying = replyingToId === reply.id;
  const [replyHasPoll, setReplyHasPoll] = useState(false);
  const [replyPollQuestion, setReplyPollQuestion] = useState("");
  const [replyPollOptions, setReplyPollOptions] = useState(["", ""]);
  const [replyPollDeadline, setReplyPollDeadline] = useState("");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function handleEdit() {
    if (!editContent.trim()) return;
    setEditSubmitting(true);
    const res = await fetchWithAuth(`/api/replies/${reply.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      if (hadPoll && !hasPoll)
        await fetchWithAuth(`/api/polls/${reply.poll.id}`, {
          method: "DELETE",
        });
      else if (hadPoll && hasPoll)
        await fetchWithAuth(`/api/polls/${reply.poll.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_question: pollQuestion }),
        });
      else if (!hadPoll && hasPoll)
        await fetchWithAuth(`/api/replies/${reply.id}/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: pollQuestion,
            deadline: pollDeadline,
            options: pollOptions.filter((o) => o.trim()),
          }),
        });
      setIsEditing(false);
      onRefresh();
    }
    setEditSubmitting(false);
  }

  async function handleReplyWithPoll() {
    const content = replyInputs[reply.id];
    if (!content?.trim()) return;
    const res = await fetchWithAuth(`/api/posts/${postId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId: reply.id }),
    });
    if (res.ok) {
      const data = await res.json();
      if (replyHasPoll && replyPollQuestion.trim() && replyPollDeadline)
        await fetchWithAuth(`/api/replies/${data.reply.id}/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: replyPollQuestion,
            deadline: replyPollDeadline,
            options: replyPollOptions.filter((o) => o.trim()),
          }),
        });
      setReplyInputs((prev: any) => ({ ...prev, [reply.id]: "" }));
      setReplyingToId(null);
      setReplyHasPoll(false);
      setReplyPollQuestion("");
      setReplyPollOptions(["", ""]);
      setReplyPollDeadline("");
      onRefresh();
    }
  }

  return (
    <div style={{ marginLeft: `${maxDepthPx}px` }}>
      <div
        className={
          depth > 0
            ? "border-l-2 border-gray-100 dark:border-[#1e1e2e] pl-3"
            : ""
        }
      >
        <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() =>
                reply.author && onNavigate(`/profile/${reply.author.id}`)
              }
            >
              <img
                src={`/avatars/avatar_${reply.author?.avatar ?? 0}.png`}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-[11px] text-[#6b6b8a] font-semibold">
                {reply.author?.username ?? "Unknown"}
              </span>
              <span className="text-[#6b6b8a]">·</span>
              <span className="text-[11px] text-[#6b6b8a]">
                {new Date(reply.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            {userId && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((p) => !p);
                  }}
                  className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] px-2 py-1 rounded text-sm"
                >
                  •••
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl shadow-lg z-10 min-w-[130px] overflow-hidden">
                    {isOwn ? (
                      <>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            if (userIsBanned) { onBanned(); return; }
                            setIsEditing(true);
                            setEditContent(reply.content);
                            setHasPoll(hadPoll);
                            setPollQuestion(reply.poll?.question ?? "");
                        }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            if (userIsBanned) { onBanned(); return; }
                            onDelete(reply.id);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onReport(reply.id);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                      >
                        Report
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setHistoryOpen(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                    >
                      View History
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] resize-none"
              />
              <PollEditSection
                initialPoll={reply.poll}
                hadPoll={hadPoll}
                hasPoll={hasPoll}
                setHasPoll={setHasPoll}
                question={pollQuestion}
                setQuestion={setPollQuestion}
                options={pollOptions}
                setOptions={setPollOptions}
                deadline={pollDeadline}
                setDeadline={setPollDeadline}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  disabled={editSubmitting || !editContent.trim()}
                  className="px-4 py-2 rounded-lg bg-[#00e5a0] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                >
                  {editSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1e1e2e] text-sm text-[#6b6b8a]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
              <p className="text-sm text-gray-900 dark:text-[#f0f0f8] leading-relaxed">
                {translatedReply ?? reply.content}
              </p>
              <button
                onClick={async () => {
                  if (translatedReply) { setTranslatedReply(null); return; }
                  setIsTranslatingReply(true);
                  try {
                    const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply.content }) });
                    const data = await res.json();
                    if (data.translated_res) setTranslatedReply(data.translated_res);
                  } catch {}
                  setIsTranslatingReply(false);
                }}
                className="text-[10px] text-[#6b6b8a] hover:text-[#00e5a0] transition-colors mt-0.5"
              >
                {isTranslatingReply ? "Translating..." : translatedReply ? "Show Original" : "Translate"}
              </button>
            </div>
              {reply.poll && !reply.isBanned && (
                <PollBlock
                  poll={reply.poll}
                  myVotes={myVotes}
                  onVote={onVote}
                />
              )}
            </>
          )}
          {userId && !isClosed && !isEditing && (
            <button
              onClick={() => { if (userIsBanned) { onBanned(); return; } setReplyingToId(isReplying ? null : reply.id); }}
              className="mt-2 text-[11px] text-[#6b6b8a] hover:text-[#00e5a0] transition-colors"
            >
              {isReplying ? (
                "Cancel"
              ) : (
                <span className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition"
                  >
                    <path d="M268.2 82.4C280.2 87.4 288 99 288 112L288 192L400 192C497.2 192 576 270.8 576 368C576 481.3 494.5 531.9 475.8 542.1C473.3 543.5 470.5 544 467.7 544C456.8 544 448 535.1 448 524.3C448 516.8 452.3 509.9 457.8 504.8C467.2 496 480 478.4 480 448.1C480 395.1 437 352.1 384 352.1L288 352.1L288 432.1C288 445 280.2 456.7 268.2 461.7C256.2 466.7 242.5 463.9 233.3 454.8L73.3 294.8C60.8 282.3 60.8 262 73.3 249.5L233.3 89.5C242.5 80.3 256.2 77.6 268.2 82.6z" />
                  </svg>
                  Reply
                </span>
              )}
            </button>
          )}
        </div>
        {isReplying && (
          <div className="mb-3">
            <textarea
              value={replyInputs[reply.id] ?? ""}
              onChange={(e) =>
                setReplyInputs((prev: any) => ({
                  ...prev,
                  [reply.id]: e.target.value,
                }))
              }
              placeholder={`Reply to ${reply.author?.username}...`}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors resize-none placeholder:text-[#6b6b8a]"
            />
            <PollEditSection
              initialPoll={null}
              hadPoll={false}
              hasPoll={replyHasPoll}
              setHasPoll={setReplyHasPoll}
              question={replyPollQuestion}
              setQuestion={setReplyPollQuestion}
              options={replyPollOptions}
              setOptions={setReplyPollOptions}
              deadline={replyPollDeadline}
              setDeadline={setReplyPollDeadline}
            />
            <button
              onClick={handleReplyWithPoll}
              disabled={submitting || !replyInputs[reply.id]?.trim()}
              className="mt-2 px-4 py-2 rounded-lg bg-[#00e5a0] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        )}
        {reply.children?.map((child: Reply) => (
          <ReplyCard
            key={child.id}
            reply={child}
            postId={postId}
            depth={depth + 1}
            isClosed={isClosed}
            userId={userId}
            userIsBanned={userIsBanned}
            myVotes={myVotes}
            onNavigate={onNavigate}
            onBanned={onBanned}
            onVote={onVote}
            onSubmitReply={onSubmitReply}
            onDelete={onDelete}
            onReport={onReport}
            onRefresh={onRefresh}
            replyingToId={replyingToId}
            setReplyingToId={setReplyingToId}
            replyInputs={replyInputs}
            setReplyInputs={setReplyInputs}
            submitting={submitting}
          />
        ))}
      </div>
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        type="reply"
        targetId={reply.id}
        poll={reply.poll}
      />
    </div>
  );
}

export default function ThreadDetailPage() {
    const router = useRouter();
    const params = useParams();
    const forumId = params?.forumId as string;
    const threadId = params?.threadId as string;
    const { user } = useUser();
    const [thread, setThread] = useState<Thread | null>(null);
    const [loading, setLoading] = useState(true);
    const [myVotes, setMyVotes] = useState<Record<number, number | null>>({});
    const [visibleReplies, setVisibleReplies] = useState(REPLIES_PER_PAGE);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [mainReplyHasPoll, setMainReplyHasPoll] = useState(false);
    const [mainReplyPollQuestion, setMainReplyPollQuestion] = useState("");
    const [mainReplyPollOptions, setMainReplyPollOptions] = useState(["", ""]);
    const [mainReplyPollDeadline, setMainReplyPollDeadline] = useState("");
    const [isEditingThread, setIsEditingThread] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editTagInput, setEditTagInput] = useState("");
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [threadHadPoll, setThreadHadPoll] = useState(false);
    const [threadHasPoll, setThreadHasPoll] = useState(false);
    const [threadPollQuestion, setThreadPollQuestion] = useState("");
    const [threadPollOptions, setThreadPollOptions] = useState(["", ""]);
    const [threadPollDeadline, setThreadPollDeadline] = useState("");
    const threadMenuRef = useRef<HTMLDivElement>(null);
    const [threadMenuOpen, setThreadMenuOpen] = useState(false);
    const [threadHistoryOpen, setThreadHistoryOpen] = useState(false);
    const [showBannedModal, setShowBannedModal] = useState(false);
    const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
    const [translatedPostContent, setTranslatedPostContent] = useState<string | null>(null);
    const [isTranslatingThread, setIsTranslatingThread] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "delete" | "report" | "deleteThread" | "reportThread" | null;
    targetId: number | null;
    explanation: string;
    }>({ isOpen: false, type: null, targetId: null, explanation: "" });

    function showToast(msg: string) {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 2500);
    }

    function refreshThread() {
        fetchWithAuth(`/api/forums/${forumId}/thread/${threadId}`)
        .then((r) => r.json())
        .then((data) => setThread(data.thread));
    }
    useEffect(() => {
        fetchWithAuth(`/api/forums/${forumId}/thread/${threadId}`)
        .then((r) => r.json())
        .then((data) => {
            setThread(data.thread);
            setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [forumId, threadId]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
        if (
            threadMenuRef.current &&
            !threadMenuRef.current.contains(e.target as Node)
        )
            setThreadMenuOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    function startEditThread() {
        if (user?.isBanned) { setShowBannedModal(true); return; }
        if (!thread) return;
        setEditTitle(thread.title);
        setEditContent(thread.post?.content ?? "");
        setEditTags(thread.tags.map((t) => t.name));
        setThreadHadPoll(!!thread.poll);
        setThreadHasPoll(!!thread.poll);
        setThreadPollQuestion(thread.poll?.question ?? "");
        setThreadPollOptions(thread.poll?.options.map((o) => o.text) ?? ["", ""]);
        setThreadPollDeadline(thread.poll?.deadline?.slice(0, 16) ?? "");
        setIsEditingThread(true);
        setThreadMenuOpen(false);
    }

    async function handleSaveThread() {
        setEditSubmitting(true);
        const threadRes = await fetchWithAuth(
        `/api/forums/${forumId}/thread/${threadId}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: editTitle, tags: editTags }),
        },
        );
        if (thread?.post?.id) {
        await fetchWithAuth(`/api/posts/${thread.post.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editContent }),
        });
        }
        if (threadRes.ok) {
        if (threadHadPoll && !threadHasPoll && thread?.poll)
            await fetchWithAuth(`/api/polls/${thread.poll.id}`, {
            method: "DELETE",
            });
        else if (threadHadPoll && threadHasPoll && thread?.poll)
            await fetchWithAuth(`/api/polls/${thread.poll.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_question: threadPollQuestion }),
            });
        else if (!threadHadPoll && threadHasPoll)
            await fetchWithAuth(`/api/forums/${forumId}/thread/${threadId}/poll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: threadPollQuestion,
                deadline: threadPollDeadline,
                options: threadPollOptions.filter((o) => o.trim()),
            }),
            });
        setIsEditingThread(false);
        refreshThread();
        showToast("Thread updated!");
        }
        setEditSubmitting(false);
    }

  const handleVote = useCallback(async (pollId: number, optionId: number) => {
    if (user?.isBanned) { setShowBannedModal(true); return; }
    if (!localStorage.getItem("accessToken")) {
      router.push("/signin");
      return;
    }
    const res = await fetchWithAuth(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    if (res.ok) {
      setMyVotes((prev) => {
        const current = prev[pollId];
        if (current === optionId) {
          localStorage.removeItem(`vote_${pollId}`);
          return { ...prev, [pollId]: null };
        }
        localStorage.setItem(`vote_${pollId}`, String(optionId));
        return { ...prev, [pollId]: optionId };
      });
      refreshThread();
    }
  }, []);

  async function handleMainReply() {
    if (user?.isBanned) { setShowBannedModal(true); return; }
    if (!replyContent.trim() || !thread?.post) return;
    setSubmitting(true);
    const res = await fetchWithAuth(`/api/posts/${thread.post.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent, parentId: null }),
    });
    if (res.ok) {
      const data = await res.json();
      if (
        mainReplyHasPoll &&
        mainReplyPollQuestion.trim() &&
        mainReplyPollDeadline
      )
        await fetchWithAuth(`/api/replies/${data.reply.id}/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: mainReplyPollQuestion,
            deadline: mainReplyPollDeadline,
            options: mainReplyPollOptions.filter((o) => o.trim()),
          }),
        });
      setReplyContent("");
      setMainReplyHasPoll(false);
      setMainReplyPollQuestion("");
      setMainReplyPollOptions(["", ""]);
      setMainReplyPollDeadline("");
      refreshThread();
    }
    setSubmitting(false);
  }

  const handleSubmitReply = useCallback(
    async (postId: number, parentId: number | null) => {
      const content = parentId ? replyInputs[parentId] : replyContent;
      if (!content?.trim()) return;
      setSubmitting(true);
      const res = await fetchWithAuth(`/api/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });
      if (res.ok) {
        if (parentId) {
          setReplyInputs((prev) => ({ ...prev, [parentId]: "" }));
          setReplyingToId(null);
        } else setReplyContent("");
        refreshThread();
      }
      setSubmitting(false);
    },
    [replyInputs, replyContent],
  );

  const handleDelete = useCallback((replyId: number) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      targetId: replyId,
      explanation: "",
    });
  }, []);
  const handleReport = useCallback((replyId: number) => {
    setConfirmModal({
      isOpen: true,
      type: "report",
      targetId: replyId,
      explanation: "",
    });
  }, []);
  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  async function handleConfirm() {
    const { type, targetId, explanation } = confirmModal;
    if (type === "deleteThread") {
      const res = await fetchWithAuth(
        `/api/forums/${forumId}/thread/${threadId}`,
        { method: "DELETE" },
      );
      if (res.ok) router.push(`/community/${forumId}`);
    } else if (type === "reportThread") {
      const res = await fetchWithAuth("/api/users/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: Number(threadId),
          contentType: "THREAD",
          explanation,
        }),
      });
      const data = await res.json();
      showToast(res.ok ? "Report submitted." : data.error || "Failed.");
    } else if (type === "delete" && targetId) {
      const res = await fetchWithAuth(`/api/replies/${targetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Reply deleted.");
        refreshThread();
      }
    } else if (type === "report" && targetId) {
      const res = await fetchWithAuth("/api/users/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: targetId,
          contentType: "REPLY",
          explanation,
        }),
      });
      const data = await res.json();
      showToast(res.ok ? "Report submitted." : data.error || "Failed.");
    }
    setConfirmModal({
      isOpen: false,
      type: null,
      targetId: null,
      explanation: "",
    });
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#6b6b8a] text-sm">Loading...</div>
      </div>
    );
  if (!thread)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#ff4c6a] text-sm">Thread not found.</div>
      </div>
    );

  const isThreadOwn = user?.id === thread.author?.id;
  const treeReplies = buildTree(thread.post?.replies ?? []);
  const shownReplies = treeReplies.slice(0, visibleReplies);
  const hasMore = visibleReplies < treeReplies.length;

  return (
    <div className="min-h-screen px-4 py-8">
    <PopupModal isOpen={showBannedModal} onClose={() => setShowBannedModal(false)}>
        <p className="text-center font-semibold text-gray-900 dark:text-[#f0f0f8] mb-2">Action not allowed</p>
        <p className="text-center text-sm text-[#6b6b8a] mb-4">Your account has been banned.</p>
        <button onClick={() => setShowBannedModal(false)} className="w-full py-2.5 rounded-xl bg-[#00e5a0] text-black text-sm font-semibold">OK</button>
      </PopupModal>
      <div className="w-full lg:w-[60%] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors text-sm"
          >
            ← Back
          </button>
          {thread.isClosed && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1e1e2e] text-[#6b6b8a]">
              CLOSED
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() =>
                thread.author && router.push(`/profile/${thread.author.id}`)
              }
            >
              {thread.author && (
                <img
                  src={`/avatars/avatar_${thread.author.avatar}.png`}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
              )}
              <span className="text-[11px] text-[#6b6b8a] font-semibold">
                {thread.author ? thread.author.username : "Match thread"}
              </span>
              <span className="text-[#6b6b8a]">·</span>
              <span className="text-[11px] text-[#6b6b8a]">
                {new Date(thread.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            {user && !thread.matchId && (
              <div className="relative" ref={threadMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setThreadMenuOpen((p) => !p);
                  }}
                  className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] px-2 py-1 rounded text-sm"
                >
                  •••
                </button>
                {threadMenuOpen && (
                  <div className="absolute right-0 top-8 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl shadow-lg z-10 min-w-[130px] overflow-hidden">
                    {isThreadOwn ? (
                      <>
                        <button
                          onClick={startEditThread}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                                setThreadMenuOpen(false);
                                if (user?.isBanned) { setShowBannedModal(true); return; }
                                setConfirmModal({ isOpen: true, type: "deleteThread", targetId: null, explanation: "" });
                            }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setThreadMenuOpen(false);
                          setConfirmModal({
                            isOpen: true,
                            type: "reportThread",
                            targetId: Number(threadId),
                            explanation: "",
                          });
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                      >
                        Report
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setThreadMenuOpen(false);
                        setThreadHistoryOpen(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-50 dark:hover:bg-[#1e1e2e]"
                    >
                      View History
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditingThread ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-[#6b6b8a] mb-1 block">
                  TITLE
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6b6b8a] mb-1 block">
                  CONTENT
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6b6b8a] mb-1 block">
                  TAGS
                </label>
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editTagInput.trim()) {
                      e.preventDefault();
                      if (!editTags.includes(editTagInput.trim()))
                        setEditTags((p) => [...p, editTagInput.trim()]);
                      setEditTagInput("");
                    }
                  }}
                  placeholder="Press Enter to add"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0]"
                />
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-[rgba(0,229,160,0.12)] text-[#00e5a0]"
                      >
                        #{tag}
                        <button
                          onClick={() =>
                            setEditTags((p) => p.filter((t) => t !== tag))
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <PollEditSection
                initialPoll={thread.poll}
                hadPoll={threadHadPoll}
                hasPoll={threadHasPoll}
                setHasPoll={setThreadHasPoll}
                question={threadPollQuestion}
                setQuestion={setThreadPollQuestion}
                options={threadPollOptions}
                setOptions={setThreadPollOptions}
                deadline={threadPollDeadline}
                setDeadline={setThreadPollDeadline}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveThread}
                  disabled={editSubmitting || !editTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-[#00e5a0] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setIsEditingThread(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1e1e2e] text-sm text-[#6b6b8a]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">
              <h1 className="text-lg font-bold text-gray-900 dark:text-[#f0f0f8]">
                {translatedTitle ?? thread.title}
              </h1>
              {thread.post && (
                <p className="text-sm text-gray-700 dark:text-[#9090b0] leading-relaxed mt-1">
                  {translatedPostContent ?? thread.post.content}
                </p>
              )}
              <button
                onClick={async () => {
                  if (translatedTitle) { setTranslatedTitle(null); setTranslatedPostContent(null); return; }
                  setIsTranslatingThread(true);
                  try {
                    const [titleRes, contentRes] = await Promise.all([
                      fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: thread.title }) }),
                      thread.post ? fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: thread.post.content }) }) : null,
                    ]);
                    const titleData = await titleRes.json();
                    if (titleData.translated_res) setTranslatedTitle(titleData.translated_res);
                    if (contentRes) {
                      const contentData = await contentRes.json();
                      if (contentData.translated_res) setTranslatedPostContent(contentData.translated_res);
                    }
                  } catch {}
                  setIsTranslatingThread(false);
                }}
                className="text-[10px] text-[#6b6b8a] hover:text-[#00e5a0] transition-colors mt-1"
              >
                {isTranslatingThread ? "Translating..." : translatedTitle ? "Show Original" : "Translate"}
              </button>
            </div>
              {thread.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {thread.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1e1e2e] text-[#6b6b8a]"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
              {thread.poll && (
                <PollBlock
                  poll={thread.poll}
                  myVotes={myVotes}
                  onVote={handleVote}
                />
              )}
            </>
          )}
        </div>

        {user && !thread.isClosed && thread.post && (
          <div className="mb-6">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors resize-none placeholder:text-[#6b6b8a]"
            />
            <PollEditSection
              initialPoll={null}
              hadPoll={false}
              hasPoll={mainReplyHasPoll}
              setHasPoll={setMainReplyHasPoll}
              question={mainReplyPollQuestion}
              setQuestion={setMainReplyPollQuestion}
              options={mainReplyPollOptions}
              setOptions={setMainReplyPollOptions}
              deadline={mainReplyPollDeadline}
              setDeadline={setMainReplyPollDeadline}
            />
            <button
              onClick={handleMainReply}
              disabled={submitting || !replyContent.trim()}
              className="mt-2 px-4 py-2 rounded-lg bg-[#00e5a0] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        )}
        {!user && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-gray-200 dark:border-[#1e1e2e] text-sm text-[#6b6b8a]">
            <button
              onClick={() => router.push("/signin")}
              className="text-[#00e5a0] hover:opacity-80"
            >
              Sign in
            </button>{" "}
            to reply
          </div>
        )}

        <div>
          <p className="text-[11px] text-[#6b6b8a] tracking-widest mb-4">
            REPLIES ({treeReplies.length})
          </p>
          {treeReplies.length === 0 && (
            <div className="text-[#6b6b8a] text-sm">No replies yet.</div>
          )}
          {shownReplies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              postId={thread.post!.id}
              depth={0}
              isClosed={thread.isClosed}
              userId={user?.id}
            userIsBanned={user?.isBanned ?? false}
            myVotes={myVotes}
              onVote={handleVote}
              onSubmitReply={handleSubmitReply}
              onDelete={handleDelete}
              onReport={handleReport}
              onRefresh={refreshThread}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              replyInputs={replyInputs}
              setReplyInputs={setReplyInputs}
              submitting={submitting}
              onNavigate={handleNavigate}
              onBanned={() => setShowBannedModal(true)}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => setVisibleReplies((p) => p + REPLIES_PER_PAGE)}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-[#1e1e2e] text-sm text-[#6b6b8a] hover:border-[#00e5a0] hover:text-[#00e5a0] transition-colors mt-2"
            >
              Load more ({treeReplies.length - visibleReplies} remaining)
            </button>
          )}
        </div>
      </div>

      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() =>
            setConfirmModal({
              isOpen: false,
              type: null,
              targetId: null,
              explanation: "",
            })
          }
        >
          <div
            className="bg-white dark:bg-[#111118] p-6 rounded-2xl border border-gray-200 dark:border-[#1e1e2e] shadow-2xl w-[90%] max-w-sm"
            style={{ animation: "bounceIn 0.4s ease forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#f0f0f8] mb-3">
              {confirmModal.type === "deleteThread"
                ? "Delete Thread"
                : confirmModal.type === "reportThread"
                  ? "Report Thread"
                  : confirmModal.type === "delete"
                    ? "Delete Reply"
                    : "Report Reply"}
            </h3>
            {(confirmModal.type === "report" ||
              confirmModal.type === "reportThread") && (
              <textarea
                value={confirmModal.explanation}
                onChange={(e) =>
                  setConfirmModal((p) => ({
                    ...p,
                    explanation: e.target.value,
                  }))
                }
                placeholder="Please provide a specific reason."
                rows={3}
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-[#1e1e2e] bg-gray-50 dark:bg-[#0a0a0f] text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] resize-none mb-4"
              />
            )}
            {(confirmModal.type === "delete" ||
              confirmModal.type === "deleteThread") && (
              <p className="text-sm text-[#6b6b8a] mb-6">
                Are you sure? This cannot be undone.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    type: null,
                    targetId: null,
                    explanation: "",
                  })
                }
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1e1e2e] text-gray-900 dark:text-[#f0f0f8] font-semibold text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (
                    (confirmModal.type === "report" ||
                      confirmModal.type === "reportThread") &&
                    !confirmModal.explanation.trim()
                  )
                    return;
                  handleConfirm();
                }}
                disabled={
                  (confirmModal.type === "report" ||
                    confirmModal.type === "reportThread") &&
                  !confirmModal.explanation.trim()
                }
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 hover:opacity-90 ${confirmModal.type === "delete" || confirmModal.type === "deleteThread" ? "bg-[#ff4c6a] text-white" : "bg-[#00e5a0] text-black"}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-[#00e5a0] text-black text-sm font-semibold shadow-lg">
          {successMessage}
        </div>
      )}

      <HistoryPanel
        isOpen={threadHistoryOpen}
        onClose={() => setThreadHistoryOpen(false)}
        type="thread"
        targetId={thread ? Number(threadId) : null}
        forumId={forumId}
        postId={thread?.post?.id}
      />
    </div>
  );
}