import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import multer from "multer";
import { Readable } from "stream";
import { uploadToOneDrive, getFileStreamFromWebUrl } from "./services/onedrive";
import { createBackup, listBackups, getBackupPath, deleteBackup } from "./services/backup";
import financeRouter from "./routes/finance";
import inventoryRouter from "./routes/inventory";
import invoicesRouter from "./routes/invoices";
import {
    deleteOwnedRecord,
    findOwnedRecord,
    getCompanyId,
    getInvoiceTypeLabel,
    normalizeInvoiceType,
    updateOwnedRecord
} from "./lib/domain";
import { requireAdmin, requireAuthenticatedUser, requireSelfOrAdmin } from "./middleware/auth";
import { createSessionToken } from "./lib/session";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
const prismaAny: any = prisma;

const requireCompanyId = (req: Request, res: Response) => {
    const companyId = getCompanyId(req);
    if (!companyId) {
        res.status(400).json({ error: "Company ID required" });
        return null;
    }
    return companyId;
};

const resolveCompanyModules = async (planId?: string | null, modules?: string[] | null) => {
    if (modules && modules.length > 0) {
        return [...new Set(modules)];
    }

    if (!planId) {
        return [];
    }

    const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
        select: { modules: true }
    });

    return plan?.modules || [];
};

const addMonths = (baseDate: Date, months: number) => {
    const nextDate = new Date(baseDate);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
};

const normalizeSubscriptionDates = (payload: {
    subscriptionStartedAt?: string | null;
    subscriptionEndsAt?: string | null;
    lastPaymentAt?: string | null;
    billingCycleMonths?: number | null;
    planStatus?: string | null;
}) => {
    const billingCycleMonths = payload.billingCycleMonths ? Number(payload.billingCycleMonths) : 1;
    const subscriptionStartedAt = payload.subscriptionStartedAt ? new Date(payload.subscriptionStartedAt) : undefined;
    const lastPaymentAt = payload.lastPaymentAt ? new Date(payload.lastPaymentAt) : undefined;
    let subscriptionEndsAt = payload.subscriptionEndsAt ? new Date(payload.subscriptionEndsAt) : undefined;

    if (!subscriptionEndsAt && subscriptionStartedAt && (payload.planStatus === "ACTIVE" || payload.planStatus === "TRIAL")) {
        subscriptionEndsAt = addMonths(subscriptionStartedAt, billingCycleMonths);
    }

    return {
        subscriptionStartedAt,
        subscriptionEndsAt,
        lastPaymentAt,
        billingCycleMonths
    };
};

const validateUserCapacity = async (companyIds: string[] = [], excludedUserId?: string) => {
    if (!companyIds.length) {
        return null;
    }

    const companies = await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: {
            id: true,
            name: true,
            planStatus: true,
            plan: {
                select: {
                    maxUsers: true
                }
            },
            _count: {
                select: {
                    users: true
                }
            }
        }
    });

    for (const company of companies) {
        if (company.planStatus !== "ACTIVE" && company.planStatus !== "TRIAL") {
            return `La empresa ${company.name} no tiene una suscripcion activa.`;
        }

        const maxUsers = company.plan?.maxUsers;
        if (!maxUsers) {
            continue;
        }

        let assignedUsers = company._count.users;
        if (excludedUserId) {
            const existingMembership = await prisma.user.count({
                where: {
                    id: excludedUserId,
                    companies: {
                        some: { id: company.id }
                    }
                }
            });

            if (existingMembership > 0) {
                assignedUsers -= 1;
            }
        }

        if (assignedUsers >= maxUsers) {
            return `La empresa ${company.name} ya alcanzo el limite de ${maxUsers} usuarios para su plan.`;
        }
    }

    return null;
};

router.use((req, res, next) => {
    if (req.path === "/login" || req.path.startsWith("/portal/")) {
        return next();
    }

    return requireAuthenticatedUser(req, res, next);
});

// --- DIAGNOSTIC ENDPOINT FOR RAILWAY ---
router.get("/debug-db", requireAdmin, async (req, res) => {
    try {
        const invoicesCount = await prisma.invoice.count();
        const clientsCount = await prisma.client.count();
        const companiesCount = await prisma.company.count();
        const companyId = (req as any).companyId;
        
        // Breakdown by Company
        const invoicesByCompany = await prisma.invoice.groupBy({
            by: ['companyId'],
            _count: true
        });
        const clientsByCompany = await prisma.client.groupBy({
            by: ['companyId'],
            _count: true
        });

        // List Companies
        const companies = await prisma.company.findMany({
            select: { id: true, name: true, modules: true }
        });

        let companyModules: string[] = [];
        if (companyId) {
            const company = companies.find(c => c.id === companyId);
            companyModules = company?.modules || [];
        }

        res.json({
            status: "ok",
            counts: {
                totalInvoices: invoicesCount,
                totalClients: clientsCount,
                totalCompanies: companiesCount,
                invoicesByCompany,
                clientsByCompany
            },
            companies: companies.map(c => ({ id: c.id, name: c.name, modules: c.modules })),
            context: {
                companyId,
                companyModules: companyModules || []
            }
        });
    } catch (err: any) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// --- AUTHORIZATION MIDDLEWARE ---
const checkModuleAccess = (requiredModule: string | string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const companyId = getCompanyId(req);
        
        if (!companyId) {
            return res.status(400).json({ error: "Company ID required for this action." });
        }

        try {
            const company = await prismaAny.company.findUnique({
                where: { id: companyId },
                select: { modules: true, planStatus: true, subscriptionEndsAt: true }
            });

            if (!company) {
                return res.status(404).json({ error: "Company not found." });
            }

            if (company.planStatus !== 'ACTIVE' && company.planStatus !== 'TRIAL') {
                return res.status(402).json({ error: "Su suscripción no se encuentra activa." });
            }

            // If modules array is empty/null, perhaps it's a legacy company with all access?
            // Allow access if modules list is empty to support legacy companies.
            const requiredModules = Array.isArray(requiredModule) ? requiredModule : [requiredModule];
            const hasAccess = requiredModules.some(moduleId => company.modules.includes(moduleId));
            if (company.modules && company.modules.length > 0 && !hasAccess) {
                return res.status(403).json({ error: `No tiene acceso a los módulos requeridos: ${requiredModules.join(", ")}.` });
            }

            next();
        } catch (error) {
            console.error("Module Check Error:", error);
            res.status(500).json({ error: "Failed to verify module access." });
        }
    };
};
// --- AUTH ---
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        const { password: _, ...userInfo } = user;

        // Fetch companies for this user
        // @ts-ignore
        const userWithCompanies: any = await prismaAny.user.findUnique({
            where: { id: user.id },
            include: { 
                companies: {
                    select: {
                        id: true,
                        name: true,
                        rut: true,
                        email: true,
                        phone: true,
                        address: true,
                        website: true,
                        logoUrl: true,
                        primaryColor: true,
                        createdAt: true,
                        updatedAt: true,
                        planId: true,
                        planStatus: true,
                        modules: true,
                        subscriptionStartedAt: true,
                        subscriptionEndsAt: true,
                        lastPaymentAt: true,
                        billingCycleMonths: true
                    }
                } 
            }
        });

        // Ensure allowedSections is returned, defaulting to empty if null (though Prisma handles it)
        res.json({
            ...userInfo,
            token: createSessionToken(user.id),
            allowedSections: user.allowedSections || [],
            companies: userWithCompanies?.companies || [],
            activeCompanyId: userWithCompanies?.activeCompanyId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

// --- COMPANIES ---
router.put("/companies/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { primaryColor, logoUrl, name, address, email, phone, website, planId, planStatus, modules } = req.body;
    
    try {
        const resolvedModules = await resolveCompanyModules(planId, modules);
        const subscription = normalizeSubscriptionDates(req.body);
        const updated = await prismaAny.company.update({
            where: { id },
            data: {
                primaryColor: primaryColor !== undefined ? primaryColor : undefined,
                logoUrl: logoUrl !== undefined ? logoUrl : undefined,
                name: name || undefined,
                address: address !== undefined ? address : undefined,
                email: email !== undefined ? email : undefined,
                phone: phone !== undefined ? phone : undefined,
                website: website !== undefined ? website : undefined,
                planId: planId !== undefined ? (planId || null) : undefined,
                planStatus: planStatus || undefined,
                modules: modules !== undefined || planId !== undefined ? resolvedModules : undefined,
                subscriptionStartedAt: req.body.subscriptionStartedAt !== undefined ? subscription.subscriptionStartedAt || null : undefined,
                subscriptionEndsAt: req.body.subscriptionEndsAt !== undefined || req.body.subscriptionStartedAt !== undefined || req.body.billingCycleMonths !== undefined
                    ? subscription.subscriptionEndsAt || null
                    : undefined,
                lastPaymentAt: req.body.lastPaymentAt !== undefined ? subscription.lastPaymentAt || null : undefined,
                billingCycleMonths: req.body.billingCycleMonths !== undefined ? subscription.billingCycleMonths : undefined
            },
            include: {
                plan: true,
                _count: { select: { users: true } }
            }
        });
        res.json({ ...updated, userCount: updated._count.users });
    } catch (error) {
        console.error("Error updating company:", error);
        res.status(500).json({ error: "Failed to update company" });
    }
});

router.post("/companies/:id/renew", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const months = Math.max(1, Number(req.body?.months || 1));

    try {
        const company = await prismaAny.company.findUnique({
            where: { id },
            select: {
                id: true,
                plan: { select: { modules: true } },
                modules: true,
                billingCycleMonths: true,
                subscriptionEndsAt: true
            }
        });

        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }

        const baseDate = company.subscriptionEndsAt && company.subscriptionEndsAt > new Date()
            ? company.subscriptionEndsAt
            : new Date();

        const renewed = await prismaAny.company.update({
            where: { id },
            data: {
                planStatus: "ACTIVE",
                lastPaymentAt: new Date(),
                billingCycleMonths: company.billingCycleMonths || months,
                subscriptionStartedAt: company.subscriptionEndsAt ? undefined : new Date(),
                subscriptionEndsAt: addMonths(baseDate, months),
                modules: company.modules?.length ? company.modules : (company.plan?.modules || [])
            },
            include: {
                plan: true,
                _count: { select: { users: true } }
            }
        });

        res.json({ ...renewed, userCount: renewed._count.users });
    } catch (error) {
        console.error("Error renewing company subscription:", error);
        res.status(500).json({ error: "Failed to renew company subscription" });
    }
});

