import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fetch epl team ids, team name and team logo
export async function GET() {
    const teams = await prisma.team.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            crest: true,
        }
    });
    return NextResponse.json(teams, {status: 200});
}