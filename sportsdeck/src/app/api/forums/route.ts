import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Find threads via search
export async function GET(request: Request){

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
    // Takes a string separated by commas 
    // Tag name has to be exact
    // Returns if at least one tag name matches
    const tags = searchParams.get("tags")?.split(',');
    // Uses AND with title AND author AND teams AND tags

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
    
    const threads = await prisma.thread.findMany({
        where: {
            title: title != null ? {
                contains: title
            } : undefined,
            authorId: author != null ? { 
                in: authorId,
            } : undefined,
            forumId: teams != null ? {
                hasSome: teamsForumId,
            } : undefined,
            tags: tags != null ? {
                some: {
                    tag: {
                        name: {
                            in: tags,
                        },
                    },
                },
            } : undefined,
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