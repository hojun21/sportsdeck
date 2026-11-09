import { authorizeUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST api/appeal
 * Submit an appeal for banned users
 * 
 * Only authenticated users who are currently banned are allowed to submit an appeal. Their request
 * must include reason why their banned should be reconsidered
 * 
 * Validations:
 * 1. Ensure user is authenticated
 * 2. Ensure user exist in database
 * 3. Ensure user is banned 
 * 4. Ensure a valid reason is provided 
 * 
 * Returns 201 success message upon successful creation
 */
export async function POST(request: Request) {
    // Ensure user is authenticated
    const { error, user } = authorizeUser(request);

    // Return error if it is not a user
    if (error) return error;

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Check if user exist is database 
        const currUser = await prisma.user.findUnique({
            where: { id: user.id }
        })

        if (!currUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 400 }
            );
        }

        // Only banned users are allowed to submit an appeal
        if (!currUser.isBanned) {
            return NextResponse.json(
                { error: "User is not banned. No appeal needs to be submitted." },
                { status: 400 }
            );
        }

        // Validate is reason provided and is valid
        const { reason } = await request.json();

        // If reason not provided, then return error message
        if (!reason) {
            return NextResponse.json(
                { error: "No reason is provided" },
                { status: 400 }
            );
        }

        // Validate the type of reason provided
        if (typeof reason !== "string") {
            return NextResponse.json(
                { error: "Invalid input type" },
                { status: 400 }
            );
        }
        
        // Check if user submits an appeal before
        const existingAppeal = await prisma.appealRequest.findFirst({
            where: {
                userId: user.id,
                status: "PENDING"
            }
        })

        if (existingAppeal) {
            return NextResponse.json(
                { error: "You already have a pending appeal."},
                { status: 400 }
            );
        }

        // Generate new appeal and add it into the database
        const newAppeal = await prisma.appealRequest.create({
            data: {
                userId: user.id,
                reason: reason
            }
        });

        return NextResponse.json(
            { message: "Successfully submitted appeal" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Appeal submission error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500}
        );
    }
}