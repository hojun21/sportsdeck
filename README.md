# SportsDeck

A community web app for Premier League fans. Follow live matches and standings, talk in team forums, vote in polls, and read an AI-generated daily match digest.

Built by a team of three for **CSC309 (Programming on the Web) at the University of Toronto**.

**Live demo:** https://sportsdeck-YOURNAME.onrender.com
<sub>Hosted on a free tier. The first load can take about a minute while the server wakes up.</sub>

## Features

- **Matches and standings:** live Premier League data from [football-data.org](https://www.football-data.org), refreshed automatically every 6 hours
- **Forums:** a general forum plus one per team, with threads, replies, and polls
- **Accounts:** email/password sign-up or one-click Google sign-in, profiles, and a favourite team
- **AI features:** content moderation and sentiment analysis (Hugging Face), translation of posts, and a daily digest written by Gemini
- **Admin tools:** review reported content, ban users, and handle appeals

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth · JWT · Docker

## My Contribution: Authentication

I designed and built the authentication system that every protected page and API route relies on.

**JWT access and refresh tokens**
- On sign-in, the server issues two tokens:
  - a short-lived **access token** (15 min) that carries the user's id, email, and role
  - a long-lived **refresh token** (7 days)
- The access token is sent as `Authorization: Bearer <token>` on API calls.
- The refresh token is stored in the database and in an `httpOnly`, `SameSite=Strict` cookie, so page scripts cannot read it.
- A client helper, `fetchWithAuth`, handles expired access tokens. When a request returns 401, it gets a new access token from `/api/auth/refresh` and retries the request. If the refresh token is also invalid, it signs the user out.
- Signing out deletes the refresh token from the database and clears the cookie, so the session ends on the server as well.
- Passwords are hashed with bcrypt.

**Role-based access control**
- Helper functions `authorizeUser` and `authorizeAdmin` protect the API routes.
- A request without a valid access token gets `401 Unauthorized`. A regular user calling an admin route gets `403 Forbidden`.

**Google OAuth (NextAuth)**
- Users can sign in with their Google account. On the first sign-in, the app creates an account for them and gives it a unique username.
- Google users then receive the same JWT access and refresh tokens as email users, so the rest of the app treats both kinds of user the same way.

Relevant code: `src/lib/jwt.ts`, `src/lib/auth.ts`, `src/lib/fetchWithAuth.ts`, `src/app/api/auth/`, `src/app/api/nextauth/`

## Running Locally

You need Docker, plus API keys for football-data.org, Gemini, Hugging Face, and Google OAuth.

```bash
cd sportsdeck
cp .env.example .env              # then fill in your keys
docker compose up -d --build      # starts the app and Postgres
docker compose exec app npm run seed   # first run only: loads teams, users, and sample posts
```

Open http://localhost:3000. To stop everything, run `docker compose down`.
