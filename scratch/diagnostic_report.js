import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- DEFINITIVE LINKAGE REPORT ---');
        const projects = await prisma.project.findMany();
        const costCenters = await prisma.costCenter.findMany();
        
        // Map of ID -> Name for easy lookup
        const ccMap = costCenters.reduce((acc, cc) => ({ ...acc, [cc.id]: cc.name }), {});

        for (const p of projects) {
            console.log(`\nProject: ${p.name} (ID: ${p.id})`);
            const linkedIds = p.costCenterIds || [];
            if (linkedIds.length === 0) {
                console.log('  [No linked Cost Centers]');
            } else {
                linkedIds.forEach(id => {
                    const name = ccMap[id] || '!!! UNKNOWN ID !!!';
                    console.log(`  - Linked: ${name} (ID: ${id})`);
                });
            }
        }

        console.log('\n--- ALL AVAILABLE COST CENTERS ---');
        costCenters.forEach(cc => {
            console.log(`Name: ${cc.name} (ID: ${cc.id})`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
