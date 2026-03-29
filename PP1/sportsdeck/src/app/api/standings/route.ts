import { NextResponse } from "next/server";
import { retrieveStanding } from "@/lib/retrieveStandings";

/**
 * GET api/standings
 * 
 * Allow visitors to get current league standings with all relevant result 
 * @returns 
 */
export async function GET (): Promise<NextResponse> {
    try {
        const data = await retrieveStanding();

        return NextResponse.json(
            data,
            { status: 200 }
        );
    } catch (error) {
        console.error("Visitor retrieve standing information error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}