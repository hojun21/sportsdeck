import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken } from "@/lib/jwt";
import jwt from "jsonwebtoken";

type RefreshTokenBody = {
    refreshToken: string;
};

type JwtPayload = {
    id: number;
    email: string;
    role: string;
};

// This function should be called when the access token expires.
// It uses the refresh token to issue a new access token.
export async function POST(request: NextRequest){

    try {

        const refreshToken = request.cookies.get("refreshToken")?.value;

        if(!refreshToken){
            return NextResponse.json({error: "refresh token is missing."}, {status: 400});
        }

        const r_token = await prisma.refreshToken.findUnique({
            where :{token:refreshToken},
        });

        if(!r_token){
            return NextResponse.json({error: "refresh token is invalid."}, {status: 401});
        }

        // Delete refresh token if expired
        if(r_token.expiresAt < new Date()){
            
            await prisma.refreshToken.delete({
                where: {token:refreshToken}
            });

            return NextResponse.json({error: "Refresh token is expired. Please sign in again."}, {status: 401});
        }

        // Verify token
        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JwtPayload;

        // Find user
        const user = await prisma.user.findUnique({ where: { id: payload.id } });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }
        
        // Issue new access token 
        const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });

        return NextResponse.json({ accessToken: newAccessToken }, { status: 200 });

    } catch(error){
        console.log("REFRESH ERROR:", error);
        return NextResponse.json({ error: "Error occured while issuing new access token." }, { status: 401 });
    }
}