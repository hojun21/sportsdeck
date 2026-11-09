import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type User = {
    id: number;
    avatar: number;
};

// Get mapping of userid to avatars
export async function GET(request: NextRequest){

    const users: User[] = await prisma.user.findMany({
        select: {
            id: true,
            avatar: true,
        },
    });
    let map:Record<number, number> = {};
    users.forEach(user => map[user.id] = user.avatar)

    return NextResponse.json({map: map}, {status: 200});


}