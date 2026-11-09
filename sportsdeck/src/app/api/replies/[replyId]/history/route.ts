import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET function executed when viewing reply history
export async function GET(request: Request, { params }: { params: Promise<{ replyId: string }> }){

    try{

        const {replyId} = await params;
        const replyIdNum = Number(replyId);
        if(isNaN(replyIdNum)) return NextResponse.json({error: "Reply ID missing."}, {status: 400});

        const reply = await prisma.reply.findUnique({ where: {id: replyIdNum} });
        if(!reply) return NextResponse.json({error: "Reply not found."}, {status: 404});

        const reply_history = await prisma.replyHistory.findMany({
            where: {replyId: replyIdNum},
            orderBy: {editedAt: "desc"},
        });

        return NextResponse.json({reply, reply_history}, {status: 200});

    } catch(error){
        return NextResponse.json({error: "Unexpected Error occured while viewing reply history"}, {status: 500});
    }
}