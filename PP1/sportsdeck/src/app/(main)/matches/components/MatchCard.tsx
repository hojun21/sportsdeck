"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type Forum = {
  id: number;
  name: string;
};

type Team = {
  name: string;
  crest: string;
  venue: string;
  forum?: Forum;
};

type Thread = {
  id: number;
};

type Match = {
  id: number;
  matchDayTime: string;
  matchDay: number;
  status: string;
  homeTeam: Team;
  awayTeam: { name: string; crest: string };
  homeScore: number | null;
  awayScore: number | null;
  thread: Thread;
};

type MatchCardProps = {
  match: Match;
  showSentiment?: boolean;
};

type SentimentLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

type SentimentScore = {
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  sentimentLabel: SentimentLabel;
};

type SentimentResponse = {
  overallSentiment: SentimentScore;
  homeTeam: SentimentScore;
  awayTeam: SentimentScore;
};

export default function MatchCard({
  match,
  showSentiment = false,
}: MatchCardProps) {
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const overall = sentiment?.overallSentiment;
  const home = sentiment?.homeTeam;
  const away = sentiment?.awayTeam;
  const router = useRouter();

  useEffect(() => {
    if (!showSentiment) return;

    async function fetchSentiment() {
      try {
        const res = await fetchWithAuth(
          `/api/thread/${match.thread.id}/sentiment`,
        );
        const data = await res.json();
        setSentiment(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchSentiment();
  }, [match.thread?.id, showSentiment]);

  const calculatePercentage = (data?: SentimentScore) => {
    if (!data) return 0;

    const total =
      (data.positiveCount ?? 0) +
      (data.neutralCount ?? 0) +
      (data.negativeCount ?? 0);

    if (total === 0) return 0;

    switch (data.sentimentLabel) {
      case "POSITIVE":
        return Math.round((data.positiveCount / total) * 100);
      case "NEUTRAL":
        return Math.round((data.neutralCount / total) * 100);
      case "NEGATIVE":
        return Math.round((data.negativeCount / total) * 100);
      default:
        return 0;
    }
  };

  const getStatusStyle = () => {
    if (match.status === "FINISHED" || match.status === "AWARDED") {
      return {
        label: "FINISHED",
        style:
          "bg-green-100 text-green-700 dark:bg-[rgba(0,229,160,0.12)] dark:text-[#00e5a0]",
      };
    }

    if (match.status === "IN_PLAY") {
      return {
        label: "LIVE",
        style:
          "bg-red-100 text-red-700 dark:bg-[rgba(255,76,106,0.12)] dark:text-[#ff4c6a]",
      };
    }

    if (match.status === "POSTPONED") {
      return {
        label: "POSTPONED",
        style:
          "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
      };
    }

    return {
      label: "UPCOMING",
      style: "bg-gray-100 dark:bg-[#1e1e2e] text-[#6b6b8a]",
    };
  };

  const getTagStyle = (label?: SentimentLabel) => {
    switch (label) {
      case "POSITIVE":
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
      case "NEUTRAL":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "NEGATIVE":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getBarColor = (label?: SentimentLabel) => {
    switch (label) {
      case "POSITIVE":
        return "bg-green-400 dark:bg-[#00e5a0]";
      case "NEUTRAL":
        return "bg-yellow-400";
      case "NEGATIVE":
        return "bg-red-400 dark:bg-[#ff4c6a]";
      default:
        return "bg-gray-300";
    }
  };

  const status = getStatusStyle();
  return (
    <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-4">
      {/* Date + Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[#6b6b8a]">
          {new Date(match.matchDayTime).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded ${status.style}`}
        >
          {status.label}
        </span>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center justify-between gap-4">
        {/* Home */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
          <img
            src={match.homeTeam.crest}
            alt={match.homeTeam.name}
            className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0"
          />
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
          <img
            src={match.awayTeam.crest}
            alt={match.awayTeam.name}
            className="w-8 h-8 object-contain shrink-0"
          />
        </div>
      </div>

      {/* Venue */}
      <p className="text-[11px] text-[#6b6b8a] mt-2 text-center">
        📍 {match.homeTeam.venue}
      </p>

      {/* Show sentiment in Result Tab */}
      {showSentiment && sentiment && (
        <div className="mt-3 pt-3 border-t border-[#e4e6eb] dark:border-[#1e1e2e]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Overall */}
            <div className="bg-gray-50 dark:bg-[#0a0a0f] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-semibold text-[#8b93a7] uppercase">
                  Overall
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTagStyle(
                      overall?.sentimentLabel,
                    )}`}
                  >
                    {overall?.sentimentLabel}
                  </span>
                 <span
                    className={`text-xs font-bold ${
                     getTagStyle(overall?.sentimentLabel)
                        .split(" ")
                        .find(c => c.startsWith("text-"))
                    }`}
                  >
                    {calculatePercentage(overall)}%
                  </span>
                </div>
              </div>

              <div className="w-full h-1.5 bg-[#e4e6eb] dark:bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBarColor(overall?.sentimentLabel)}`}
                  style={{ width: `${calculatePercentage(overall)}%` }}
                />
              </div>
            </div>

            {/* Home */}
            <div className="bg-gray-50 dark:bg-[#0a0a0f] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-semibold text-[#8b93a7] uppercase truncate">
                  {match.homeTeam.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTagStyle(
                      home?.sentimentLabel,
                    )}`}
                  >
                    {home?.sentimentLabel}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                     getTagStyle(home?.sentimentLabel)
                        .split(" ")
                        .find(c => c.startsWith("text-"))
                    }`}
                  >
                    {calculatePercentage(home)}%
                  </span>
                </div>
              </div>

              <div className="w-full h-1.5 bg-[#e4e6eb] dark:bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBarColor(home?.sentimentLabel)}`}
                  style={{ width: `${calculatePercentage(home)}%` }}
                />
              </div>
            </div>

            {/* Away */}
            <div className="bg-gray-50 dark:bg-[#0a0a0f] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-semibold text-[#8b93a7] uppercase truncate">
                  {match.awayTeam.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTagStyle(
                      away?.sentimentLabel,
                    )}`}
                  >
                    {away?.sentimentLabel}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                     getTagStyle(away?.sentimentLabel)
                        .split(" ")
                        .find(c => c.startsWith("text-"))
                    }`}
                  >
                    {calculatePercentage(away)}%
                  </span>
                </div>
              </div>

              <div className="w-full h-1.5 bg-[#e4e6eb] dark:bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBarColor(away?.sentimentLabel)}`}
                  style={{ width: `${calculatePercentage(away)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Button to redirect to corresponding match thread */}
      <div className="mt-3 flex justify-end">
        <button
          className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#00a865]/10 dark:bg-[#00e5a0]/10 border border-[#00a865]/20 dark:border-[#00e5a0]/20 text-[#00a865] dark:text-[#00e5a0] hover:bg-[#00a865]/20 dark:hover:bg-[#00e5a0]/20"
          onClick={() => {
            if (!match.homeTeam.forum) return;
            router.push(
              `/community/${match.homeTeam.forum.id}/threads/${match.thread.id}`,
            );
          }}
        >
          View Thread
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
            <path d="M2 6h8M6 2l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
