import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import multer from "multer";
import { Readable } from "stream";
import { uploadToOneDrive, getFileStreamFromWebUrl } from "./services/onedrive";
import { createBackup, listBackups, getBackupPath, deleteBackup } from "./services/backup";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// --- GLOBAL MIDDLEWARE TO SET COMPANY ID ---
router.use((req: Request, res: Response, next: NextFunction) => {
    const companyId = req.headers['x-company-id'];
    if (companyId) {
        (req as any).companyId = companyId as string;
    }
    next();
});

// --- AUTHORIZATION MIDDLEWARE ---
const checkModuleAccess = (requiredModule: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const companyId = (req as any).companyId || req.headers['x-company-id'];
        
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

            if (company.planStatus !== 'ACTIVE' && company.planStatus !== 'TRIAL') {
                return res.status(402).json({ error: "Su suscripción no se encuentra activa." });
            }

            // If modules array is empty/null, perhaps it's a legacy company with all access?
            // For strict SaaS, we enforce the check.
            if (!company.modules || !company.modules.includes(requiredModule)) {
                return res.status(403).json({ error: `No tiene acceso al módulo: ${requiredModule}. Requerido cambiar de plan.` });
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
        const userWithCompanies = await prisma.user.findUnique({
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
                        modules: true
                    }
                } 
            }
        });

        // Ensure allowedSections is returned, defaulting to empty if null (though Prisma handles it)
        res.json({
            ...userInfo,
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
router.put("/companies/:id", async (req, res) => {
    const { id } = req.params;
    const { primaryColor, logoUrl, name, address, email, phone, website } = req.body;
    
    try {
        const updated = await prisma.company.update({
            where: { id },
            data: {
                primaryColor: primaryColor !== undefined ? primaryColor : undefined,
                logoUrl: logoUrl !== undefined ? logoUrl : undefined,
                name: name || undefined,
                address: address !== undefined ? address : undefined,
                email: email !== undefined ? email : undefined,
                phone: phone !== undefined ? phone : undefined,
                website: website !== undefined ? website : undefined
            }
        });
        res.json(updated);
    } catch (error) {
        console.error("Error updating company:", error);
        res.status(500).json({ error: "Failed to update company" });
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
            return res.status(409).json({ error: "Ya existe un centro de costo con este código." });
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
        const updated = await prisma.costCenter.update({
            where: { id, companyId }, // Ensure ownership
            data: { code, name, budget: Number(budget) }
        });
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
        await prisma.costCenter.delete({ where: { id, companyId } });
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

        await prisma.client.update({
            where: { id, companyId },
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
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        await prisma.client.delete({ where: { id, companyId } });
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
            include: { client: true } // Fetch client name if needed
        });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

router.post("/projects", checkModuleAccess("PROJECTS"), async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { name, budget, address, status, progress, startDate, endDate, workerIds } = req.body;

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
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { name, budget, address, status, progress, startDate, endDate, workerIds } = req.body;

        const updated = await prisma.project.update({
            where: { id, companyId },
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
        const companyId = req.headers['x-company-id'] as string;
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        await prisma.project.delete({ where: { id, companyId } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete project" });
    }
});

// --- INVOICES ---
router.get("/invoices", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const invoices = await prisma.invoice.findMany({
            where: { companyId },
            orderBy: { date: 'desc' },
            include: { client: true, project: true } // Include relations for UI
        });
        res.json(invoices);
    } catch (err) {
        console.error("Error fetching invoices:", err);
        res.status(500).json({ error: "Failed to fetch invoices" });
    }
});

router.post("/invoices", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const { number, net, iva, total, date, status, clientId, projectId, costCenterId, type, items, relatedInvoiceId, annulInvoice, paymentDate } = req.body;
        // Validate costCenterId handles empty strings or 'none' if sent by frontend
        const validCostCenterId = costCenterId && costCenterId !== 'none' ? costCenterId : undefined;
        // Validate projectId handles empty strings
        const validProjectId = projectId && projectId !== '' ? projectId : undefined;

        const companyId = (req as any).companyId;
        // VALIDATION: Check for duplicates
        // 1. Calculate check criteria
        const checkType = type || 'SALE';

        // Build where clause
        const duplicateWhere: any = {
            number: number,
            type: checkType,
            companyId,
            status: { not: 'CANCELLED' } // We might allow re-using folio if previous was cancelled? Or strictly never?
            // Usually efficient tax systems don't allow re-use even if cancelled. 
            // Let's stick to strict: no duplicates active or inactive. 
            // actually, let's just check number + type + client (if purchase)
        };
        // Remove status check to be strict
        delete duplicateWhere.status;

        // 2. If it is a PURCHASE (COMPRA), it is unique per Client.
        if (checkType === 'COMPRA') {
            if (!clientId) {
                return res.status(400).json({ error: "Debe especificar un cliente para facturas de compra." });
            }
            duplicateWhere.clientId = clientId;
        } else {
            // For SALES (VENTA), NOTES, etc emitted by US, they should be global unique.
            // However, verify if we have multiple emission points? Assuming single SaaS for now.
        }

        const existing = await prisma.invoice.findFirst({
            where: duplicateWhere
        });

        if (existing) {
            const typeName = checkType === 'COMPRA' ? 'Compra' :
                checkType === 'VENTA' ? 'Venta' :
                    checkType === 'NOTA_CREDITO' ? 'Nota de Crédito' : 'Documento';

            return res.status(409).json({
                error: `El folio ${number} ya existe para ${typeName}.`
            });
        }

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
                    hesNumber: req.body.hesNumber,
                    relatedInvoiceId: relatedInvoiceId || undefined,
                    paymentStatus: req.body.paymentStatus || 'PENDING',
                    paymentDate: paymentDate ? new Date(paymentDate) : null,
                    companyId,
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

            // If it is a Credit Note and references an invoice, we cancel said invoice IF requested
            if (type === 'NOTA_CREDITO' && relatedInvoiceId && annulInvoice !== false) {
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

router.delete("/invoices/:id", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const { id } = req.params;

        const companyId = (req as any).companyId;
        await prisma.$transaction(async (tx) => {
            // Check if it's a Credit Note
            const invoice = await tx.invoice.findFirst({ where: { id, companyId } });
            if (!invoice) throw new Error("Invoice not found");

            if (invoice.type === 'NOTA_CREDITO' && invoice.relatedInvoiceId) {
                // Check if the related invoice was cancelled. If so, revert it to PENDING.
                // If it is NOT cancelled (meaning it was a partial credit note), do NOT touch the status.
                const relatedInvoice = await tx.invoice.findUnique({ where: { id: invoice.relatedInvoiceId } });

                if (relatedInvoice && relatedInvoice.status === 'CANCELLED') {
                    await tx.invoice.update({
                        where: { id: invoice.relatedInvoiceId },
                        data: { status: 'PENDING' }
                    });
                }
            }

            await tx.invoice.delete({ where: { id } });
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting invoice:", err);
        res.status(500).json({ error: "Failed to delete invoice" });
    }
});

router.put("/invoices/:id", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const { id } = req.params;
        const { number, net, iva, total, date, status, clientId, projectId, costCenterId, type, items, purchaseOrderNumber, dispatchGuideNumber, isPaid, relatedInvoiceId, paymentDate } = req.body;

        const validCostCenterId = costCenterId && costCenterId !== 'none' ? costCenterId : undefined;
        const validProjectId = projectId && projectId !== '' ? projectId : undefined;
        const companyId = (req as any).companyId;

        const updatedInvoice = await prisma.$transaction(async (tx) => {
            // Delete existing items
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

            // Verify ownership
            const existing = await tx.invoice.findFirst({ where: { id, companyId } });
            if (!existing) throw new Error("Invoice not found");

            // Update Invoice
            const invoice = await tx.invoice.update({
                where: { id },
                data: {
                    number,
                    netAmount: net,
                    taxAmount: iva,
                    totalAmount: total,
                    date: new Date(date),
                    status: status || 'DRAFT',
                    client: clientId ? { connect: { id: clientId } } : { disconnect: true },
                    project: validProjectId ? { connect: { id: validProjectId } } : { disconnect: true },
                    costCenter: validCostCenterId ? { connect: { id: validCostCenterId } } : { disconnect: true },
                    type,
                    purchaseOrderNumber,
                    dispatchGuideNumber,
                    isPaid: isPaid ?? false,
                    paymentStatus: req.body.paymentStatus || (isPaid ? 'PAID' : 'PENDING'), // Handle logic if not sent
                    paymentDate: paymentDate ? new Date(paymentDate) : null,
                    hesNumber: req.body.hesNumber || null,
                    relatedInvoice: req.body.relatedInvoiceId ? { connect: { id: req.body.relatedInvoiceId } } : { disconnect: true }
                }
            });

            if (items && items.length > 0) {
                await tx.invoiceItem.createMany({
                    data: items.map((item: any) => ({
                        description: item.description,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice),
                        total: Number(item.total),
                        invoiceId: id
                    }))
                });
            }

            // If it is a Credit Note and references an invoice, we cancel said invoice IF requested
            if (type === 'NOTA_CREDITO' && relatedInvoiceId && req.body.annulInvoice !== false) {
                await tx.invoice.update({
                    where: { id: relatedInvoiceId },
                    data: { status: 'CANCELLED' }
                });
            }

            // Fetch the complete invoice with relations to match GET structure
            const completeInvoice = await tx.invoice.findUnique({
                where: { id },
                include: { client: true, project: true }
            });

            return completeInvoice;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 20000 // default: 5000
        });

        res.json(updatedInvoice);
    } catch (err) {
        console.error("Error updating invoice:", err);
        res.status(500).json({ error: "Failed to update invoice" });
    }
});

// --- PAYMENTS ---

// Get Payments for Invoice
router.get("/invoices/:id/payments", async (req, res) => {
    try {
        const { id } = req.params;
        const payments = await prisma.payment.findMany({
            where: { invoiceId: id },
            orderBy: { date: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
});

// Add Payment
router.post("/invoices/:id/payments", async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date, method, reference, comment, companyId } = req.body;

        // 1. Create Payment
        const payment = await prisma.payment.create({
            data: {
                invoiceId: id,
                amount: Number(amount),
                date: new Date(date),
                method,
                reference,
                comment,
                companyId
            }
        });

        // 2. Recalculate Invoice Status
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { payments: true }
        });

        if (invoice) {
            const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            const isFullyPaid = totalPaid >= invoice.totalAmount;

            let newStatus = 'PENDING';
            if (isFullyPaid) newStatus = 'PAID';
            else if (totalPaid > 0) newStatus = 'PARTIAL';

            await prisma.invoice.update({
                where: { id },
                data: {
                    isPaid: isFullyPaid,
                    paymentStatus: newStatus
                }
            });
        }

        res.status(201).json(payment);
    } catch (error) {
        console.error("Error creating payment:", error);
        res.status(500).json({ error: "Failed to create payment" });
    }
});

// Delete Payment
router.delete("/payments/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await prisma.payment.findUnique({ where: { id } });
        if (!payment) return res.status(404).json({ error: "Payment not found" });

        const invoiceId = payment.invoiceId;

        await prisma.payment.delete({ where: { id } });

        // Recalculate Invoice Status
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { payments: true }
        });

        if (invoice) {
            const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            const isFullyPaid = totalPaid >= invoice.totalAmount;

            let newStatus = 'PENDING';
            if (isFullyPaid) newStatus = 'PAID';
            else if (totalPaid > 0) newStatus = 'PARTIAL';

            await prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    isPaid: isFullyPaid,
                    paymentStatus: newStatus
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).json({ error: "Failed to delete payment" });
    }
});