// --- CLIENTS ---
router.get("/clients", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        // Mapping "name" back to "razonSocial" for frontend compatibility if needed, 
        // OR update frontend to use "name". Ideally update frontend, but here we maintain contract.
        const clients = await prisma.client.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        // Transform to match legacy frontend expectations if needed, or return direct.
        // Frontend expects: razonSocial, nombreComercial, telefono.
        const response = clients.map(c => ({
            ...c,
            razonSocial: c.name,
            nombreComercial: c.name,
            telefono: c.phone
        }));

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});

router.post("/clients", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { rut, razonSocial, email, telefono, address } = req.body;

        const newClient = await prisma.client.create({
            data: {
                companyId,
                rut,
                name: razonSocial,
                email: email || null,
                phone: telefono || null,
                address: address || null
            }
        });

        res.json({
            ...newClient,
            razonSocial: newClient.name,
            nombreComercial: newClient.name,
            telefono: newClient.phone
        });
    } catch (err: any) {
        console.error(err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: "Ya existe un cliente con este RUT." });
        }
        res.status(500).json({ error: "Failed to create client" });
    }
});

// --- COST CENTERS ---
router.get("/cost-centers", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const costCenters = await prisma.costCenter.findMany({
            where: { companyId },
            orderBy: { createAt: 'desc' }
        });
        res.json(costCenters);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch cost centers" });
    }
});

router.post("/cost-centers", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { code, name, budget } = req.body;
        const newCostCenter = await prisma.costCenter.create({
            data: {
                companyId,
                code,
                name,
                budget: budget ? Number(budget) : 0
            }
        });
        res.json(newCostCenter);
    } catch (err: any) {
        console.error(err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: "Ya existe un centro de costo con este codigo." });
        }
        res.status(500).json({ error: "Failed to create cost center" });
    }
});

router.put("/cost-centers/:id", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { code, name, budget } = req.body;
        const updated = await updateOwnedRecord(prisma.costCenter, id, companyId, {
            code,
            name,
            budget: Number(budget)
        });
        if (!updated) return res.status(404).json({ error: "Cost center not found" });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update cost center" });
    }
});

router.delete("/cost-centers/:id", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.costCenter, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Cost center not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete cost center" });
    }
});

router.put("/clients/:id", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { rut, razonSocial, email, telefono, address } = req.body;

        const updated = await updateOwnedRecord(prisma.client, id, companyId, {
            rut,
            name: razonSocial,
            email,
            phone: telefono,
            address
        });
        if (!updated) return res.status(404).json({ error: "Client not found" });
        res.json({
            ...updated,
            razonSocial: updated.name,
            nombreComercial: updated.name,
            telefono: updated.phone
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to update client" });
    }
});

router.delete("/clients/:id", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.client, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Client not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete client" });
    }
});

// --- PROJECTS ---
router.get("/projects", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const projects = await prisma.project.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { client: true, milestones: { orderBy: { order: 'asc' } }, timeEntries: { include: { worker: true }, orderBy: { date: 'desc' } } }
        });
        console.log(`[Backend] Fetched ${projects.length} projects. First one costCenterIds:`, projects[0]?.costCenterIds);
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

router.post("/projects", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { name, budget, address, status, progress, startDate, endDate, workerIds, costCenterIds } = req.body;

        const newProject = await prisma.project.create({
            data: {
                companyId,
                name,
                budget: budget ? Number(budget) : 0,
                address,
                status: status || 'ACTIVE',
                progress: progress ? Number(progress) : 0,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                workerIds: workerIds || [],
                costCenterIds: costCenterIds || []
            }
        });
        res.json(newProject);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create project" });
    }
});

router.put("/projects/:id", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { name, budget, address, status, progress, startDate, endDate, workerIds, costCenterIds } = req.body;

        const updated = await updateOwnedRecord(prisma.project, id, companyId, {
            name,
            budget: budget !== undefined ? Number(budget) : undefined,
            address,
            status,
            progress: progress !== undefined ? Number(progress) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            workerIds,
            costCenterIds
        });
        if (!updated) return res.status(404).json({ error: "Project not found" });
        console.log(`[Backend] Updated project ${updated.id}. Linked CCs:`, updated.costCenterIds);
        res.json(updated);
    } catch (err) {
        console.error("Failed to update project", err);
        res.status(500).json({ error: "Failed to update project" });
    }
});

router.delete("/projects/:id", async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.project, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Project not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete project" });
    }
});

// --- PROJECT MILESTONES ---
router.get("/projects/:projectId/milestones", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Project not found" });
        const milestones = await prisma.projectMilestone.findMany({
            where: { projectId },
            orderBy: { order: 'asc' }
        });
        res.json(milestones);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch milestones" });
    }
});

router.post("/projects/:projectId/milestones", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const { name, description, status, dueDate, order } = req.body;
        const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Project not found" });
        const milestone = await prisma.projectMilestone.create({
            data: { projectId, name, description, status: status || 'PENDING', dueDate: dueDate ? new Date(dueDate) : null, order: order || 0 }
        });
        res.json(milestone);
    } catch (err) {
        res.status(500).json({ error: "Failed to create milestone" });
    }
});

router.put("/milestones/:id", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const { name, description, status, dueDate, order } = req.body;
        const existing = await prisma.projectMilestone.findFirst({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Milestone not found" });
        const project = await prisma.project.findFirst({ where: { id: existing.projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Milestone not found" });
        const milestone = await prisma.projectMilestone.update({
            where: { id },
            data: {
                name, description, status, dueDate: dueDate ? new Date(dueDate) : undefined, order,
                completedAt: status === 'COMPLETED' && existing.status !== 'COMPLETED' ? new Date() : status !== 'COMPLETED' ? null : undefined
            }
        });
        res.json(milestone);
    } catch (err) {
        res.status(500).json({ error: "Failed to update milestone" });
    }
});

router.delete("/milestones/:id", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const existing = await prisma.projectMilestone.findFirst({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Milestone not found" });
        const project = await prisma.project.findFirst({ where: { id: existing.projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Milestone not found" });
        await prisma.projectMilestone.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete milestone" });
    }
});

// --- TIME ENTRIES ---
router.get("/projects/:projectId/time-entries", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const { workerId, dateFrom, dateTo } = req.query;
        const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Project not found" });
        const where: any = { projectId };
        if (workerId) where.workerId = workerId as string;
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) where.date.gte = new Date(dateFrom as string);
            if (dateTo) where.date.lte = new Date(dateTo as string);
        }
        const entries = await prisma.timeEntry.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { worker: true, user: true }
        });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch time entries" });
    }
});

router.post("/projects/:projectId/time-entries", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const { workerId, userId, date, hours, description } = req.body;
        const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Project not found" });
        // Verify worker belongs to company
        if (workerId) {
            const worker = await prisma.worker.findFirst({ where: { id: workerId, companyId } });
            if (!worker) return res.status(404).json({ error: "Worker not found" });
        }
        const entry = await prisma.timeEntry.create({
            data: { projectId, workerId, userId, date: new Date(date), hours: Number(hours) || 0, description }
        });
        res.json(entry);
    } catch (err) {
        res.status(500).json({ error: "Failed to create time entry" });
    }
});

