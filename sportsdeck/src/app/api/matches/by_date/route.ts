import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MatchParam = {
    id: number;
    externalId: number;
    status: string;
    matchDay: number;
    matchDayTime: Date;
    homeTeam: {
        id: number;
        name: string;
        crest: string;
    };
    awayTeam: {
        id: number;
        name: string;
        crest: string;
    };
    homeScore: number | null;
    awayScore: number | null;
}

type ParsedMatch = {
    id: number;
    externalId: number;
    status: string;
    date: string;
    matchDay: number;
    homeTeam: {
        id: number;
        name: string;
        crest: string;
    };
    awayTeam: {
        id: number;
        name: string;
        crest: string;
    };
    score: {
        home: number | null;
        away: number | null;
    }
    
}

export function parseMatch(match : MatchParam): ParsedMatch{
    return {
        id: match.id,
        externalId: match.externalId,
        status: match.status,
        date: match.matchDayTime.toISOString(),
        matchDay: match.matchDay,
        homeTeam: {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            crest: match.homeTeam.crest,
        },
        awayTeam: {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            crest: match.awayTeam.crest,
        },
        score: {
            home: match.homeScore,
            away: match.awayScore,
        },
    };
}


// GET function executed when fetching games by date.
export async function GET(request: Request): Promise<NextResponse>{
    try {

        const {searchParams} = new URL(request.url);
        const date = searchParams.get("date");

        // Date validation check
        if(!date) return NextResponse.json({error: "Date is missing."}, {status: 400});

        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if(!regex.test(date)) return NextResponse.json({error: "Invalid date format. Use YYYY-MM-DD."}, {status: 400});
        
        // Return error if trying to fetch today's match or in the future
        const today: Date = new Date();

        // get yesterday's date
        today.setDate(today.getDate() - 1); 
        const yesterday = today.toISOString().split("T")[0];
        if(date > yesterday) return NextResponse.json({error: "Only past match data is available."}, { status: 400 });

        // Fetch
        const matches_in_db = await prisma.match.findMany({
            where: {
                matchDayTime: {
                    gte: new Date(`${date}T00:00:00Z`),
                    lt: new Date(`${date}T23:59:59Z`),
                }
            },
            include: {
                homeTeam: true,
                awayTeam: true,
            }
        });

        // Extract information needed from matches and then return 
        if(matches_in_db.length > 0) return NextResponse.json({ date, matches: matches_in_db.map(parseMatch)}, {status: 200})

        // Fetch game matches data for selected date
        const response = await fetch(
            `https://api.football-data.org/v4/competitions/2021/matches?dateFrom=${date}&dateTo=${date}`,
            {headers: {"X-Auth-Token": process.env.FOOTBALL_API_KEY!}}
        );
        if(!response.ok) return NextResponse.json({error: "Data not available."}, {status: 400});

        const data = await response.json();
        
        // AFter fetching data, store in db if it doesn't exist
        for(const match of data.matches){

            // Fetch home & away
            const home = await prisma.team.findUnique({
                where: {
                    externalId: match.homeTeam.id
                }
            });
            const away = await prisma.team.findUnique({
                where: {
                    externalId: match.awayTeam.id
                }
            });

            if(!home || !away) continue;

            await prisma.match.upsert({
                where: { externalId: match.id },
                update: {
                    status: match.status,
                    homeScore: match.score.fullTime.home,
                    awayScore: match.score.fullTime.away,
                },
                create: {
                    externalId: match.id,
                    matchDayTime: new Date(match.utcDate),
                    matchDay: match.matchDay,
                    status: match.status,
                    homeTeamId: home.id,
                    awayTeamId: away.id,
                    homeScore: match.score.fullTime.home,
                    awayScore: match.score.fullTime.away,
                }
            });
        }

        const saved = await prisma.match.findMany({
            where: {
                matchDayTime: {
                    gte: new Date(`${date}T00:00:00Z`),
                    lt: new Date(`${date}T23:59:59Z`),
                }
            },
            include: {homeTeam: true, awayTeam: true}
        });

        return NextResponse.json(saved, {status: 200});

    } catch(error){

        console.log(error);
        return NextResponse.json({error: "Unexpected Error occured while fetching matches by date."}, {status: 500});

    }
}