router.patch("/invoices/:id/payment", async (req, res) => {
    try {
        const { id } = req.params;
        const { isPaid, paymentDate, paymentStatus } = req.body;

        const companyId = (req as any).companyId;
        // Verify ownership first
        const existing = await prisma.invoice.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Invoice not found" });

        const updateData: any = { isPaid };
        if (paymentDate !== undefined) updateData.paymentDate = paymentDate ? new Date(paymentDate) : null;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;

        const updated = await prisma.invoice.update({
            where: { id },
            data: updateData
        });
        res.json(updated);
    } catch (err) {
        console.error("Error updating invoice payment status:", err);
        res.status(500).json({ error: "Failed to update invoice payment status" });
    }
});


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

router.put("/suppliers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;
        const { rut, razonSocial, fantasyName, email, phone, address, category } = req.body;

        // Ensure ownership
        const existing = await prisma.supplier.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Supplier not found" });

        const updated = await prisma.supplier.update({
            where: { id },
            data: {
                rut,
                razonSocial,
                fantasyName,
                email,
                phone,
                address,
                category
            }
        });
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

        const existing = await prisma.supplier.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Supplier not found" });

        await prisma.supplier.delete({ where: { id } });
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

        const existing = await prisma.worker.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Worker not found" });

        const updated = await prisma.worker.update({
            where: { id },
            data: { rut, name, role, specialty, email, phone }
        });
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
        const existing = await prisma.worker.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Worker not found" });

        await prisma.worker.delete({ where: { id } });
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
        const { id } = req.params;
        const { name, role, workerIds, projectId } = req.body;

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

router.post("/users", async (req, res) => {
    try {
        const { name, email, password, role, allowedSections, assignedProjectIds, companyIds } = req.body;
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

router.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, password, role, allowedSections, assignedProjectIds, companyIds } = req.body;

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

router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

router.get("/users/:id", async (req, res) => {
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
router.get("/companies", async (req, res) => {
    try {
        const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
        res.json(companies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
});

router.post("/companies", async (req, res) => {
    try {
        const { name, rut, logoUrl, creatorId } = req.body;
        const newCompany = await prisma.company.create({
            data: {
                name,
                rut,
                logoUrl,
                users: creatorId ? {
                    connect: { id: creatorId }
                } : undefined
            }
        });
        res.json(newCompany);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create company" });
    }
});

router.put("/companies/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rut, logoUrl } = req.body;
        const updated = await prisma.company.update({
            where: { id },
            data: { name, rut, logoUrl }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update company" });
    }
});

router.delete("/companies/:id", async (req, res) => {
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
        const companyId = (req as any).companyId;
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
        const companyId = (req as any).companyId;
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
        const companyId = (req as any).companyId;
        const updated = await prisma.jobTitle.update({
            where: { id }, // In future, scope by companyId if needed, but ID is unique.
            // But we should verify ownership
            data: { name, description }
        });
        // Verify ownership via findFirst before update?
        // For now, let's assume UUID security + company context usage elsewhere.
        // Actually best to findFirst to verify
        const existing = await prisma.jobTitle.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Job Title not found" });

        // Re-execute update
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
        const companyId = (req as any).companyId;
        const existing = await prisma.jobTitle.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Job Title not found" });

        await prisma.jobTitle.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete job title" });
    }
});

// --- DAILY REPORTS ---
router.get("/daily-reports", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const reports = await prisma.dailyReport.findMany({
            where: { companyId },
            orderBy: { date: 'desc' }
        });
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch daily reports" });
    }
});

router.post("/daily-reports", async (req, res) => {
    try {
        const { userId, date, content, projectId, progress } = req.body;
        const companyId = (req as any).companyId;

        // Verify project belongs to company
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

router.delete("/daily-reports/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId;

        const existing = await prisma.dailyReport.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Daily Report not found" });

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
        const existing = await prisma.purchaseOrder.findFirst({ where: { id, companyId } });
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
        const existing = await prisma.purchaseOrder.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Purchase Order not found" });

        await prisma.purchaseOrder.delete({ where: { id } });
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

        const updated = await prisma.documentRequirement.update({
            where: { id }, // Validate ownership
            data: {
                status,
                dueDate: dueDate ? new Date(dueDate) : undefined
            }
        });
        // We should verify ownership (omitted for brevity in past steps but crucial)
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
        const existing = await prisma.documentRequirement.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Requirement not found" });

        await prisma.documentRequirement.delete({ where: { id } });
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
        const { id } = req.params;
        const { status } = req.body; // PENDING, APPROVED, REJECTED

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
        const { id } = req.params;
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
        const { clientId } = req.params;
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
        const { clientId } = req.params;
        const { name, color } = req.body;
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
        const { id } = req.params;
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
        const existing = await prisma.plan.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Plan not found" });

        await prisma.plan.delete({ where: { id } });
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
        const plan = await prisma.plan.findFirst({ where: { id, companyId } });
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
        const plan = await prisma.plan.findFirst({
            where: { id, companyId },
            include: { project: true }
        });
        if (!plan) return res.status(404).json({ error: "Plano no encontrado" });

        // 2. Get User
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        // 3. Check permissions (Skip for ADMIN)
        if (user.role !== 'ADMIN') {
            // If plan belongs to a project...
            if (plan.projectId) {
                const assigned = user.assignedProjectIds || [];
                // Check if project ID is in assigned list
                if (!assigned.includes(plan.projectId)) {
                    return res.status(403).json({ error: "No estás asignado a este proyecto. No puedes reportar cuelgues." });
                }
            }
        }

        // Handle File Upload
        if (req.file) {
            try {
                const projectName = plan.project?.name || 'General';
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
        const { description, amount, category, date, originCompanyId, targetCompanyId, workerId, invoiceNumber, distributions } = req.body;

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
        const { description, amount, category, date, originCompanyId, targetCompanyId, workerId, invoiceNumber, status } = req.body;

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
        const { id } = req.params;
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
        const { id } = req.params;
        await prisma.expense.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting expense:", err);
        res.status(500).json({ error: "Failed to delete expense" });
    }
});


// --- BACKUPS ---
router.get("/backups", async (req, res) => {
    try {
        const backups = await listBackups();
        res.json(backups);
    } catch (err: any) {
        console.error("Error listing backups:", err);
        res.status(500).json({ error: "Failed to list backups" });
    }
});

router.post("/backups", async (req, res) => {
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

router.delete("/backups/:filename", async (req, res) => {
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
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { name, brand, model, serialNumber, status, lastMaintenanceDate, nextMaintenanceDate } = req.body;

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
        const companyId = (req as any).companyId;
        const { id } = req.params;
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
        const companyId = (req as any).companyId;
        const { id: toolId } = req.params;
        const { date, description, cost, provider } = req.body;

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
        const companyId = (req as any).companyId;
        const { id } = req.params;
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
        const epp = await prisma.epp.updateMany({
            where: { id, companyId },
            data: { name, description, stock: Number(stock) }
        });
        res.json(epp);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/epp/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        await prisma.epp.deleteMany({ where: { id, companyId } });
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
        const companyId = (req as any).companyId;
        const { eppId, workerId, quantity, date, notes } = req.body;

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
        const companyId = (req as any).companyId;
        const { toolId, workerId, assignedAt, notes } = req.body;

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
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { returnedAt, notes } = req.body;

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
router.get("/plans", async (req, res) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
});

router.post("/plans", async (req, res) => {
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

router.put("/plans/:id", async (req, res) => {
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

router.delete("/plans/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.subscriptionPlan.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete subscription plan" });
    }
});


// --- CRM: LEADS ---
router.get("/leads", checkModuleAccess('INVOICING'), async (req, res) => { // Reusing INVOICING module for now or assume CRM module, using INVOICING since CRM module string not strictly defined yet in plan, let's just make it check companyId
    try {
        const companyId = (req as any).companyId;
        const leads = await prisma.lead.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { quotes: true }
        });
        res.json(leads);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch leads", details: err.message });
    }
});

router.post("/leads", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { name, companyName, email, phone, status, source, notes } = req.body;
        const lead = await prisma.lead.create({
            data: {
                name,
                companyName,
                email,
                phone,
                status: status || 'NEW',
                source,
                notes,
                companyId
            }
        });
        res.json(lead);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create lead", details: err.message });
    }
});

router.put("/leads/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { name, companyName, email, phone, status, source, notes } = req.body;
        
        const lead = await prisma.lead.update({
            where: { id, companyId },
            data: { name, companyName, email, phone, status, source, notes }
        });
        res.json(lead);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update lead", details: err.message });
    }
});

router.delete("/leads/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        await prisma.lead.delete({
            where: { id, companyId }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete lead", details: err.message });
    }
});

// --- CRM: QUOTES ---
router.get("/quotes", async (req, res) => {
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

router.get("/quotes/:id", async (req, res) => {
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

router.post("/quotes", async (req, res) => {
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

router.put("/quotes/:id", async (req, res) => {
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

router.delete("/quotes/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        await prisma.quote.delete({
            where: { id, companyId }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete quote", details: err.message });
    }
});


// --- PRODUCTS ---
router.get("/products", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const products = await prisma.product.findMany({
            where: { companyId },
            include: { stocks: { include: { warehouse: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(products);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch products", details: err.message });
    }
});

router.post("/products", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { code, name, description, type, category, unit, price } = req.body;
        const product = await prisma.product.create({
            data: {
                companyId,
                code,
                name,
                description,
                type: type || 'GOOD',
                category,
                unit: unit || 'UN',
                price: Number(price) || 0
            }
        });
        res.json(product);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create product", details: err.message });
    }
});

router.put("/products/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { code, name, description, type, category, unit, price } = req.body;
        
        // Find explicitly instead of updateMany to return object properly
        const existing = await prisma.product.findFirst({ where: { id, companyId }});
        if (!existing) return res.status(404).json({ error: 'Product not found' });

        const product = await prisma.product.update({
            where: { id },
            data: {
                code,
                name,
                description,
                type,
                category,
                unit,
                price: Number(price)
            }
        });
        res.json(product);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update product", details: err.message });
    }
});

router.delete("/products/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        await prisma.product.deleteMany({
            where: { id, companyId }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete product", details: err.message });
    }
});

// --- WAREHOUSES & STOCK ---
router.get("/warehouses", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const warehouses = await prisma.warehouse.findMany({
            where: { companyId },
            include: { stocks: { include: { product: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(warehouses);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch warehouses", details: err.message });
    }
});

router.post("/warehouses", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { name, location, manager } = req.body;
        const warehouse = await prisma.warehouse.create({
            data: { companyId, name, location, manager }
        });
        res.json(warehouse);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create warehouse", details: err.message });
    }
});

router.put("/warehouses/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { name, location, manager } = req.body;

        const existing = await prisma.warehouse.findFirst({ where: { id, companyId }});
        if (!existing) return res.status(404).json({ error: 'Warehouse not found' });

        const warehouse = await prisma.warehouse.update({
            where: { id },
            data: { name, location, manager }
        });
        res.json(warehouse);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update warehouse", details: err.message });
    }
});

router.delete("/warehouses/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        await prisma.warehouse.deleteMany({
            where: { id, companyId }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete warehouse", details: err.message });
    }
});

// --- INVENTORY MOVEMENTS ---
router.post("/inventory-movements", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { type, quantity, date, description, productId, fromWarehouseId, toWarehouseId, projectId } = req.body;

        const result = await prisma.$transaction(async (tx) => {
             // 1. Create movement record
             const movement = await tx.inventoryMovement.create({
                 data: {
                     companyId,
                     type,
                     quantity: Number(quantity),
                     date: date ? new Date(date) : new Date(),
                     description,
                     productId,
                     fromWarehouseId,
                     toWarehouseId,
                     projectId
                 }
             });

             // Helper to update stock
             const updateStock = async (warehouseId: string, qtyChange: number) => {
                 const currentStock = await tx.stock.findUnique({
                     where: { productId_warehouseId: { productId, warehouseId } }
                 });

                 if (currentStock) {
                     await tx.stock.update({
                         where: { id: currentStock.id },
                         data: { quantity: currentStock.quantity + qtyChange }
                     });
                 } else {
                     await tx.stock.create({
                         data: {
                             productId,
                             warehouseId,
                             quantity: qtyChange
                         }
                     });
                 }
             };

             // 2. Adjust stocks depending on type
             const qty = Number(quantity);
             if (type === 'IN' && toWarehouseId) {
                 await updateStock(toWarehouseId, qty);
             } else if (type === 'OUT' && fromWarehouseId) {
                 await updateStock(fromWarehouseId, -qty);
             } else if (type === 'TRANSFER' && fromWarehouseId && toWarehouseId) {
                 await updateStock(fromWarehouseId, -qty);
                 await updateStock(toWarehouseId, qty);
             } else if (type === 'ADJUSTMENT' && toWarehouseId) {
                 await updateStock(toWarehouseId, qty);
             }

             return movement;
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to process inventory movement", details: err.message });
    }
});

// --- BANK ACCOUNTS ---
router.get("/bank-accounts", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const accounts = await prisma.bankAccount.findMany({
            where: { companyId },
            include: { transactions: { orderBy: { date: 'desc' }, take: 5 } },
            orderBy: { name: 'asc' }
        });
        res.json(accounts);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch bank accounts", details: err.message });
    }
});

