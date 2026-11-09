import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";

type Params = {
    params: {
        pollId: string;
    };
};

// POST function executed when user votes
export async function POST(request: Request, { params }: { params: Promise<{ pollId: string }> }){

    try {

        const {error, user} = authorizeUser(request);
        if (error) return error;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        // Check if user is banned
        const curr_user = await prisma.user.findUnique({
            where: {id: user.id}
        })

        if(!curr_user){
            return NextResponse.json({error: "User not found."}, {status: 404});
        }

        if(curr_user.isBanned){
            return NextResponse.json({error: "You are banned."}, {status: 403});
        }

        const {pollId} = await params;
        const pollIdNum = Number(pollId);

        if(isNaN(pollIdNum)) return NextResponse.json({error: "Poll ID missing."}, {status: 400});

        const poll = await prisma.poll.findUnique({
            where: {id: pollIdNum},
            include: {options: true}
        });

        if(!poll) return NextResponse.json({error: "Poll not found."}, {status: 404});

        if(new Date() > new Date(poll.deadline)){
            return NextResponse.json({error: "Poll is closed."}, {status: 403});
        }

        // Get option id of voted poll option
        const {optionId} = await request.json();
        if(!optionId) return NextResponse.json({error: "Option ID is invalid."}, {status: 400});

        // Check if polloption belongs to poll with id
        const option = poll.options.find(o => o.id === optionId);
        if(!option) return NextResponse.json({error: "This poll option does not belong to this poll."}, {status: 400});

        const already_voted = await prisma.vote.findFirst({
            where: {
                userId: user.id,
                option: {
                    pollId: pollIdNum
                }
            }
        });

        // If user votes to same option, cancel the vote
        if(already_voted && already_voted.optionId === optionId){
            await prisma.vote.delete({ where: {id: already_voted.id} });
            return NextResponse.json({message: "Vote cancelled."}, {status: 200});
        }
        if(already_voted){
            await prisma.vote.delete({ where: {id: already_voted.id} });
        }

        // Create new vote if user votes to other option again
        await prisma.vote.create({
            data: {
                userId: user.id,
                optionId,
            }
        });

        return NextResponse.json({message: "Voted successfully."}, {status: 201});

    } catch(error) {
        return NextResponse.json({error: "Unexpected Error occured while voting."}, {status: 500});
    }

}