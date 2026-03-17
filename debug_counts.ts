
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE COUNTS ---');
    const users = await prisma.user.count();
    const clients = await prisma.client.count();
    const projects = await prisma.project.count();
    const invoices = await prisma.invoice.count();
    const suppliers = await prisma.supplier.count();
    const workers = await prisma.worker.count();
    const costCenters = await prisma.costCenter.count();

    console.log(`Users: ${users}`);
    console.log(`Clients: ${clients}`);
    console.log(`Projects: ${projects}`);
    console.log(`Invoices: ${invoices}`);
    console.log(`Suppliers: ${suppliers}`);
    console.log(`Workers: ${workers}`);
    console.log(`CostCenters: ${costCenters}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