router.post("/bank-accounts", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { name, number, currency, balance } = req.body;
        const account = await prisma.bankAccount.create({
            data: {
                companyId,
                name,
                number,
                currency: currency || 'CLP',
                balance: Number(balance) || 0
            }
        });
        res.json(account);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create bank account", details: err.message });
    }
});

router.put("/bank-accounts/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const { name, number, currency, balance } = req.body;

        const existing = await prisma.bankAccount.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: 'Bank account not found' });

        const account = await prisma.bankAccount.update({
            where: { id },
            data: { name, number, currency, balance: Number(balance) }
        });
        res.json(account);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update bank account", details: err.message });
    }
});

router.delete("/bank-accounts/:id", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        await prisma.bankAccount.deleteMany({
            where: { id, companyId }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete bank account", details: err.message });
    }
});

// --- BANK TRANSACTIONS ---
router.get("/bank-transactions", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { bankAccountId } = req.query;

        const transactions = await prisma.bankTransaction.findMany({
            where: {
                bankAccount: { companyId },
                ...(bankAccountId ? { bankAccountId: bankAccountId as string } : {})
            },
            include: { bankAccount: true },
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch transactions", details: err.message });
    }
});

router.post("/bank-transactions", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const { bankAccountId, type, amount, description, reference, category, date } = req.body;

        const account = await prisma.bankAccount.findFirst({
            where: { id: bankAccountId, companyId }
        });
        if (!account) return res.status(404).json({ error: "Bank account not found" });

        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.bankTransaction.create({
                data: {
                    bankAccountId,
                    type,
                    amount: Number(amount),
                    description,
                    reference,
                    category,
                    date: date ? new Date(date) : new Date()
                }
            });

            const balanceChange = type === 'IN' ? Number(amount) : -Number(amount);
            await tx.bankAccount.update({
                where: { id: bankAccountId },
                data: { balance: account.balance + balanceChange }
            });

            return transaction;
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to process transaction", details: err.message });
    }
});

