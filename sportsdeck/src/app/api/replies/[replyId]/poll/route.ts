import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";

type Params = {
    params: {
        replyId: string;
    }
}

// POST function creating poll to replies
export async function POST(request: Request, { params }: { params: Promise<{ replyId: string }> }){

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

        const {replyId} = await params;
        const replyIdNum = Number(replyId);
        if(isNaN(replyIdNum)) return NextResponse.json({error: "Invalid params."}, {status: 400});

        // Fetch reply with its post and thread
        const reply = await prisma.reply.findUnique({
            where: {id: replyIdNum},
            include: {
                post: { include: {thread: true} }
            }
        });

        // Validates reply
        if(!reply) return NextResponse.json({error: "Reply does not exist."}, {status: 404});
        if(reply.isBanned) return NextResponse.json({error: "Reply is hidden."}, {status: 403});

        if(reply.post.thread.isBanned){
            return NextResponse.json({error: "Thread is banned."}, {status: 403});
        }
        if(reply.post.thread.closeAt && new Date() > new Date(reply.post.thread.closeAt)){
            return NextResponse.json({error: "Thread is closed."}, {status: 403});
        }

        const poll_exist = await prisma.poll.findUnique({
            where: {replyId: replyIdNum}
        });
        // 1 poll max per reply
        if(poll_exist){
            return NextResponse.json({error: "It can only have one reply."}, {status: 409});
        }

        const {question, deadline, options} = await request.json();

        // Question check
        if(!question || question.trim() === "") return NextResponse.json({error: "Question is required."}, {status: 400});
        if(typeof question !== "string") return NextResponse.json({error: "Question has to be string"}, {status: 400});

        // Deadline check
        const d_date = new Date(deadline);
        if(isNaN(d_date.getTime())){
            return NextResponse.json({error: "Invalid deadline format."}, {status: 400});
        }
        if(d_date <= new Date()){
            return NextResponse.json({error: "Deadline cannot be past."}, {status: 400});
        }

        // Option Check
        if(!Array.isArray(options)){
            return NextResponse.json({error: "Options has to be stored in array"}, {status: 400});
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
                deadline: d_date,
                authorId: user.id,
                replyId: replyIdNum,
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

        console.log(error);
        return NextResponse.json({error: "Unexpected Error occured while creating poll within a reply"}, {status: 500});
    
    }

}