router.put("/time-entries/:id", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const { workerId, date, hours, description } = req.body;
        const existing = await prisma.timeEntry.findFirst({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Time entry not found" });
        const project = await prisma.project.findFirst({ where: { id: existing.projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Time entry not found" });
        const entry = await prisma.timeEntry.update({
            where: { id },
            data: { workerId, date: date ? new Date(date) : undefined, hours: hours !== undefined ? Number(hours) : undefined, description }
        });
        res.json(entry);
    } catch (err) {
        res.status(500).json({ error: "Failed to update time entry" });
    }
});

router.delete("/time-entries/:id", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const existing = await prisma.timeEntry.findFirst({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Time entry not found" });
        const project = await prisma.project.findFirst({ where: { id: existing.projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Time entry not found" });
        await prisma.timeEntry.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete time entry" });
    }
});

// --- PROJECT TIME SUMMARY ---
router.get("/projects/:projectId/time-summary", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const companyId = req.headers['x-company-id'] as string;
        const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
        if (!project) return res.status(404).json({ error: "Project not found" });
        const entries = await prisma.timeEntry.findMany({ where: { projectId } });
        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
        const byWorker = await prisma.timeEntry.groupBy({
            by: ['workerId'],
            where: { projectId },
            _sum: { hours: true }
        });
        res.json({ totalHours, byWorker, entryCount: entries.length });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch time summary" });
    }
});

router.use(invoicesRouter);


// --- SUPPLIERS ---

router.get("/suppliers", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const suppliers = await prisma.supplier.findMany({
            where: { companyId },
            orderBy: { razonSocial: 'asc' }
        });
        res.json(suppliers);
    } catch (err) {
        console.error("Error fetching suppliers:", err);
        res.status(500).json({ error: "Failed to fetch suppliers" });
    }
});

router.post("/suppliers", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { rut, razonSocial, fantasyName, email, phone, address, category } = req.body;

        const existing = await prisma.supplier.findFirst({
            where: { rut, companyId }
        });

        if (existing) {
            return res.status(400).json({ error: "Un proveedor con este RUT ya existe." });
        }

        const supplier = await prisma.supplier.create({
            data: {
                rut,
                razonSocial,
                fantasyName,
                email,
                phone,
                address,
                category,
                companyId
            }
        });
        res.status(201).json(supplier);
    } catch (err) {
        console.error("Error creating supplier:", err);
        res.status(500).json({ error: "Failed to create supplier" });
    }
});

router.put("/suppliers/categories/rename", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { oldCategory, newCategory } = req.body;

        if (!oldCategory || !newCategory) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const result = await prisma.supplier.updateMany({
            where: { companyId, category: oldCategory },
            data: { category: newCategory }
        });

        res.json({ success: true, count: result.count });
    } catch (err) {
        console.error("Error renaming supplier category:", err);
        res.status(500).json({ error: "Failed to rename category" });
    }
});

router.put("/suppliers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const { rut, razonSocial, fantasyName, email, phone, address, category } = req.body;

        const updated = await updateOwnedRecord(prisma.supplier, id, companyId, {
            rut,
            razonSocial,
            fantasyName,
            email,
            phone,
            address,
            category
        });
        if (!updated) return res.status(404).json({ error: "Supplier not found" });
        res.json(updated);
    } catch (err) {
        console.error("Error updating supplier:", err);
        res.status(500).json({ error: "Failed to update supplier" });
    }
});

router.delete("/suppliers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;

        const deleted = await deleteOwnedRecord(prisma.supplier, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Supplier not found" });
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting supplier:", err);
        res.status(500).json({ error: "Failed to delete supplier" });
    }
});

// --- WORKERS ---
router.get("/workers", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const workers = await prisma.worker.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(workers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch workers" });
    }
});

router.post("/workers", async (req, res) => {
    try {
        const { rut, name, role, specialty, email, phone } = req.body;
        const companyId = (req as any).companyId;
        const newWorker = await prisma.worker.create({
            data: { rut, name, role, specialty, email, phone, companyId }
        });
        res.json(newWorker);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create worker" });
    }
});

router.put("/workers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { rut, name, role, specialty, email, phone } = req.body;
        const companyId = (req as any).companyId;

        const updated = await updateOwnedRecord(prisma.worker, id, companyId, {
            rut,
            name,
            role,
            specialty,
            email,
            phone
        });
        if (!updated) return res.status(404).json({ error: "Worker not found" });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update worker" });
    }
});

router.delete("/workers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const deleted = await deleteOwnedRecord(prisma.worker, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Worker not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete worker" });
    }
});

// --- CREWS ---
router.get("/crews", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const crews = await prisma.crew.findMany({
            where: { companyId },
            orderBy: { name: 'asc' },
            include: { workers: true }
        });

        // Transform for frontend if it expects workerIds array
        // But better to update frontend to use workers array
        res.json(crews);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch crews" });
    }
});

router.post("/crews", async (req, res) => {
    try {
        const { name, role, workerIds, projectId } = req.body;
        const companyId = (req as any).companyId;
        // workerIds: ["id1", "id2"]

        const newCrew = await prisma.crew.create({
            data: {
                name,
                role,
                projectId: projectId && projectId !== '' ? projectId : undefined,
                companyId,
                workers: {
                    connect: (workerIds || []).map((id: string) => ({ id }))
                }
            },
            include: { workers: true }
        });
        res.json(newCrew);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create crew" });
    }
});

router.put("/crews/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const { name, role, workerIds, projectId } = req.body;

        const existing = await prisma.crew.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Crew not found" });

        const updated = await prisma.crew.update({
            where: { id },
            data: {
                name,
                role,
                projectId: projectId && projectId !== '' ? projectId : null,
                workers: {
                    set: (workerIds || []).map((id: string) => ({ id }))
                }
            },
            include: { workers: true }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update crew" });
    }
});

router.delete("/crews/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const existing = await prisma.crew.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Crew not found" });
        await prisma.crew.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete crew" });
    }
});

// --- USERS (Admin) ---
router.get("/users", requireAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                allowedSections: true,
                assignedProjectIds: true,
                createdAt: true,
                companies: true // Include companies
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

router.post("/users", requireAdmin, async (req, res) => {
    try {
        const { name, email, password, role, allowedSections, assignedProjectIds, companyIds } = req.body;
        const capacityError = await validateUserCapacity(companyIds || []);
        if (capacityError) {
            return res.status(400).json({ error: capacityError });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'USER',
                allowedSections: allowedSections || [],
                assignedProjectIds: assignedProjectIds || [],
                companies: {
                    connect: (companyIds || []).map((id: string) => ({ id }))
                }
            },
            select: { id: true, name: true, email: true, role: true, allowedSections: true, assignedProjectIds: true, companies: true }
        });
        res.json(newUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

router.put("/users/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, password, role, allowedSections, assignedProjectIds, companyIds } = req.body;
        if (companyIds) {
            const capacityError = await validateUserCapacity(companyIds || [], id);
            if (capacityError) {
                return res.status(400).json({ error: capacityError });
            }
        }

        const data: any = {};
        if (name) data.name = name;
        if (password) data.password = await bcrypt.hash(password, 10);
        if (role) data.role = role;
        if (allowedSections) data.allowedSections = allowedSections;
        if (assignedProjectIds) data.assignedProjectIds = assignedProjectIds;

        if (companyIds) {
            data.companies = {
                set: (companyIds || []).map((cid: string) => ({ id: cid }))
            };
        }

        await prisma.user.update({
            where: { id },
            data
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

router.get("/users/:id", requireSelfOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                allowedSections: true,
                assignedProjectIds: true,
                companies: true,
                activeCompanyId: true
            }
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// --- COMPANIES (Admin) ---
router.get("/companies", requireAdmin, async (req, res) => {
    try {
        const companies = await prismaAny.company.findMany({
            orderBy: { name: 'asc' },
            include: {
                plan: true,
                _count: { select: { users: true } }
            }
        });
        res.json(companies.map(company => ({ ...company, userCount: company._count.users })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
});

router.post("/companies", requireAdmin, async (req, res) => {
    try {
        const { name, rut, logoUrl, creatorId, planId, planStatus, modules, primaryColor } = req.body;
        const resolvedModules = await resolveCompanyModules(planId, modules);
        const subscription = normalizeSubscriptionDates(req.body);
        const newCompany = await prismaAny.company.create({
            data: {
                name,
                rut,
                logoUrl,
                primaryColor: primaryColor || "#2563eb",
                planId: planId || null,
                planStatus: planStatus || "ACTIVE",
                modules: resolvedModules,
                subscriptionStartedAt: subscription.subscriptionStartedAt || new Date(),
                subscriptionEndsAt: subscription.subscriptionEndsAt || addMonths(new Date(), subscription.billingCycleMonths),
                lastPaymentAt: subscription.lastPaymentAt || new Date(),
                billingCycleMonths: subscription.billingCycleMonths,
                users: creatorId ? {
                    connect: { id: creatorId }
                } : undefined
            },
            include: {
                plan: true,
                _count: { select: { users: true } }
            }
        });
        res.json({ ...newCompany, userCount: newCompany._count.users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create company" });
    }
});

router.put("/companies/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rut, logoUrl, primaryColor, planId, planStatus, modules } = req.body;
        const resolvedModules = await resolveCompanyModules(planId, modules);
        const subscription = normalizeSubscriptionDates(req.body);
        const updated = await prismaAny.company.update({
            where: { id },
            data: {
                name,
                rut,
                logoUrl,
                primaryColor,
                planId: planId || null,
                planStatus: planStatus || "ACTIVE",
                modules: resolvedModules,
                subscriptionStartedAt: req.body.subscriptionStartedAt !== undefined ? subscription.subscriptionStartedAt || null : undefined,
                subscriptionEndsAt: req.body.subscriptionEndsAt !== undefined || req.body.subscriptionStartedAt !== undefined || req.body.billingCycleMonths !== undefined
                    ? subscription.subscriptionEndsAt || null
                    : undefined,
                lastPaymentAt: req.body.lastPaymentAt !== undefined ? subscription.lastPaymentAt || null : undefined,
                billingCycleMonths: req.body.billingCycleMonths !== undefined ? subscription.billingCycleMonths : undefined
            },
            include: {
                plan: true,
                _count: { select: { users: true } }
            }
        });
        res.json({ ...updated, userCount: updated._count.users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update company" });
    }
});

router.delete("/companies/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check for dependencies? Or just fail if FK constraint.
        await prisma.company.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete company" });
    }
});


// --- JOB TITLES ---
router.get("/job-titles", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const titles = await prisma.jobTitle.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(titles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch job titles" });
    }
});

router.post("/job-titles", async (req, res) => {
    try {
        const { name, description } = req.body;
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const newTitle = await prisma.jobTitle.create({
            data: { name, description, companyId }
        });
        res.json(newTitle);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create job title" });
    }
});

router.put("/job-titles/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const existing = await prisma.jobTitle.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Job Title not found" });
        const safeUpdate = await prisma.jobTitle.update({
            where: { id },
            data: { name, description }
        });
        res.json(safeUpdate);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update job title" });
    }
});

router.delete("/job-titles/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const existing = await prisma.jobTitle.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Job Title not found" });

        await prisma.jobTitle.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete job title" });
    }
});

