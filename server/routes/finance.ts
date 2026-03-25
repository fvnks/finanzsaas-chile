import { Router } from "express";
import { prisma } from "../prisma";
import { deleteOwnedRecord, findOwnedRecord, getCompanyId, updateOwnedRecord } from "../lib/domain";
import { requireCompanyContext } from "../middleware/company";

const financeRouter = Router();


financeRouter.get("/bank-accounts", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const accounts = await prisma.bankAccount.findMany({
            where: { companyId },
            include: { transactions: { orderBy: { date: "desc" }, take: 5 } },
            orderBy: { name: "asc" }
        });
        res.json(accounts);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch bank accounts", details: err.message });
    }
});

financeRouter.post("/bank-accounts", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { name, number, currency, balance } = req.body;
        const account = await prisma.bankAccount.create({
            data: {
                companyId,
                name,
                number,
                currency: currency || "CLP",
                balance: Number(balance) || 0
            }
        });
        res.json(account);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create bank account", details: err.message });
    }
});

financeRouter.put("/bank-accounts/:id", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { name, number, currency, balance } = req.body;

        const account = await updateOwnedRecord(prisma.bankAccount, id, companyId, {
            name,
            number,
            currency,
            balance: Number(balance)
        });
        if (!account) return res.status(404).json({ error: "Bank account not found" });
        res.json(account);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update bank account", details: err.message });
    }
});

financeRouter.delete("/bank-accounts/:id", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.bankAccount, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Bank account not found" });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete bank account", details: err.message });
    }
});

financeRouter.get("/bank-transactions", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { bankAccountId } = req.query;

        const transactions = await prisma.bankTransaction.findMany({
            where: {
                bankAccount: { companyId },
                ...(bankAccountId ? { bankAccountId: bankAccountId as string } : {})
            },
            include: { bankAccount: true },
            orderBy: { date: "desc" }
        });
        res.json(transactions);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch transactions", details: err.message });
    }
});

financeRouter.post("/bank-transactions", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { bankAccountId, type, amount, description, reference, category, date } = req.body;

        const account = await findOwnedRecord(prisma.bankAccount, bankAccountId, companyId);
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

            const balanceChange = type === "IN" ? Number(amount) : -Number(amount);
            await tx.bankAccount.update({
                where: { id: bankAccountId },
                data: {
                    balance: {
                        increment: balanceChange
                    }
                }
            });

            return transaction;
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to process transaction", details: err.message });
    }
});

financeRouter.get("/exchange-rates", async (_req, res) => {
    try {
        const rates = await prisma.exchangeRate.findMany({
            orderBy: { date: "desc" },
            take: 30
        });
        res.json(rates);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch exchange rates", details: err.message });
    }
});

financeRouter.post("/exchange-rates", async (req, res) => {
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

financeRouter.get("/cash-flow", async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const receivableTypes = ["SALE", "VENTA"];
        const payableTypes = ["PURCHASE", "COMPRA"];

        const accountsPayable = await prisma.invoice.findMany({
            where: {
                companyId,
                type: { in: payableTypes },
                isPaid: false,
                status: { not: "CANCELLED" }
            },
            select: { date: true, dueDate: true, totalAmount: true, currency: true, exchangeRate: true }
        });

        const accountsReceivable = await prisma.invoice.findMany({
            where: {
                companyId,
                type: { in: receivableTypes },
                isPaid: false,
                status: { not: "CANCELLED" }
            },
            select: { date: true, dueDate: true, totalAmount: true, currency: true, exchangeRate: true }
        });

        const forecastSourceInvoices = await prisma.invoice.findMany({
            where: {
                companyId,
                type: { in: [...receivableTypes, ...payableTypes] }
            },
            select: {
                type: true,
                date: true,
                dueDate: true,
                isPaid: true,
                status: true
            }
        });

        const accounts = await prisma.bankAccount.findMany({
            where: { companyId },
            select: { currency: true, balance: true }
        });

        const latestRates = await prisma.exchangeRate.findMany({
            orderBy: { date: "desc" },
            take: 10
        });

        const getRate = (currency: string) => {
            if (currency === "CLP") return 1;
            const rate = latestRates.find((item) => item.currency === currency);
            return rate ? rate.value : 1;
        };

        const totalBalanceCLP = accounts.reduce((sum, account) => {
            const rate = getRate(account.currency);
            return sum + (account.balance * rate);
        }, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diagnostics = forecastSourceInvoices.reduce((summary, invoice) => {
            const referenceDate = invoice.dueDate || invoice.date;
            const isReceivable = receivableTypes.includes(invoice.type);

            if (invoice.status === "CANCELLED") {
                if (isReceivable) summary.cancelledReceivable += 1;
                else summary.cancelledPayable += 1;
                return summary;
            }

            if (invoice.isPaid) {
                if (isReceivable) summary.paidReceivable += 1;
                else summary.paidPayable += 1;
                return summary;
            }

            if (!referenceDate) {
                if (isReceivable) summary.missingDateReceivable += 1;
                else summary.missingDatePayable += 1;
                return summary;
            }

            const normalizedDate = new Date(referenceDate);
            normalizedDate.setHours(0, 0, 0, 0);

            if (normalizedDate < today) {
                if (isReceivable) summary.overdueReceivable += 1;
                else summary.overduePayable += 1;
                return summary;
            }

            if (isReceivable) summary.includedReceivable += 1;
            else summary.includedPayable += 1;
            return summary;
        }, {
            includedReceivable: 0,
            includedPayable: 0,
            paidReceivable: 0,
            paidPayable: 0,
            cancelledReceivable: 0,
            cancelledPayable: 0,
            missingDateReceivable: 0,
            missingDatePayable: 0,
            overdueReceivable: 0,
            overduePayable: 0
        });

        res.json({
            currentBalanceCLP: totalBalanceCLP,
            accountsPayable,
            accountsReceivable,
            diagnostics
        });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to calculate cash flow", details: err.message });
    }
});

export default financeRouter;
