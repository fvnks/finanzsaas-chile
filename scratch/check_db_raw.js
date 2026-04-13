import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, name, "costCenterIds" FROM "Project" LIMIT 5');
        console.log('--- Proyectos en BD ---');
        console.table(res.rows);
        
        if (res.rows.length > 0) {
            const withCCs = res.rows.filter(r => r.costCenterIds && r.costCenterIds.length > 0);
            console.log(`Total proyectos: ${res.rows.length}`);
            console.log(`Proyectos con Centros de Costo vinculados: ${withCCs.length}`);
        }
    } catch (err) {
        console.error('Error al conectar:', err.message);
    } finally {
        await client.end();
    }
}

check();
