
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    try {
        console.log("Starting migration: Fixing DailyReport columns...");

        // Ensure table exists
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "DailyReport" (
        "id" TEXT PRIMARY KEY,
        "workerId" TEXT,
        "date" TIMESTAMP(3),
        "content" TEXT,
        "projectId" TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3)
      );
    `);

        // Add columns if they don't exist (if table existed but was missing cols)
        await pool.query('ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "workerId" TEXT;');
        await pool.query('ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "projectId" TEXT;');

        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
