import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const migrations = await prisma.$queryRaw`SELECT "id", "migration_name", "applied_steps_count", "rolled_back_at", "finished_at" FROM "_prisma_migrations"`
  console.log(JSON.stringify(migrations, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
