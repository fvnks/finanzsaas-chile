
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS IN DATABASE ---');
    try {
        const users = await prisma.user.findMany();
        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.error("Error fetching users:", e);
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
