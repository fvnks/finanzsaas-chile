const fs = require('fs');

const invoices = JSON.parse(fs.readFileSync('invoices-dump.json', 'utf8'));
const editingId = null;

const InvoiceType = {
  COMPRA: 'COMPRA',
  VENTA: 'VENTA',
  NOTA_CREDITO: 'NOTA_CREDITO',
  NOTA_DEBITO: 'NOTA_DEBITO',
  GUIA_DESPACHO: 'GUIA_DESPACHO',
  FACTURA_EXENTA: 'FACTURA_EXENTA'
};

const filtered = invoices
  .filter(inv => (
    inv.type === InvoiceType.VENTA ||
    inv.type === InvoiceType.COMPRA ||
    inv.type === InvoiceType.NOTA_DEBITO ||
    inv.type === InvoiceType.NOTA_CREDITO ||
    inv.type === InvoiceType.FACTURA_EXENTA ||
    inv.type === 'SALE' ||
    inv.type === 'PURCHASE' ||
    inv.type === 'CREDIT_NOTE' ||
    inv.type === 'DEBIT_NOTE' ||
    inv.type === 'EXEMPT_INVOICE'
  ) && inv.id !== editingId)
  .sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateB !== dateA) return dateB - dateA;
    const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
    return numB - numA;
  })
  .map(inv => `Nº ${inv.number} - Type: ${inv.type} Date: ${inv.date}`);

console.log('Resulting Dropdown Options:');
filtered.forEach(o => console.log(o));