// --- REPORT TEMPLATES ---
router.get("/report-templates", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const templates = await prisma.reportTemplate.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(templates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch report templates" });
    }
});

router.post("/report-templates", async (req, res) => {
    try {
        const { name, content } = req.body;
        const companyId = (req as any).companyId;
        if (!name || !content) return res.status(400).json({ error: "Name and content are required" });
        const template = await prisma.reportTemplate.create({
            data: { name, content, companyId }
        });
        res.json(template);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create report template" });
    }
});

router.put("/report-templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, content } = req.body;
        const companyId = (req as any).companyId;
        const template = await prisma.reportTemplate.findFirst({ where: { id, companyId } });
        if (!template) return res.status(404).json({ error: "Template not found" });
        const updated = await prisma.reportTemplate.update({
            where: { id },
            data: { name, content }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update report template" });
    }
});

router.delete("/report-templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const template = await prisma.reportTemplate.findFirst({ where: { id, companyId } });
        if (!template) return res.status(404).json({ error: "Template not found" });
        await prisma.reportTemplate.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete report template" });
    }
});

// --- DAILY REPORTS ---
router.get("/daily-reports", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { status, projectId, dateFrom, dateTo, search } = req.query;
        const where: any = { companyId };
        if (status) where.status = status;
        if (projectId) where.projectId = projectId;
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) where.date.gte = new Date(dateFrom as string);
            if (dateTo) where.date.lte = new Date(dateTo as string);
        }
        const reports = await prisma.dailyReport.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { template: true }
        });
        if (search) {
            const s = (search as string).toLowerCase();
            return res.json(reports.filter(r =>
                r.content.toLowerCase().includes(s) ||
                (r.project && r.project.name.toLowerCase().includes(s))
            ));
        }
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch daily reports" });
    }
});

router.post("/daily-reports", async (req, res) => {
    try {
        const { userId, date, content, projectId, progress, status, templateId } = req.body;
        const companyId = (req as any).companyId;
        if (projectId) {
            const proj = await prisma.project.findFirst({ where: { id: projectId, companyId } });
            if (!proj) return res.status(404).json({ error: "Project not found" });
        }
        const result = await prisma.$transaction(async (tx) => {
            const report = await tx.dailyReport.create({
                data: {
                    userId,
                    date: date ? new Date(date) : new Date(),
                    content,
                    projectId: projectId || undefined,
                    status: status || 'DRAFT',
                    templateId: templateId || undefined,
                    companyId
                }
            });
            if (projectId && progress !== undefined) {
                await tx.project.update({
                    where: { id: projectId },
                    data: { progress: Number(progress) }
                });
            }
            const updatedProject = projectId ? await tx.project.findUnique({ where: { id: projectId } }) : null;
            return { report, updatedProject };
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create daily report" });
    }
});

router.put("/daily-reports/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { date, content, projectId, progress, status } = req.body;
        const companyId = (req as any).companyId;
        const existing = await prisma.dailyReport.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Daily Report not found" });
        if (projectId) {
            const proj = await prisma.project.findFirst({ where: { id: projectId, companyId } });
            if (!proj) return res.status(404).json({ error: "Project not found" });
        }
        const result = await prisma.$transaction(async (tx) => {
            const report = await tx.dailyReport.update({
                where: { id },
                data: {
                    date: date ? new Date(date) : undefined,
                    content,
                    projectId: projectId || undefined,
                    status: status || undefined
                }
            });
            if (projectId && progress !== undefined) {
                await tx.project.update({
                    where: { id: projectId },
                    data: { progress: Number(progress) }
                });
            }
            const updatedProject = projectId ? await tx.project.findUnique({ where: { id: projectId } }) : null;
            return { report, updatedProject };
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update daily report" });
    }
});

router.post("/daily-reports/:id/attachments", upload.single('file'), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        if (!req.file) return res.status(400).json({ error: "No file provided" });
        const report = await prisma.dailyReport.findFirst({ where: { id, companyId } });
        if (!report) return res.status(404).json({ error: "Daily Report not found" });
        const uploadResult = await uploadToOneDrive(
            req.file.buffer,
            req.file.originalname,
            `/ReportesDiarios/${companyId}/${id}`
        );
        const updated = await prisma.dailyReport.update({
            where: { id },
            data: { attachments: [...(report.attachments || []), uploadResult.webUrl] }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to upload attachment" });
    }
});

router.delete("/daily-reports/:id/attachments", async (req, res) => {
    try {
        const { id } = req.params;
        const { url } = req.query;
        const companyId = (req as any).companyId;
        const report = await prisma.dailyReport.findFirst({ where: { id, companyId } });
        if (!report) return res.status(404).json({ error: "Daily Report not found" });
        const updated = await prisma.dailyReport.update({
            where: { id },
            data: { attachments: (report.attachments || []).filter((a: string) => a !== url) }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove attachment" });
    }
});

router.post("/daily-reports/:id/submit", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const report = await prisma.dailyReport.findFirst({ where: { id, companyId } });
        if (!report) return res.status(404).json({ error: "Daily Report not found" });
        if (report.status !== 'DRAFT') return res.status(400).json({ error: "Only draft reports can be submitted" });
        const updated = await prisma.dailyReport.update({
            where: { id },
            data: { status: 'PENDING_APPROVAL' }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit report" });
    }
});

router.post("/daily-reports/:id/approve", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const userRole = (req as any).user?.role;
        if (userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') {
            return res.status(403).json({ error: "Only admins or supervisors can approve reports" });
        }
        const report = await prisma.dailyReport.findFirst({ where: { id, companyId } });
        if (!report) return res.status(404).json({ error: "Daily Report not found" });
        const updated = await prisma.dailyReport.update({
            where: { id },
            data: { status: 'APPROVED' }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to approve report" });
    }
});

router.post("/daily-reports/:id/reject", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const userRole = (req as any).user?.role;
        if (userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') {
            return res.status(403).json({ error: "Only admins or supervisors can reject reports" });
        }
        const report = await prisma.dailyReport.findFirst({ where: { id, companyId } });
        if (!report) return res.status(404).json({ error: "Daily Report not found" });
        const updated = await prisma.dailyReport.update({
            where: { id },
            data: { status: 'REJECTED' }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to reject report" });
    }
});

router.delete("/daily-reports/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const deleted = await deleteOwnedRecord(prisma.dailyReport, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Daily Report not found" });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete daily report" });
    }
});


// --- NEW MODULES: PURCHASE ORDERS ---
router.get("/purchase-orders", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const pos = await prisma.purchaseOrder.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { project: true, items: true }
        });
        res.json(pos);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
});

router.post("/purchase-orders", async (req, res) => {
    try {
        const { number, provider, date, projectId, items } = req.body;
        // items expected to be array of { description, quantity, unitPrice }

        const companyId = (req as any).companyId;
        const newPO = await prisma.purchaseOrder.create({
            data: {
                number,
                provider,
                date: new Date(date),
                projectId,
                companyId,
                items: {
                    // ...
                    create: items.map((item: any) => ({
                        description: item.description,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice),
                        total: Number(item.quantity) * Number(item.unitPrice)
                    }))
                }
            },
            include: { items: true }
        });
        res.json(newPO);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create purchase order" });
    }
});

router.put("/purchase-orders/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { number, provider, date, projectId, items, status } = req.body;

        const companyId = (req as any).companyId;

        // Ensure PO belongs to company
        const existing = await findOwnedRecord(prisma.purchaseOrder, id, companyId);
        if (!existing) return res.status(404).json({ error: "Purchase Order not found" });

        const updated = await prisma.$transaction(async (tx) => {
            // Delete existing items
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

            // Update PO and create new items
            return await tx.purchaseOrder.update({
                where: { id },
                data: {
                    number,
                    provider,
                    date: new Date(date),
                    projectId,
                    status,
                    items: {
                        create: items.map((item: any) => ({
                            description: item.description,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice),
                            total: Number(item.quantity) * Number(item.unitPrice)
                        }))
                    }
                },
                include: { items: true }
            });
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update purchase order" });
    }
});

router.delete("/purchase-orders/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const deleted = await deleteOwnedRecord(prisma.purchaseOrder, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Purchase Order not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete purchase order" });
    }
});

// --- NEW MODULES: DOCUMENTS & REQUIREMENTS ---

