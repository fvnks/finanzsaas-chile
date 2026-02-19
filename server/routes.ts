import { Router } from "express";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import multer from "multer";
import { Readable } from "stream";
import { uploadToOneDrive, getFileStreamFromWebUrl } from "./services/onedrive";
import { createBackup, listBackups, getBackupPath, deleteBackup } from "./services/backup";

const upload = multer({ storage: multer.memoryStorage() });

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

        // Fetch companies for this user
        // @ts-ignore
        const userWithCompanies = await prisma.user.findUnique({
            where: { id: user.id },
            include: { companies: true }
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
router.get("/projects", async (req, res) => {
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

router.post("/projects", async (req, res) => {
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
router.get("/invoices", async (req, res) => {
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

router.post("/invoices", async (req, res) => {
    try {
        const { number, net, iva, total, date, status, clientId, projectId, costCenterId, type, items, relatedInvoiceId, annulInvoice } = req.body;
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

router.delete("/invoices/:id", async (req, res) => {
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

router.put("/invoices/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { number, net, iva, total, date, status, clientId, projectId, costCenterId, type, items, purchaseOrderNumber, dispatchGuideNumber, isPaid, relatedInvoiceId } = req.body;

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
        const { isPaid } = req.body;

        const companyId = (req as any).companyId;
        // Verify ownership first
        const existing = await prisma.invoice.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ error: "Invoice not found" });

        const updated = await prisma.invoice.update({
            where: { id },
            data: { isPaid }
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

// --- NEW MODULES: INVENTORY ---
router.get("/inventory/materials", async (req, res) => {
    try {
        const companyId = (req as any).companyId;
        const mats = await prisma.material.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(mats);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch materials" });
    }
});

router.post("/inventory/materials", async (req, res) => {
    try {
        const { name, code, unit, minStock } = req.body;
        const companyId = (req as any).companyId;
        const newMat = await prisma.material.create({
            data: { name, code, unit, minStock: Number(minStock), companyId }
        });
        res.json(newMat);
    } catch (err) {
        res.status(500).json({ error: "Failed to create material" });
    }
});

router.post("/inventory/movements", async (req, res) => {
    try {
        const { materialId, type, quantity, notes } = req.body; // type: 'IN' | 'OUT'

        const companyId = (req as any).companyId;
        // Transaction to update stock and create record
        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.inventoryMovement.create({
                data: {
                    materialId,
                    type,
                    quantity: Number(quantity),
                    description: notes, // notes mapped to description
                    companyId
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

export default router;
