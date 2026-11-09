import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get thread history
export async function GET(request: Request, { params }: { params: Promise<{ threadId: string }> }){
    try {

        let {threadId} = await params;
        let threadIdNum = parseInt(threadId);
        if(isNaN(threadIdNum)) return NextResponse.json({error: "Thread ID missing."}, {status: 400});

        // Get thread
        const thread = await prisma.thread.findUnique({ where: {id: threadIdNum} });
        if(!thread) return NextResponse.json({error: "Thread not found."}, {status: 404});

        // Get history
        const thread_history = await prisma.threadHistory.findMany({
            where: {threadId: threadIdNum},
            orderBy: {editedAt: "desc"},
        });

        return NextResponse.json({current_thread: thread, thread_history}, {status: 200});

    } catch(error){
        return NextResponse.json({error: "Unexpected Error occured while fetching thread history."}, {status: 500});
    }

}