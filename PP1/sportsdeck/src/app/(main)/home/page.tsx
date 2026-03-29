"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
type Team = {
    name: string;
    crest: string;
    venue: string;
};

type Match = {
    id: number;
    matchDayTime: string;
    status: string;
    homeTeam: Team;
    awayTeam: { name: string; crest: string };
    homeScore: number | null;
    awayScore: number | null;
};

type Digest = {
    topDiscussionsSummary: string;
    matchResultSummary: string;
    standingsSummary: string;
};

type Author = { id: number; username: string; avatar: number };
type FeedThread = { id: number; title: string; forumId: number[] };
type FeedPost = { id: number; author: Author; thread: FeedThread; createdAt: string; content: string };
type FeedReply = { id: number; author: Author; post: { thread: FeedThread }; createdAt: string; content: string };
type FeedMatch = {
    id: number; matchDayTime: string; status: string;
    homeTeam: { name: string; crest: string };
    awayTeam: { name: string; crest: string };
    homeScore: number | null; awayScore: number | null;
};
type FeedThread2 = { id: number; title: string; forumId: number[]; author: Author | null; createdAt: string; matchId: number | null };
type Feed = {
    recentActivityOnUserThreads: FeedPost[];
    recentActivityOnUserPostsAndReplies: FeedReply[];
    newFollowingUserPosts: FeedPost[];
    newFollowingUserReplies: FeedReply[];
    favouriteTeamNewMatches: FeedMatch[];
    favouriteTeamNewThreads: FeedThread2[];
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 60) return `${mins}m ago`;

    const hrs = Math.floor(mins / 60);

    if (hrs < 24) return `${hrs}h ago`;

    return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomePage() {
    const router = useRouter();
    const [recentMatches, setRecentMatches] = useState<Match[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [digest, setDigest] = useState<Digest | null>(null);
    const [digestLoading, setDigestLoading] = useState(true);
    const [feed, setFeed] = useState<Feed | null>(null);
    const [feedLoading, setFeedLoading] = useState(true);
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        
        
        // Fetch mathes information from DB
        fetch("/api/matches")
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) { setLoading(false); return; }

                const now = new Date();

                // Filter past matches and upcoming matches
                const past = data.filter((m: Match) => new Date(m.matchDayTime) < now);
                const future = data.filter((m: Match) => new Date(m.matchDayTime) >= now);

                // Group by Date method
                const groupByDate = (matches: Match[]) => {
                    const groups: Record<string, Match[]> = {};
                    matches.forEach(m => {
                        const date = new Date(m.matchDayTime).toDateString();
                        if (!groups[date]) groups[date] = [];
                        groups[date].push(m);
                    });
                    return groups;
                };

                // Sort by date
                const pastGroups = groupByDate(past);
                const pastDates = Object.keys(pastGroups).sort(
                    (a, b) => new Date(b).getTime() - new Date(a).getTime()
                );

                let recentDate: string | null = null;
                for (const date of pastDates) {
                    const dayMatches = pastGroups[date];
                    const allDone = dayMatches.every(
                        m => m.status === "FINISHED" || m.status === "AWARDED"
                    );
                    if (allDone) {
                        recentDate = date;
                        break;
                    }
                }

                if (recentDate) {
                    setRecentMatches(pastGroups[recentDate]);
                }

                // Sort upcoming matches by date 
                const futureGroups = groupByDate(future);
                const futureDates = Object.keys(futureGroups).sort(
                    (a, b) => new Date(a).getTime() - new Date(b).getTime()
                );
                if (futureDates.length > 0) {
                    setUpcomingMatches(futureGroups[futureDates[0]]);
                }

                setLoading(false);
            })
            .catch(() => setLoading(false));

        // Daily digest
        fetch("/api/digest")
            .then(res => res.json())
            .then(data => {
                setDigest(data);
                setDigestLoading(false);
            })
            .catch(() => setDigestLoading(false));

    }, []);

    // Fetch personalized Feed
    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            setFeedLoading(false);
            return;
        }
        fetchWithAuth("/api/users/me/feed")
            .then(res => res.json())
            .then(data => {
                setFeed(data);
                setFeedLoading(false);
            })
            .catch(() => setFeedLoading(false));
    }, [user, userLoading]);


    const MatchCard = ({ match }: { match: Match }) => (
        <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4">
            {/* Date + Status */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-[#6b6b8a]">
                    {new Date(match.matchDayTime).toLocaleDateString("en-GB", {
                        weekday: "short", day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit"
                    })}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    match.status === "FINISHED" || match.status === "AWARDED"
                        ? "bg-green-100 text-green-700 dark:bg-[rgba(0,229,160,0.12)] dark:text-[#00e5a0]"
                        : match.status === "IN_PLAY"
                        ? "bg-red-100 text-red-700 dark:bg-[rgba(255,76,106,0.12)] dark:text-[#ff4c6a]"
                        : "bg-gray-100 dark:bg-[#1e1e2e] text-[#6b6b8a]"
                }`}>
                    {match.status === "FINISHED" || match.status === "AWARDED"
                        ? "FINISHED"
                        : match.status === "IN_PLAY"
                        ? "LIVE"
                        : "UPCOMING"}
                </span>
            </div>

            {/* Teams + Score */}
            <div className="flex items-center justify-between gap-4">
                {/* Home */}
                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                    <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] truncate">
                        {match.homeTeam.name}
                    </span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className="text-sm sm:text-lg font-bold text-gray-900 dark:text-[#f0f0f8] w-5 text-right">
                        {match.homeScore ?? "-"}
                    </span>
                    <span className="text-[#6b6b8a] text-sm">:</span>
                    <span className="text-sm sm:text-lg font-bold text-gray-900 dark:text-[#f0f0f8] w-5 text-left">
                        {match.awayScore ?? "-"}
                    </span>
                </div>

                {/* Away */}
                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 sm:justify-end">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] truncate text-right">
                        {match.awayTeam.name}
                    </span>
                    <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0" />
                </div>
            </div>

            {/* Venue */}
            <p className="text-[11px] text-[#6b6b8a] mt-2 text-center">
                📍 {match.homeTeam.venue}
            </p>
        </div>
    );

    return (
        <div className="min-h-screen px-4 py-8 relative overflow-hidden">
            {/* BG decorations */}
            <div
                className="absolute -top-32 -right-20 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)" }}
            />
            <div
                className="absolute -bottom-20 -left-24 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(76,142,255,0.06) 0%, transparent 70%)" }}
            />

            <div className="max-w-2xl mx-auto">
                {/* Greeting */}
                <div className="mb-8">
                    <p className="text-[12px] text-[#6b6b8a] tracking-widest mb-1">WELCOME BACK</p>
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-[#f0f0f8]">
                        {user ? `Hi, ${user.username} !` : "Hey there !"}
                    </h1>
                    <p className="text-sm text-[#6b6b8a] mt-1">Here's what's happening in the EPL</p>
                </div>

                {loading ? (
                    <div className="text-[#6b6b8a] text-sm">Loading...</div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {/* Recent Matches */}
                        {recentMatches.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <p className="text-[11px] font-bold text-[#6b6b8a] tracking-widest">RECENT RESULTS</p>
                                    <span className="text-[11px] text-[#6b6b8a]">
                                        · {new Date(recentMatches[0].matchDayTime).toLocaleDateString("en-GB", {
                                            weekday: "long", day: "numeric", month: "short"
                                        })}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {recentMatches.map(match => (
                                        <MatchCard key={match.id} match={match} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming Matches */}
                        {upcomingMatches.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <p className="text-[11px] font-bold text-[#6b6b8a] tracking-widest">UPCOMING MATCHES</p>
                                    <span className="text-[11px] text-[#6b6b8a]">
                                        · {new Date(upcomingMatches[0].matchDayTime).toLocaleDateString("en-GB", {
                                            weekday: "long", day: "numeric", month: "short"
                                        })}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {upcomingMatches.map(match => (
                                        <MatchCard key={match.id} match={match} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {recentMatches.length === 0 && upcomingMatches.length === 0 && (
                            <div className="text-[#6b6b8a] text-sm">No matches found.</div>
                        )}

                        {/* Daily Digest */}
                        <div>
                            <p className="text-[11px] font-bold text-[#6b6b8a] tracking-widest mb-4">📋 DAILY DIGEST</p>
                            {digestLoading ? (
                                <div className="text-[#6b6b8a] text-sm">Loading digest...</div>
                            ) : digest ? (
                                <div className="flex flex-col gap-3">
                                    <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4">
                                        <p className="text-[10px] sm:text-xs font-bold text-[#18B973] dark:text-[#00e5a0] tracking-widest mb-2">MATCH RESULTS</p>
                                        <p className="text-xs sm:text-sm text-gray-700 dark:text-[#9090b0] leading-relaxed">{digest.matchResultSummary}</p>
                                    </div>
                                    <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4">
                                        <p className="text-[10px] sm:text-xs font-bold text-[#4c8eff] tracking-widest mb-2">TOP DISCUSSIONS</p>
                                        <p className="text-xs sm:text-sm text-gray-700 dark:text-[#9090b0] leading-relaxed">{digest.topDiscussionsSummary}</p>
                                    </div>
                                    <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4">
                                        <p className="text-[10px] sm:text-xs font-bold text-amber-500 dark:text-[#ffd246] tracking-widest mb-2">STANDINGS</p>
                                        <p className="text-xs sm:text-sm text-gray-700 dark:text-[#9090b0] leading-relaxed">{digest.standingsSummary}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[#6b6b8a] text-sm">Digest unavailable.</div>
                            )}
                        </div>

                        {/* Personalized Feed */}
                        {user && (
                            <div>
                                <p className="text-[11px] font-bold text-[#6b6b8a] tracking-widest mb-4">🔔 YOUR FEED</p>
                                {feedLoading ? (
                                    <div className="text-[#6b6b8a] text-sm">Loading feed...</div>
                                ) : !feed ? (
                                    <div className="text-[#6b6b8a] text-sm">Feed unavailable.</div>
                                ) : (
                                    <div className="flex flex-col gap-2">

                                        {/* Comments on my thread - Complete*/}
                                        {feed.recentActivityOnUserThreads.map(post => (
                                            <div
                                                key={`post-${post.id}`}
                                                onClick={() => router.push(`/community/${post.thread.forumId[0]}/threads/${post.thread.id}`)}
                                                className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 cursor-pointer hover:border-[#00e5a0] transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-bold text-[#18B973] dark:text-[#00e5a0]">NEW COMMENT ON YOUR THREAD</span>
                                                    <span className="text-[11px] text-[#6b6b8a]">{timeAgo(post.createdAt)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-1">
                                                    {post.author.username}
                                                    <span className="font-normal text-[#6b6b8a]"> commented on </span>
                                                    {post.thread.title}
                                                </p>
                                                <p className="text-xs text-[#6b6b8a] truncate">{post.content}</p>
                                            </div>
                                        ))}

                                        {/* Other user's replies on my replies - Complete*/}
                                        {feed.recentActivityOnUserPostsAndReplies.map(reply => (
                                            <div
                                                key={`reply-${reply.id}`}
                                                onClick={() => router.push(`/community/${reply.post.thread.forumId[0]}/threads/${reply.post.thread.id}`)}
                                                className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 cursor-pointer hover:border-[#4c8eff] transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-bold text-[#18B973] dark:text-[#00e5a0]">REPLY TO YOUR COMMENT</span>
                                                    <span className="text-[11px] text-[#6b6b8a]">{timeAgo(reply.createdAt)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-1">
                                                    {reply.author.username}
                                                    <span className="font-normal text-[#6b6b8a]"> replied in </span>
                                                    {reply.post.thread.title}
                                                </p>
                                                <p className="text-xs text-[#6b6b8a] truncate">{reply.content}</p>
                                            </div>
                                        ))}

                                        {/* Following's post - Complete */}
                                        {feed.newFollowingUserPosts.map(post => (
                                            <div
                                                key={`fpost-${post.id}`}
                                                onClick={() => router.push(`/community/${post.thread.forumId[0]}/threads/${post.thread.id}`)}
                                                className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 cursor-pointer hover:border-[#ffd246] transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-bold text-[#18B973] dark:text-[#00e5a0]">FROM SOMEONE YOU FOLLOW</span>
                                                    <span className="text-[11px] text-[#6b6b8a]">{timeAgo(post.createdAt)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-1">
                                                    {post.author.username}
                                                    <span className="font-normal text-[#6b6b8a]"> posted in </span>
                                                    {post.thread.title}
                                                </p>
                                                <p className="text-xs text-[#6b6b8a] truncate">{post.content}</p>
                                            </div>
                                        ))}

                                        {/* Following's comment - Complete */}
                                        {feed.newFollowingUserReplies.map(reply => (
                                            <div
                                                key={`freply-${reply.id}`}
                                                onClick={() => router.push(`/community/${reply.post.thread.forumId[0]}/threads/${reply.post.thread.id}`)}
                                                className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 cursor-pointer hover:border-[#ffd246] transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-bold text-[#18B973] dark:text-[#00e5a0]">FROM SOMEONE YOU FOLLOW</span>
                                                    <span className="text-[11px] text-[#6b6b8a]">{timeAgo(reply.createdAt)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] mb-1">
                                                    {reply.author.username}
                                                    <span className="font-normal text-[#6b6b8a]"> replied in </span>
                                                    {reply.post.thread.title}
                                                </p>
                                                <p className="text-xs text-[#6b6b8a] truncate">{reply.content}</p>
                                            </div>
                                        ))}

                                        {/* Your Favorite Team's recent match - Complete */}
                                        {feed.favouriteTeamNewMatches.map(match => (
                                            <div
                                                key={`fmatch-${match.id}`}
                                                className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[11px] font-bold text-[#18B973] dark:text-[#00e5a0]">YOUR TEAM'S MATCH</span>
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                                        match.status === "FINISHED" || match.status === "AWARDED"
                                                            ? "bg-green-100 text-green-700 dark:bg-[rgba(0,229,160,0.12)] dark:text-[#00e5a0]"
                                                            : "bg-red-100 text-red-700 dark:bg-[rgba(255,76,106,0.12)] dark:text-[#ff4c6a]"
                                                    }`}>
                                                        {match.status === "FINISHED" || match.status === "AWARDED" ? "FINISHED" : "LIVE"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <img src={match.homeTeam.crest} className="w-5 h-5 sm:w-7 sm:h-7 object-contain" />
                                                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] truncate">{match.homeTeam.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-sm sm:text-lg font-bold text-gray-900 dark:text-[#f0f0f8]">{match.homeScore ?? "-"}</span>
                                                        <span className="text-[#6b6b8a] text-sm">:</span>
                                                        <span className="text-sm sm:text-lg font-bold text-gray-900 dark:text-[#f0f0f8]">{match.awayScore ?? "-"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-[#f0f0f8] truncate text-right">{match.awayTeam.name}</span>
                                                        <img src={match.awayTeam.crest} className="w-5 h-5 sm:w-7 sm:h-7 object-contain" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Your Team's Forum's new thread - Complete */}
                                        {feed.favouriteTeamNewThreads.map(thread => (
                                            <div
                                                key={`fthread-${thread.id}`}
                                                onClick={() => router.push(`/community/${thread.forumId[0]}/threads/${thread.id}`)}
                                                className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4 cursor-pointer hover:border-[#18B973] dark:hover:border-[#00e5a0] transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-bold text-[#18B973] dark:text-[#00e5a0]">NEW IN YOUR TEAM'S FORUM</span>
                                                    <span className="text-[11px] text-[#6b6b8a]">{timeAgo(thread.createdAt)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">{thread.title}</p>
                                                <p className="text-xs text-[#6b6b8a] mt-0.5">
                                                    {thread.matchId ? "Match Thread" : `by ${thread.author?.username ?? "Unknown"}`}
                                                </p>
                                            </div>
                                        ))}

                                        {/* Nothing */}
                                        {feed.recentActivityOnUserThreads.length === 0 &&
                                        feed.recentActivityOnUserPostsAndReplies.length === 0 &&
                                        feed.newFollowingUserPosts.length === 0 &&
                                        feed.newFollowingUserReplies.length === 0 &&
                                        feed.favouriteTeamNewMatches.length === 0 &&
                                        feed.favouriteTeamNewThreads.length === 0 && (
                                            <div className="text-[#6b6b8a] text-sm text-center py-4">
                                                No recent activity. Follow users or set a favourite team!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}