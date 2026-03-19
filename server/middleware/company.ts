import { NextFunction, Request, Response } from "express";
import { getCompanyId } from "../lib/domain";

export const attachCompanyContext = (req: Request, _res: Response, next: NextFunction) => {
    const companyIdHeader = req.headers["x-company-id"] || req.headers["active-company-id"];
    if (companyIdHeader) {
        (req as any).companyId = typeof companyIdHeader === "string" ? companyIdHeader : companyIdHeader[0];
    }
    next();
};

export const requireCompanyContext = (req: Request, res: Response, next: NextFunction) => {
    if (!getCompanyId(req)) {
        return res.status(400).json({ error: "Company ID required" });
    }
    next();
};
