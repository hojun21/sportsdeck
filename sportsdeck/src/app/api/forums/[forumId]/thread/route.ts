import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";
import { moderateContent } from "@/lib/aiModeration";

// Find threads within the forumId via search
export async function GET(request: Request, { params }: { params: Promise<{ forumId: string }> }){

    const { user } = authorizeUser(request); 
    const currentUserId = user?.id ?? -1;
    const {forumId} = await params;
    const forumIdNum = Number(forumId);
    const { searchParams } = new URL(request.url);

    // Takes title of post, and searches for titles that contains title in the title
    // Title does not have to be exact
    // Only takes one title
    const title = searchParams.get("title");
    // Author is a username, and searches for all users with username that contains author
    // Author name does not have to be exact
    // Only takes on author name, but can return multiple authors
    const author = searchParams.get("author");
    // Takes a string separated by commas, searches for all that contains at least one of the teams name
    // Team name does not have to be exact
    // Returns if at least one team name matches
    const teams = searchParams.get("teams")?.split(',');
    // Takes a string separated by commas, searches for all that contains at least one of the teams name
    // Team name does not have to be exact
    // Returns if at least one team name matches
    const tags = searchParams.get("tags")?.split(',');
    // Uses AND with title AND author AND tags


    // Get userId of author
    let authorId: number[] | undefined;

    if (author) {
        const user = await prisma.user.findMany({
            where: {
                username: {
                    contains: author, 
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
            },
        });
        authorId = user.map(item => item.id);
    }
    
    // Get forumId of team
    let teamsForumId: number[] | undefined;
    let teamIds: number[] | undefined; 
    console.log(teams)
    if (teams) {
        const teamList = await prisma.team.findMany({
            where: {
                // https://stackoverflow.com/questions/74460820/how-to-use-or-array-inside-and-prisma
                OR: teams.map(team => ({name: {contains: team}}))
            },
            select: {
                id: true,
            },
        })
        teamIds = teamList.map(item => Number(item.id));

        const teamsForum = await prisma.forum.findMany({
            where: {
                teamId: {
                    in: teamIds,
                },
            },
            select: {
                id: true
            }
        });
        teamsForumId = teamsForum.map(item => item.id);
    }
    console.log(teamsForumId)
    const threads = await prisma.thread.findMany({
        where: {
            title: title != null ? {
                contains: title,
                mode: "insensitive"
            } : undefined,
            authorId: author != null ? { 
                in: authorId,
            } : undefined,
            AND: [
                {
                    forumId: {
                        has: forumIdNum,
                    }
                },
                {
                    forumId: teams != null ? {
                        hasSome: teamsForumId,
                    } : undefined,
                },
            ],
            tags: tags != null ? {
                some: {
                    tag: {
                        name: {
                            in: tags,
                        },
                    },
                },
            } : undefined,
            OR: [
            { author: { isBanned: false } },
            { author: null }, 
            { authorId: currentUserId },
        ],
        },
        orderBy: { createdAt: "desc" },
        // Fetch author's info, tags and poll
        include: {
            author: { select: { id: true, username: true, avatar: true } },
            tags: { select: { tag: { select: { id: true, name: true } } } },
            poll: {
                include: {
                    options: {
                        orderBy: { id: "asc" },
                        include: {
                            _count: { select: { votes: true } }
                        }
                    }
                }
            },
        }
    });

    return NextResponse.json({
        threads: threads.map(t => ({
            ...t,
            tags: t.tags.map((tt: any) => tt.tag)
        }))
    }, { status: 200 });

}

// Make a thread under forum
export async function POST(request: Request, { params }: { params: Promise<{ forumId: string }> }) {

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

        const {forumId} = await params;
        const forumIdNum = Number(forumId);
        if(isNaN(forumIdNum)) return NextResponse.json({error: "Forum ID missing"}, {status: 400});

        // Check if forum exists
        const forum = await prisma.forum.findUnique(
            {where: {id: forumIdNum}}
        );
        if(!forum){
            return NextResponse.json({error: "Forum not found."}, {status: 404});
        }

        const {title, content, tags = []} = await request.json();

        if(!title || title.trim() === ""){
            return NextResponse.json({error: "Title is missing"}, {status: 400});
        }

        if(!content || content.trim() === ""){
            return NextResponse.json({error: "Content is missing"}, {status: 400});
        }

        if(!Array.isArray(tags)){
            return NextResponse.json({error: "Tag must be stored in array"}, {status: 400});
        }

        // Check for tags. Fetch tag if exists and create a new tag if it does not exist.
        const tagList = await Promise.all(
            tags.map((name) =>
                prisma.tag.upsert({
                    where: {name},
                    // dont update if exists
                    update: {},
                    create: {name},
                })
            )
        );

        // Create thread + main post
        // Use transaction so if error occurs while making mainPost, it automatically deletes thread too in DB.
        const thread = await prisma.$transaction(async (t) => {
            const newThread = await t.thread.create({
                data: {
                    title: title,
                    authorId: user.id,
                    forumId: { set: [forumIdNum] },
                    tags: {
                        create: tagList.map((tag) => ({tagId: tag.id})),
                    },
                },
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    updatedAt: true,
                    matchId: true,
                    openAt: true,
                    closeAt: true,
                    author: { select: { id: true, username: true, avatar: true } },
                    tags: { select: { tag: { select: { id: true, name: true } } } },
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
                },
            });

            const mainPost = await t.post.create({
                data: {
                    content: content.trim(),
                    authorId: user.id,
                    threadId: newThread.id,
                },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                },
            });
            return { newThread, mainPost };
        });

        moderateContent("THREAD", thread.newThread.id, thread.newThread.title)
            .catch(console.error);
        moderateContent("POST", thread.mainPost.id, thread.mainPost.content)
            .catch(console.error);

        return NextResponse.json({ thread: thread.newThread, mainPost: thread.mainPost }, { status: 201 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Unexpected Error occured while making thread" }, { status: 500 });
    }
}