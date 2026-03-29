import { authorizeUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Get user following and followedBy list sorted by follow time
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const idNum = Number(id);

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: {
            id: idNum,
        },
    });

    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Getting following users and users who follow user
    let following = await prisma.follows.findMany({
        where: {
            followerId: idNum,
        },
        orderBy: [{
            createdAt: 'desc',
        }],
        include: {
            following: true,
        }
    });
    let followedBy = await prisma.follows.findMany({
        where: {
            followingId: idNum,
        },
        orderBy: [{
            createdAt: 'desc',
        }],
        include: {
            follower: true,
        }
    });

    return NextResponse.json({following: following, followedBy: followedBy}, {status: 200});

}

// Follow user at id
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: other_user_id } = await params;
    const other_user_id_num = Number(other_user_id)

    // Ensure user is logged in and the auth token is valid
    let {user: authPayload} = authorizeUser(request);
    if (!authPayload)
        return NextResponse.json({ error: "Must be signed in or have a valid token" }, { status: 401 });
    let user_id = Number(authPayload['id'])
    if (user_id === other_user_id_num)
        return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    const user = await prisma.user.findUnique({
        where: {
            id: user_id,
        },
        select: {
            isBanned: true,
        }
    });

    if (!user) {
        return NextResponse.json(
            { error: "No user found" },
            { status: 404 }
        );
    }

    if (user['isBanned'])
        return NextResponse.json({ error: "Cannot follow a new user while banned" }, { status: 403 }); // I think 403? 

    let other_user = await prisma.user.findUnique({
        where: {
            id: other_user_id_num,
        },
    });

    if (!other_user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Follow
    // Add user.following other_user.id and other_user.follower user.id
    // Ensure other_user isn't followed first

    // Check if user is not already following other
    if (await prisma.follows.findUnique({
        where: {
            followerId_followingId: {
                followerId: user_id, 
                followingId: other_user_id_num,
            },
        },
    }) != null)
        return NextResponse.json({ error: "Already following" }, { status: 400 });

    const follow = await prisma.follows.create({
        data : {
            followerId: user_id,
            followingId: other_user_id_num,
        },
    });
    return NextResponse.json({follow}, {status: 200});
    
}

// Remove follow for a user, depending on removeFollower, either unfollow or remove a follower
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: other_user_id } = await params;
    const other_user_id_num = Number(other_user_id)

    const { removeFollower } = await request.json(); // removeFollower is true if user wants to remove other_user from following user
    // Otherwise false if user wants to unfollow other_user
    // Ensure user is logged in and the auth token is valid
    let {user: authPayload} = authorizeUser(request);
    if (!authPayload)
        return NextResponse.json({ error: "Must be signed in or have a valid token" }, { status: 401 });
    let user_id = Number(authPayload['id'])
    if (user_id === other_user_id_num)
        return NextResponse.json({ error: "Cannot unfollow yourself" }, { status: 400 });

    let other_user = await prisma.user.findUnique({
        where: {
            id: Number(other_user_id),
        },
    });

    if (removeFollower === undefined)
        return NextResponse.json({ error: "removeFollower not given" }, { status: 400 });

    if (!other_user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    switch (removeFollower) {
        case false:
            // Unfollow
            // Remove from user.following other_user.id and from other_user.follower user.id
            // Ensure other_user is followed first

            // Check if user is following other_user
            if (await prisma.follows.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: user_id, 
                        followingId: other_user_id_num,
                    },
                },
            }) === null)
                return NextResponse.json({ error: "Not already following" }, { status: 400 });

            const unfollow = await prisma.follows.delete({
                where: {
                    followerId_followingId: {
                        followerId: user_id,
                        followingId: other_user_id_num,
                    },
                }
            })
            
            return NextResponse.json({unfollow}, {status: 200});
            
        case true:
            // Remove someone following you
            // Remove user.id from other_user.following and user.id from other_user.following
            // Ensure other_user is following first

            // Check if user is following other_user
            if (await prisma.follows.findUnique({
                
                where: {
                    followerId_followingId: {
                        followerId: other_user_id_num, 
                        followingId: user_id,
                    },
                },
            }) === null)
                return NextResponse.json({ error: "Not already following" }, { status: 400 });
            
            const otherUnfollow = await prisma.follows.delete({
                where: {
                    followerId_followingId: {
                        followerId: other_user_id_num,
                        followingId: user_id,
                    },
                }
            })
            
            return NextResponse.json({otherUnfollow}, {status: 200});

            }
    
}
