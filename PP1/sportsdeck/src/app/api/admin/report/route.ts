import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ReportQueueItem = {
    contentType: string;
    contentId: string;
    reportedId: number;
    reportedUserName: string | null;
    reportCount: number | bigint;
    aiLabel: string | null;
    aiScore: number | null;
    aiReason: string | null;
}   

/**
 * GET api/report
 * 
 * Authenticated admin is able to retrieve a queue of reports submitted
 * that are "PENDING" sorted descendingly by AI generated verdict score and number of user reports
 */
export async function GET(request: Request) {
    // Check if user is an authorized admin
    const { error, user: admin } = authorizeAdmin(request);

    // // Return error if it is not an admin
    if (error) return error;

    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the queue of reports that are in status "PENDING" sorted by score and number of user reports
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const contentType = searchParams.get("type");
        const scoreLabel = searchParams.get("label");
        const page = Number(searchParams.get("page") ?? "1");
        const pageLimit = Number(searchParams.get("limit") ?? "10");
        const startingPage = (page - 1) * pageLimit;
    
        const queue = await prisma.$queryRaw<ReportQueueItem[]>`
            SELECT 
                MIN(r."id") as "id",
                r."contentType",
                r."contentId",
                r."contentBody",
                r."reportedId",
                u."username" as "reportedUserName",
                u."avatar" as "reportedUserAvatar",
                COUNT(*) as "reportCount",
                cv."aiLabel",
                cv."aiScore",
                cv."aiReason"
            FROM "Report" r LEFT JOIN "ContentVerdict" cv
            ON r."contentId" = cv."contentId" AND r."contentType" = cv."contentType"
            LEFT JOIN "User" u ON r."reportedId" = u."id"
            WHERE r."status" = 'PENDING'
            AND (
                ${search ?? ""} = '' OR 
                u."username" ILIKE ${'%' + (search ?? '') + '%'}
                OR r."contentBody" ILIKE ${'%' + (search ?? '') + '%'}
            )
            AND (
                ${contentType ?? ""} = '' OR 
                r."contentType" = ${contentType ?? ""}
            )
            AND (
                ${scoreLabel ?? ""} = '' OR
                cv."aiLabel" = ${scoreLabel ?? ""}
            )
            GROUP BY r."contentType", r."contentId", r."contentBody", cv."aiLabel", cv."aiScore", cv."aiReason", r."reportedId", u."username", u."avatar"
            ORDER BY cv."aiScore" DESC, "reportCount" DESC
            LIMIT ${pageLimit}
            OFFSET ${startingPage}
        `;

        // Convert report count to Numbers
        const formattedQueue = queue.map(item => ({
            ...item,
            reportCount: Number(item.reportCount),
        }));

        const totalCountResult = await prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*) as count FROM (
                SELECT r."contentId", r."contentType"
                FROM "Report" r 
                LEFT JOIN "ContentVerdict" cv
                ON r."contentId" = cv."contentId" 
                AND r."contentType" = cv."contentType"
                LEFT JOIN "User" u ON r."reportedId" = u."id"
                WHERE r."status" = 'PENDING'
                AND (
                    ${search ?? ""} = '' OR 
                    u."username" ILIKE ${'%' + (search ?? '') + '%'}
                    OR r."contentBody" ILIKE ${'%' + (search ?? '') + '%'}
                )
                AND (
                    ${contentType ?? ""} = '' OR 
                    r."contentType" = ${contentType ?? ""}
                )
                AND (
                    ${scoreLabel ?? ""} = '' OR
                    cv."aiLabel" = ${scoreLabel ?? ""}
                )
                GROUP BY r."contentId", r."contentType"
            ) as grouped
        `;

        const totalReports = Number(totalCountResult[0].count);

        return NextResponse.json(
            {
                data: formattedQueue,
                total: totalReports
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Admin retrieve queue error: ", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}