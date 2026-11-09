import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";
import { moderateContent } from "@/lib/aiModeration";

// DELETE function which is called when thread is deleted. By using cascade, it also deletes main post 
// & replies under this thread.
export async function DELETE(request: Request, { params }: { params: Promise<{ forumId: string, threadId: string }> }){

    try {
        
        const {error, user} = authorizeUser(request);
        if (error) return error;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const curr_user = await prisma.user.findUnique({
            where: {id: user.id}
        });

        if(!curr_user) return NextResponse.json({error: "User not Found."}, {status: 404});

        const {forumId, threadId} = await params;
        const forumIdNum = Number(forumId);
        const threadIdNum = Number(threadId);

        if(isNaN(forumIdNum) || isNaN(threadIdNum)){
            return NextResponse.json({error: "Invalid parameters."}, {status: 400});
        }

        const thread = await prisma.thread.findUnique({
            where: {id: threadIdNum, forumId: {
                has: forumIdNum
            }
        }
        });

        // Throw error if thread not found
        if(!thread) return NextResponse.json({error: "Thread trying to delete not found."}, {status: 404});

        // Match threads cannot be deleted.
        if(thread.matchId !== null){
            return NextResponse.json({error: "Match thread cannot be deleted"}, {status: 403});
        }

        // Admin or author can delete thread only
        if(curr_user.role !== "ADMIN" && thread.authorId !== user.id){
            return NextResponse.json({error: "No permission to delete this thread"}, {status: 403});
        }

        // Delete thread and related post & replies
        await prisma.thread.delete({where: {id: threadIdNum}});

        return NextResponse.json({message: "Thread has been deleted successfully"}, {status: 200});

    } catch(error){

        return NextResponse.json({error: "Unexpected Error occured while deleting thread, post"}, {status: 500});

    }
}

// GET thread and its post and replies
export async function GET(request: Request, { params }: { params: Promise<{ forumId: string, threadId: string }> }){
    try {   

        const { user } = authorizeUser(request);
        const currentUserId = user?.id ?? null;
        const {forumId, threadId} = await params;
        const forumIdNum = Number(forumId);
        const threadIdNum = Number(threadId);

        if(isNaN(forumIdNum) || isNaN(threadIdNum)){
            return NextResponse.json({error: "Invalid parameters."}, {status: 400});
        }

        // Get thread, and its post and replies
        const thread = await prisma.thread.findUnique({
            where: {id: threadIdNum},
            include: {
                author: {select: {id: true, username: true, avatar: true}},
                forum: {
                        select: {
                            id: true,
                            team: {
                                select: {
                                    id: true,
                                    name: true,
                                    crest: true,
                                }
                            }
                        }
                },
                tags: {select: {tag: {select: {id: true, name: true}}}},
                poll: {
                    include: {
                        options: {
                            orderBy: { id: "asc" },
                            include: {
                                _count: {select: {votes: true}}
                            }
                        }
                    }
                },
                post: {
                    include: {
                        author: {select: {id: true, username: true, avatar: true}},
                        replies: {
                            where: {
                                OR: [
                                    { isBanned: false, author: { isBanned: false } },
                                    { authorId: currentUserId ?? -1 },
                                ]
                            },
                            orderBy: { createdAt: "asc" },
                            include: {
                                author: { select: { id: true, username: true, avatar: true } },
                                poll: {
                                    include: {
                                        options: {
                                            orderBy: { id: "asc" },
                                            include: { _count: { select: { votes: true } } }
                                        }
                                    }
                                },
                            }
                        },
                    }
                }
            }
        });

        if(!thread) return NextResponse.json({error: "thread not found"}, {status: 404});
        if(!(thread.forumId.includes(forumIdNum))) return NextResponse.json({error: "Thread not found."}, {status: 404});

        // return thread, tags and boolean that shows if its closed or not.
        return NextResponse.json({
            thread: {
                ...thread,
                tags: thread.tags.map(tt => tt.tag),
                isClosed: thread.closeAt ? new Date() > new Date(thread.closeAt) : false,
            }
        }, {status: 200});

    } catch(error){
        console.log(error);
        return NextResponse.json({error: "Unexpected error occured while fetching thread,post, and replies"}, {status: 500});
    }
}   

// Edit thread
export async function PATCH(request: Request, { params }: { params: Promise<{ forumId: string, threadId: string }> }){
    try {

        const {error, user} = authorizeUser(request);
        if (error) return error;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const curr_user = await prisma.user.findUnique({ where: {id: user.id} });
        if(!curr_user) return NextResponse.json({error: "User not found."}, {status: 404});
        if(curr_user.isBanned) return NextResponse.json({error: "You are banned."}, {status: 403});

        const {forumId, threadId} = await params;
        const forumIdNum = Number(forumId);
        const threadIdNum = Number(threadId);

        if(isNaN(forumIdNum) || isNaN(threadIdNum)){
            return NextResponse.json({error: "Invalid parameters."}, {status: 400});
        }

        const thread = await prisma.thread.findUnique(
            { where: {id: threadIdNum} }
        );
        if(!thread) return NextResponse.json({error: "Thread does not exist."}, {status: 404});
        if(thread.isBanned) return NextResponse.json({error: "Thread is banned."}, {status: 403});

        if(thread.authorId !== user.id){
            return NextResponse.json({error: "No permission to edit this thread."}, {status: 403});
        }

        if(thread.matchId !== null){
            return NextResponse.json({error: "Match thread cannot be edited."}, {status: 403});
        }

        const {title} = await request.json();

        if(!title || title.trim() === ""){
            return NextResponse.json({error: "Title is required."}, {status: 400});
        }

        if(typeof title !== "string"){
            return NextResponse.json({error: "Title needs to be a string."}, {status: 400});
        }

        // Save original version to thread history
        await prisma.threadHistory.create({
            data: {
                title: thread.title,
                threadId: thread.id,
            }
        });

        const new_thread = await prisma.thread.update({
            where: {id: threadIdNum},
            data: {title: title.trim()},
            select: {
                id: true,
                title: true,
                updatedAt: true,
                author: {select: {id: true, username: true, avatar: true}},
                tags: {select: {tag: {select: {id: true, name: true}}}},
            }
        });

        moderateContent("THREAD", new_thread.id, new_thread.title)
        .catch(console.error);

        return NextResponse.json({thread: new_thread}, {status: 200});

    } catch(error){
        return NextResponse.json({error: "Unexpected error occured while editing thread."}, {status: 500});
    }
}

