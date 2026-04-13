import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
    try {
        // 1. Find the project
        const project = await prisma.project.findFirst({
            where: { name: 'RVCX-18SEPTBRE' }
        });
        
        // 2. Find the correct Cost Center
        const costCenter = await prisma.costCenter.findFirst({
            where: { name: 'EDIFICIO 18 SEPTIEMBRE' }
        });

        if (!project || !costCenter) {
            console.error('Project or Cost Center not found!');
            console.log('Project:', project?.name);
            console.log('Cost Center:', costCenter?.name);
            return;
        }

        console.log(`Linking Project "${project.name}" to Cost Center "${costCenter.name}"...`);

        // 3. Update the project with ONLY the correct ID (or append it?)
        // The user said "only shows services generales", so replacing it seems better.
        await prisma.project.update({
            where: { id: project.id },
            data: {
                costCenterIds: [costCenter.id]
            }
        });

        console.log('✅ Linkage successfully updated in DB.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
