import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { retrieveStanding } from "./retrieveStandings";

type Digest = {
    topDiscussionsSummary: string,
    matchResultSummary: string,
    standingsSummary: string
}

type Discussion = {
    title: string;
    postContent: string | null;
    replyCount: number;
}

type ThreadQueryResult = {
    id: number;
    title: string;
    createdAt: Date;
    post: {
        content: string | null,
        _count: {
            replies: number
        };
    } | null;
};

type MatchQueryResult = {
    homeTeam: { name: string };
    awayTeam: { name: string };
    homeScore: number | null;
    awayScore: number | null;
};

// Cache it so it only queries the API once per day
let cacheDigest: Digest | null = null;
let cacheDate: string | null = null;

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

export async function generateDigest(): Promise<Digest> {
    const today = new Date().toDateString();

    // Return cache digest if its generated today
    if (cacheDigest && cacheDate === today) {
        return cacheDigest;
    }

    // Get top 5 discussion threads
    const topDiscussions = await prisma.thread.findMany({
        where: {
            isBanned: false
        },
        select: {
            id: true,
            title: true,
            createdAt: true,
            post: {
                select: {
                    content: true,
                    _count: {
                        select: {
                            replies: true
                        }
                    }
                }
            }
        },
        take: 50
    });
    
    // Format the data to get the top 5 discussions to be sent to gemini
    const formattedDiscussions: Discussion[] = topDiscussions.map( (t: ThreadQueryResult) => ({
        title: t.title,
        postContent: t.post?.content ?? null,
        replyCount: t.post?._count.replies || 0
    }))
    .sort((a: Discussion, b: Discussion)=> b.replyCount - a.replyCount)
    .slice(0, 5);

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 14);

    const matches = await prisma.match.findMany({
        where: {
            status: "FINISHED",
            matchDayTime: {
                gte: startDate,
                lte: now
            }
        },
        include: {
            homeTeam: true,
            awayTeam: true
        },
        orderBy: {
            matchDayTime: "desc"
        },
        take: 20
    })

    const formatMatches = matches.map ( (m: MatchQueryResult) => ({
        homeTeamName: m.homeTeam.name,
        homeTeamScore: m.homeScore,
        awayTeamName: m.awayTeam.name,
        awayTeamScore: m.awayScore
    }));

    const standings = await retrieveStanding();
    const topTeams = standings.slice(0, 10);

    const prompt = `
    You are generating a daily football community digest.

    Summarize the data provided and return only valid JSON.

    Do not include any explanations, markdown or extra text.

    Return only JSON as the exact form below.
    {
        "topDiscussionsSummary": "string",
        "matchResultSummary": "string",
        "standingsSummary": "string"
    }

    Top Discussions:
    ${JSON.stringify(formattedDiscussions)}

    Match Results: 
    ${JSON.stringify(formatMatches)}

    Standings: 
    ${JSON.stringify(topTeams)}
    `
    
    let digest: Digest;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        digest = JSON.parse(text) as Digest;
    } catch(error) {
        console.error("Fail to parse Gemini response: ", error);
        if (cacheDigest) return cacheDigest;
        throw new Error("Invalid AI response");
    }
    
    cacheDigest = digest;
    cacheDate = today;

    return digest;
}
