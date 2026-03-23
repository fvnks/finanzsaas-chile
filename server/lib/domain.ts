import { Request } from "express";

export const INVOICE_TYPE_ALIASES: Record<string, string> = {
    SALE: "SALE",
    VENTA: "SALE",
    PURCHASE: "PURCHASE",
    COMPRA: "PURCHASE",
    CREDIT_NOTE: "CREDIT_NOTE",
    NOTA_CREDITO: "CREDIT_NOTE",
    DEBIT_NOTE: "DEBIT_NOTE",
    NOTA_DEBITO: "DEBIT_NOTE",
    GUIA_DESPACHO: "GUIA_DESPACHO",
    DISPATCH_GUIDE: "GUIA_DESPACHO",
    FACTURA_EXENTA: "FACTURA_EXENTA",
    EXEMPT_INVOICE: "FACTURA_EXENTA"
};

export const normalizeInvoiceType = (value?: string) => {
    if (!value) return "SALE";
    return INVOICE_TYPE_ALIASES[value] || value;
};

export const getInvoiceTypeLabel = (value?: string) => {
    switch (normalizeInvoiceType(value)) {
        case "PURCHASE":
            return "Compra";
        case "SALE":
            return "Venta";
        case "CREDIT_NOTE":
            return "Nota de Crédito";
        case "DEBIT_NOTE":
            return "Nota de Débito";
        case "GUIA_DESPACHO":
            return "Guía de Despacho";
        case "FACTURA_EXENTA":
            return "Factura Exenta";
        default:
            return value?.replace(/_/g, ' ') || "Documento";
    }
};

export const getCompanyId = (req: Request) => {
    const companyId = (req as any).companyId;
    if (!companyId) return null;
    return typeof companyId === "string" ? companyId : companyId[0];
};

export const findOwnedRecord = async (delegate: any, id: string, companyId: string) => {
    return delegate.findFirst({ where: { id, companyId } });
};

export const updateOwnedRecord = async (
    delegate: any,
    id: string,
    companyId: string,
    data: Record<string, unknown>
) => {
    const existing = await findOwnedRecord(delegate, id, companyId);
    if (!existing) return null;
    return delegate.update({ where: { id }, data });
};

export const deleteOwnedRecord = async (delegate: any, id: string, companyId: string) => {
    const existing = await findOwnedRecord(delegate, id, companyId);
    if (!existing) return false;
    await delegate.delete({ where: { id } });
    return true;
};
