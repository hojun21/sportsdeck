import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";

type Params = {
    params: {
        forumId: string;
        threadId: string;
    };
};

// This function is executed when user tries to make poll within a thread.
export async function POST(request: Request, { params }: { params: Promise<{ forumId: string, threadId: string }> }){

    try {

        const {error, user} = authorizeUser(request);
        if (error) return error;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // User check
        const curr_user = await prisma.user.findUnique({
            where: {id: user.id}
        })
        if(!curr_user){
            return NextResponse.json({error: "User not found."}, {status: 404});
        }
        if(curr_user.isBanned){
            return NextResponse.json({error: "You are banned."}, {status: 403});
        }

        const {forumId, threadId} = await params;
        const forumIdNum = Number(forumId);
        const threadIdNum = Number(threadId);

        if(isNaN(threadIdNum) || isNaN(forumIdNum)) return NextResponse.json({error: "Invalid params."}, {status: 400});

        // Fetch and validate threads
        const thread = await prisma.thread.findUnique({ where: {id: threadIdNum} });
        if(!thread) return NextResponse.json({error: "Thread not found."}, {status: 404});
        if(thread.isBanned) return NextResponse.json({error: "Thread is not available."}, {status: 403});
        if(thread.closeAt && new Date() > new Date(thread.closeAt)){
            return NextResponse.json({error: "Thread is closed."}, {status: 403});
        }

        // Check if poll already exists
        const poll_exists = await prisma.poll.findUnique({
            where: {threadId: threadIdNum}
        });
        if(poll_exists) return NextResponse.json({error: "Thread already has poll."}, {status: 409});
        
        const {question, deadline, options} = await request.json();

        // Input check
        if(!question || question.trim() === "" || typeof question !== "string"){
            return NextResponse.json({error: "Question is invalid."}, {status: 400});
        }
        // Deadline Check
        if(!deadline) return NextResponse.json({error: "Deadline is invalid."}, {status: 400});
        const d_Date = new Date(deadline);
        if(isNaN(d_Date.getTime())){
            return NextResponse.json({error: "Invalid deadline."}, {status: 400});
        }
        if(d_Date <= new Date()){
            return NextResponse.json({error: "Deadline cannot be past."}, {status: 400});
        }

        // Options check
        if(!Array.isArray(options)){
            return NextResponse.json({error: "Option has to be array."}, {status: 400});
        }
        if(options.length < 2){
            return NextResponse.json({error: "Poll needs at least 2 options."}, {status: 400});
        }
        if(options.length > 10){
            return NextResponse.json({error: "Poll can have 10 options maximum."}, {status: 400});
        }

        const poll = await prisma.poll.create({
            data: {
                question: question.trim(),
                deadline: d_Date,
                authorId: user.id,
                threadId: threadIdNum,
                options: {
                    create: options.map((text) => ({text: String(text).trim()})),
                },
            },
            include: {
                options: true,
            }
        });

        return NextResponse.json({poll}, {status: 201});

    } catch(error){

        return NextResponse.json({error: "Unexpected error has occured while creating poll within a thread"}, {status: 500});

    }

}