router.get("/clients/:clientId/requirements", async (req, res) => {
    try {
        const { clientId } = req.params;
        const { month, year } = req.query;
        const companyId = (req as any).companyId;

        const where: any = { clientId, companyId };
        if (month) where.month = Number(month);
        if (year) where.year = Number(year);

        const requirements = await prisma.documentRequirement.findMany({
            where,
            include: { documents: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requirements);
    } catch (err) {
        console.error("Error in Docs/Reqs:", err);
        res.status(500).json({ error: "Failed to fetch/create resource", details: err.message });
    }
});

router.post("/clients/:clientId/requirements", async (req, res) => {
    try {
        const { clientId } = req.params;
        const { name, description, month, year, categoryId } = req.body;

        if (!name) {
            return res.status(400).json({ error: "El nombre del requerimiento es obligatorio" });
        }

        let companyId = (req as any).companyId || req.headers['x-company-id'];

        // Verify client belongs to company or get company from client
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

        // If we have a companyId context, verify matches client
        if (companyId && client.companyId !== companyId) {
            return res.status(403).json({ error: "Cliente no pertenece a la empresa actual" });
        }

        // If no companyId context, use client's companyId
        if (!companyId) {
            companyId = client.companyId;
        }

        const newReq = await prisma.documentRequirement.create({
            data: {
                name,
                description,
                clientId,
                month: month ? Number(month) : null,
                year: year ? Number(year) : null,
                companyId,
                categoryId: categoryId || undefined
            }
        });
        res.json(newReq);
    } catch (err: any) {
        console.error("Error creating requirement:", err);
        // Prisma error codes
        if (err.code === 'P2003') {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }
        res.status(500).json({ error: "Failed to create requirement", details: err.message });
    }
});

router.put("/requirements/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, dueDate } = req.body;
        const companyId = (req as any).companyId;

        const updated = await updateOwnedRecord(prisma.documentRequirement, id, companyId, {
            status,
            dueDate: dueDate ? new Date(dueDate) : undefined
        });
        if (!updated) return res.status(404).json({ error: "Requirement not found" });
        res.json(updated);
    } catch (err: any) {
        console.error("Error updating requirement:", err);
        res.status(500).json({ error: "Failed to update requirement", details: err.message });
    }
});

router.delete("/requirements/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const deleted = await deleteOwnedRecord(prisma.documentRequirement, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Requirement not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete requirement" });
    }
});



router.post("/clients/:clientId/requirements/copy", async (req, res) => {
    try {
        const { clientId } = req.params;
        const { fromMonth, fromYear, toMonth, toYear } = req.body;

        // 1. Fetch source requirements
        const sourceReqs = await prisma.documentRequirement.findMany({
            where: {
                clientId,
                month: Number(fromMonth),
                year: Number(fromYear)
            }
        });

        if (sourceReqs.length === 0) {
            return res.status(404).json({ error: "No se encontraron requerimientos en el mes de origen." });
        }

        const companyId = (req as any).companyId;

        // Verify client belongs to company
        const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
        if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

        // 2. Create new requirements for target month
        // We use a transaction to ensure all or nothing
        const createdReqs = await prisma.$transaction(
            sourceReqs.map(req => prisma.documentRequirement.create({
                data: {
                    name: req.name, // Copy name
                    description: req.description, // Copy description
                    clientId,
                    month: Number(toMonth),
                    year: Number(toYear),
                    companyId
                }
            }))
        );

        res.json({ success: true, count: createdReqs.length });
    } catch (err: any) {
        console.error("Error copying requirements:", err);
        res.status(500).json({ error: "Failed to copy requirements", details: err.message });
    }
});

router.get("/clients/:clientId/monthly-info", async (req, res) => {
    try {
        const { clientId } = req.params;
        const { month, year } = req.query;
        const companyId = (req as any).companyId;

        // Verify client belongs to company
        const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
        if (!client) return res.json({});

        const info = await prisma.clientMonthlyInfo.findFirst({
            where: {
                clientId,
                month: Number(month),
                year: Number(year),
                companyId
            }
        });
        res.json(info || {}); // Return empty obj if not found
    } catch (err: any) {
        console.error("Error fetching monthly info:", err);
        res.status(500).json({ error: "Failed to fetch monthly info" });
    }
});

router.post("/clients/:clientId/monthly-info", async (req, res) => {
    try {
        const { clientId } = req.params;
        const { month, year, edpDate } = req.body;
        const companyId = (req as any).companyId;

        // Verify client
        const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
        if (!client) return res.status(404).json({ error: "Client not found in this company" });

        const info = await prisma.clientMonthlyInfo.upsert({
            where: {
                clientId_month_year: {
                    clientId,
                    month: Number(month),
                    year: Number(year)
                }
            },
            update: {
                edpDate: edpDate ? new Date(edpDate) : null
            },
            create: {
                clientId,
                month: Number(month),
                year: Number(year),
                companyId,
                edpDate: edpDate ? new Date(edpDate) : null
            }
        });
        res.json(info);
    } catch (err: any) {
        console.error("Error updating monthly info:", err);
        res.status(500).json({ error: "Failed to update monthly info" });
    }
});

router.get("/documents", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const docs = await prisma.document.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { requirement: true }
        });
        res.json(docs);
    } catch (err: any) {
        console.error("Error fetching documents:", err);
        res.status(500).json({ error: "Failed to fetch documents", details: err.message });
    }
});

router.post("/documents", upload.single('file'), async (req: any, res: any) => {
    try {
        // Metadata only for now. Appending requirementId linkage.
        const { type, clientId, projectId, requirementId, name } = req.body;
        let url = req.body.url;
        let fileName = name || req.body.name;

        // Handle File Upload
        if (req.file) {
            try {
                // Determine folder path
                // /VertikalApp/Documents/{ClientName}/{RequirementName}/
                let clientName = 'General';
                let reqName = 'Doc';

                if (clientId) {
                    const client = await prisma.client.findUnique({ where: { id: clientId } });
                    if (client) clientName = client.name;
                }

                if (requirementId) {
                    const req = await prisma.documentRequirement.findUnique({ where: { id: requirementId } });
                    if (req) reqName = req.name;
                }

                // Sanitize
                clientName = clientName.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
                reqName = reqName.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();

                const path = `/Planos-SaaS/Documentos/${clientName}/${reqName}`;

                const uploadResult = await uploadToOneDrive(req.file.buffer, req.file.originalname, path);
                url = uploadResult.webUrl;
                if (!fileName) fileName = req.file.originalname;

            } catch (uErr) {
                console.error("Upload failed", uErr);
                return res.status(500).json({ error: "Failed to upload file to OneDrive" });
            }
        }

        const companyId = (req as any).companyId;
        const newDoc = await prisma.document.create({
            data: {
                type: type || 'OTHER', // 'INVOICE', 'CONTRACT', 'RECEIPT', 'OTHER'
                url: url || '',
                name: fileName,
                clientId: clientId || undefined,
                projectId: projectId || undefined,
                requirementId: requirementId || undefined,
                status: 'PENDING',
                companyId
            }
        });
        res.json(newDoc);
    } catch (err: any) {
        console.error("Error creating document:", err);
        res.status(500).json({ error: "Failed to create document", details: err.message });
    }
});

router.put("/documents/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const { status } = req.body; // PENDING, APPROVED, REJECTED

        const existing = await prisma.document.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Document not found" });

        const updated = await prisma.document.update({
            where: { id },
            data: { status }
        });
        res.json(updated);
    } catch (err: any) {
        console.error("Error updating document:", err);
        res.status(500).json({ error: "Failed to update document", details: err.message });
    }
});

router.delete("/documents/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const existing = await prisma.document.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Document not found" });
        await prisma.document.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete document" });
    }
});

// --- DOCUMENT CATEGORIES ---
// --- DOCUMENT CATEGORIES ---
router.get("/clients/:clientId/document-categories", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { clientId } = req.params;
        const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
        if (!client) return res.status(404).json({ error: "Client not found" });
        const categories = await prisma.documentCategory.findMany({
            where: { clientId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

router.post("/clients/:clientId/document-categories", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { clientId } = req.params;
        const { name, color } = req.body;
        const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
        if (!client) return res.status(404).json({ error: "Client not found" });
        const newCat = await prisma.documentCategory.create({
            data: { name, color, clientId }
        });
        res.json(newCat);
    } catch (err) {
        console.error("Error creating category:", err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: "Ya existe una categoría con este nombre para este cliente." });
        }
        res.status(500).json({ error: "Failed to create category" });
    }
});

router.delete("/document-categories/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const existing = await prisma.documentCategory.findFirst({
            where: { id, client: { companyId } }
        });
        if (!existing) return res.status(404).json({ error: "Category not found" });
        await prisma.documentCategory.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting category:", err);
        res.status(500).json({ error: "Failed to delete category" });
    }
});

// --- NEW MODULES: PLANOS ---

router.get("/plans", async (req, res) => {
    try {
        const { projectId } = req.query;
        const companyId = (req as any).companyId;
        const where: any = { companyId };
        if (projectId) where.projectId = String(projectId);

        const plans = await prisma.plan.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { project: true, _count: { select: { marks: true } } }
        });
        res.json(plans);
    } catch (err) {
        console.error("Error fetching plans:", err);
        res.status(500).json({ error: "Failed to fetch plans" });
    }
});

