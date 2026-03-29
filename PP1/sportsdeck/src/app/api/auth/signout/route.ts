import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";

export async function POST(request: NextRequest){

    try {
        const {error, user} = authorizeUser(request);

        if (error) return error;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // receive refresh token of user.
        const refreshToken = request.cookies.get("refreshToken")?.value;

        if(!refreshToken){
            return NextResponse.json({error: "Refresh token is missing"}, {status: 400});
        }

        // If user signs out, delete user's refresh token from DB
        // Note : deleteMany returns success even if no data is deleted. 
        await prisma.refreshToken.deleteMany({

            where: {
                token: refreshToken,
                userId: user.id,
            }
        });

        const response = NextResponse.json({message: "User signed out."}, {status: 200});
        
        // Delete refresh token from cookie
        response.cookies.set("refreshToken", "", {
            httpOnly: true,
            maxAge: 0,
            path: "/",
        });

        return response;

    } catch(error){
        
        return NextResponse.json({message: "Unexpected error occured while signing out." }, {status: 500});

    }

}