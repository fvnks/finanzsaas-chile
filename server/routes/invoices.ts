import { Router } from "express";
import { prisma } from "../prisma";
import { checkModuleAccess } from "../middleware/modules";
import {
    findOwnedRecord,
    getCompanyId,
    getInvoiceTypeLabel,
    normalizeInvoiceType
} from "../lib/domain";
import { asNumber, asOptionalDate, asRequiredDate, requireNonEmptyString } from "../lib/validation";
import { createInvoicePayment, deleteInvoicePayment, recalculateInvoicePaymentStatus } from "../services/invoicePayments";

const invoicesRouter = Router();


invoicesRouter.get("/invoices", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const invoices = await prisma.invoice.findMany({
            where: { companyId },
            orderBy: { date: "desc" },
            include: { client: true, project: true, supplier: true, items: true }
        });
        res.json(invoices);
    } catch (err) {
        console.error("Error fetching invoices:", err);
        res.status(500).json({ error: "Failed to fetch invoices" });
    }
});

invoicesRouter.post("/invoices", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const {
            number,
            net,
            iva,
            total,
            date,
            dueDate,
            status,
            clientId,
            supplierId,
            projectId,
            costCenterId,
            type,
            items,
            relatedInvoiceId,
            annulInvoice,
            paymentDate
        } = req.body;

        const invoiceNumber = requireNonEmptyString(number, "number");
        const invoiceDate = asRequiredDate(date, "date");
        const validCostCenterId = costCenterId && costCenterId !== "none" ? costCenterId : undefined;
        const validProjectId = projectId && projectId !== "" ? projectId : undefined;
        const checkType = type || "SALE";
        const normalizedType = normalizeInvoiceType(type);

        const duplicateWhere: any = {
            number: invoiceNumber,
            type: normalizedType,
            companyId
        };

        if (normalizedType === "PURCHASE") {
            if (!supplierId) {
                return res.status(400).json({ error: "Debe especificar un proveedor para facturas de compra." });
            }
            duplicateWhere.supplierId = supplierId;
        }

        const existing = await prisma.invoice.findFirst({ where: duplicateWhere });
        if (existing) {
            const duplicateTypeName = getInvoiceTypeLabel(checkType);
            return res.status(409).json({
                error: `El folio ${invoiceNumber} ya existe para ${duplicateTypeName}.`
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    number: invoiceNumber,
                    netAmount: asNumber(net),
                    taxAmount: asNumber(iva),
                    totalAmount: asNumber(total),
                    date: invoiceDate,
                    dueDate: asOptionalDate(dueDate),
                    status: status || "ISSUED",
                    clientId: clientId || undefined,
                    supplierId: supplierId || undefined,
                    projectId: validProjectId,
                    costCenterId: validCostCenterId,
                    type: normalizedType,
                    emissionType: "MANUAL",
                    purchaseOrderNumber: req.body.purchaseOrderNumber,
                    dispatchGuideNumber: req.body.dispatchGuideNumber,
                    hesNumber: req.body.hesNumber,
                    relatedInvoiceId: relatedInvoiceId || undefined,
                    paymentStatus: req.body.paymentStatus || "PENDING",
                    paymentDate: asOptionalDate(paymentDate),
                    companyId,
                    items: Array.isArray(items) && items.length > 0 ? {
                        create: items.map((item: any) => ({
                            description: item.description,
                            quantity: asNumber(item.quantity),
                            unitPrice: asNumber(item.unitPrice),
                            total: asNumber(item.total)
                        }))
                    } : undefined
                },
                include: { items: true }
            });

            if (normalizedType === "CREDIT_NOTE" && relatedInvoiceId && annulInvoice !== false) {
                await tx.invoice.update({
                    where: { id: relatedInvoiceId },
                    data: { status: "CANCELLED" }
                });
            }

            return newInvoice;
        });

        res.json(result);
    } catch (err: any) {
        console.error(err);
        if (err.message?.includes("required")) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Failed to create invoice" });
    }
});