router.post("/plans", upload.single('file'), async (req: any, res: any) => {
    try {
        const { name, projectId, costCenterId, stages, systemType, installationType, installationDetail } = req.body;
        let imageUrl = req.body.imageUrl;

        // Handle File Upload
        if (req.file) {
            try {
                let folderName = 'General';
                if (projectId) {
                    const project = await prisma.project.findUnique({ where: { id: projectId } });
                    if (project) {
                        // Sanitize folder name
                        folderName = project.name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
                    }
                }

                const uploadResult = await uploadToOneDrive(req.file.buffer, req.file.originalname, `/Planos-SaaS/Planos/${folderName}`);
                imageUrl = uploadResult.webUrl;
            } catch (uploadErr) {
                console.error("OneDrive Upload Failed:", uploadErr);
                return res.status(500).json({ error: "Failed to upload file to OneDrive" });
            }
        }

        const companyId = (req as any).companyId;
        const newPlan = await prisma.plan.create({
            data: {
                name,
                imageUrl: imageUrl || '',
                projectId: projectId && projectId !== '' ? projectId : null,
                costCenterId: costCenterId && costCenterId !== '' ? costCenterId : null,
                stages: stages ? Number(stages) : 1,
                systemType,
                installationType,
                installationDetail,
                companyId
            }
        });
        res.json(newPlan);
    } catch (err) {
        console.error("Error creating plan:", err);
        res.status(500).json({ error: "Failed to create plan" });
    }
});

router.delete("/plans/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const deleted = await deleteOwnedRecord(prisma.plan, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Plan not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete plan" });
    }
});

router.get("/plans/:id/marks", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;

        // Verify plan belongs to company
        const plan = await findOwnedRecord(prisma.plan, id, companyId);
        if (!plan) return res.status(404).json({ error: "Plan not found" });

        const marks = await prisma.planMark.findMany({
            where: { planId: id },
            include: { user: { select: { name: true } } }, // Include user name
            orderBy: { createdAt: 'desc' }
        });
        res.json(marks);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch marks" });
    }
});

router.post("/plans/:id/marks", upload.single('file'), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { x, y, userId, comment, meters, date, workerIds, points, type, stage } = req.body;
        let imageUrl = null;

        // Parse workerIds if it comes as a JSON string (common with FormData)
        let parsedWorkerIds: string[] = [];
        if (workerIds) {
            try {
                parsedWorkerIds = typeof workerIds === 'string' ? JSON.parse(workerIds) : workerIds;
            } catch (e) {
                console.error("Error parsing workerIds:", e);
                parsedWorkerIds = [];
            }
        }

        // Parse points if string
        let parsedPoints = undefined;
        if (points) {
            try {
                parsedPoints = typeof points === 'string' ? JSON.parse(points) : points;
            } catch (e) {
                console.error("Error parsing points:", e);
            }
        }

        // VALDATION: Check if user is assigned to the project of this Plan
        // 1. Get Plan with ProjectId
        const companyId = (req as any).companyId;
        const plan = await findOwnedRecord(prisma.plan, id, companyId);
        const planWithProject = plan ? await prisma.plan.findUnique({
            where: { id },
            include: { project: true }
        }) : null;
        if (!planWithProject) return res.status(404).json({ error: "Plano no encontrado" });

        // 2. Get User
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        // 3. Check permissions (Skip for ADMIN)
        if (user.role !== 'ADMIN') {
            // If plan belongs to a project...
            if (planWithProject.projectId) {
                const assigned = user.assignedProjectIds || [];
                // Check if project ID is in assigned list
                if (!assigned.includes(planWithProject.projectId)) {
                    return res.status(403).json({ error: "No estas asignado a este proyecto. No puedes reportar cuelgues." });
                }
            }
        }

        // Handle File Upload
        if (req.file) {
            try {
                const projectName = planWithProject.project?.name || 'General';
                const d = new Date(date || new Date());
                const folder = `${projectName}/${d.getFullYear()}-${d.getMonth() + 1}`;
                // Sanitize path
                const cleanPath = `/Planos-SaaS/Cuelgues/${folder.replace(/[^a-zA-Z0-9 \-\/_]/g, '').trim()}`;

                const uploadResult = await uploadToOneDrive(req.file.buffer, req.file.originalname, cleanPath);
                imageUrl = uploadResult.webUrl;
            } catch (uErr) {
                console.error("Upload failed", uErr);
                // Continue saving mark without image or fail? Let's continue but log.
            }
        }

        const newMark = await prisma.planMark.create({
            data: {
                planId: id,
                userId,
                x: Number(x),
                y: Number(y),
                comment,
                meters: meters ? Number(meters) : 0,
                date: date ? new Date(date) : new Date(),
                imageUrl,
                points: parsedPoints,
                type: type || 'POINT',
                stage: stage ? Number(stage) : 1,
                workers: {
                    connect: parsedWorkerIds.map(id => ({ id }))
                }
            },
            include: {
                user: { select: { name: true } },
                workers: true
            }
        });
        res.json(newMark);
    } catch (err) {
        console.error("Error creating mark:", err);
        res.status(500).json({ error: "Failed to create mark" });
    }
});

router.delete("/plans/marks/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const mark = await prisma.planMark.findUnique({
            where: { id },
            include: { plan: { select: { companyId: true } } }
        });
        if (!mark || mark.plan.companyId !== (req as any).companyId) {
            return res.status(404).json({ error: "Mark not found" });
        }
        await prisma.planMark.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete mark" });
    }
});

// --- STATS FOR DASHBOARD ---
router.get("/stats/marks", async (req, res) => {
    try {
        // Group by month/year? Or just return all valid marks and let frontend process
        // For efficiency w/ huge data, we'd aggregate here. For now, let's return all or filter by date range.
        const marks = await prisma.planMark.findMany({
            select: { meters: true, date: true }
        });
        res.json(marks);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});


// --- PROXY FOR ONEDRIVE IMAGES ---
router.get("/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
        return res.status(400).send("Missing url parameter");
    }

    try {
        // If it's not a OneDrive URL, just redirect (or handle as error)
        if (!url.includes("sharepoint.com") && !url.includes("onedrive")) {
            return res.redirect(url);
        }

        const stream = await getFileStreamFromWebUrl(url);

        // Set basic headers - we don't know exact mime type unless we fetch metadata first
        // But for images, browsers are good at sniffing or we can default to octet-stream
        // Or we could query driveItem metadata. For speed, verify basic sniffing.
        // res.setHeader('Content-Type', 'image/jpeg'); // Assuming mostly images?

        if (typeof stream.pipe === 'function') {
            stream.pipe(res);
        } else {
            // It's likely a Web Stream (ReadableStream)
            // Convert to Node Stream
            // @ts-ignore
            const nodeStream = Readable.fromWeb ? Readable.fromWeb(stream) : Readable.from(stream);
            nodeStream.pipe(res);
        }
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).send("Failed to load image");
    }
});

// --- EXPENSES ---
router.get("/expenses", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        // Fetch expenses where the company is either the payer (Origin) or beneficiary (Target)
        const expenses = await prisma.expense.findMany({
            where: {
                OR: [
                    { originCompanyId: companyId },
                    { targetCompanyId: companyId }
                ]
            },
            include: {
                originCompany: true,
                targetCompany: true,
                worker: true,
                invoice: true,
                distributions: {
                    include: { project: true, costCenter: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (err) {
        console.error("Error fetching expenses:", err);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

router.post("/expenses", async (req, res) => {
    try {
        const { description, amount, category, date, originCompanyId, targetCompanyId, workerId, invoiceNumber, invoiceId, distributions } = req.body;

        const newExpense = await prisma.expense.create({
            data: {
                description,
                amount: Number(amount),
                category,
                date: new Date(date),
                originCompanyId,
                targetCompanyId,
                workerId: workerId || undefined,
                invoiceNumber: invoiceNumber || undefined,
                invoiceId: invoiceId || undefined,
                status: 'PENDING',
                distributions: distributions && distributions.length > 0 ? {
                    create: distributions.map((d: any) => ({
                        amount: Number(d.amount),
                        projectId: d.projectId || undefined,
                        costCenterId: d.costCenterId || undefined
                    }))
                } : undefined
            },
            include: {
                distributions: true
            }
        });
        res.status(201).json(newExpense);
    } catch (err) {
        console.error("Error creating expense:", err);
        res.status(500).json({ error: "Failed to create expense" });
    }
});


router.put("/expenses/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, category, date, originCompanyId, targetCompanyId, workerId, invoiceNumber, invoiceId, status } = req.body;

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                description,
                amount: amount ? Number(amount) : undefined,
                category,
                date: date ? new Date(date) : undefined,
                originCompanyId,
                targetCompanyId,
                workerId,
                invoiceNumber,
                invoiceId,
                status
            },
            include: {
                originCompany: true,
                targetCompany: true,
                worker: true,
                distributions: { include: { project: true, costCenter: true } }
            }
        });
        res.json(updated);
    } catch (err) {
        console.error("Error updating expense:", err);
        res.status(500).json({ error: "Failed to update expense" });
    }
});

router.delete("/expenses/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const existing = await prisma.expense.findFirst({
            where: {
                id,
                OR: [{ originCompanyId: companyId }, { targetCompanyId: companyId }]
            }
        });
        if (!existing) return res.status(404).json({ error: "Expense not found" });
        await prisma.expense.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting expense:", err);
        res.status(500).json({ error: "Failed to delete expense" });
    }
});


