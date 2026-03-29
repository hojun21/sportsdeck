"use client";

import { useState, useEffect } from "react";
import MatchCard from "./MatchCard";
import { useRouter, useSearchParams } from "next/navigation";

type Team = {
  name: string;
  crest: string;
  venue: string;
  forum?: Forum;
};

type Thread = {
    id: number;
}

type Match = {
  id: number;
  matchDay: number;
  matchDayTime: string;
  status: string;
  homeTeam: Team;
  awayTeam: { name: string; crest: string };
  homeScore: number | null;
  awayScore: number | null;
  thread: Thread
};

type Forum = {
  id: number;
  name: string;
};

export default function Results() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [results, setResults] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
   
    const sortOrder = (searchParams.get("sort") as "asc" | "desc") || "desc";
    const selectedMatchDay = searchParams.get("matchDay") ? Number(searchParams.get("matchDay")) : null;
    const searchTeam = (searchParams.get("search") || "");

    const filteredMatch = results.filter((match: Match) => {
            const filteredMatchDay = selectedMatchDay === null || match.matchDay === selectedMatchDay;

            const searchedTeam = 
                match.homeTeam.name.toLowerCase().includes(searchTeam.toLowerCase()) ||
                match.awayTeam.name.toLowerCase().includes(searchTeam.toLowerCase())

            return filteredMatchDay && searchedTeam;
        }
    )

    const groupedByMatchDay = filteredMatch.reduce((acc: any, match: Match) => {
        if (!acc[match.matchDay]) acc[match.matchDay] = [];
        acc[match.matchDay].push(match);
        return acc;
    }, {});

     // Get existing matchdays
    const matchDayOptions = [...new Set(results.map(f => f.matchDay))].sort((a, b) => a - b);

    useEffect(() => {
        fetch("/api/matches?type=results")
        .then(res => res.json())
        .then(data => {
            setResults(data)
            setLoading(false);
        })
        .catch(err => {
            console.error("Failed to fetch results:", err);
            setLoading(false);
        });
    }, [])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-[#6b6b8a] text-sm">Loading results...</div>
        </div>
      );
    }
    return (
     <div className="min-h-screen px-4 py-2">
        <div className="flex justify-end mb-3 gap-1.5 sm:gap-2 flex-wrap">
            {/** Search bar to search for desired team's upcoming matches */}
            <input
                type = "text"
                placeholder="Search for teams..."
                value = {searchTeam}
                onChange = {(e) => {
                    const value = e.target.value;

                    const param = new URLSearchParams(searchParams.toString());
                    if (value) {
                        param.set("search", value);
                    } else {
                        param.delete("search");
                    }

                    router.replace(`?${param.toString()}`)
                }}
                className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] focus:ring-2 focus:ring-[#00a865]/20 dark:focus:ring-[#00e5a0]/20"
            >
            </input>

            {/** Dropdown to filter based on matchdays */}
            <select
            value = { selectedMatchDay ?? ""}
            onChange = {(e) => {
                const value = e.target.value;

                const param = new URLSearchParams(searchParams.toString());
                if (value) {
                    param.set("matchDay", value);
                } else {
                    param.delete("matchDay");
                }

                router.replace(`?${param.toString()}`)
            }}
             className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] cursor-pointer"
            >
                <option value = "">All</option>
                {matchDayOptions.map((day) => (
                    <option key={day} value={day}>
                        Matchday {day}
                    </option>
                ))}
            </select>

            <button
                onClick={() => {
                    const newSortOrder = sortOrder === "desc" ? "asc" : "desc";

                    const param = new URLSearchParams(searchParams.toString());
                    param.set("sort", newSortOrder);
                    router.replace(`?${param.toString()}`)
                }
                }
                className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] cursor-pointer hover:bg-green-100 dark:hover:text-gray-800"
            >
                Sort: {sortOrder === "desc" ? "Newest" : "Oldest"}
            </button>
        </div>
        <div className="max-w-2xl mx-auto">
            {Object.entries(groupedByMatchDay)
            .sort((a, b) => 
                sortOrder === "desc"
                    ? Number(b[0]) - Number(a[0])
                    : Number(a[0]) - Number(b[0])
            )
            .map(([matchDay, matches]: any) => (
            <div key={matchDay} className="mb-6">

                <h2 className="text-xs font-bold text-[#6b6b8a] tracking-widest mb-3">
                MATCHDAY {matchDay}
                </h2>

                <div className="flex flex-col gap-3">
                {matches.map((match: Match) => (
                    <MatchCard key={match.id} match={match} showSentiment={true}/>
                ))}
                </div>

            </div>
            ))}

        </div>
    </div>
  );
}