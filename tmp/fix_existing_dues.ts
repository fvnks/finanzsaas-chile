import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting retroactive due date update...");
    
    // Find invoices with null due date
    const invoices = await prisma.invoice.findMany({
        where: {
            dueDate: null
        }
    });

    console.log(`Found ${invoices.length} invoices to update.`);

    let updatedCount = 0;
    for (const inv of invoices) {
        // Calculate due date: date + 30 days
        const issueDate = new Date(inv.date);
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30);

        await prisma.invoice.update({
            where: { id: inv.id },
            data: { dueDate: dueDate }
        });
        updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} invoices.`);
}

main()
  .catch(e => {
      console.error("Error during update:", e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
