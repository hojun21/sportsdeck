import { authorizeUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Match, Thread } from "@/generated/prisma";

// Get user's feed
export async function GET(request: Request) {
    const {error, user} = authorizeUser(request);
    
    if (error) return error;

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = Number(user['id']);

    const fullUser = await prisma.user.findUnique({
        where: {
            id: id,
        },
    });

    if (!fullUser) {
        return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
        );
    }

    // Get items up until last week, to ensure entire database is not returned
    let lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);
    
    // Get posts on user's posts

    // 1. Get all posts on user's threads
    const userThreads = await prisma.thread.findMany({
        where: {
            authorId: id,
        },
    });
    const userThreadIds = userThreads.map((thread) => thread['id']);
    const recentActivityOnUserThreads = await prisma.post.findMany({
        where: {
            threadId: {
                in: userThreadIds,
            },
            createdAt: {
                gte: lastWeek,
            },
            NOT: {
                authorId: id,
            },
        },
        include: {
            author: { select: { id: true, username: true, avatar: true } },
            thread: { select: { id: true, title: true, forumId: true } },
        },
        orderBy: [{
            createdAt: 'desc',
        }],
    });
    // Get all replies on user posts
    const userPosts = await prisma.post.findMany({
        where: {
            authorId: id,
        },
    });
    const userPostIds = userPosts.map((post) => post['id']);
    
    const userReply = await prisma.post.findMany({
        where: {
            authorId: id,
        },
    });
    
    const userReplyIds = userReply.map((reply) => reply['id']);
    let recentActivityOnUserPostsAndReplies = await prisma.reply.findMany({
        where: {
            OR: [
                { postId: { in: userPostIds } },
                { parentId: { in: userReplyIds } },
                ],
            createdAt: {
                gte: new Date(lastWeek),
            },
            NOT: {
                authorId: id,
            },
        },
        include: {
            author: { select: { id: true, username: true, avatar: true } },
            post: {
                include: { thread: { select: { id: true, title: true, forumId: true } } },
            },
        },
        orderBy: [{
            createdAt: 'desc',
        }],
    });

    // Get followed user ids and find all posts and replies by them
    const followedUsers = await prisma.follows.findMany({
        where: {
            followerId: id,
        },
    });
    
    const followedUserid = followedUsers.map((follows) => follows['followingId']);

    let newFollowingUserPosts = await prisma.post.findMany({
        where: {
            authorId: {
                in: followedUserid,
            },
            createdAt: {
                gte: new Date(lastWeek),
            },
        },
        include: {
            author: { select: { id: true, username: true, avatar: true } },
            thread: { select: { id: true, title: true, forumId: true } },
        },
        orderBy: [{
            createdAt: 'desc',
        }],
    });

    let newFollowingUserReplies = await prisma.reply.findMany({
        where: {
            authorId: {
                in: followedUserid
            },
            createdAt: {
                gte: new Date(lastWeek),
            },
        },
        include: {
            author: { select: { id: true, username: true, avatar: true } },
            post: {
                include: { thread: { select: { id: true, title: true, forumId: true } } },
            },
        },
        orderBy: [{
            createdAt: 'desc',
        }],
    });

    // Get recently finished matches or current matches for favourite team
    let teamId = fullUser['favoriteTeamId'];
    let statusToReport = ['IN_PLAY', 'PAUSED', 'FINISHED', 'AWARDED'];
    let favouriteTeamNewMatches: Match[] = [];
    if (teamId) {
        favouriteTeamNewMatches = await prisma.match.findMany({
            where: {
                OR: [
                { homeTeamId: teamId },
                { awayTeamId: teamId },
                ],
                status: {
                    in: statusToReport,
                },
                matchDayTime: {
                    gte: new Date(lastWeek),
                    lte: new Date(),
                },
            },
            include: {
                homeTeam: { select: { name: true, crest: true } },
                awayTeam: { select: { name: true, crest: true } },
            },
            orderBy: [{
                matchDayTime: 'desc',
            }],
        })
    }

    // Get new threads in favourite team's forums
    let favouriteTeamForum;
    if (teamId) {
        favouriteTeamForum = await prisma.forum.findUnique({
            where: { teamId },
        })
    }

    let favouriteTeamNewThreads: Thread[] = [];

    if (favouriteTeamForum) {
        favouriteTeamNewThreads = await prisma.thread.findMany({
            where: {
                forumId: {
                    has: favouriteTeamForum['id'],
                },
                createdAt: {
                    gte: new Date(lastWeek),
                }
            },
            include: {
                author: { select: { id: true, username: true, avatar: true } },
            },
            orderBy: [{
                createdAt: 'desc',
            }],
        })
    }

    return NextResponse.json({
        recentActivityOnUserThreads, 
        recentActivityOnUserPostsAndReplies, 
        newFollowingUserPosts, 
        newFollowingUserReplies, 
        favouriteTeamNewMatches,
        favouriteTeamNewThreads}, {status: 200});
    
}