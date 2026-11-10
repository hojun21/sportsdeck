# SportsDeck

A community site for Premier League fans: live scores and standings, club forums, polls, and AI-powered moderation. Built by a team of three for CSC309 (Programming on the Web) at the University of Toronto.

**Live:** https://sportsdeck.onrender.com <sub>(free hosting, so the first load can take about a minute)</sub>

**Stack:** Next.js 16 · React 19 · TypeScript · PostgreSQL · Prisma · NextAuth · JWT · Tailwind · Docker

## What I Built

### Authentication (owned end to end)
- JWT auth with a **15-minute access token** and a **7-day refresh token**. The refresh token is stored server-side so a sign-out actually ends the session.
- Refresh token kept in an `httpOnly`, `SameSite=Strict` cookie, out of reach of page scripts.
- A `fetchWithAuth` wrapper that silently refreshes an expired token and retries the request. Users never see a random logout.
- **Google sign-in** with NextAuth, issuing the same JWTs as email sign-in, so the rest of the API works the same for both kinds of user.
- Role-based access control (user / admin) on every protected route, and bcrypt password hashing.

### Threads, Replies, and Polls
- Database schema, REST API, and UI for threads, nested replies, tags, and polls.
- Edit history: every edit keeps the previous version.
- Search by title, author, club, and tag.
- Thread and opening post are created in **one transaction**, so a failed write never leaves an empty thread.
- AI moderation runs **in the background** after a post is saved, so posting never waits on a third-party model.

### Key Decisions
| Decision | Why |
|---|---|
| Access + refresh tokens instead of one long-lived JWT | A single JWT can't be revoked on sign-out or ban |
| JWT instead of server sessions | No database lookup on every request; revocation is only needed at refresh time |
| NextAuth only for the Google handshake | Avoids running two parallel auth systems |
| Soft-hide banned content instead of deleting it | Keeps evidence for reports and ban appeals |

## Other Features (team)
Live match data from football-data.org, refreshed every 6 hours · translation and sentiment analysis with Hugging Face · daily match digest written by Gemini · admin dashboard for reports, bans, and appeals

## Run Locally
```bash
cd sportsdeck
cp .env.example .env                    # add your API keys
docker compose up -d --build
docker compose exec app npm run seed    # first run only
```
Open http://localhost:3000
