type StandingsAPIResponse = {
    standings: {
        table: {
            position: number
            team: {
                id: number
                name: string
                crest: string
            }
        playedGames: number,
        won: number,
        draw: number,
        lost: number,
        points: number,
        goalsFor: number,
        goalsAgainst: number,
        goalDifference: number
        }[]
    }[]
}

type Standings = {
    position: number;
    teamName: string;
    teamExternalId: number;
    teamLogo: string;
    gamesPlayed: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
}

// Variable to store the standings data
let standingsCache: Standings[] | null = null;
let cacheDate: string | null = null;

export async function retrieveStanding() {
    try{
        // Convert timestamp to only date 
        const today = new Date().toDateString();

        if (standingsCache && cacheDate === today) {
            return standingsCache;
        }

        const result = await fetch(`https://api.football-data.org/v4/competitions/PL/standings`, {
            headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY! }
        });

        const data: StandingsAPIResponse = await result.json();
        const standings = data.standings[0].table.map(team => ({
            position: team.position,
            teamName: team.team.name,
            teamExternalId: team.team.id,
            teamLogo: team.team.crest,
            gamesPlayed: team.playedGames,
            won: team.won,
            draw: team.draw,
            lost: team.lost,
            points: team.points,
            goalsFor: team.goalsFor,
            goalsAgainst: team.goalsAgainst,
            goalDifference: team.goalDifference
        }));
        
        standingsCache = standings;
        // Implement cache by date 
        cacheDate = today;

        return standings;
    } catch (error) {
        console.error("Standings retrieval error: ", error);
        throw error;
    }
}