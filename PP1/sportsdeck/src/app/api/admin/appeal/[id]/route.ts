import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = {
    params: {
        id: string;
    };
};

type UpdateBody = {
    statusUpdate: string
};

const VALID_STATUS = ["APPROVED", "REJECTED"]
type validStatus = typeof VALID_STATUS[number]

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Check if user is an authorized admin
    const { error, user: admin } = authorizeAdmin(request);

    // Return error if it is not an admin
    if (error) return error;

    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { statusUpdate }: UpdateBody = await request.json();

        // Convert id to Number
        const appealId = Number(id);

        // Validate reportId
        if (!Number.isInteger(appealId) || appealId <= 0) {
            return NextResponse.json(
                { error: "Invalid input type"},
                { status: 400 }
            );
        }

        // Validation action
        if (!statusUpdate) {
            return NextResponse.json(
                { error: "New status is not provided" },
                { status: 400 }
            );
        }

        const normalizedStatus = statusUpdate.toUpperCase() as validStatus;

        // Check if input status update is valid
        if (!VALID_STATUS.includes(normalizedStatus)) {
            return NextResponse.json(
                { error: "Invalid status type" },
                { status: 400 }
            );
        }

        const appeal = await prisma.appealRequest.findUnique({
            where: { id: appealId }
        });

        if (!appeal) {
            return NextResponse.json(
                { error: "No appeal is found" },
                { status: 404 }
            );
        }

        if (appeal.status !== "PENDING") {
            return NextResponse.json(
                { error: "Appeal is already handled" },
                { status: 400 }
            );
        }

        // Update status of the appeal
        await prisma.appealRequest.update({
            where: { id: appealId },
            data: { status: normalizedStatus }
        });

        return NextResponse.json(
            { message: `Appeal ${appeal.id} successfully updated` },
            { status: 200}
        )

    } catch (error) {
        console.error("Report moderation error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500}
        );
    }
}
