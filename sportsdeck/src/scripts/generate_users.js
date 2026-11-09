// Randomly generate users
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient(); 
const bcrypt = require("bcryptjs");

const USER_COUNT = 20;

const usernames = [
  "strikerKing",
  "goalMachine",
  "pitchMaster",
  "ballControl",
  "tikiTakaPro",
  "headerHero",
  "freeKickAce",
  "dribbleGod",
  "counterAttack",
  "cleanSheetGK",
  "assistWizard",
  "pressingBeast",
  "ultimateForward",
  "midfieldGenius",
  "defenseWall",
  "wingSpeedster",
  "penaltySniper",
  "matchWinner",
  "footballLegend",
  "stadiumRoar"
];

async function main() {
  console.log("Seeding users...");

  const teams = await prisma.team.findMany();

  if (teams.length === 0) {
    throw new Error("No teams found. Run team setup first.");
  }

  for (let i = 0; i < USER_COUNT; i++) {
    const username = `${usernames[i % usernames.length]}_${i}`;
    const email = `${username}@test.com`;

    const password = await bcrypt.hash("password123", 10);

    // Ensure different teams
    const team = teams[i % teams.length];

    try {
      await prisma.user.create({
        data: {
          username,
          email,
          password,
          favoriteTeamId: team.id,
          avatar: Math.floor(Math.random() * 5),
        },
      });

      console.log(`Created user: ${username}`);
    } catch (err) {
      console.log(`Skipped duplicate: ${username}`);
    }
  }

  console.log("User seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });