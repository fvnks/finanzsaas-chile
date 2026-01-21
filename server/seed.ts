import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('Seeding database...');

    const adminEmail = 'admin@finanzchile.cl';
    const passwordRaw = '123456';
    const hashedPassword = await bcrypt.hash(passwordRaw, 10);

    // Upsert Admin User
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Administrador'
      },
      create: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN'
      }
    });

    console.log(`Admin user seeded: ${adminUser.email}`);
    console.log(`Password: ${passwordRaw}`); // Log for user visibility (dev only)

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seed();
