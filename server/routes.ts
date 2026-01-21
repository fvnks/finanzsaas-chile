import { Router } from "express";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const router = Router();

// --- HEALTH ---
router.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- AUTH ---
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        const { password: _, ...userInfo } = user;
        // Ensure allowedSections is returned, defaulting to empty if null (though Prisma handles it)
        res.json({ ...userInfo, allowedSections: user.allowedSections || [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

// --- CLIENTS ---
router.get("/clients", async (req, res) => {
    try {
        // Mapping "name" back to "razonSocial" for frontend compatibility if needed, 
        // OR update frontend to use "name". Ideally update frontend, but here we maintain contract.
        const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });

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
        const { rut, razonSocial, email, telefono, address } = req.body;

        const newClient = await prisma.client.create({
            data: {
                rut,
                name: razonSocial,
                email,
                address
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
        const costCenters = await prisma.costCenter.findMany({ orderBy: { createAt: 'desc' } });
        res.json(costCenters);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch cost centers" });
    }
});

router.post("/cost-centers", async (req, res) => {
    try {
        const { code, name, budget } = req.body;
        const newCostCenter = await prisma.costCenter.create({
            data: {
                code,
                name,
                budget: budget ? Number(budget) : 0
            }
        });
        res.json(newCostCenter);
    } catch (err: any) {
        console.error(err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: "Ya existe un centro de costo con este código." });
        }
        res.status(500).json({ error: "Failed to create cost center" });
    }
});

router.put("/cost-centers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, budget } = req.body;
        const updated = await prisma.costCenter.update({
            where: { id },
            data: { code, name, budget: Number(budget) }
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update cost center" });
    }
});

router.delete("/cost-centers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.costCenter.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete cost center" });
    }
});

router.put("/clients/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { rut, razonSocial, email, telefono, address } = req.body;

        await prisma.client.update({
            where: { id },
            data: {
                rut,
                name: razonSocial,
                email,
                phone: telefono,
                address
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update client" });
    }
});

router.delete("/clients/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.client.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete client" });
    }
});

// --- PROJECTS ---
router.get("/projects", async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: { client: true } // Fetch client name if needed
        });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

router.post("/projects", async (req, res) => {
    try {
        const { name, budget, address, status, progress, startDate, endDate, workerIds } = req.body;

        const newProject = await prisma.project.create({
            data: {
                name,
                budget: budget ? Number(budget) : 0,
                address,
                status: status || 'ACTIVE',
                progress: progress ? Number(progress) : 0,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                workerIds: workerIds || []
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
        const { id } = req.params;
        const { name, budget, address, status, progress, startDate, endDate, workerIds } = req.body;

        const updated = await prisma.project.update({
            where: { id },
            data: {
                name,
                budget: budget !== undefined ? Number(budget) : undefined,
                address,
                status,
                progress: progress !== undefined ? Number(progress) : undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                workerIds // Note: Consider moving to Crew relations
            }
        });
        res.json(updated);
    } catch (err) {
        console.error("Failed to update project", err);
        res.status(500).json({ error: "Failed to update project" });
    }
});

router.delete("/projects/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.project.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete project" });
    }
});

// --- INVOICES ---
router.get("/invoices", async (req, res) => {
    try {
        const invoices = await prisma.invoice.findMany({ orderBy: { date: 'desc' } });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch invoices" });
    }
});

router.post("/invoices", async (req, res) => {
    try {
        const { number, net, iva, total, date, status, clientId, projectId, costCenterId, type, items, relatedInvoiceId } = req.body;
        // Validate costCenterId handles empty strings or 'none' if sent by frontend
        const validCostCenterId = costCenterId && costCenterId !== 'none' ? costCenterId : undefined;
        // Validate projectId handles empty strings
        const validProjectId = projectId && projectId !== '' ? projectId : undefined;

        const result = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    number,
                    netAmount: net,
                    taxAmount: iva,
                    totalAmount: total,
                    date: date ? new Date(date) : new Date(),
                    status: status || 'ISSUED',
                    clientId,
                    projectId: validProjectId,
                    costCenterId: validCostCenterId,
                    type: type || 'SALE',
                    emissionType: 'MANUAL',
                    purchaseOrderNumber: req.body.purchaseOrderNumber,
                    dispatchGuideNumber: req.body.dispatchGuideNumber,
                    relatedInvoiceId: relatedInvoiceId || undefined,
                    items: items && items.length > 0 ? {
                        create: items.map((item: any) => ({
                            description: item.description,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice),
                            total: Number(item.total)
                        }))
                    } : undefined
                },
                include: {
                    items: true
                }
            });

            // If it is a Credit Note and references an invoice, we cancel said invoice
            if (type === 'NOTA_CREDITO' && relatedInvoiceId) {
                await tx.invoice.update({
                    where: { id: relatedInvoiceId },
                    data: { status: 'CANCELLED' }
                });
            }

            return newInvoice;
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create invoice" });
    }
});

router.delete("/invoices/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.invoice.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete invoice" });
    }
});

