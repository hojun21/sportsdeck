import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // Check if user is an authorized admin
    const { error, user: admin } = authorizeAdmin(request);

    // // Return error if it is not an admin
    if (error) return error;

    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const page = Number(searchParams.get("page") ?? "1");
        const pageLimit = Number(searchParams.get("limit") ?? "10");
        const startingPage = (page - 1) * pageLimit;

        const appeals = await prisma.appealRequest.findMany({
            where: {
                status: "PENDING",
                ...(search && {
                    OR: [
                        {
                            user: {
                                username: {
                                    contains: search,
                                    mode: "insensitive"
                                },
                            },
                        },
                        {
                            reason: {
                                contains: search,
                                mode: "insensitive"
                            }
                        }
                    ]
                })
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        isBanned: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            skip: startingPage,
            take: pageLimit
        });

        // Get total count
        const total = await prisma.appealRequest.count({
            where: {
                status: "PENDING",
                ...(search && {
                    OR: [
                        {
                            user: {
                                username: {
                                    contains: search,
                                    mode: "insensitive"
                                },
                            },
                        },
                        {
                            reason: {
                                contains: search,
                                mode: "insensitive"
                            }
                        }
                    ]
                })
            }
        });

        return NextResponse.json(
            {
                data: appeals, 
                total: total
            },
            {status: 200}
        );
    } catch (error) {
        console.error("Admin retrieve appeal error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}