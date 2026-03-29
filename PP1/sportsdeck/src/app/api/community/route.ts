import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get a list of forums
export async function GET(){

    try {
        const forums = await prisma.forum.findMany({
            include: {
                team: {
                    select: {
                        id: true,
                        name: true,
                        crest: true,
                    }
                }
            },
            orderBy: {
                id: "asc"
            }
        });
        return NextResponse.json(forums, {status: 200});

    } catch(error){
        return NextResponse.json({error: "Failed to fetch forums"}, {status: 200});
    }
}