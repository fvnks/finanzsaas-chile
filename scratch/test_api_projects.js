import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3001/api'; 

async function test() {
    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const p = await prisma.project.findFirst();
        if (!p) return console.log('No project found');
        const cId = p.companyId;
        console.log('Testing Projects API for Company:', cId);

        const res = await fetch(`${API_URL}/projects`, {
            headers: { 'x-company-id': cId }
        });
        
        if (!res.ok) {
            console.error('API Error:', res.status, await res.text());
            return;
        }

        const projects = await res.json();
        const firstProject = projects.find(proj => proj.id === p.id);
        
        console.log('--- API RESPONSE ---');
        console.log('Project ID:', firstProject?.id);
        console.log('costCenterIds in API:', firstProject?.costCenterIds);
        
        await prisma.$disconnect();
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
