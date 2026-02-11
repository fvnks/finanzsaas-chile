
import { PrismaClient } from '../../generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting JobTitle migration...');

    const defaultCompany = await prisma.company.findFirst({
        where: { name: 'Servicios y Montaje Vertikal SpA' } // Use the default company created earlier
    });

    if (!defaultCompany) {
        console.error('Default company not found!');
        process.exit(1);
    }

    console.log(`Using default company: ${defaultCompany.name} (${defaultCompany.id})`);

    const titles = await prisma.jobTitle.findMany({
        where: { companyId: null }
    });

    console.log(`Found ${titles.length} job titles without companyId.`);

    for (const title of titles) {
        await prisma.jobTitle.update({
            where: { id: title.id },
            data: { companyId: defaultCompany.id }
        });
        console.log(`Updated JobTitle ${title.name}`);
    }

    console.log('JobTitle migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
