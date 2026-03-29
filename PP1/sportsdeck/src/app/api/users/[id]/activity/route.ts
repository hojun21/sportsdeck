import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DAYS_TO_GET = 7;

type Params = {
    params: {
        id: string;
    };
};

// Get user activity of user over the last 7 days
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const idNum = Number(id);

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: {
            id: idNum,
        },
    });
    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fill activity with posts and replies made on each day, last index being today
    let activity: number[] = [];
    // Referenced https://stackoverflow.com/questions/5511323/calculate-the-date-yesterday-in-javascript
    let date = new Date();
    let i = 0;
    // Since get_activity gets all activity after a day, need to remove
    // count of activity that's already counted and thus on a different day
    let count;
    let prev_count = 0;
    while (i < DAYS_TO_GET+1) {
        count = await get_activity(date, idNum);
        activity.push(count - prev_count);
        prev_count = count;
        date.setDate(date.getDate() - 1);
        date.setHours(0, 0, 0, 0);
        i++;
    }

    activity.reverse();

    return NextResponse.json({activity: activity}, {status: 200});
}

// Following code from https://stackoverflow.com/questions/72444834/get-items-by-date-in-prisma
// For getting item by date

// Gets activity after the day before or start of date.
// If given date that doesn't have hour, minutes, seconds, milliseconds at 0, it returns
// activity up to the current date (From start of date to date)
// Otherwise, it gives activity from day before date (from day before date to date)
// "Activity is determined based on the number of posts and comments authored by the user."
async function get_activity(date: Date, id: number) {

    // Given date or default of today, return date in format for prisma 
    const getDate = (givenDate = new Date()) => {
        const offset = givenDate.getTimezoneOffset();
        givenDate = new Date(givenDate.getTime() - offset * 60 * 1000);
        return givenDate.toISOString().split('T')[0];
    };

    // Sets up previous date
    let previousDate = new Date(date.getTime());
    previousDate.setHours(0, 0, 0, 0);

    // console.log("new")
    // console.log("date:"+date)
    // console.log("previous:"+previousDate)

    // Find posts (comments) and threads (posts) by user on date, return sum
    const posts = await prisma.post.findMany({
        where: { 
            authorId: id, 
            createdAt: {
                gte: new Date(getDate(previousDate)),
                // lte: new Date(getDate(date)) // For some reason if I keep this it doesn't get today's post for some reason 
            }
        },
    });
    const replies = await prisma.reply.findMany({
        where: { 
            authorId: id, 
            createdAt: {
                gte: new Date(getDate(previousDate)),
            }
        },
    });

    return replies.length + posts.length;
}