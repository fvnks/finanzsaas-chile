
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

export const createBackup = async (): Promise<string> => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not defined');
    }

    // Command to dump database
    // Note: This requires pg_dump to be available in PATH
    const command = `pg_dump "${databaseUrl}" -f "${filepath}"`;

    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) console.warn('pg_dump stderr:', stderr);
        return filename;
    } catch (error: any) {
        console.error('Backup failed:', error);
        throw new Error(`Backup failed: ${error.message}`);
    }
};

export const listBackups = async (): Promise<{ name: string; size: number; date: Date }[]> => {
    try {
        const files = await fs.promises.readdir(BACKUP_DIR);
        const backups = await Promise.all(
            files
                .filter(f => f.endsWith('.sql'))
                .map(async (f) => {
                    const stats = await fs.promises.stat(path.join(BACKUP_DIR, f));
                    return {
                        name: f,
                        size: stats.size,
                        date: stats.mtime
                    };
                })
        );
        // Sort by date desc
        return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error('Error listing backups:', error);
        return [];
    }
};

export const getBackupPath = (filename: string): string => {
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(BACKUP_DIR, safeFilename);
    const normalizedPath = path.normalize(filepath);

    // Additional check to ensure it's within BACKUP_DIR
    if (!normalizedPath.startsWith(BACKUP_DIR)) {
        throw new Error('Invalid filename');
    }

    if (!fs.existsSync(normalizedPath)) {
        throw new Error('File not found');
    }
    return normalizedPath;
};

export const deleteBackup = async (filename: string): Promise<void> => {
    const filepath = getBackupPath(filename);
    await fs.promises.unlink(filepath);
};
