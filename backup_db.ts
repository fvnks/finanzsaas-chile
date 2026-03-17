
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const backupDir = path.join(process.cwd(), 'backups');

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not defined in environment variables');
    process.exit(1);
}

console.log(`Creating backup at ${backupFile}...`);

// Use pg_dump if available, or just verify valid connection string for now
// standard postgres connection string: postgres://user:pass@host:port/db
// We'll use a simple approach for now or alerting the user this requires pg_dump installed
const command = `pg_dump "${databaseUrl}" -f "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error creating backup: ${error.message}`);
        console.error('Ensure pg_dump is installed and in your PATH.');
        return;
    }
    if (stderr) {
        console.error(`pg_dump stderr: ${stderr}`);
    }
    console.log(`Backup created successfully: ${backupFile}`);
});
