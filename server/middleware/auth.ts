import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma";

export const attachCurrentUser = async (req: Request, _res: Response, next: NextFunction) => {
    const userIdHeader = req.headers["x-user-id"];
    const userId = typeof userIdHeader === "string" ? userIdHeader : userIdHeader?.[0];

    if (!userId) {
        return next();
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                activeCompanyId: true,
                companies: { select: { id: true } }
            }
        });

        if (user) {
            (req as any).currentUser = user;
        }
    } catch (error) {
        console.error("Failed to attach current user:", error);
    }

    next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const currentUser = (req as any).currentUser;
    if (!currentUser) {
        return res.status(401).json({ error: "User context required" });
    }

    if (currentUser.role !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
    }

    next();
};

export const requireSelfOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    const currentUser = (req as any).currentUser;
    if (!currentUser) {
        return res.status(401).json({ error: "User context required" });
    }

    if (currentUser.role === "ADMIN" || currentUser.id === req.params.id) {
        return next();
    }

    return res.status(403).json({ error: "Forbidden" });
};
