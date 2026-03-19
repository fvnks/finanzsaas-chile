import { PrismaClient } from "@prisma/client";
import { logger } from "../lib/logger";

const prisma = new PrismaClient() as any;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function sweepCompanySubscriptions() {
    try {
        const now = new Date();
        const in7Days = new Date(now.getTime() + 7 * DAY_MS);

        const expiredCompanies = await prisma.company.findMany({
            where: {
                subscriptionEndsAt: { lt: now },
                NOT: { planStatus: "SUSPENDED" }
            },
            select: {
                id: true,
                name: true,
                subscriptionEndsAt: true
            }
        });

        let suspendedCount = 0;
        for (const company of expiredCompanies) {
            await prisma.company.update({
                where: { id: company.id },
                data: { planStatus: "SUSPENDED" }
            });
            suspendedCount += 1;
        }

        const expiringSoon = await prisma.company.findMany({
            where: {
                planStatus: { in: ["ACTIVE", "TRIAL"] },
                subscriptionEndsAt: {
                    gte: now,
                    lte: in7Days
                }
            },
            select: {
                id: true,
                name: true,
                subscriptionEndsAt: true
            },
            orderBy: { subscriptionEndsAt: "asc" }
        });

        logger.info({
            event: "subscription_sweep_completed",
            suspendedCount,
            expiringSoonCount: expiringSoon.length
        });
    } catch (error: any) {
        logger.error({
            event: "subscription_sweep_failed",
            message: error?.message || "Unknown subscription sweep error"
        });
    }
}

export function startSubscriptionCron() {
    sweepCompanySubscriptions();
    setInterval(sweepCompanySubscriptions, 6 * 60 * 60 * 1000);
}
