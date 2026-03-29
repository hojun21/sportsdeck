import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
    params: {
        id: string;
    };
};

// Get all threads/posts and replies, ordered by date
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const idNum = Number(id);

        // Check if user exists
    const user = await prisma.user.findUnique({
        where: {
            id: idNum,
        },
        select: {
            id: true,
        },
    });
    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });


    const threads = await prisma.thread.findMany({
        where: {
            authorId: idNum,
        },
        include: { post: true },
    });

    const replies = await prisma.reply.findMany({
        where: {
            authorId: idNum,
        },
        include: { post: {include: {thread: true}}},
    });

    //https://stackoverflow.com/questions/48242218/typescript-concat-arrays-with-different-element-types
    const posts = [...threads, ...replies];

    //https://stackoverflow.com/questions/8837454/sort-array-of-objects-by-single-key-with-date-value
    posts.sort(function(a, b) {
    var keyA = new Date(a.createdAt), keyB = new Date(b.createdAt);
    // Compare the 2 dates
    if (keyA > keyB) return -1;
    if (keyA < keyB) return 1;
    return 0;
    });

    return NextResponse.json({posts: posts}, {status: 200});

}