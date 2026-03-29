import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";
import { moderateContent } from "@/lib/aiModeration";

type Params = {
    params: {
        postId: string;
    };
};

// PATCH function executed when user edits post
export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }){
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
        const postIdNum = parseInt(postId);
        if(isNaN(postIdNum)) return NextResponse.json({error: "Post Id is missing."}, {status: 400});

        // Fetch post
        const post = await prisma.post.findUnique({
            where: {id: postIdNum},
            include: {thread: true}
        });

        if(!post) return NextResponse.json({error: "Post not found."}, {status: 404});
        
        // Match posts cannot be edited. 
        if(post.thread.matchId !== null){
            return NextResponse.json({error: "Match posts cannot be edited."}, {status: 403});
        }

        // Only author can edit
        if(post.authorId !== user.id) return NextResponse.json({error: "No permission to edit post"}, {status:403});

        // Post cannot be edited if user is banned 
        if(post.thread.isBanned) return NextResponse.json({error: "This post is banned."}, {status:400});

        // Check if it's open
        if(post.thread.closeAt && new Date() > new Date(post.thread.closeAt)){
            return NextResponse.json({error: "This post is closed."}, {status: 403});
        }

        const {content} = await request.json();

        if(!content || content.trim() === ""){
            return NextResponse.json({error: "Content is required."}, {status: 400});
        }

        if(content.trim() === post.content){
            return NextResponse.json({error: "Content is the same as current."}, {status: 400});
        }

        if(typeof content !== "string"){
            return NextResponse.json({error: "Invalid Type of content."}, {status: 400});
        }

        // Save original version to history
        await prisma.postHistory.create({
            data: {
                content: post.content,
                postId: post.id,
            }
        });

        const updated_post = await prisma.post.update({
            where: {id: postIdNum},
            data: {content: content.trim()},
            select: {
                id: true,
                content: true,
                updatedAt: true,
                author: {select: {id: true, username: true, avatar: true}},
            }
        });
        
        moderateContent("POST", updated_post.id, updated_post.content)
        .catch(console.error);

        return NextResponse.json({post: updated_post}, {status: 200});

    } catch(error){

        return NextResponse.json({error: "Unexpected error occurred while updating post."}, {status: 500});

    }
}