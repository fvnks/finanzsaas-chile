
import { InvoiceType } from '../../types';

export const normalizeInvoiceType = (value?: string) => {
  if (!value) return "SALE";
  const aliases: Record<string, string> = {
    SALE: "SALE", VENTA: "SALE",
    PURCHASE: "PURCHASE", COMPRA: "PURCHASE",
    CREDIT_NOTE: "CREDIT_NOTE", NOTA_CREDITO: "CREDIT_NOTE",
    DEBIT_NOTE: "DEBIT_NOTE", NOTA_DEBITO: "DEBIT_NOTE",
    GUIA_DESPACHO: "GUIA_DESPACHO", DISPATCH_GUIDE: "GUIA_DESPACHO",
    FACTURA_EXENTA: "FACTURA_EXENTA", EXEMPT_INVOICE: "FACTURA_EXENTA"
  };
  return aliases[value] || value;
};

export const getInvoiceTypeLabel = (value?: string) => {
  switch (normalizeInvoiceType(value)) {
    case "PURCHASE": return "Compra";
    case "SALE": return "Venta";
    case "CREDIT_NOTE": return "Nota de Crédito";
    case "DEBIT_NOTE": return "Nota de Débito";
    case "GUIA_DESPACHO": return "Guía de Despacho";
    case "FACTURA_EXENTA": return "Factura Exenta";
    default: return value?.replace(/_/g, ' ') || "Documento";
  }
};

export const mapTypeToEnum = (value?: string): InvoiceType => {
  const normalized = normalizeInvoiceType(value);
  if (normalized === 'PURCHASE') return InvoiceType.COMPRA;
  if (normalized === 'CREDIT_NOTE') return InvoiceType.NOTA_CREDITO;
  if (normalized === 'DEBIT_NOTE') return InvoiceType.NOTA_DEBITO;
  if (normalized === 'GUIA_DESPACHO') return InvoiceType.GUIA_DESPACHO;
  if (normalized === 'FACTURA_EXENTA') return InvoiceType.FACTURA_EXENTA;
  return InvoiceType.VENTA;
};
