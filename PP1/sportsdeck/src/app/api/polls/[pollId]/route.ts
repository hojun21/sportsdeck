import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";

type Params = {
    params: {
        pollId: string;
    };
};

// PATCH function executed when user tries to modify their polls.
export async function PATCH(request: Request, { params }: { params: Promise<{ pollId: string }> }){

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
            where: {id: pollIdNum}
        });

        if(!poll) return NextResponse.json({error: "Poll not found."}, {status: 404});

        const {new_question} = await request.json();

        if(!new_question || new_question.trim() === "" || typeof new_question !== "string"){
            return NextResponse.json({error: "Question is invalid"}, {status: 400});
        }

        const new_poll = await prisma.poll.update({
            where: {id: pollIdNum},
            data: {question: new_question.trim()},
            include: {options: true}
        });

        return NextResponse.json({poll: new_poll}, {status: 200});

    } catch(error) {
        return NextResponse.json({error: "Unexpected error occured while "}, {status: 500});
    }
}

// DELETE function executed when user tries to delete poll
export async function DELETE(request: Request, { params }: { params: Promise<{ pollId: string }> }){

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

        // Fetch poll
        const poll = await prisma.poll.findUnique({ where: {id: pollIdNum} });
        if(!poll) return NextResponse.json({error: "Poll not found."}, {status: 404});

        // Only author can delete
        if(poll.authorId !== user.id){
            return NextResponse.json({error: "No permission to edit this poll."}, {status: 403});
        }

        // Deletes poll and its related poll options and votes
        await prisma.poll.delete({where: {id: pollIdNum}});

        return NextResponse.json({message: "Poll has been deleted successfully."}, {status: 200});

    } catch(error){
        console.log(error);
        return NextResponse.json({error: "Unexpected error occured while deleting poll"}, {status: 500});
    }
}

// GET function executed when person tries to view the poll result
export async function GET(request: Request, { params }: { params: Promise<{ pollId: string }> }){

    try {

        // get pollID from params
        const {pollId} = await params;
        const pollIdNum = Number(pollId);
        if(isNaN(pollIdNum)) return NextResponse.json({error: "Poll ID missing."}, {status: 400});

        // get poll entity
        const poll = await prisma.poll.findUnique({
            where: {id: pollIdNum},
            include: {
                author: {select: {id: true, username: true, avatar: true}},
                options: {
                    include: {
                        _count: {select: {votes: true}}
                    }
                }
            }
        });

        if(!poll) return NextResponse.json({error: "Poll not found."}, {status: 404});

        // Get total number of votes
        const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);

        const isClosed = new Date() > new Date(poll.deadline);

        const poll_result = {
            id: poll.id,
            question: poll.question,
            deadline: poll.deadline,
            isClosed,
            totalVotes,
            author: poll.author,
            options: poll.options.map(o => ({
                id: o.id,
                text: o.text,
                votes: o._count.votes,
                // Calculate percentage
                percentage: totalVotes > 0 ? Math.round((o._count.votes / totalVotes) * 100) : 0
            }))
        };

        return NextResponse.json({poll: poll_result}, {status: 200});

    } catch(error){
        console.log(error);
        return NextResponse.json({error: "Unexpected Error has occured while viewing poll result."}, {status: 500});
    }

}