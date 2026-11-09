import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = {
    params: {
        id: string;
    };
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let level = 0; // 0 for VISITOR, 1 for USER, 2 for ADMIN

    const authPayload = verifyToken(request);

    if (authPayload) {
        if (authPayload["role"] === "ADMIN")
            level = 2;
        else if (authPayload["role"] === "USER")
            level = 1;
    }

    let user; 

    // Return full information for ADMIN
    if (level === 2)
        user = await prisma.user.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                appeals: true,
            }
        });

    // Return partial information for USER and VISITOR
    else 
        // Use Prisma Client to find the user
        user = await prisma.user.findUnique({
            where: {
                id: Number(id),
            },
            // Return the following
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                favoriteTeamId: true,
                role: true,
                createdAt: true,
                following: true, 
                followers: true, 
                favoriteTeam: {
                    select: {
                    id: true,
                    name: true,
                    crest: true,
                }}, 
                threads: true, // May not want to return all of it if it is a lot
                posts: true, // May not want to return all of it if it is a lot
                replies: true, // May not want to return all of it if it is a lot
                isBanned: true,
                appeals: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    select: {
                        id: true,
                        reason: true,
                        status: true,
                        createdAt: true
                    }
                }
            },
        });

    if (user === null) 
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({user: user}, {status: 200});  
}