import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: { client: true, supplier: true }
    });
    
    // Sort by number as strings, but actually the user said "factura 51", "52", "53"
    // Let's print the top 10 invoices we found by date descending
    const result = invoices.map(i => ({
      id: i.id,
      number: i.number,
      type: i.type,
      status: i.status,
      date: i.date,
      client: i.client?.razonSocial,
      supplier: i.supplier?.razonSocial,
      companyId: i.companyId
    }));
    
    fs.writeFileSync('invoices-dump.json', JSON.stringify(result, null, 2));
  } catch(e) {
    fs.writeFileSync('err.json', JSON.stringify({ message: e.message || String(e), stack: e.stack }));
  } finally {
    await prisma.$disconnect();
  }
}
main();
