import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { date: "desc" },
      include: { client: true, project: true, supplier: true }
    });
    fs.writeFileSync('out.json', JSON.stringify({ success: true, count: invoices.length }));
  } catch(e) {
    fs.writeFileSync('err.json', JSON.stringify({ message: e.message || String(e), stack: e.stack }));
  } finally {
    await prisma.$disconnect();
  }
}
main();
