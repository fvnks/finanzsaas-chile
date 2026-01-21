
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    try {
        console.log("Starting migration...");

        // Check if table exists first just in case
        const tableCheck = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'Project'`);
        if (tableCheck.rowCount === 0) {
            console.log("Table Project does not exist, creating logic is handled by API route... attempting force create.");
            // We can optionally create it here, but let's stick to adding columns to existing one.
            // Assuming user ran the app at least once.
        }

        await pool.query('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "progress" INTEGER DEFAULT 0;');
        console.log("Added progress column.");

        await pool.query('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);');
        console.log("Added endDate column.");

        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
