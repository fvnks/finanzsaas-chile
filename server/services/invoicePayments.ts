import { Prisma, PrismaClient } from "@prisma/client";

type InvoiceTx = Prisma.TransactionClient | PrismaClient;

export const recalculateInvoicePaymentStatus = async (tx: InvoiceTx, invoiceId: string) => {
    const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
    });

    if (!invoice) {
        throw new Error("Invoice not found");
    }

    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const isFullyPaid = totalPaid >= invoice.totalAmount;

    let paymentStatus = "PENDING";
    if (isFullyPaid) paymentStatus = "PAID";
    else if (totalPaid > 0) paymentStatus = "PARTIAL";

    return tx.invoice.update({
        where: { id: invoiceId },
        data: {
            isPaid: isFullyPaid,
            paymentStatus,
            paymentDate: isFullyPaid ? invoice.payments.sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.date || null : null
        }
    });
};

export const createInvoicePayment = async (
    tx: InvoiceTx,
    data: Prisma.PaymentUncheckedCreateInput
) => {
    const payment = await tx.payment.create({ data });
    await recalculateInvoicePaymentStatus(tx, data.invoiceId);
    return payment;
};

export const deleteInvoicePayment = async (tx: InvoiceTx, paymentId: string) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
        throw new Error("Payment not found");
    }

    await tx.payment.delete({ where: { id: paymentId } });
    await recalculateInvoicePaymentStatus(tx, payment.invoiceId);
    return payment;
};
