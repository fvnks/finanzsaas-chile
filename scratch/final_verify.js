import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const p = await prisma.project.findFirst();
        const cc = await prisma.costCenter.findFirst();
        
        if (!p || !cc) {
            console.log('No hay proyectos o centros de costo para probar.');
            return;
        }

        console.log(`Intentando vincular Proyecto "${p.name}" con CC "${cc.name}"...`);
        
        const updated = await prisma.project.update({
            where: { id: p.id },
            data: {
                costCenterIds: [cc.id]
            }
        });

        console.log('--- EXITO EN LOCALHOST ---');
        console.log('Proyecto actualizado:', updated.name);
        console.log('Centros de Costo vinculados:', updated.costCenterIds);
        
        // Comprobar que el campo persiste
        const check = await prisma.project.findUnique({ where: { id: p.id } });
        console.log('Verificación de persistencia:', check?.costCenterIds);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
