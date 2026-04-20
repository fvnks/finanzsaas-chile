import { PrismaClient } from "@prisma/client";
import { getCurrentCompanyId } from "./lib/context";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prismaLogs = process.env.PRISMA_LOG_QUERIES === "true"
    ? ["query", "info", "warn", "error"] as const
    : ["warn", "error"] as const;

const basePrisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: prismaLogs as any,
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

export const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ args, query, operation }) {
                const companyId = getCurrentCompanyId();

                if (!companyId) {
                    return query(args);
                }

                // Pass the companyId to the database session before executing the query.
                // We use a transaction to ensure the setting stays bound to the connection
                // used for the actual query, which is required for Row Level Security (RLS).
                return basePrisma.$transaction(async (tx) => {
                    await tx.$executeRawUnsafe(`SELECT set_config('app.current_company_id', '${companyId}', true)`);
                    return query(args);
                });
            }
        }
    }
});
