const { PrismaClient } = require('../generated/prisma');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();  

async function main(){

    const result = await fetch('https://api.football-data.org/v4/competitions/2021/teams', {
        headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY }
    });
    const data = await result.json();

    // Create general forum 
    const existingGeneral = await prisma.forum.findFirst({
        where: { teamId: null }
    });

    if (!existingGeneral) {
    await prisma.forum.create({
        data: { teamId: null }
    });
    }

    // Create forum for each EPL team 
    for (const eplTeam of data.teams) {
        const team = await prisma.team.upsert({
            where: { externalId: eplTeam.id },
            update: {},
            create: { 
                externalId: eplTeam.id,
                name: eplTeam.name,
                shortname: eplTeam.shortName,
                crest: eplTeam.crest,
                venue: eplTeam.venue
            }
        });

        await prisma.forum.upsert({
            where: { teamId: team.id },
            update: {},
            create: { teamId: team.id }
        })
    }
    await prisma.$disconnect();
}

main();



