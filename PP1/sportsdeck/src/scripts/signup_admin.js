const { PrismaClient } = require('../generated/prisma');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();  

async function main() {
    // Create admin
    const hashedPassword = await hash('admin1234567', 10);

    await prisma.user.upsert({
        where: { email: 'admin@naver.com' },
        update: {},
        create: {
            email: 'admin@naver.com',
            username: 'admin',
            password: hashedPassword,
            avatar: 1,
            favoriteTeamId: 8,
            role: 'ADMIN',
        }
    });

    // Create SYSTEM AI user
    await prisma.user.upsert({
        where: { email: 'system@ai.com' },
        update: {},
        create: {
            email: 'system@ai.com',
            username: 'SYSTEM_AI',
            password: null,
            avatar: 0,
            favoriteTeamId: 3,
            role: 'SYSTEM',
        }
    });

    await prisma.$disconnect();
}
main();