// --- WORKERS ---
router.get("/workers", async (req, res) => {
    try {
        const workers = await prisma.worker.findMany({ orderBy: { name: 'asc' } });
        res.json(workers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch workers" });
    }
});

router.post("/workers", async (req, res) => {
    try {
        const { rut, name, role, specialty, email, phone } = req.body;
        const newWorker = await prisma.worker.create({
            data: { rut, name, role, specialty, email, phone }
        });
        res.json(newWorker);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create worker" });
    }
});

router.delete("/workers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.worker.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete worker" });
    }
});

// --- CREWS ---
router.get("/crews", async (req, res) => {
    try {
        const crews = await prisma.crew.findMany({
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
        const { name, role, workerIds } = req.body;
        // workerIds: ["id1", "id2"]

        const newCrew = await prisma.crew.create({
            data: {
                name,
                role,
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

router.delete("/crews/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.crew.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete crew" });
    }
});

// --- USERS (Admin) ---
router.get("/users", async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, allowedSections: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

router.post("/users", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'USER',
                allowedSections: req.body.allowedSections || []
            },
            select: { id: true, name: true, email: true, role: true, allowedSections: true }
        });
        res.json(newUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

router.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, password, role } = req.body;

        const data: any = {};
        if (name) data.name = name;
        if (password) data.password = await bcrypt.hash(password, 10);
        if (role) data.role = role;
        // Update allowedSections logic
        if (req.body.allowedSections) data.allowedSections = req.body.allowedSections;

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

router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// --- JOB TITLES ---
router.get("/job-titles", async (req, res) => {
    try {
        const titles = await prisma.jobTitle.findMany({ orderBy: { name: 'asc' } });
        res.json(titles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch job titles" });
    }
});

router.post("/job-titles", async (req, res) => {
    try {
        const { name, description } = req.body;
        const newTitle = await prisma.jobTitle.create({
            data: { name, description }
        });
        res.json(newTitle);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create job title" });
    }
});

router.delete("/job-titles/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.jobTitle.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete job title" });
    }
});

// --- DAILY REPORTS ---
router.get("/daily-reports", async (req, res) => {
    try {
        const reports = await prisma.dailyReport.findMany({ orderBy: { date: 'desc' } });
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch daily reports" });
    }
});

router.post("/daily-reports", async (req, res) => {
    try {
        const { userId, date, content, projectId, progress } = req.body;

        // Transaction to update report and project progress atomically
        const result = await prisma.$transaction(async (tx) => {
            const report = await tx.dailyReport.create({
                data: {
                    userId,
                    date: date ? new Date(date) : new Date(),
                    content,
                    projectId
                }
            });

            if (projectId && progress !== undefined) {
                await tx.project.update({
                    where: { id: projectId },
                    data: { progress: Number(progress) }
                });
            }
            return { report, updatedProject: projectId && progress !== undefined ? await tx.project.findUnique({ where: { id: projectId } }) : null };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create daily report" });
    }
});

router.delete("/daily-reports/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.dailyReport.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete daily report" });
    }
});


// --- NEW MODULES: PURCHASE ORDERS ---
router.get("/purchase-orders", async (req, res) => {
    try {
        const pos = await prisma.purchaseOrder.findMany({
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

        const newPO = await prisma.purchaseOrder.create({
            data: {
                number,
                provider,
                date: new Date(date),
                projectId,
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
        res.json(newPO);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create purchase order" });
    }
});

// --- NEW MODULES: DOCUMENTS ---
router.get("/documents", async (req, res) => {
    try {
        const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch documents" });
    }
});

router.post("/documents", async (req, res) => {
    try {
        // Metadata only for now. File upload logic requires multer or S3 (out of scope for now, just storing ref).
        const { type, referenceId, url, name } = req.body;

        const newDoc = await prisma.document.create({
            data: {
                type, // 'INVOICE', 'CONTRACT', 'RECEIPT', 'OTHER'
                referenceId,
                url: url || '', // Placeholder URL
                name
            }
        });
        res.json(newDoc);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create document" });
    }
});

router.delete("/documents/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.document.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete document" });
    }
});

// --- NEW MODULES: INVENTORY ---
router.get("/inventory/materials", async (req, res) => {
    try {
        const mats = await prisma.material.findMany({ orderBy: { name: 'asc' } });
        res.json(mats);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch materials" });
    }
});

router.post("/inventory/materials", async (req, res) => {
    try {
        const { name, code, unit, minStock } = req.body;
        const newMat = await prisma.material.create({
            data: { name, code, unit, minStock: Number(minStock) }
        });
        res.json(newMat);
    } catch (err) {
        res.status(500).json({ error: "Failed to create material" });
    }
});

router.post("/inventory/movements", async (req, res) => {
    try {
        const { materialId, type, quantity, notes } = req.body; // type: 'IN' | 'OUT'

        // Transaction to update stock and create record
        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.inventoryMovement.create({
                data: {
                    materialId,
                    type,
                    quantity: Number(quantity),
                    description: notes // notes mapped to description
                }
            });

            // Update Material stock
            const adjustment = type === 'IN' ? Number(quantity) : -Number(quantity);

            await tx.material.update({
                where: { id: materialId },
                data: { currentStock: { increment: adjustment } }
            });

            return movement;
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create movement" });
    }
});

// Add logic for movements...

export default router;