invoicesRouter.delete("/invoices/:id", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;

        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findFirst({ where: { id, companyId } });
            if (!invoice) throw new Error("Invoice not found");

            if (normalizeInvoiceType(invoice.type) === "CREDIT_NOTE" && invoice.relatedInvoiceId) {
                const relatedInvoice = await tx.invoice.findUnique({ where: { id: invoice.relatedInvoiceId } });

                if (relatedInvoice && relatedInvoice.status === "CANCELLED") {
                    await tx.invoice.update({
                        where: { id: invoice.relatedInvoiceId },
                        data: { status: "PENDING" }
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

invoicesRouter.put("/invoices/:id", checkModuleAccess("INVOICING"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const {
            number,
            net,
            iva,
            total,
            date,
            dueDate,
            status,
            clientId,
            supplierId,
            projectId,
            costCenterId,
            type,
            items,
            purchaseOrderNumber,
            dispatchGuideNumber,
            isPaid,
            relatedInvoiceId,
            paymentDate
        } = req.body;

        const invoiceNumber = requireNonEmptyString(number, "number");
        const invoiceDate = asRequiredDate(date, "date");
        const validCostCenterId = costCenterId && costCenterId !== "none" ? costCenterId : undefined;
        const validProjectId = projectId && projectId !== "" ? projectId : undefined;
        const normalizedType = normalizeInvoiceType(type);

        const updatedInvoice = await prisma.$transaction(async (tx) => {
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

            const existing = await tx.invoice.findFirst({ where: { id, companyId } });
            if (!existing) throw new Error("Invoice not found");

            await tx.invoice.update({
                where: { id },
                data: {
                    number: invoiceNumber,
                    netAmount: asNumber(net),
                    taxAmount: asNumber(iva),
                    totalAmount: asNumber(total),
                    date: invoiceDate,
                    dueDate: asOptionalDate(dueDate),
                    status: status || "DRAFT",
                    client: normalizedType === "PURCHASE" ? { disconnect: true } : (clientId ? { connect: { id: clientId } } : { disconnect: true }),
                    supplier: normalizedType === "PURCHASE" ? (supplierId ? { connect: { id: supplierId } } : { disconnect: true }) : { disconnect: true },
                    project: validProjectId ? { connect: { id: validProjectId } } : { disconnect: true },
                    costCenter: validCostCenterId ? { connect: { id: validCostCenterId } } : { disconnect: true },
                    type: normalizedType,
                    purchaseOrderNumber,
                    dispatchGuideNumber,
                    isPaid: isPaid ?? false,
                    paymentStatus: req.body.paymentStatus || (isPaid ? "PAID" : "PENDING"),
                    paymentDate: asOptionalDate(paymentDate),
                    hesNumber: req.body.hesNumber || null,
                    relatedInvoice: relatedInvoiceId ? { connect: { id: relatedInvoiceId } } : { disconnect: true }
                }
            });

            if (Array.isArray(items) && items.length > 0) {
                await tx.invoiceItem.createMany({
                    data: items.map((item: any) => ({
                        description: item.description,
                        quantity: asNumber(item.quantity),
                        unitPrice: asNumber(item.unitPrice),
                        total: asNumber(item.total),
                        invoiceId: id
                    }))
                });
            }

            if (normalizedType === "CREDIT_NOTE" && relatedInvoiceId && req.body.annulInvoice !== false) {
                await tx.invoice.update({
                    where: { id: relatedInvoiceId },
                    data: { status: "CANCELLED" }
                });
            }

            return tx.invoice.findUnique({
                where: { id },
                include: { client: true, project: true, supplier: true, items: true }
            });
        }, {
            maxWait: 5000,
            timeout: 20000
        });

        res.json(updatedInvoice);
    } catch (err: any) {
        console.error("Error updating invoice:", err);
        if (err.message?.includes("required")) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Failed to update invoice" });
    }
});

invoicesRouter.get("/invoices/:id/payments", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const invoice = await findOwnedRecord(prisma.invoice, id, companyId);
        if (!invoice) return res.status(404).json({ error: "Invoice not found" });

        const payments = await prisma.payment.findMany({
            where: { invoiceId: id },
            orderBy: { date: "desc" }
        });
        res.json(payments);
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
});

invoicesRouter.post("/invoices/:id/payments", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { amount, date, method, reference, comment } = req.body;
        const invoice = await findOwnedRecord(prisma.invoice, id, companyId);
        if (!invoice) return res.status(404).json({ error: "Invoice not found" });

        const payment = await prisma.$transaction((tx) =>
            createInvoicePayment(tx as any, {
                invoiceId: id,
                amount: asNumber(amount),
                date: asRequiredDate(date, "date"),
                method,
                reference,
                comment,
                companyId
            })
        );

        res.status(201).json(payment);
    } catch (error: any) {
        console.error("Error creating payment:", error);
        if (error.message?.includes("required")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to create payment" });
    }
});

invoicesRouter.delete("/payments/:id", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const payment = await prisma.payment.findUnique({ where: { id } });
        if (!payment) return res.status(404).json({ error: "Payment not found" });

        const invoice = await findOwnedRecord(prisma.invoice, payment.invoiceId, companyId);
        if (!invoice) return res.status(404).json({ error: "Invoice not found" });

        await prisma.$transaction((tx) => deleteInvoicePayment(tx as any, id));

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).json({ error: "Failed to delete payment" });
    }
});

invoicesRouter.patch("/invoices/:id/payment", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { isPaid, paymentDate, paymentStatus } = req.body;
        const existing = await findOwnedRecord(prisma.invoice, id, companyId);
        if (!existing) return res.status(404).json({ error: "Invoice not found" });

        const updateData: any = { isPaid };
        if (paymentDate !== undefined) updateData.paymentDate = asOptionalDate(paymentDate);
        if (paymentStatus) updateData.paymentStatus = paymentStatus;

        const updated = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.update({
                where: { id },
                data: updateData
            });

            if (paymentStatus === undefined && isPaid !== undefined) {
                await recalculateInvoicePaymentStatus(tx as any, id);
                return tx.invoice.findUnique({ where: { id } });
            }

            return invoice;
        });
        res.json(updated);
    } catch (err) {
        console.error("Error updating invoice payment status:", err);
        res.status(500).json({ error: "Failed to update invoice payment status" });
    }
});

export default invoicesRouter;
