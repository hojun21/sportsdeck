import { prisma } from "@/lib/prisma";

/**
 * Helps to map content type their corresponding prisma model
 */
export const contentModelMap = {
    THREAD: prisma.thread,
    POST: prisma.post,
    REPLY: prisma.reply
} as const;