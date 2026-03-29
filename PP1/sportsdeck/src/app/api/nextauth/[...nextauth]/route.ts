import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";

const handler = NextAuth({
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user }) {

            const baseUsername = (user.name ?? user.email!.split("@")[0]).replace(/\s/g, "_");
            const existingUser = await prisma.user.findUnique({ where: { username: baseUsername } });
            // Prevent duplicated username
            const username = existingUser ? `${baseUsername}_${Date.now()}` : baseUsername;

            const dbUser = await prisma.user.upsert({
                where: { email: user.email! },
                update: {},
                create: {
                    email: user.email!,
                    username: username,
                    avatar: 0,
                    favoriteTeamId: 1,
                },
            });

            const refreshToken = signRefreshToken({ id: dbUser.id });
            await prisma.refreshToken.deleteMany({
                where: { userId: dbUser.id, expiresAt: { lt: new Date() } }
            });
            await prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId: dbUser.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                }
            });

            return true;
        },
        async jwt({ token, account }) {
            if (account?.provider === "google") {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email! }
                    });
                    if (dbUser) {
                        token.accessToken = signAccessToken({ id: dbUser.id, email: dbUser.email, role: dbUser.role });
                        token.refreshToken = await prisma.refreshToken.findFirst({
                            where: { userId: dbUser.id }
                        }).then(r => r?.token);
                    }
                }
                return token;
            },
        async session({ session, token }) {
            (session as any).accessToken = token.accessToken;
            (session as any).refreshToken = token.refreshToken;
            return session;
        },
        async redirect({ url, baseUrl }) {
            return url.startsWith(baseUrl) ? url : baseUrl + "/home";
        },
    }});

export {handler as GET, handler as POST};