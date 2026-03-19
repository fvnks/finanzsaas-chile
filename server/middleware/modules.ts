import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma";
import { getCompanyId } from "../lib/domain";

export const checkModuleAccess = (requiredModule: string | string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({ error: "Company ID required for this action." });
        }

        try {
            const company = await (prisma as any).company.findUnique({
                where: { id: companyId },
                select: { modules: true, planStatus: true, subscriptionEndsAt: true }
            });

            if (!company) {
                return res.status(404).json({ error: "Company not found." });
            }

            const isExpired = !!company.subscriptionEndsAt && company.subscriptionEndsAt < new Date();
            if (isExpired && company.planStatus !== "SUSPENDED") {
                await (prisma as any).company.update({
                    where: { id: companyId },
                    data: { planStatus: "SUSPENDED" }
                });
            }

            if (isExpired) {
                return res.status(402).json({ error: "La suscripcion de esta empresa esta vencida. Debe renovarse para continuar." });
            }

            if (company.planStatus !== "ACTIVE" && company.planStatus !== "TRIAL") {
                return res.status(402).json({ error: "Su suscripcion no se encuentra activa." });
            }

            const requiredModules = Array.isArray(requiredModule) ? requiredModule : [requiredModule];
            const hasAccess = requiredModules.some(moduleId => company.modules.includes(moduleId));

            if (company.modules && company.modules.length > 0 && !hasAccess) {
                return res.status(403).json({
                    error: `No tiene acceso a los modulos requeridos: ${requiredModules.join(", ")}.`
                });
            }

            next();
        } catch (error) {
            console.error("Module Check Error:", error);
            res.status(500).json({ error: "Failed to verify module access." });
        }
    };
};
