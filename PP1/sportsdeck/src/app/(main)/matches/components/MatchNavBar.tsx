"use client"

import { useState } from "react";
import Fixtures from "./Fixtures";
import Results from "./Results";
import Standings from "./Standings";
import { useRouter, useSearchParams } from "next/navigation"

export default function MatchNavBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tab = searchParams.get("tab") || "fixtures";

    return (
        <div className="font-sans">
            <h1 className = "text-xl sm:text-3xl font-bold mb-4 sm:mb-8">MATCHES</h1>
            <div className = "flex gap-4 sm:gap-8 border-b border-gray-300 dark:border-gray-600 mb-6">
                <button
                onClick = {() =>{
                    const param = new URLSearchParams(searchParams.toString());
                    param.set("tab", "fixtures");
                    router.replace(`?${param.toString()}`)
                }}
                className={tab === "fixtures" ? "text-[#00a865] text-sm sm:text-base dark:text-[#18B973] border-b-2 border-[#00a865] dark:border-[#18B973] pb-2 sm:pb-3" : "text-gray-400 pb-2 sm:pb-3 text-sm sm:text-base"}
                >
                    Fixtures
                </button>

                <button
                onClick = {() => {
                    const param = new URLSearchParams(searchParams.toString());
                    param.set("tab", "results");
                    router.replace(`?${param.toString()}`)
                }}
                className={tab === "results" ? "text-[#00a865] text-sm sm:text-base dark:text-[#18B973] border-b-2 border-[#00a865] dark:border-[#18B973] pb-2 sm:pb-3" : "text-gray-400 pb-2 sm:pb-3 text-sm sm:text-base"}
                >
                    Results
                </button>

                <button
                onClick = {() => {
                    const param = new URLSearchParams(searchParams.toString());
                    param.set("tab", "standings");
                    router.replace(`?${param.toString()}`)
                }}
                className={tab === "standings" ? "text-[#00a865] text-sm sm:text-base dark:text-[#18B973] border-b-2 border-[#00a865] dark:border-[#18B973] pb-2 sm:pb-3" : "text-gray-400 pb-2 sm:pb-3 text-sm sm:text-base"}
                >
                    Standings
                </button>
            </div>

            <div>
                {tab === "fixtures" && <Fixtures />}
                {tab === "results" && <Results />}
                {tab === "standings" && <Standings />}
            </div>
        </div>
    )
}