// --- EXPENSES ---
router.get("/expenses", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        // Fetch expenses where the company is either the payer (Origin) or beneficiary (Target)
        const expenses = await prisma.expense.findMany({
            where: {
                OR: [
                    { originCompanyId: companyId },
                    { targetCompanyId: companyId }
                ]
            },
            include: {
                originCompany: true,
                targetCompany: true,
                worker: true,
                distributions: {
                    include: { project: true, costCenter: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (err) {
        console.error("Error fetching expenses:", err);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

router.post("/expenses", async (req, res) => {
    try {
        const { description, amount, date, originCompanyId, targetCompanyId, workerId, invoiceNumber, distributions } = req.body;

        const newExpense = await prisma.expense.create({
            data: {
                description,
                amount: Number(amount),
                date: new Date(date),
                originCompanyId,
                targetCompanyId,
                workerId: workerId || undefined,
                invoiceNumber: invoiceNumber || undefined,
                status: 'PENDING',
                distributions: distributions && distributions.length > 0 ? {
                    create: distributions.map((d: any) => ({
                        amount: Number(d.amount),
                        projectId: d.projectId || undefined,
                        costCenterId: d.costCenterId || undefined
                    }))
                } : undefined
            },
            include: {
                distributions: true
            }
        });
        res.status(201).json(newExpense);
    } catch (err) {
        console.error("Error creating expense:", err);
        res.status(500).json({ error: "Failed to create expense" });
    }
});

router.delete("/expenses/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const existing = await prisma.expense.findFirst({
            where: {
                id,
                OR: [{ originCompanyId: companyId }, { targetCompanyId: companyId }]
            }
        });
        if (!existing) return res.status(404).json({ error: "Expense not found" });
        await prisma.expense.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting expense:", err);
        res.status(500).json({ error: "Failed to delete expense" });
    }
});


// --- BACKUPS ---
router.get("/backups", requireAdmin, async (req, res) => {
    try {
        const backups = await listBackups();
        res.json(backups);
    } catch (err: any) {
        console.error("Error listing backups:", err);
        res.status(500).json({ error: "Failed to list backups" });
    }
});

router.post("/backups", requireAdmin, async (req, res) => {
    try {
        const filename = await createBackup();
        res.json({ filename });
    } catch (err: any) {
        console.error("Error creating backup:", err);
        res.status(500).json({ error: "Failed to create backup", details: err.message });
    }
});

router.get("/backups/:filename", (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = getBackupPath(filename);
        res.download(filepath);
    } catch (err: any) {
        console.error("Error downloading backup:", err);
        res.status(404).json({ error: "Backup not found" });
    }
});

router.delete("/backups/:filename", requireAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        await deleteBackup(filename);
        res.json({ success: true });
    } catch (err: any) {
        console.error("Error deleting backup:", err);
        res.status(500).json({ error: "Failed to delete backup" });
    }
});

// --- TOOLS ---
router.get("/tools", checkModuleAccess("TOOLS"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const tools = await prisma.tool.findMany({
            where: { companyId },
            include: {
                maintenances: { orderBy: { date: 'desc' } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(tools);
    } catch (err: any) {
        console.error("Error fetching tools:", err);
        res.status(500).json({ error: "Failed to fetch tools", details: err.message });
    }
});

router.post("/tools", checkModuleAccess("TOOLS"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { name, brand, model, serialNumber, status, lastMaintenanceDate, nextMaintenanceDate } = req.body;
        const newTool = await prisma.tool.create({
            data: {
                name,
                brand,
                model,
                serialNumber,
                status: status || 'AVAILABLE',
                lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : undefined,
                nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : undefined,
                companyId
            },
            include: { maintenances: true }
        });
        res.json(newTool);
    } catch (err: any) {
        console.error("Error creating tool:", err);
        res.status(500).json({ error: "Failed to create tool", details: err.message });
    }
});

router.put("/tools/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const { name, brand, model, serialNumber, status, lastMaintenanceDate, nextMaintenanceDate } = req.body;

        const existing = await prisma.tool.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Tool not found" });

        const updatedTool = await prisma.tool.update({
            where: { id },
            data: {
                name,
                brand,
                model,
                serialNumber,
                status,
                lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
                nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null,
            },
            include: { maintenances: { orderBy: { date: 'desc' } } }
        });
        res.json(updatedTool);
    } catch (err: any) {
        console.error("Error updating tool:", err);
        res.status(500).json({ error: "Failed to update tool", details: err.message });
    }
});

router.delete("/tools/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const existing = await prisma.tool.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Tool not found" });
        await prisma.tool.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        console.error("Error deleting tool:", err);
        res.status(500).json({ error: "Failed to delete tool", details: err.message });
    }
});

// --- TOOL MAINTENANCE ---
router.post("/tools/:id/maintenance", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id: toolId } = req.params;
        const { date, description, cost, provider } = req.body;

        const tool = await prisma.tool.findFirst({ where: { id: toolId, companyId } });
        if (!tool) return res.status(404).json({ error: "Tool not found" });

        const result = await prisma.$transaction(async (tx) => {
            const parsedDate = new Date(date);
            const maintenance = await tx.toolMaintenance.create({
                data: {
                    toolId,
                    date: parsedDate,
                    description,
                    cost: Number(cost || 0),
                    provider
                }
            });

            // Update tool's last properties
            const updatedTool = await tx.tool.update({
                where: { id: toolId },
                data: {
                    lastMaintenanceDate: parsedDate,
                    status: 'AVAILABLE'
                },
                include: { maintenances: { orderBy: { date: 'desc' } } }
            });

            return { maintenance, tool: updatedTool };
        });

        res.json(result);
    } catch (err: any) {
        console.error("Error creating maintenance record:", err);
        res.status(500).json({ error: "Failed to create maintenance", details: err.message });
    }
});

router.delete("/tools/maintenance/:id", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const existing = await prisma.toolMaintenance.findFirst({
            where: { id, tool: { companyId } }
        });
        if (!existing) return res.status(404).json({ error: "Maintenance not found" });
        await prisma.toolMaintenance.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        console.error("Error deleting maintenance:", err);
        res.status(500).json({ error: "Failed to delete maintenance", details: err.message });
    }
});

// --- EPP (Equipos de Protección Personal) ---
router.get("/epp", checkModuleAccess("HR"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        if (!companyId) return res.status(403).json({ error: "No company ID" });
        const epps = await prisma.epp.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(epps);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/epp", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { name, description, stock } = req.body;
        const epp = await prisma.epp.create({
            data: { companyId, name, description, stock: Number(stock) }
        });
        res.json(epp);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/epp/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { name, description, stock } = req.body;
        const epp = await updateOwnedRecord(prisma.epp, id, companyId, {
            name,
            description,
            stock: Number(stock)
        });
        if (!epp) return res.status(404).json({ error: "EPP not found" });
        res.json(epp);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/epp/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.epp, id, companyId);
        if (!deleted) return res.status(404).json({ error: "EPP not found" });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- EPP DELIVERIES ---
router.get("/epp-deliveries", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        if (!companyId) return res.status(403).json({ error: "No company ID" });
        const deliveries = await prisma.eppDelivery.findMany({
            where: { epp: { companyId } },
            include: { epp: true, worker: true },
            orderBy: { date: 'desc' }
        });
        res.json(deliveries);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/epp-deliveries", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { eppId, workerId, quantity, date, notes } = req.body;

        const [epp, worker] = await Promise.all([
            prisma.epp.findFirst({ where: { id: eppId, companyId } }),
            prisma.worker.findFirst({ where: { id: workerId, companyId } })
        ]);
        if (!epp) return res.status(404).json({ error: "EPP not found" });
        if (!worker) return res.status(404).json({ error: "Worker not found" });

        const result = await prisma.$transaction(async (tx) => {
            const qty = Number(quantity);
            const delivery = await tx.eppDelivery.create({
                data: {
                    eppId,
                    workerId,
                    quantity: qty,
                    date: new Date(date),
                    notes
                },
                include: { epp: true, worker: true }
            });

            // Decrement the stock
            await tx.epp.update({
                where: { id: eppId },
                data: { stock: { decrement: qty } }
            });

            return delivery;
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to deliver EPP", details: err.message });
    }
});

// --- TOOL ASSIGNMENTS ---
router.get("/tool-assignments", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        if (!companyId) return res.status(403).json({ error: "No company ID" });
        const assignments = await prisma.toolAssignment.findMany({
            where: { tool: { companyId } },
            include: { tool: true, worker: true },
            orderBy: { assignedAt: 'desc' }
        });
        res.json(assignments);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/tool-assignments", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { toolId, workerId, assignedAt, notes } = req.body;

        const [tool, worker] = await Promise.all([
            prisma.tool.findFirst({ where: { id: toolId, companyId } }),
            prisma.worker.findFirst({ where: { id: workerId, companyId } })
        ]);
        if (!tool) return res.status(404).json({ error: "Tool not found" });
        if (!worker) return res.status(404).json({ error: "Worker not found" });

        const result = await prisma.$transaction(async (tx) => {
            const assignment = await tx.toolAssignment.create({
                data: {
                    toolId,
                    workerId,
                    assignedAt: new Date(assignedAt),
                    notes
                },
                include: { tool: true, worker: true }
            });

            await tx.tool.update({
                where: { id: toolId },
                data: { status: 'IN_USE' }
            });

            return assignment;
        });
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to assign tool", details: err.message });
    }
});

