import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prismaLogs = process.env.PRISMA_LOG_QUERIES === "true"
    ? ["query", "info", "warn", "error"] as const
    : ["warn", "error"] as const;

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: prismaLogs as any,
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
