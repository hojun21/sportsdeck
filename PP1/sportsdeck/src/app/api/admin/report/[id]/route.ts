import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { contentModelMap } from "@/lib/contentModelMap";

type UpdateBody = {
    statusUpdate: string
};

const VALID_STATUS = ["APPROVED", "DISMISSED"] as const;
type validStatus = typeof VALID_STATUS[number];

type ContentType = keyof typeof contentModelMap;

/**
 * GET api/report/[id]
 * 
 * Allow authenticated admin to view specific report alongside with its AI generated
 * verdict and original content
 * 
 * Validations
 * 1. Ensure reportId inputted is valid
 * 2. Ensure report and its AI generated verdict exist 
 */
export async function GET (request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Check if user is an authorized admin
    const { error, user: admin } = authorizeAdmin(request);

    // Return error if it is not an admin
    if (error) return error;

    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Convert id to number
        const reportId = Number(id);

        // Validate reportId
        if (!Number.isInteger(reportId) || reportId <= 0) {
            return NextResponse.json(
                { error: "Invalid input type" },
                { status: 400 }
            );
        }

        // Get the specific report
        const report = await prisma.report.findUnique({
            where: {id: reportId}
        });

        if (!report) {
            return NextResponse.json(
                { error: "Report not found" },
                { status: 404 }
            );
        }

        // Get the AI generated verdict using content type and content id
        const contentVerdict = await prisma.contentVerdict.findUnique({
            where: {
                contentType_contentId: {
                    contentType: report.contentType,
                    contentId: report.contentId
                }
            }
        })

        if (!contentVerdict) {
            return NextResponse.json(
                { error: "Content verdict not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { 
                reportId: reportId,
                reporterId: report.reporterId,
                reportStatus: report.status,
                explanation: report.explanation,
                contentType: report.contentType,
                contentId: report.contentId,
                contentTitle: report.contentTitle,
                contentBody: report.contentBody,
                aiLabel: contentVerdict.aiLabel,
                aiScore: contentVerdict.aiScore,
                aiReason: contentVerdict.aiReason
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Admin retrieve content verdict error: ", error);
        
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}   

/**
 * PUT api/report/[id]
 * 
 * Allow authenticated admin to update the status of a specific report.
 * If report is "APPROVED, update the ban status as well. 
 * 
 * Validations:
 * 1. Ensure admin is authenticated
 * 2. Ensure reportId and status to be updated exist and is valid
 * 3. Ensure report to be updated exist in database
 * 4. Only update "PENDING" reports
 * 5. If report is to be "APPROVED", approve all reports of the same content
 * 6. If report is to be "DISMISSED", dismiss the particular report only
 */
export async function PUT (request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Check if user is an authorized admin
    const { error, user: admin} = authorizeAdmin(request);

    // Return error if it is not an admin
    if (error) return error;

    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { statusUpdate }: UpdateBody = await request.json();

        // Convert id to Number
        const reportId = Number(id);

        // Validate reportId
        if (!Number.isInteger(reportId) || reportId <= 0) {
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

        // Check is report present
        const report = await prisma.report.findUnique({
            where: { id: reportId }
        });

        if(!report) {
            return NextResponse.json(
                { error: "No report is found" },
                { status: 404 }
            );
        }

        // Check if report is already handled
        if (report.status !== "PENDING") {
            return NextResponse.json(
                { error: "Report already handled" },
                { status: 400 }
            );
        }

        const model = contentModelMap[report.contentType as ContentType] as any;

        if (!model) {
            return NextResponse.json(
                { error: "Invalid content type" },
                { status: 400 }
            );
        }

        const content = await model.findUnique({
            where: {id: report.contentId}
        });

        // If status is approve then hide original content from other users and approve all reports of the same content
        if (normalizedStatus === "APPROVED") {

            // Update banned status of the content if content exist
            if (content) {
                await model.update({
                    where: { id: report.contentId },
                    data: { isBanned: true}
                });
            }
            
            // Approve all reports of the same content
            await prisma.report.updateMany({
                where: {
                    contentType: report.contentType,
                    contentId: report.contentId,
                    status: "PENDING"
                },
                data: {
                    status: "APPROVED"
                }
            });

        }
        else if (normalizedStatus === "DISMISSED") {
            await prisma.report.updateMany({
                where: {
                    contentType: report.contentType,
                    contentId: report.contentId,
                    status: "PENDING"
                },
                data: {
                    status: "APPROVED"
                }
            });
        }

        return NextResponse.json(
            { message: `Report ${report.id} successfully updated` },
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