const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
    // Randomly find 2 users and ban them
    const users = await prisma.user.findMany({
        where: {
            role: "USER",
            isBanned: false
        }
    });

    const bannedUser = users.slice(0, 2);

    for (const user of bannedUser) {
        await prisma.user.update({
            where: { id: user.id },
            data: { isBanned: true }
        });
    }

    // Report some replies
    const replies = await prisma.reply.findMany({
        take: 20
    });

    for (let i = 0; i < 10; i++) {
    const reporter = users[Math.floor(Math.random() * users.length)];
    const reply = replies[Math.floor(Math.random() * replies.length)];

    if (reporter.id === reply.authorId) continue;

    await prisma.report.create({
        data: {
            explanation: "Toxic content",
            reporterId: reporter.id, 
            reportedId: reply.authorId,
            contentId: reply.id,
            contentType: "REPLY",
            contentBody: reply.content
        }
    });
    }

    const appealMessages = [
    "I didn’t mean to offend anyone.",
    "Please review my ban, it was a misunderstanding.",
    "I will follow the rules moving forward.",
    "I apologize for my behavior.",
    ];

    // Submit appeal for banned users
    for (const user of bannedUser) {
        await prisma.appealRequest.create({
            data: {
                userId: user.id,
                reason: appealMessages[Math.floor(Math.random() * appealMessages.length)],
                status: "PENDING"
            }
        });
    }
    console.log("Reports & appeals seeded!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });