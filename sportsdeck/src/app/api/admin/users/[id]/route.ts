import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * PUT api/admin/users/[id]
 * 
 * Allows authenticated admin to ban or unban users
 * 
 * Validations
 * 1. Ensure access only by authenticated admin
 * 2. Ensure user id and updated status are provided and valid
 * 3. Ensure user to be updated exist in database
 * 4. Prevent redundant updates (only update when state will be changed)
 * 
 */
export async function PUT (request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Check if user is an authorized admin
    const { error, user: admin} = authorizeAdmin(request);

    if (error) return error;

    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { isBanned } = await request.json();

        const userId = Number(id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return NextResponse.json(
                { error: "Invalid input type" },
                { status: 400 }
            );
        }

        if (isBanned === undefined) {
            return NextResponse.json(
                { error: "Updated banned status not provided" },
                { status: 400 }
            );
        }

        if (typeof isBanned !== "boolean") {
            return NextResponse.json(
                { error: "Invalid input type" },
                { status: 400 }
            );
        }

        // Validate if user exist in the database
        const user = await prisma.user.findUnique({
            where: {id: userId}
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (admin.id === user.id) {
            return NextResponse.json(
                { error: "Admin cannot ban themselves" },
                { status: 400 }
            )
        }

        // Do not update when user is already banned/unbanned
        if (isBanned === user.isBanned) {
            return NextResponse.json(
                { error: isBanned ? "User is already banned" : "User is already unbanned"},
                { status: 400 }
            );
        }

        // Update ban status of user
        await prisma.user.update({
            where: { id: userId },
            data: { isBanned: isBanned }
        });

        // await prisma.reply.updateMany({
        //     where: { authorId: userId },
        //     data: { isBanned: isBanned }
        // });
        // await prisma.post.updateMany({
        //     where: { authorId: userId },
        //     data: { isBanned: isBanned }
        // });
        // await prisma.thread.updateMany({
        //     where: { authorId: userId },
        //     data: { isBanned: isBanned }
        // });

        return NextResponse.json(
            { message: `Ban status of user ${userId} successfully updated!`},
            { status: 200 }
        )
    } catch (error) {
        console.error("Ban status update error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}