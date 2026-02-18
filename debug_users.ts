
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS IN DATABASE ---');
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('No users found.');
    } else {
        users.forEach(u => {
            console.log(`User: ${u.email} | Role: ${u.role} | ID: ${u.id}`);
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
