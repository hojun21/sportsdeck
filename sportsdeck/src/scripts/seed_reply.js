const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {

  const posts = await prisma.post.findMany({
    include: {
      thread: {
        include: {
          match: true
        }
      }
    }
  });

  const users = await prisma.user.findMany({
    where: { 
      role: "USER",
    }
  });

  if (users.length === 0) {
    throw new Error("No users found. Run seed_users first.");
  }

  const replyMetadata = {
  "Great match!": { sentimentLabel: "POSITIVE", sentimentScore: 90, aiScore: 10, aiLabel: "SAFE" },
  "Amazing performance 🔥": { sentimentLabel: "POSITIVE", sentimentScore: 95, aiScore: 5, aiLabel: "SAFE" },
  "What a comeback!": { sentimentLabel: "POSITIVE", sentimentScore: 92, aiScore: 8, aiLabel: "SAFE" },
  "Dominated from start to finish.": { sentimentLabel: "POSITIVE", sentimentScore: 88, aiScore: 10, aiLabel: "SAFE" },
  "Brilliant tactics from the manager.": { sentimentLabel: "POSITIVE", sentimentScore: 91, aiScore: 10, aiLabel: "SAFE" },
  "That goal was insane!": { sentimentLabel: "POSITIVE", sentimentScore: 94, aiScore: 5, aiLabel: "SAFE" },
  "Best game I've seen this season.": { sentimentLabel: "POSITIVE", sentimentScore: 96, aiScore: 5, aiLabel: "SAFE" },

  "Terrible defending...": { sentimentLabel: "NEGATIVE", sentimentScore: 85, aiScore: 40, aiLabel: "TOXIC" },
  "Ref was awful.": { sentimentLabel: "NEGATIVE", sentimentScore: 80, aiScore: 50, aiLabel: "TOXIC" },
  "Disappointing result...": { sentimentLabel: "NEGATIVE", sentimentScore: 75, aiScore: 30, aiLabel: "TOXIC" },
  "Shocking performance.": { sentimentLabel: "NEGATIVE", sentimentScore: 88, aiScore: 60, aiLabel: "TOXIC" },
  "Defense completely collapsed.": { sentimentLabel: "NEGATIVE", sentimentScore: 82, aiScore: 45, aiLabel: "TOXIC" },
  "Midfield was invisible.": { sentimentLabel: "NEGATIVE", sentimentScore: 78, aiScore: 35, aiLabel: "TOXIC" },
  "That was hard to watch.": { sentimentLabel: "NEGATIVE", sentimentScore: 80, aiScore: 35, aiLabel: "TOXIC" },

  "Could be better.": { sentimentLabel: "NEUTRAL", sentimentScore: 55, aiScore: 15, aiLabel: "SAFE" },
  "Decent game overall.": { sentimentLabel: "NEUTRAL", sentimentScore: 60, aiScore: 10, aiLabel: "SAFE" },
  "Both teams had chances.": { sentimentLabel: "NEUTRAL", sentimentScore: 58, aiScore: 10, aiLabel: "SAFE" },
  "Not the result we expected.": { sentimentLabel: "NEUTRAL", sentimentScore: 55, aiScore: 15, aiLabel: "SAFE" },
  "Pretty even match.": { sentimentLabel: "NEUTRAL", sentimentScore: 60, aiScore: 10, aiLabel: "SAFE" },
  "Some good moments, some bad.": { sentimentLabel: "NEUTRAL", sentimentScore: 58, aiScore: 15, aiLabel: "SAFE" },

  "We are massive!": { sentimentLabel: "POSITIVE", sentimentScore: 85, aiScore: 10, aiLabel: "SAFE" },
  "Never doubted them!": { sentimentLabel: "POSITIVE", sentimentScore: 90, aiScore: 5, aiLabel: "SAFE" },
  "Pain. Just pain.": { sentimentLabel: "NEGATIVE", sentimentScore: 90, aiScore: 20, aiLabel: "SAFE" },
  "I can't believe we lost that...": { sentimentLabel: "NEGATIVE", sentimentScore: 88, aiScore: 25, aiLabel: "SAFE" },
  "This team gives me heart attacks": { sentimentLabel: "NEUTRAL", sentimentScore: 65, aiScore: 10, aiLabel: "SAFE" },

  "They exploited the wings perfectly.": { sentimentLabel: "POSITIVE", sentimentScore: 85, aiScore: 10, aiLabel: "SAFE" },
  "Too many defensive errors.": { sentimentLabel: "NEGATIVE", sentimentScore: 82, aiScore: 35, aiLabel: "TOXIC" },
  "Lack of finishing cost us.": { sentimentLabel: "NEGATIVE", sentimentScore: 78, aiScore: 30, aiLabel: "TOXIC" },
  "Good control in midfield.": { sentimentLabel: "POSITIVE", sentimentScore: 80, aiScore: 10, aiLabel: "SAFE" },
  "Set pieces were dangerous.": { sentimentLabel: "NEUTRAL", sentimentScore: 65, aiScore: 10, aiLabel: "SAFE" },
  "Poor substitutions.": { sentimentLabel: "NEGATIVE", sentimentScore: 75, aiScore: 30, aiLabel: "TOXIC" },
};
 const replyTexts = Object.keys(replyMetadata);

  for (const post of posts) {
    const match = post.thread.match;
    if (!match) continue;

    const homeTeam = match.homeTeamId;
    const awayTeam = match.awayTeamId;

    const matchedUsers = users.filter(
      u => u.favoriteTeamId === homeTeam || u.favoriteTeamId === awayTeam
    );

    if (matchedUsers.length === 0) continue;

    for (let i = 0; i < 15; i++) {
      const user = matchedUsers[Math.floor(Math.random() * matchedUsers.length)];
      const content = replyTexts[Math.floor(Math.random() * replyTexts.length)];

      const reply = await prisma.reply.create({
        data: {
          content,
          postId: post.id,
          authorId: user.id,
        }
      });

      // Run sentiment analysis

      const meta = replyMetadata[content];


      await prisma.reply.update({
        where: { id: reply.id },
        data: {
          sentimentLabel: meta.sentimentLabel,
          sentimentScore: meta.sentimentScore
        }
      });

      await prisma.contentVerdict.create({
        data: {
          contentId: reply.id,
          contentType: "REPLY",
          aiScore: meta.aiScore,
          aiLabel: meta.aiLabel,
          aiReason: `AI detected ${meta.aiLabel} content with confidence score of ${meta.aiScore}%.`
        }
      });
    }

  }

  console.log("Reply seeding complete!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });