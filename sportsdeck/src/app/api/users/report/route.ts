import { authorizeUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { contentModelMap } from "@/lib/contentModelMap";

type ContentType = keyof typeof contentModelMap;

/**
 * POST api/report
 * 
 * Allows authenticated users to submit reports for content they think is inappropriate
 * 
 * Restrictions:
 * 1. Banned users are not allowed to submit report
 * 2. Users cannot report their own content
 * 
 * Validations:
 * 1. Ensure user exist
 * 2. Ensure user is not banned
 * 3. Ensure contentId, contentType and explanation are provided and valid
 * 4. Ensure reported content exist
 */
export async function POST(request: Request) {
    const { error, user } = authorizeUser(request);

    // Return error if it is not a user
    if (error) return error;

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get user from the database to check if user still exist and is user banned
        const currUser = await prisma.user.findUnique({
            where: { id: user.id }
        })

        // Return error message when user is not found
        if (!currUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // If user is banned, they cannot submit a report as well
        if (currUser.isBanned) {
            return NextResponse.json(
                { error: "User is banned. Report cannot be performed." },
                { status: 403 }
            );
        }

        const { contentId, contentType, explanation } = await request.json();

        // If contentId, contentType or explanation is not provided, then return error message
        if (!contentId || !contentType || !explanation) {
            return NextResponse.json(
                { error: "Missing fields" },
                { status: 400 }
            );
        }

        // Validate the type of contentId, contentType and explanation submitted
        if (typeof contentId !== "number" || typeof contentType !== "string"  || typeof explanation !== "string") {
            return NextResponse.json(
                { error: "Invalid input type" },
                { status: 400 }
            ); 
        }

        // Normalize content type
        const normalizedType = contentType.toUpperCase();
        const validTypes: ContentType[] = ["THREAD", "POST", "REPLY"];

        // Validate content type
        if (!validTypes.includes(normalizedType as ContentType)) {
            return NextResponse.json(
                { error: "Invalid content type" },
                { status: 400 }
            );
        }

        // Retrieve content from database
        const model = contentModelMap[normalizedType as ContentType] as any;
        if (!model) {
            return NextResponse.json(
                { error: "Invalid content type"},
                { status: 400 }
            );
        }

        // Validate if content exist
        const content = await model.findUnique({
            where: { id: contentId }
        });

        if (!content) {
            return NextResponse.json(
                { error: "Reported content not found" },
                { status: 404}
            );
        }

        if (!content.authorId) {
            return NextResponse.json(
                { error: "Match Thread cannot be reported" },
                { status: 400 }
            );
        }

        // Return error message if user is reporting themselves
        if (currUser.id === content.authorId) {
            return NextResponse.json(
                { error: "You can't report yourself" },
                { status: 400 }
            );
        }

        // Check if same user is reporting the same content
        const existingReport = await prisma.report.findFirst({
            where: {
                reporterId: currUser.id,
                contentType: normalizedType,
                contentId: contentId,
            }
        })

        if (existingReport) {
            return NextResponse.json(
                { error: "You already reported this content" },
                { status: 400 }
            );
        }

        let contentTitle: string | null = null;
        let contentBody: string = "";

        if (normalizedType === "THREAD") {
            contentTitle = content.title;

            const mainPost = await prisma.post.findUnique({
                where: { threadId: content.id }
            });

            contentBody = mainPost?.content || "";
        } 

        if (normalizedType === "POST") {
            contentBody = content.content;
        }

        if (normalizedType === "REPLY") {
            contentBody = content.content;
        }

        // Generate report and add it into the database 
        await prisma.report.create({
            data: {
                reporterId: currUser.id,
                reportedId: content.authorId,
                explanation: explanation,
                contentType: normalizedType,
                contentId: contentId,
                contentTitle: contentTitle,
                contentBody: contentBody
            }
        });

        return NextResponse.json(
            { message: "Successfully reported" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Report submission error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500}
        );
    }
    
}