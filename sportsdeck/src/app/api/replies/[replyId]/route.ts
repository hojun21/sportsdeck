import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";
import { moderateContent } from "@/lib/aiModeration";

// PATCH function executed when user edits reply
export async function PATCH(request: Request, { params }: { params: Promise<{ replyId: string }> }) {

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

        const {replyId} = await params;
        const replyIdNum = Number(replyId);
        if(isNaN(replyIdNum)) return NextResponse.json({error: "Reply Id is missing."}, {status: 400});

        // Fetch reply and its related post and thread
        const reply = await prisma.reply.findUnique({
            where: {id: replyIdNum},
            include: {
                post: {
                    include: {thread: true}
                }
            }
        });

        if(!reply) return NextResponse.json({error: "reply not found."}, {status: 404});
        if(reply.isBanned) return NextResponse.json({error: "Reply is not available."}, {status: 403});
        
        if(reply.authorId !== user.id){
            return NextResponse.json({error: "You don't have permission to edit this reply."}, {status: 403});
        }
        
        // Check if thread is closed or banned
        if(reply.post.thread.closeAt && new Date() > new Date(reply.post.thread.closeAt)){
            return NextResponse.json({error: "Thread is closed."}, {status: 403});
        }
        if(reply.post.thread.isBanned){
            return NextResponse.json({error: "Thread is not available."}, {status: 403});
        }

        const {content} = await request.json();

        if(!content || content.trim() === ""){
            return NextResponse.json({error: "Content is required."}, {status: 400});
        }

        // Content must be string
        if(typeof content !== "string") return NextResponse.json({error: "Invalid content type."}, {status: 400});

        // Save original reply
        await prisma.replyHistory.create({
            data: {
                content: reply.content,
                replyId: reply.id,
            }
        });

        const updated_reply = await prisma.reply.update({
            where: {id: replyIdNum},
            data: {content: content.trim()},
            select: {
                id: true,
                content: true,
                updatedAt: true,
                author: {select: {id: true, username: true, avatar: true}},
            }
        });

        moderateContent("REPLY", updated_reply.id, updated_reply.content).catch(console.error);

        return NextResponse.json({reply: updated_reply}, {status: 200});

    } catch(error) {

        return NextResponse.json({error: "Unexpected error occured while editing a reply."}, {status: 500});

    }

}


// DELETE function executed when users try to delete their own replies
export async function DELETE(request: Request, { params }: { params: Promise<{ replyId: string }> }){

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

        const {replyId} = await params;
        const replyIdNum = Number(replyId);
        if(isNaN(replyIdNum)) return NextResponse.json({error: "Reply Id is missing."}, {status: 400});

        // Fetch post
        const reply = await prisma.reply.findUnique({
            where: {id: replyIdNum},
            include: {
                post: { include: {thread: true} }
            }
        });

        if(!reply) return NextResponse.json({error: "Reply not found."}, {status: 404});

        // Only author or ADMIN can delete replies
        if(reply.authorId !== user.id && curr_user.role !== "ADMIN"){
            return NextResponse.json({error: "You don't have permission to delete this reply"}, {status: 403});
        }

        // Update content to deleted
        await prisma.reply.update({
            where: {id: replyIdNum},
            data: {
                content: "[This reply is deleted]",
            }
        });

        return NextResponse.json({message: "Reply has been deleted successfully."}, {status: 200});


    } catch(error){

        return NextResponse.json({error: "Unexpected Error occured while deleting replies."}, {status: 500});

    }

}