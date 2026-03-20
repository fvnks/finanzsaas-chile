import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma";
import { verifySessionToken } from "../lib/session";

export const attachCurrentUser = async (req: Request, _res: Response, next: NextFunction) => {
    const authorizationHeader = req.headers.authorization;
    const bearerToken = typeof authorizationHeader === "string" && authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice("Bearer ".length).trim()
        : null;

    if (!bearerToken) {
        return next();
    }

    const session = verifySessionToken(bearerToken);
    if (!session) {
        return next();
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                email: true,
                name: true,
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

export const requireAuthenticatedUser = (req: Request, res: Response, next: NextFunction) => {
    const currentUser = (req as any).currentUser;
    if (!currentUser) {
        return res.status(401).json({ error: "Authentication required" });
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
