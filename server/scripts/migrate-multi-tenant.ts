
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAIN_COMPANY_NAME = "Servicios y Montaje Vertikal SpA";
const MAIN_COMPANY_RUT = "76.123.456-7"; // Use a placeholder or real RUT if known

async function main() {
    console.log("Starting multi-tenancy migration...");

    // 1. Create or Get Main Company
    let company = await prisma.company.findUnique({
        where: { rut: MAIN_COMPANY_RUT },
    });

    if (!company) {
        console.log(`Creating main company: ${MAIN_COMPANY_NAME}`);
        company = await prisma.company.create({
            data: {
                name: MAIN_COMPANY_NAME,
                rut: MAIN_COMPANY_RUT,
            },
        });
    } else {
        console.log(`Main company already exists: ${company.name} (${company.id})`);
    }

    const companyId = company.id;

    // 2. Update Models
    const modelsToUpdate = [
        'client',
        'project',
        'invoice',
        'costCenter',
        'worker',
        'crew',
        'dailyReport',
        'purchaseOrder',
        'inventoryMovement',
        'document',
        'documentRequirement',
        'clientMonthlyInfo',
        'plan',
        'material'
    ];

    for (const model of modelsToUpdate) {
        console.log(`Updating ${model}...`);
        // @ts-ignore
        const result = await prisma[model].updateMany({
            where: { companyId: null },
            data: { companyId },
        });
        console.log(`Updated ${result.count} ${model} records.`);
    }

    // 3. Update Users
    console.log("Updating Users...");
    const users = await prisma.user.findMany({
        include: { companies: true }
    });

    for (const user of users) {
        // Connect user to company if not already connected
        const isConnected = user.companies.some(c => c.id === companyId);

        if (!isConnected || !user.activeCompanyId) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    companies: {
                        connect: { id: companyId }
                    },
                    activeCompanyId: companyId
                }
            });
            console.log(`Assigned user ${user.email} to company.`);
        }
    }

    console.log("Migration completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
