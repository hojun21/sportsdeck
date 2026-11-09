import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";

type SignUpBody = {
    username: string;
    password: string;
    email: string;
    favoriteTeamId: number;
    avatar: number;
}

export async function POST(request: Request){

    try {

        const { username, password, email, favoriteTeamId, avatar }: SignUpBody = await request.json();

        // Null Check
        if(!username){
            return NextResponse.json({error: "Username is missing."}, { status: 400 })
        }

        if(!password){
            return NextResponse.json({error: "Password is missing."}, { status: 400 })
        }

        if(!email){
            return NextResponse.json({error: "Email is missing."}, { status: 400 })
        }

        if(favoriteTeamId === undefined || favoriteTeamId === null){
            return NextResponse.json({error: "Favorite team is missing."}, { status: 400 })
        }
        
        if(avatar === undefined || avatar === null){
            return NextResponse.json({error: "Avatar is missing."}, { status: 400 })
        }

        // Validate input type
        if (typeof username !== "string" || typeof password !== "string" || typeof email !== "string") {
            return NextResponse.json(
                { error: "Invalid input type" },
                { status: 400 }
            );
        }

        if (!Number.isInteger(favoriteTeamId)) {
            return NextResponse.json(
                { error: "Invalid favourite team ID" },
                { status: 400 }
            );
        }

        if (!Number.isInteger(avatar)) {
            return NextResponse.json(
                { error: "Invalid avatar Id" },
                { status: 400 }
            );
        }
        
        if(username.length <= 4 || username.length >= 16){
            return NextResponse.json({error: "Username should contain 5 to 15 characters."}, { status: 400 })
        }

        if(password.length <= 6 || password.length >= 16){
            return NextResponse.json({error: "Password should contain 7 to 15 characters."}, { status: 400 })
        }
        
        // For avatar, we will give users 5 options to pick, by using index. (0 ~ 4)
        if(avatar < 0 || avatar > 4){
            return NextResponse.json({error: "Invalid avatar."}, { status: 400 })
        }
        
        // Email check with regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return NextResponse.json({error: "Invalid email format."}, {status: 400})
        }

        // Check if user already exists with given email, username
        const existing_user = await prisma.user.findFirst(
            {
                where : {OR : [{email}, {username}]},
            }
        );

        if(existing_user){
            if(existing_user.email === email){
                return NextResponse.json({error: "Email already in use."}, {status: 409})
            }
            if(existing_user.username === username){
                return NextResponse.json({error: "Username already in use."}, {status: 409})
            }
        }

        const team = await prisma.team.findUnique({
            where: {id: favoriteTeamId}
        });

        if (!team) {
            return NextResponse.json(
                { error: "Invalid favorite team" },
                { status: 400 }
            );
        }

        const hashed_password = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data : {
                username,
                email, 
                password : hashed_password,
                favoriteTeamId,
                avatar,
            },
            // hide password from select 
            select : {
                id: true,
                email: true,
                username: true,
                avatar: true,
                favoriteTeamId: true,
                role: true,
                createdAt: true,
            },
        });

        const accessToken = signAccessToken({id: user.id, email: user.email, role: user.role});
        const refreshToken = signRefreshToken({id: user.id});

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                }
        });

        const response = NextResponse.json({user, accessToken}, {status: 201});

        response.cookies.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });

        return response;

    } catch(error){

        return NextResponse.json({error: "Error occured while signing up. Please try again."}, {status: 500});
    
    }
}