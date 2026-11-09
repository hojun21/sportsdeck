import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";
import { updateReplySentiment } from "@/lib/aiSentiment";
import { moderateContent } from "../../../../../lib/aiModeration";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }){

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

        const {postId} = await params;
        const postIdNum = Number(postId);
        if(isNaN(postIdNum)) return NextResponse.json({error: "Post Id is missing."}, {status: 400});

        // Fetch post
        const post = await prisma.post.findUnique({
            where: {id: postIdNum}
        });

        if(!post) return NextResponse.json({error: "Post not found."}, {status: 404});
        // Check if post is available
        if(post.isBanned) return NextResponse.json({error: "This post is not available"}, {status:400});

        // parentId is set to null if not provided
        const {content, parentId = null} = await request.json();

        if(!content || content.trim() === ""){
            return NextResponse.json({error: "Content is missing."}, {status: 403});
        }

        // Check if parentId exists.  
        if(parentId !== null){

            const parentReply = await prisma.reply.findUnique({
                where: {id: parentId}
            });

            if(!parentReply){
                return NextResponse.json({error: "Parent reply not found."}, {status: 404});
            }
            
            // Check if they belongs to same post
            if(parentReply.postId !== postIdNum){
                return NextResponse.json({error: "Post Id does not match."}, {status: 400});
            }
        }   

        // Create reply
        const reply = await prisma.reply.create({
                data: {
                    content,
                    authorId : user.id,
                    postId: postIdNum,
                    parentId,
                }, 
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    parentId: true,
                    author: {
                        select: {id: true, username: true, avatar: true}
                    }
                }
            });

        // Non-blocking to update reply sentiment
        updateReplySentiment(reply.id, reply.content)
            .catch(error => console.error(error));

        // Analyze content verdict of reply generated
        moderateContent("REPLY", reply.id, reply.content)
            .catch(error => console.error(error));

        return NextResponse.json({reply}, {status: 200});

    } catch(error){
        console.error(error);
        return NextResponse.json({error: "Unexpected error occured while posting replies."}, {status: 500});

    }
}