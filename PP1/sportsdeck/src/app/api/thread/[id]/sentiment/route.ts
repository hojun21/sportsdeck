import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { aggregateSentiment } from "@/lib/aiSentiment";

type Params = {
    params: {
        id: string;
    };
};

export async function GET (request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { error, user } = authorizeUser(request);

    if (error) return error;

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const threadId = Number(id);

        if (!Number.isInteger(threadId) || threadId <= 0) {
            return NextResponse.json(
                { error: "Invalid input type" },
                { status: 400 }
            );
        }

        // Get all the replies
        const thread = await prisma.thread.findUnique({
            where: { id: threadId }
        });

        if (!thread || thread.isBanned) {
            return NextResponse.json(
                { error: "No thread is found" },
                { status: 404 }
            );
        }

        const post = await prisma.post.findUnique({
            where: { threadId: threadId }
        });

        if (!post || post.isBanned) {
            return NextResponse.json(
                { error: "No post is found" },
                { status: 404 }
            );
        }

        const replies = await prisma.reply.findMany({
            where: { 
                postId: post.id,
                isBanned: false
            },
            select: {
                sentimentLabel: true,
                sentimentScore: true,
                author: {
                    select: {
                        favoriteTeamId: true,
                        favoriteTeam: {
                            select: {
                                id: true,
                                name: true,
                                shortname: true
                            }
                        }
                    }
                }
            }
        });

        // Get team based sentiment analysis 
        const matchId = thread.matchId;

        // Calculate sentiment for general thread 
        if (!matchId) {
            const { sentimentLabel, positiveCount, negativeCount, neutralCount } = aggregateSentiment(replies);

            return NextResponse.json(
                { sentimentLabel, positiveCount, negativeCount, neutralCount },
                { status: 200 }
            );
        } 

        const match = await prisma.match.findUnique({
            where: {id: matchId}
        });

        if (!match) {
            return NextResponse.json(
                { error: "No match is found" },
                { status: 400 }
            );
        }

        const homeTeamId = match.homeTeamId;
        const awayTeamId = match.awayTeamId;

        const homeReplies = replies.filter(
            r => r.author.favoriteTeamId === homeTeamId
        );


        const awayReplies = replies.filter(
            r => r.author.favoriteTeamId === awayTeamId
        );

        const overallData = aggregateSentiment(replies);
        const homeData = aggregateSentiment(homeReplies);
        const awayData = aggregateSentiment(awayReplies);

        return NextResponse.json(
            {
                "overallSentiment": overallData,
                "homeTeam": homeData,
                "awayTeam": awayData
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Sentiment analysis error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

