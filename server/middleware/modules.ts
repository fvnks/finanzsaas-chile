import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma";
import { getCompanyId } from "../lib/domain";

export const checkModuleAccess = (requiredModule: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({ error: "Company ID required for this action." });
        }

        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { modules: true, planStatus: true }
            });

            if (!company) {
                return res.status(404).json({ error: "Company not found." });
            }

            if (company.planStatus !== "ACTIVE" && company.planStatus !== "TRIAL") {
                return res.status(402).json({ error: "Su suscripcion no se encuentra activa." });
            }

            if (company.modules && company.modules.length > 0 && !company.modules.includes(requiredModule)) {
                return res.status(403).json({
                    error: `No tiene acceso al modulo: ${requiredModule}. Requerido cambiar de plan.`
                });
            }

            next();
        } catch (error) {
            console.error("Module Check Error:", error);
            res.status(500).json({ error: "Failed to verify module access." });
        }
    };
};
