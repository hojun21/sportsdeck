import { prisma } from "@/lib/prisma";

// How many days in PAST/FUTURE to get match
const PAST = 14
const FUTURE = 14

type MatchAPIResponse = {
    matches: {
        id: number,
        utcDate: string,
        matchday: number,
        status: string,
        homeTeam: { id: number },
        awayTeam: { id: number },
        score: {
            fullTime: {
                home: number | null,
                away: number | null
            }
        }
    }[]
}

// Retrieve the match for past PAST days and upcoming FUTURE days 
export async function retrieveMatch() {
    try {   
        const currDate = new Date();

        // Get past PAST days match
        const startDate = new Date();
        startDate.setDate(currDate.getDate() - PAST);

        // Get next FUTURE days match
        const endDate = new Date();
        endDate.setDate(currDate.getDate() + FUTURE);

        const start = formatDate(startDate);
        const end = formatDate(endDate);

        const result = await fetch(`https://api.football-data.org/v4/competitions/PL/matches?dateFrom=${start}&dateTo=${end}`, {
            headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY! }
        });

        const data: MatchAPIResponse = await result.json();

        // Update match inside database, as well as auto creating threads for the matches
        for (const match of data.matches) {

            const homeTeam = await prisma.team.findUnique({
                where: {externalId: match.homeTeam.id}
            });

            const awayTeam = await prisma.team.findUnique({
                where: {externalId: match.awayTeam.id}
            });

            if (!homeTeam || !awayTeam) {
                throw new Error("Team not found");
            }

            const matchModel = await prisma.match.upsert({
                where: { externalId: match.id },
                update: {
                    matchDayTime: new Date(match.utcDate),
                    status: match.status,
                    homeScore: match.score.fullTime.home,
                    awayScore: match.score.fullTime.away
                },
                create: {
                    externalId: match.id,
                    matchDayTime: new Date(match.utcDate),
                    matchDay: match.matchday,
                    status: match.status,
                    homeTeamId: homeTeam.id,
                    awayTeamId: awayTeam.id,
                    homeScore: match.score.fullTime.home,
                    awayScore: match.score.fullTime.away,
                }
            });

            // Get information needed for the match threads
            let twoWeeksBefore = new Date(match.utcDate);
            twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
            let twoWeeksAfter = new Date(match.utcDate);
            twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);

            let awayTeamForum = await prisma.forum.findUnique({
                where: {
                    teamId: awayTeam['id'],
                },
            })
            let homeTeamForum = await prisma.forum.findUnique({
                where: {
                    teamId: homeTeam['id'],
                },
            })

            if (!awayTeamForum || !homeTeamForum) {
                throw "Team Forum not found. Ensure team forum is up to date."
            }

            // Create threads and posts
            let threadTitle  = "Discussion thread for home team " + homeTeam['name'] 
                + " versus away team " + awayTeam['name'] + " on " + match.utcDate.split('T')[0];
            let thread = await prisma.thread.upsert({
                where: { matchId: matchModel['id'] },
                update: {
                    title: threadTitle,
                    forumId: [awayTeamForum['id'], homeTeamForum['id']],
                    openAt: twoWeeksBefore,
                    closeAt: twoWeeksAfter,
                },
                create: {
                    title: threadTitle,
                    forumId: [awayTeamForum['id'], homeTeamForum['id']],
                    matchId: matchModel['id'],
                    openAt: twoWeeksBefore,
                    closeAt: twoWeeksAfter,
                }
            });

            let postContent = "Talk about the match between home team " + homeTeam['name'] +
                " and away team " + awayTeam['name'] + " here! The match takes place on " +
                match.utcDate.split('T')[0] + " and this thread closes two weeks after."
            if (match.status === 'AWARDED' || match.status === 'FINISHED') {
                postContent += " The final score of this match is: home team " + homeTeam['name'] + 
                " " + match.score.fullTime.home + " - away team " + awayTeam['name'] + " " 
                + match.score.fullTime.away + ".";
            }
            await prisma.post.upsert({
                where: { threadId: thread['id'] },
                update: {
                    content: postContent,
                },
                create: {
                    content: postContent,
                    threadId: thread['id'],
                },
            })

            // Find tag and add tags here
            const homeTeamTag = await prisma.tag.upsert({
                where: {name: homeTeam['name']},
                update: {},
                create: {name: homeTeam['name']},
            });
            const awayTeamTag = await prisma.tag.upsert({
                where: {name: awayTeam['name']},
                update: {},
                create: {name: awayTeam['name']},
            });
            await prisma.threadTag.upsert({
                where: {
                    threadId_tagId: {
                        threadId: thread['id'], tagId: homeTeamTag['id']
                        }
                    },
                update: {},
                create: { threadId: thread['id'], tagId: homeTeamTag['id'] },
            });
            await prisma.threadTag.upsert({
                where: {
                    threadId_tagId: {
                        threadId: thread['id'], tagId: awayTeamTag['id'],
                        }
                    },
                update: {},
                create: { threadId: thread['id'], tagId: awayTeamTag['id'] },
            });
        }
    } catch (error) {
        console.error("Match retrieval error: ", error);
        throw error;
    }
}

// Function to format date into ISO format
function formatDate(date: Date) {
    return date.toISOString().split("T")[0];
}