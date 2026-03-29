const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const { InferenceClient } = require("@huggingface/inference");

const client = new InferenceClient(process.env.HF_TOKEN);

async function analyzeSentiment(text) {
  const response = await client.textClassification({
    model: "cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual",
    inputs: text,
    provider: "hf-inference"
  });

  let highest = response[0];
  for (const item of response) {
    if (item.score > highest.score) {
      highest = item;
    }
  }

  return {
    sentimentLabel: highest.label.toUpperCase(),
    sentimentScore: Math.round(highest.score * 100),
  };
}

async function analyzeContent(text) {
  const response = await client.textClassification({
    model: "unitary/multilingual-toxic-xlm-roberta",
    inputs: text,
    provider: "hf-inference"
  })

  let highestScore = response[0];
    for (const item of response) {
        if (item.score > highestScore.score) {
            highestScore = item;
        }
    }

    const aiScore = Math.round(highestScore.score * 100);

    let aiLabel;
    let aiReason;

    // If score is less than 30, label it as "SAFE"
    if (aiScore < 30) {
        aiLabel = "SAFE";
        aiReason = `Content is safe (Highest toxicity score of: ${aiScore}%).`;
    } else if (aiScore < 80) {
        aiLabel = "TOXIC";
        aiReason = `AI detected ${aiLabel} content with confidence score of ${aiScore}%.`;
    } else {
        aiLabel = "SEVERE";
        aiReason = `AI detected ${aiLabel} content with confidence score of ${aiScore}%.`;
    }

    return {aiScore, aiLabel, aiReason};
}

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

  const sampleReplies = [
    "Great match!",
    "Amazing performance 🔥",
    "What a comeback!",
    "Dominated from start to finish.",
    "Brilliant tactics from the manager.",
    "That goal was insane!",
    "Best game I've seen this season.",
    "Terrible defending...",
    "Ref was awful.",
    "Disappointing result...",
    "Shocking performance.",
    "Defense completely collapsed.",
    "Midfield was invisible.",
    "That was hard to watch.",
    "Could be better.",
    "Decent game overall.",
    "Both teams had chances.",
    "Not the result we expected.",
    "Pretty even match.",
    "Some good moments, some bad.",
    "We are massive!",
    "Never doubted them!",
    "Pain. Just pain.",
    "I can't believe we lost that...",
    "This team gives me heart attacks",
    "They exploited the wings perfectly.",
    "Too many defensive errors.",
    "Lack of finishing cost us.",
    "Good control in midfield.",
    "Set pieces were dangerous.",
    "Poor substitutions.",
  ];

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
      const content = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

      const reply = await prisma.reply.create({
        data: {
          content,
          postId: post.id,
          authorId: user.id,
        }
      });

      // Run sentiment analysis
      try {
        const result = await analyzeSentiment(content);
        const contentVerdictResult = await analyzeContent(content);

        await prisma.reply.update({
          where: { id: reply.id },
          data: {
            sentimentLabel: result.sentimentLabel,
            sentimentScore: result.sentimentScore
          }
        });

        await prisma.contentVerdict.create({
          data: {
            contentId: reply.id,
            contentType: "REPLY",
            aiScore: contentVerdictResult.aiScore,
            aiLabel: contentVerdictResult.aiLabel,
            aiReason: contentVerdictResult.aiReason
          }
        })

      } catch (err) {
        console.error("Sentiment failed:", err);
      }
    }

    console.log(`Replies added for post ${post.id}`);
  }

  console.log("Reply seeding complete!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });