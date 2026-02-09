
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS IN DATABASE ---');
    const users = await prisma.user.findMany();
    console.table(users.map(u => ({
        email: u.email,
        role: u.role,
        roleType: typeof u.role,
        allowedSections: u.allowedSections
    })));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
