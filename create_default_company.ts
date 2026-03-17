
import { prisma } from './server/prisma';

async function main() {
    const email = 'admin@finanzchile.cl';

    // 1. Find the admin user
    const user = await prisma.user.findUnique({
        where: { email },
        include: { companies: true }
    });

    if (!user) {
        console.error('Admin user not found!');
        return;
    }

    if (user.companies.length > 0) {
        console.log('User already has companies:', user.companies.map(c => c.name));
        return;
    }

    console.log('Creating default company...');

    // 2. Create the company and link it
    const company = await prisma.company.create({
        data: {
            rut: '76.123.456-7',
            name: 'Vertikal Finanzas',
            address: 'Av. Providencia 1234',
            email: 'contacto@vertikal.cl',
            users: {
                connect: { id: user.id }
            }
        }
    });

    console.log(`Company created: ${company.name} (${company.id})`);

    // 3. Set as active company for user
    await prisma.user.update({
        where: { id: user.id },
        data: { activeCompanyId: company.id }
    });

    console.log('Set as active company for admin user.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
