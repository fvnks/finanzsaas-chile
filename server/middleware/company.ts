import { NextFunction, Request, Response } from "express";
import { getCompanyId } from "../lib/domain";
import { requestContext } from "../lib/context";

export const attachCompanyContext = (req: Request, res: Response, next: NextFunction) => {
    const companyIdHeader = req.headers["x-company-id"] || req.headers["active-company-id"];
    const requestedCompanyId = companyIdHeader
        ? (typeof companyIdHeader === "string" ? companyIdHeader : companyIdHeader[0])
        : null;
    const currentUser = (req as any).currentUser;

    let resolvedCompanyId: string | null = null;

    if (!currentUser) {
        if (requestedCompanyId) {
            resolvedCompanyId = requestedCompanyId;
        }
    } else {
        const allowedCompanyIds = new Set(
            Array.isArray(currentUser.companies) ? currentUser.companies.map((company: { id: string }) => company.id) : []
        );
        const fallbackCompanyId = currentUser.activeCompanyId && allowedCompanyIds.has(currentUser.activeCompanyId)
            ? currentUser.activeCompanyId
            : null;
        
        resolvedCompanyId = requestedCompanyId || fallbackCompanyId;

        if (resolvedCompanyId && currentUser.role !== "ADMIN" && !allowedCompanyIds.has(resolvedCompanyId)) {
            return res.status(403).json({ error: "No tiene acceso a la empresa seleccionada." });
        }
    }

    if (resolvedCompanyId) {
        (req as any).companyId = resolvedCompanyId;
        req.headers["x-company-id"] = resolvedCompanyId;
    }

    // Wrap the rest of the request in the context
    requestContext.run({ companyId: resolvedCompanyId || undefined, userId: currentUser?.id }, () => {
        next();
    });
};

export const requireCompanyContext = (req: Request, res: Response, next: NextFunction) => {
    if (!getCompanyId(req)) {
        return res.status(400).json({ error: "Company ID required" });
    }
    next();
};
