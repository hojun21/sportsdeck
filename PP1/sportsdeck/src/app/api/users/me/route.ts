import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeUser } from "@/lib/auth";

// GET : view my profile 
export async function GET(request: Request){
    
    try{
        
        // Get user's information and error message.
        const {error, user} = authorizeUser(request);

        if (error) return error;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const myProfile = await prisma.user.findUnique({
            where: {id: user.id},
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                favoriteTeamId: true,
                role: true,
                createdAt: true,
                isBanned: true,
            }
        });

        if(!myProfile){
            return NextResponse.json({error: "User does not exist"}, {status: 404});
        }

        return NextResponse.json({user: myProfile}, {status: 200});


    } catch(error){
        return NextResponse.json({error: "Unexpected error occured"}, {status: 404});
    }
}

// PUT function that allows user to manipulate their profile
// User can change their username that does not duplicate, favoriteTeam or avatar.
export async function PUT(request: Request){

    try {

        // Get user's information and error message.
        const {error, user} = authorizeUser(request);

        if (error) return error;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Receives data that can be modified
        const {username, avatar, favoriteTeamId} = await request.json();

        if(username){
            
            // Check if username is already being used 
            const already_exists = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: user.id }
                }
            });
            
            if(already_exists){
                return NextResponse.json({error: "Username already being used by other user."}, {status: 409});
            }
        }

        if (avatar !== undefined && (avatar < 0 || avatar > 4)){
            return NextResponse.json({ error: "Invalid avatar." }, { status: 400 });
        }

        if(favoriteTeamId){
            const team = await prisma.team.findUnique({
                where: { id: favoriteTeamId }
            });
            if(!team){
                return NextResponse.json({error: "Invalid favorite team."}, {status: 400});
            }
        }
        
        const updated_user_info = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(username && {username}),
                ...(avatar !== undefined && {avatar}),
                ...(favoriteTeamId && {favoriteTeamId}),
            },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                favoriteTeamId: true,
                role: true,
                createdAt: true,
                isBanned: true,
            }
        });

        return NextResponse.json({user: updated_user_info}, {status: 200});
        

    } catch(error){

        return NextResponse.json({error: "An unexpected error occurred while editing profile."}, {status: 500});

    }

}