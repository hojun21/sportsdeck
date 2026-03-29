import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
    params: {
        postId: string
    }
}

// GET post history
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {

    try {

        const {postId} = await params;
        const postIdNum = parseInt(postId);
        if(isNaN(postIdNum)) return NextResponse.json({error: "Post ID missing."}, {status: 400});

        const post = await prisma.post.findUnique({ where: {id: postIdNum} });
        if(!post) return NextResponse.json({error: "Post not found."}, {status: 404});

        const post_history = await prisma.postHistory.findMany({
            where: {postId: postIdNum},
            orderBy: {editedAt: "desc"},
        });

        return NextResponse.json({post, post_history}, {status: 200});

    } catch(error) {

        return NextResponse.json({error: "Unexpected error has occured while fetching post history"}, {status: 500});

    }
}