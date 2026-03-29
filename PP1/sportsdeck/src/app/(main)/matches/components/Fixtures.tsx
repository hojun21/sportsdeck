"use client";

import { useState, useEffect } from "react";
import MatchCard from "./MatchCard";
import { useRouter, useSearchParams } from "next/navigation";

type Forum = {
    id: number;
    name: string;
}

type Team = {
  name: string;
  crest: string;
  venue: string;
  forum: Forum;
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

export default function Fixtures() {
    const router = useRouter();
    const searchParams = useSearchParams()

    const [fixtures, setFixtures] = useState<Match[]>([]);
    const searchTeam = (searchParams.get("search") || "");
    const selectedMatchDay = searchParams.get("matchDay") ? Number(searchParams.get("matchDay")) : null;

    const filteredMatch = fixtures.filter((match: Match) => {
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
    const [loading, setLoading] = useState(true);

    // Get existing matchdays
    const matchDayOptions = [...new Set(fixtures.map(f => f.matchDay))].sort((a, b) => a - b);

    useEffect(() => {
        fetch("/api/matches?type=fixtures")
        .then(res => res.json())
        .then(data => {
            setFixtures(data)
            setLoading(false);
        })
        .catch(err => {
            console.error("Failed to fetch fixtures:", err)
            setLoading(false);
        });
    }, [])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-[#6b6b8a] text-sm">Loading fixtures...</div>
        </div>
      );
    }
    return (
    <div className="min-h-screen px-4 py-2 font-sans">
        <div className="flex justify-end mb-4 gap-2">
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
                        param.delete("search")
                    }

                    router.replace(`?${param.toString()}`)
                }}
                className="px-3 py-1.5 text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] focus:ring-2 focus:ring-[#00a865]/20 dark:focus:ring-[#00e5a0]/20"
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
                    param.delete("matchDay")
                }

                router.replace(`?${param.toString()}`)
            }}
             className="px-3 py-1.5 text-sm rounded-xl border border-[#e4e6eb] dark:border-[#1e1e2e] bg-white dark:bg-[#111118] text-[#4b5263] dark:text-[#9090b0] outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] cursor-pointer"
            >
                <option value = "">All</option>
                {matchDayOptions.map((day) => (
                    <option key={day} value={day}>
                        Matchday {day}
                    </option>
                ))}
            </select>
        </div>
        <div className="max-w-2xl mx-auto">
            {Object.entries(groupedByMatchDay).map(([matchDay, matches]: any) => (
            <div key={matchDay} className="mb-6">

                <h2 className="text-xs font-bold text-[#6b6b8a] tracking-widest mb-3">
                MATCHDAY {matchDay}
                </h2>

                <div className="flex flex-col gap-3">
                {matches.map((match: Match) => (
                    <MatchCard key={match.id} match={match} />
                ))}
                </div>

            </div>
            ))}

        </div>
    </div>
  );
}