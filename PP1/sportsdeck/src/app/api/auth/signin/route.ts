import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";

type LoginBody = {
    email: string;
    password: string
}

export async function POST(request: Request){

    try {

        const { email , password }: LoginBody = await request.json();

        // null check
        if(!email){
            return NextResponse.json({error: "Email is missing."}, {status: 400})
        };
        if(!password){
            return NextResponse.json({error: "Password is missing."}, {status: 400})
        };
        
        // Find user with given username
        const user = await prisma.user.findUnique({
            where: {email},
        });

        
        // (If user does not exist) or (OAuth user tries to sign in with email) 
        if(!user || !user.password){
            return NextResponse.json({error: "Invalid email or password."}, {status: 401})
        }

        // Check if password matches
        if(!await bcrypt.compare(password, user.password)){
            return NextResponse.json({error: "You have entered wrong password."}, {status: 401})
        }

        const accessToken = signAccessToken({id: user.id, email: user.email, role: user.role});
        const refreshToken = signRefreshToken({id: user.id});

        // Get rid of all refresh tokens that are expired
        await prisma.refreshToken.deleteMany({
            where: {
                userId: user.id,
                expiresAt: { lt: new Date() }
            }   
        });

        await prisma.refreshToken.create({
            data : {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days 
            }
        });

        // return access token and user's information
        const response = NextResponse.json(
            {user: 
                {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                favoriteTeamId : user.favoriteTeamId,
                role: user.role
                },
            accessToken, 
            },
            {status: 200}
        );

        response.cookies.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        return response;

    } catch(error){
        return NextResponse.json({ error: "Unexpected error occurred while logging in. Please try again."}, {status: 500});
    }   
}