
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const { Pool } = pg;
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    try {
        console.log("Starting migration: Adding startDate and workerIds to Project...");

        // Add startDate
        await pool.query('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);');
        console.log("Added startDate column.");

        // Add workerIds as array of text. Note: In Postgres arrays are specific types.
        // Prisma maps String[] to text[].
        await pool.query('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "workerIds" TEXT[];');
        console.log("Added workerIds column.");

        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
