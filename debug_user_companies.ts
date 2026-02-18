
import { prisma } from './server/prisma';

async function main() {
    const email = 'admin@finanzchile.cl';
    const user = await prisma.user.findUnique({
        where: { email },
        include: { companies: true }
    });

    console.log('User:', user?.email);
    console.log('Companies:', user?.companies);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