// --- EXCHANGE RATES ---
router.get("/exchange-rates", async (req, res) => {
    try {
        const rates = await prisma.exchangeRate.findMany({
            orderBy: { date: 'desc' },
            take: 30
        });
        res.json(rates);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch exchange rates", details: err.message });
    }
});

router.post("/exchange-rates", async (req, res) => {
    try {
        const { currency, value, date } = req.body;
        const rate = await prisma.exchangeRate.upsert({
            where: {
                date_currency: {
                    date: date ? new Date(date) : new Date(),
                    currency
                }
            },
            update: { value: Number(value) },
            create: {
                date: date ? new Date(date) : new Date(),
                currency,
                value: Number(value)
            }
        });
        res.json(rate);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to save exchange rate", details: err.message });
    }
});

// --- CASH FLOW projection ---
router.get("/cash-flow", async (req, res) => {
    try {
        const companyId = (req as any).companyId;

        const accountsPayable = await prisma.invoice.findMany({
            where: { companyId, type: "PURCHASE", isPaid: false, status: { not: "CANCELLED" } },
            select: { dueDate: true, totalAmount: true, currency: true, exchangeRate: true }
        });

        const accountsReceivable = await prisma.invoice.findMany({
            where: { companyId, type: "SALE", isPaid: false, status: { not: "CANCELLED" } },
            select: { dueDate: true, totalAmount: true, currency: true, exchangeRate: true }
        });

        const accounts = await prisma.bankAccount.findMany({
            where: { companyId },
            select: { currency: true, balance: true }
        });

        const latestRates = await prisma.exchangeRate.findMany({
            orderBy: { date: 'desc' },
            take: 10
        });

        const getRate = (currency: string) => {
             if (currency === 'CLP') return 1;
             const rate = latestRates.find(r => r.currency === currency);
             return rate ? rate.value : 1; 
        };

        const totalBalanceCLP = accounts.reduce((sum, acc) => {
             const rate = getRate(acc.currency);
             return sum + (acc.balance * rate);
        }, 0);

        res.json({
            currentBalanceCLP: totalBalanceCLP,
            accountsPayable,
            accountsReceivable
        });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to calculate cash flow", details: err.message });
    }
});

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
