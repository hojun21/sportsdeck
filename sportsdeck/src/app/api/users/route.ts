import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Find user via id or username
export async function GET(request: NextRequest){
    const { searchParams } = new URL(request.nextUrl);

    const username = searchParams.get("username");
    // Check if username is provided
    if (!username)
        return NextResponse.json({ error: "Username to search for is not given" }, { status: 400 });

    const user = await prisma.user.findUnique({
        where: {
            username: username,
        },
        select: {
            id: true,
        },
    });

    if (!user) 
        return NextResponse.json({ error: "No user with matching username" }, { status: 404 });
    const id = user['id'];
    redirect('/api/users/' + id);
}