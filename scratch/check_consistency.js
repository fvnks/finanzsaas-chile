const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- Project & Cost Center Company Consistency Check ---');
        const projects = await prisma.project.findMany({
            include: { company: true }
        });

        for (const p of projects) {
            console.log(`\nProject: ${p.name} (ID: ${p.id})`);
            console.log(`Company ID: ${p.companyId}`);
            console.log(`Linked Cost Center IDs: ${JSON.stringify(p.costCenterIds)}`);

            if (p.costCenterIds && p.costCenterIds.length > 0) {
                const ccs = await prisma.costCenter.findMany({
                    where: { id: { in: p.costCenterIds } }
                });
                
                if (ccs.length === 0) {
                    console.log('❌ Linked Cost Centers NOT FOUND in database!');
                } else {
                    ccs.forEach(cc => {
                        console.log(`- CC: ${cc.name} (ID: ${cc.id})`);
                        console.log(`  CC Company ID: ${cc.companyId}`);
                        if (cc.companyId !== p.companyId) {
                            console.log('  ⚠️ WARNING: Company ID MISMATCH!');
                        } else {
                            console.log('  ✅ Company ID MATCH');
                        }
                    });
                }
            } else {
                console.log('No Cost Centers linked.');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
