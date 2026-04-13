import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- Company ID Mismatch Check ---');
        const projects = await prisma.project.findMany({
            where: { costCenterIds: { isEmpty: false } }
        });

        if (projects.length === 0) {
            console.log('No projects with cost centers found in DB.');
            return;
        }

        for (const p of projects) {
            console.log(`\nProject: ${p.name} (CompanyID: ${p.companyId})`);
            for (const ccId of p.costCenterIds) {
                const cc = await prisma.costCenter.findUnique({ where: { id: ccId } });
                if (!cc) {
                    console.log(`  ❌ Linked CC ID ${ccId} NOT FOUND in CostCenter table!`);
                } else {
                    console.log(`  CC: ${cc.name} (Code: ${cc.code}, CompanyID: ${cc.companyId})`);
                    if (p.companyId !== cc.companyId) {
                        console.log('  🚨 MISMATCH! This CC will NOT show up in the frontend for this project.');
                    } else {
                        console.log('  ✅ MATCH');
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