router.put("/tool-assignments/:id/return", async (req, res) => {
    try {
        const companyId = requireCompanyId(req, res);
        if (!companyId) return;
        const { id } = req.params;
        const { returnedAt, notes } = req.body;

        const existing = await prisma.toolAssignment.findFirst({
            where: { id, tool: { companyId } }
        });
        if (!existing) return res.status(404).json({ error: "Assignment not found" });

        const result = await prisma.$transaction(async (tx) => {
            const assignment = await tx.toolAssignment.update({
                where: { id },
                data: {
                    returnedAt: new Date(returnedAt),
                    notes
                },
                include: { tool: true, worker: true }
            });

            await tx.tool.update({
                where: { id: assignment.toolId },
                data: { status: 'AVAILABLE' }
            });

            return assignment;
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to return tool", details: err.message });
    }
});


// --- SUBSCRIPTION PLANS ---
router.get("/plans", requireAdmin, async (req, res) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
});

router.post("/plans", requireAdmin, async (req, res) => {
    try {
        const { name, price, description, features, modules, maxUsers, maxStorageGB } = req.body;
        const plan = await prisma.subscriptionPlan.create({
            data: {
                name,
                price: Number(price),
                description,
                features,
                modules,
                maxUsers: maxUsers ? Number(maxUsers) : null,
                maxStorageGB: maxStorageGB ? Number(maxStorageGB) : null
            }
        });
        res.json(plan);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create subscription plan" });
    }
});

router.put("/plans/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, features, modules, maxUsers, maxStorageGB } = req.body;
        const plan = await prisma.subscriptionPlan.update({
            where: { id },
            data: {
                name,
                price: Number(price),
                description,
                features,
                modules,
                maxUsers: maxUsers ? Number(maxUsers) : null,
                maxStorageGB: maxStorageGB ? Number(maxStorageGB) : null
            }
        });
        res.json(plan);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update subscription plan" });
    }
});

router.delete("/plans/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.subscriptionPlan.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete subscription plan" });
    }
});


// --- CRM: LEADS ---
router.get("/leads", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { search, status, minScore } = req.query;
        const where: any = { companyId };
        if (status) where.status = status;
        if (minScore) where.score = { gte: Number(minScore) };
        const leads = await prisma.lead.findMany({
            where,
            orderBy: { score: 'desc' },
            include: { quotes: true, activities: { orderBy: { createdAt: 'desc' }, take: 10 } }
        });
        if (search) {
            const s = (search as string).toLowerCase();
            return res.json(leads.filter(l =>
                l.name.toLowerCase().includes(s) ||
                (l.companyName || '').toLowerCase().includes(s) ||
                (l.email || '').toLowerCase().includes(s)
            ));
        }
        res.json(leads);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch leads", details: err.message });
    }
});

router.post("/leads", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { name, companyName, email, phone, status, source, notes, score, grade, estimatedValue, assignedTo } = req.body;
        const lead = await prisma.lead.create({
            data: {
                name, companyName, email, phone,
                status: status || 'NEW',
                source, notes,
                score: score || 0,
                grade,
                estimatedValue: estimatedValue || 0,
                assignedTo,
                companyId
            }
        });
        // Log activity
        await prisma.leadActivity.create({
            data: { leadId: lead.id, type: 'STATUS_CHANGE', content: `Lead creado con estado: ${lead.status}`, userId: (req as any).user?.id }
        });
        res.json(lead);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create lead", details: err.message });
    }
});

router.put("/leads/:id", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { name, companyName, email, phone, status, source, notes, score, grade, estimatedValue, assignedTo } = req.body;
        const existing = await prisma.lead.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Lead not found" });
        const lead = await prisma.lead.update({
            where: { id },
            data: { name, companyName, email, phone, status, source, notes, score, grade, estimatedValue, assignedTo }
        });
        // Log status change activity
        if (status && status !== existing.status) {
            await prisma.leadActivity.create({
                data: { leadId: id, type: 'STATUS_CHANGE', content: `Estado cambiado de ${existing.status} a ${status}`, userId: (req as any).user?.id }
            });
        }
        res.json(lead);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update lead", details: err.message });
    }
});

router.put("/leads/:id/score", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const { id } = req.params;
        const { score } = req.body;
        const companyId = (req as any).companyId;
        const existing = await prisma.lead.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Lead not found" });
        // Auto-calculate grade based on score
        let grade: string | null = null;
        if (score >= 70) grade = 'A';
        else if (score >= 40) grade = 'B';
        else if (score > 0) grade = 'C';
        const lead = await prisma.lead.update({
            where: { id },
            data: { score, grade }
        });
        res.json(lead);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update score", details: err.message });
    }
});

router.post("/leads/:id/activities", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const { id } = req.params;
        const { type, content } = req.body;
        const companyId = (req as any).companyId;
        const lead = await prisma.lead.findFirst({ where: { id, companyId } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });
        const activity = await prisma.leadActivity.create({
            data: { leadId: id, type, content, userId: (req as any).user?.id }
        });
        res.json(activity);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create activity", details: err.message });
    }
});

router.get("/leads/:id/activities", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const lead = await prisma.lead.findFirst({ where: { id, companyId } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });
        const activities = await prisma.leadActivity.findMany({
            where: { leadId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(activities);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch activities", details: err.message });
    }
});

// --- CRM: EMAIL TEMPLATES ---
router.get("/email-templates", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const templates = await prisma.emailTemplate.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
        res.json(templates);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch templates", details: err.message });
    }
});

router.post("/email-templates", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { name, subject, body } = req.body;
        if (!name || !subject || !body) return res.status(400).json({ error: "All fields required" });
        const template = await prisma.emailTemplate.create({ data: { name, subject, body, companyId } });
        res.json(template);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create template", details: err.message });
    }
});

router.put("/email-templates/:id", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subject, body } = req.body;
        const companyId = (req as any).companyId;
        const existing = await prisma.emailTemplate.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Template not found" });
        const template = await prisma.emailTemplate.update({ where: { id }, data: { name, subject, body } });
        res.json(template);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update template", details: err.message });
    }
});

router.delete("/email-templates/:id", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const existing = await prisma.emailTemplate.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Template not found" });
        await prisma.emailTemplate.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete template", details: err.message });
    }
});

// --- CRM: QUOTES ---
router.get("/quotes", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const quotes = await prisma.quote.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { lead: true, items: true }
        });
        res.json(quotes);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch quotes", details: err.message });
    }
});

router.get("/quotes/:id", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const quote = await prisma.quote.findFirst({
            where: { id, companyId },
            include: { lead: true, items: true }
        });
        if (!quote) return res.status(404).json({ error: "Quote not found" });
        res.json(quote);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch quote", details: err.message });
    }
});

router.post("/quotes", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { number, date, validUntil, status, notes, leadId, items } = req.body;
        
        const quote = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const quoteItemsData = items?.map((item: any) => {
                const total = Number(item.quantity) * Number(item.unitPrice);
                totalAmount += total;
                return {
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    total
                };
            }) || [];

            const netAmount = totalAmount; // Or apply discounts
            const taxAmount = netAmount * 0.19; // standard VAT
            const finalTotal = netAmount + taxAmount;

            const newQuote = await tx.quote.create({
                data: {
                    number,
                    date: new Date(date),
                    validUntil: validUntil ? new Date(validUntil) : null,
                    status: status || 'DRAFT',
                    notes,
                    leadId,
                    companyId,
                    netAmount,
                    taxAmount,
                    totalAmount: finalTotal,
                    items: {
                        create: quoteItemsData
                    }
                },
                include: { items: true, lead: true }
            });
            return newQuote;
        });

        res.json(quote);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create quote", details: err.message });
    }
});

router.put("/quotes/:id", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { number, date, validUntil, status, notes, leadId, items } = req.body;
        
        const updatedQuote = await prisma.$transaction(async (tx) => {
            // Check if exists
            const existing = await tx.quote.findFirst({ where: { id, companyId } });
            if (!existing) throw new Error("Quote not found");

            // Delete current items
            await tx.quoteItem.deleteMany({ where: { quoteId: id } });

            let totalAmount = 0;
            const quoteItemsData = items?.map((item: any) => {
                const total = Number(item.quantity) * Number(item.unitPrice);
                totalAmount += total;
                return {
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    total
                };
            }) || [];

            const netAmount = totalAmount;
            const taxAmount = netAmount * 0.19;
            const finalTotal = netAmount + taxAmount;

            const result = await tx.quote.update({
                where: { id },
                data: {
                    number,
                    date: new Date(date),
                    validUntil: validUntil ? new Date(validUntil) : null,
                    status,
                    notes,
                    leadId,
                    netAmount,
                    taxAmount,
                    totalAmount: finalTotal,
                    items: {
                        create: quoteItemsData
                    }
                },
                include: { items: true, lead: true }
            });

            return result;
        });

        res.json(updatedQuote);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update quote", details: err.message });
    }
});

router.delete("/quotes/:id", checkModuleAccess(['CRM', 'INVOICING']), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.quote, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Quote not found" });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete quote", details: err.message });
    }
});


// --- PRODUCTS ---
router.use(inventoryRouter);

router.use(financeRouter);

// --- CLIENT PORTAL MODULE ---
router.get("/portal/:token/dashboard", async (req, res) => {
    try {
        const { token } = req.params;
        const client = await prisma.client.findUnique({
            where: { portalToken: token },
            include: {
                company: true,
                invoices: {
                    orderBy: { date: 'desc' },
                    take: 20
                },
                documents: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });

        if (!client) {
            return res.status(404).json({ error: "Portal no encontrado o Token inválido" });
        }

        res.json({
            client: {
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone
            },
            company: {
                name: client.company.name,
                primaryColor: client.company.primaryColor || "#2563eb",
                logoUrl: client.company.logoUrl
            },
            invoices: client.invoices,
            documents: client.documents
        });
    } catch (err: any) {
        res.status(500).json({ error: "Error al cargar el dashboard del portal", details: err.message });
    }
});

export default router;
