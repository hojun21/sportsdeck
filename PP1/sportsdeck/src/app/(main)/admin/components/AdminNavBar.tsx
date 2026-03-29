"use client"

import Appeals from "./Appeals";
import Reports from "./Reports";
import { useRouter, useSearchParams } from "next/navigation"

export default function AdminNavBar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tab = searchParams.get("tab") || "reports";

    return (
        <div className="font-sans">
            <h1 className = "text-3xl font-bold mb-8">ADMIN PANEL</h1>
            <div className = "flex gap-8 border-b border-gray-300 dark:border-gray-600 mb-6">
                <button
                onClick = {() => {
                    const param = new URLSearchParams(searchParams.toString());
                    param.set("tab", "reports");

                    router.replace(`?${param.toString()}`)
                }}
                className={tab === "reports" ? "text-[#00a865] dark:text-[#18B973] border-b-2 border-[#00a865] dark:border-[#18B973] pb-3" : "text-gray-400 pb-3"}
                >
                    Reports
                </button>

                <button
                onClick = {() => {
                    const param = new URLSearchParams(searchParams.toString());
                    param.set("tab", "appeals");

                    router.replace(`?${param.toString()}`)
                }}
                className={tab === "appeals" ? "text-[#00a865] dark:text-[#18B973] border-b-2 border-[#00a865] dark:border-[#18B973] pb-3" : "text-gray-400 pb-3"}
                >
                    Appeals
                </button>
            </div>

            <div>
                {tab === "reports" && <Reports />}
                {tab === "appeals" && <Appeals />}
            </div>
        </div>
    )
}