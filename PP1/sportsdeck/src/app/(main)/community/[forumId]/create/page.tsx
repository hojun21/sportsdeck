"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";


export default function makeThread(){

    const router = useRouter();
    const params = useParams();
    const forumId = params?.forumId as string;
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [hasPoll, setHasPoll] = useState(true);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollDeadline, setPollDeadline] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Executes when user add a new tag
    function handleTagKeyDown(e: React.KeyboardEvent) {

        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();

            // Add if tag is not added already
            if (!tags.includes(tagInput.trim())) {
                setTags(prev => [...prev, tagInput.trim()]);
            }
            // Reset tag input box
            setTagInput("");
        }
    }

    function removeTag(tag: string) {
        setTags(prev => prev.filter(t => t !== tag));
    }

    function addPollOption() {
        if (pollOptions.length < 10) {
            setPollOptions(prev => [...prev, ""]);
        }
    }

    function removePollOption(index: number) {
        if (pollOptions.length > 2) {
            setPollOptions(prev => prev.filter((_, i) => i !== index));
        }
    }

    function updatePollOption(index: number, value: string) {
        setPollOptions(prev => prev.map((o, i) => i === index ? value : o));
    }

    async function handleSubmit() {

        setError("");

        if (!title.trim()) { setError("Title is required."); return; }
        if (!content.trim()) { setError("Content is required."); return; }

        if (hasPoll) {
            if (!pollQuestion.trim()) { setError("Poll question is required."); return; }
            if (!pollDeadline) { setError("Poll deadline is required."); return; }
            if (new Date(pollDeadline) <= new Date()) { setError("Deadline must be in the future."); return; }
            if (pollOptions.some(o => !o.trim())) { setError("All poll options must be filled."); return; }
        }

        setLoading(true); 
        try {
            // 1. Create thread
            const threadRes = await fetchWithAuth(`/api/forums/${forumId}/thread`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, tags }),
            });

            const threadData = await threadRes.json();

            if (!threadRes.ok) {
                setError(threadData.error || "Failed to create thread.");
                return;
            }

            const threadId = threadData.thread.id;

            // 2. Create poll if enabled
            if (hasPoll) {
                const pollRes = await fetchWithAuth(`/api/forums/${forumId}/thread/${threadId}/poll`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question: pollQuestion,
                        deadline: pollDeadline,
                        options: pollOptions.filter(o => o.trim()),
                    }),
                });

                if (!pollRes.ok) {
                    const pollData = await pollRes.json();
                    setError(pollData.error || "Thread created but poll failed.");
                    router.push(`/community/${forumId}/threads/${threadId}`);
                    return;
                }
            }

            router.push(`/community/${forumId}/threads/${threadId}`);

        } catch {

            setError("Unexpected error. Please try again.");

        } finally {

            setLoading(false);

        }
    }

    return(
        <div className="min-h-screen px-4 py-8">

            {/* Header */}
            <div className="w-full lg:w-[60%] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.back()}
                        className="text-[#6b6b8a] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors text-sm"
                    >
                        ← Back
                    </button>
                    <span className="text-[11px] text-[#6b6b8a] tracking-widest">Make New Thread</span>
                    <div className="w-12" />
                </div>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-2">
                <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block">TITLE</label>
                <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Thread title"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                        />
            </div>

            {/* Content */}
            <div className="mt-2">
                <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">CONTENT</label>
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write your post here..."
                    rows={6}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a] resize-none"
                />
            </div>

            {/* Tags */}
            <div className="mt-2">
                <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block">TAGS</label>
                <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Press Enter to add a new key"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                />
            </div>

            {/* Display added tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                        <span
                            key={tag}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-[rgba(0,229,160,0.12)] 
                            text-[#00e5a0]  hover:bg-red-500 hover:text-white transition"
                        >
                            # {tag}
                            <button onClick={() => removeTag(tag)} className="hover:opacity-70 ">×</button>
                        </span>
                    ))}
                </div>
            )}

            {/* Add poll header */}
            <div className="mt-4 flex items-center gap-3">
                <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block">ADD POLL</label>
                <button
                    // Reverse hasPoll boolean
                    onClick={() => setHasPoll(!hasPoll)}
                    className={`w-12 h-6 rounded-full transition-colors ${hasPoll ? "bg-[#00e5a0]" : "bg-gray-200 dark:bg-[#1e1e2e]"}`}
                >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${hasPoll ? "translate-x-6" : "translate-x-0"}`} />
                </button>
            </div>

            {
                hasPoll && (
                    <div className="flex flex-col gap-4 p-4 rounded-xl border border-[#00e5a0] bg-[rgba(0,229,160,0.04)] mt-2">
                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">POLL QUESTION</label>
                            <input
                                    type="text"
                                    value={pollQuestion}
                                    onChange={e => setPollQuestion(e.target.value)}
                                    placeholder="Enter your poll question here"
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">OPTIONS (2~10)</label>

                            <div className="flex flex-col gap-2">
                                {pollOptions.map((option, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={e => updatePollOption(i, e.target.value)}
                                            placeholder={`Option #${i + 1}`}
                                            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
                                        />

                                        {/* Remove button */}
                                        {pollOptions.length > 2 && (
                                            <button
                                                onClick={() => removePollOption(i)}
                                                className="text-[#ff4c6a] hover:opacity-70 text-lg px-2"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Add option button */}
                                {pollOptions.length < 10 && (
                                            <button
                                                onClick={addPollOption}
                                                className="mt-2 text-sm text-[#00e5a0] hover:opacity-70 transition-opacity"
                                            >
                                                + Add option
                                            </button>
                                )}
                            </div>


                            <div>
                                <label className="text-[11px] text-[#6b6b8a] tracking-[0.5px] block mb-1.5">DEADLINE</label>
                                <input
                                    type="datetime-local"
                                    value={pollDeadline}
                                    onChange={e => setPollDeadline(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors"
                                />
                            </div>

                        </div>
                        
                    </div>

                )
            }

            {/* Error */}
            {error && (
                <div className="px-3.5 py-2.5 rounded-lg bg-[rgba(255,76,106,0.12)] border border-[rgba(255,76,106,0.3)] text-[#ff4c6a] text-[13px] my-2">
                    {error}
                </div>
            )}

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium text-[15px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed mt-2"
                style={{
                    background: loading ? "rgba(0,229,160,0.12)" : "#00e5a0",
                    color: loading ? "#00e5a0" : "#000",
                    animation: loading ? "none" : "glow 3s ease infinite",
                }}
            >
                {loading ? "Posting..." : "Post Thread"}
            </button>

        </div>
    );
}