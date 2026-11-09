import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startCronJobs } from "@/lib/cron";
import { retrieveMatch } from "@/lib/retrieveMatch";

startCronJobs();

/**
 * GET api/matches
 * 
 * Visitor are able to view upcoming and recent matches in the league
 */
export async function GET (request: Request): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");

        let statusFilter = {};

        if (type === "fixtures") {
            statusFilter = {
                in: ["TIMED", "SCHEDULED", "POSTPONED"]
            };
        }

        if (type === "results") {
            statusFilter = {
                in: ["IN_PLAY", "PAUSED", "FINISHED"]
            };
        }

        // Get matches from the past 7 days and upcoming 14 days
        const currDate: Date = new Date();

        const startDate: Date = new Date();
        startDate.setDate(currDate.getDate() - 14);

        const endDate: Date = new Date();
        endDate.setDate(currDate.getDate() + 21);


        let matches = await prisma.match.findMany({
            where: { 
                matchDayTime: {
                    gte: startDate,
                    lte: endDate
                },
                ...(type && { status: statusFilter })
            },
            orderBy: {
                matchDayTime: "asc"
            },
            include: {
                homeTeam: {
                    select: {
                        name: true,
                        crest: true,
                        venue: true,
                        forum: true
                    }
                },
                awayTeam: {
                    select: {
                        name: true,
                        crest: true
                    }
                },
                thread: true
            }
        });

        if (matches.length === 0) {
            await retrieveMatch();

            matches = await prisma.match.findMany({
                where: { 
                    matchDayTime: {
                        gte: startDate,
                        lte: endDate
                    },
                    ...(type && { status: statusFilter })
                },
                orderBy: {
                    matchDayTime: "asc"
                },
                include: {
                    homeTeam: {
                        select: {
                            name: true,
                            crest: true,
                            venue: true,
                            forum: true
                        }
                    },
                    awayTeam: {
                        select: {
                            name: true,
                            crest: true
                        }
                    },
                    thread: true
                }
            });
        }

        return NextResponse.json(
            matches,
            { status: 200 }
        )
    } catch (error) {
        console.error("Visitor retrieve matches information error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    } 
}