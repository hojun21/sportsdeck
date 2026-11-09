import { generateDigest } from "@/lib/geminiSummary";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
    try{
        const data = await generateDigest();

        return NextResponse.json(
            data,
            { status: 200 }
        );
    } catch (error) {
        console.error("Retrieving daily digest post error: ", error);
        
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}