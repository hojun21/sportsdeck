"use client";
import { useState, useEffect } from "react";

type Standing = {
    teamName: string;
    teamLogo: string;
    won: number;
    draw: number;
    lost: number;
    points: number;
    gamesPlayed: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
}

const LEGEND = [
  { abbrevation: "MP", label: "Matches Played" },
  { abbrevation: "W",  label: "Wins" },
  { abbrevation: "D",  label: "Draws" },
  { abbrevation: "L",  label: "Losses" },
  { abbrevation: "GF", label: "Goals For" },
  { abbrevation: "GA", label: "Goals Against" },
  { abbrevation: "GD", label: "Goal Difference" },
  { abbrevation: "PTS", label: "Points" },
];

export default function Standings() {
    const [standings, setStandings] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/standings")
        .then(res => res.json())
        .then(data => {
          setStandings(data)
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch standings:", err);
          setLoading(false);
        });
    }, [])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-[#6b6b8a] text-sm">Loading standings...</div>
        </div>
      );
    }
    return (
    <div className="min-h-screen px-4 py-2">
        <div className="max-w-4xl mx-auto font-sans">
            <div className="bg-white dark:bg-[#111118] border border-[#e4e6eb] dark:border-[#1e1e2e] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
            
            <thead>
                <tr className="border-b border-[#e4e6eb] dark:border-[#1e1e2e] bg-[#f4f5f7] dark:bg-[#0a0a0f]">
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-left text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a] w-10">#</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-left text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">Club</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">MP</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">W</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">D</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">L</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">GF</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">GA</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">GD</th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-md font-semibold tracking-wide text-[#8b93a7] dark:text-[#6b6b8a]">PTS</th>
                </tr>
            </thead>
            <tbody>
                {standings.map((team, index) => (
                <tr
                    key={index}
                    className="border-b border-[#e4e6eb] dark:border-[#1e1e2e] hover:bg-[#f4f5f7] dark:hover:bg-[#16161f]"
                >

                {/* Color first four index in green and the rest in grey*/}
                <td className="px-4 py-3">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      index < 4
                        ? "text-[#00a865] dark:text-[#00e5a0]"
                        : "text-[#8b93a7] dark:text-[#6b6b8a]"
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
 
                {/* Club name */}
                <td className="sm:py-3 py-2 sm:px-4 px-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={team.teamLogo}
                      alt={team.teamName}
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                    <span className="font-medium text-xs sm:text-sm text-[#0f1117] dark:text-[#f0f0f8]">
                      {team.teamName}
                    </span>
                  </div>
                </td>
 
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-center text-[#4b5263] dark:text-[#9090b0]">{team.gamesPlayed}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-center text-[#4b5263] dark:text-[#9090b0]">{team.won}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-center text-[#4b5263] dark:text-[#9090b0]">{team.draw}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-center text-[#4b5263] dark:text-[#9090b0]">{team.lost}</td>
 
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-center text-[#4b5263] dark:text-[#9090b0]">{team.goalsFor}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-center text-[#4b5263] dark:text-[#9090b0]">{team.goalsAgainst}</td>

                {/* Goal differences: color positive in green and negative in red */}
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-center font-medium">
                    <span
                    className={
                        team.goalDifference > 0
                        ? "text-[#00a865] dark:text-[#00e5a0]"
                        : team.goalDifference < 0
                        ? "text-[#e8284a] dark:text-[#ff4c6a]"
                        : "text-[#4b5263] dark:text-[#9090b0]"
                    }
                    >
                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                    </span>
                </td>
                
                {/* Points */}
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">
                  <span className="font-bold text-[#0f1117] dark:text-[#f0f0f8] text-xs sm:text-sm">
                    {team.points}
                  </span>
                </td>
              </tr>
            ))}
            </tbody>    
            </table> 
            </div> 

            <div className="border-t border-[#e4e6eb] dark:border-[#1e1e2e] px-4 py-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {/* Abbreviations */}
            {LEGEND.map(({ abbrevation, label }) => (
              <div key={abbrevation} className="flex items-center gap-1">
                <span className="text-xs font-semibold text-[#4b5263] dark:text-[#9090b0]">
                  {abbrevation}
                </span>
                <span className="text-xs text-[#8b93a7] dark:text-[#6b6b8a]">
                  = {label}
                </span>
              </div>
               ))}
               </div>
            </div>     
        </div>
    </div>
  );
}