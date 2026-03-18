import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function updateExchangeRates() {
    console.log("[ExchangeRate] Iniciando actualización de tipos de cambio...");
    try {
        const res = await fetch('https://mindicador.cl/api');
        if (!res.ok) throw new Error("Error fetching mindicador.cl");
        
        const data = await res.json();
        const ufValue = data.uf?.valor;
        const usdValue = data.dolar?.valor;
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`); // Normalizar a medianoche UTC

        if (ufValue) {
            await prisma.exchangeRate.upsert({
                where: { date_currency: { date: todayDate, currency: 'UF' } },
                update: { value: ufValue },
                create: { date: todayDate, currency: 'UF', value: ufValue }
            });
            console.log(`[ExchangeRate] UF Actualizada: ${ufValue}`);
        }

        if (usdValue) {
            await prisma.exchangeRate.upsert({
                where: { date_currency: { date: todayDate, currency: 'USD' } },
                update: { value: usdValue },
                create: { date: todayDate, currency: 'USD', value: usdValue }
            });
            console.log(`[ExchangeRate] USD Actualizada: ${usdValue}`);
        }

    } catch (error) {
        console.error("[ExchangeRate] Error actualizando tipos de cambio:", error);
    }
}

// Iniciar actualización cada 12 horas
export function startExchangeRateCron() {
    // Primera ejecución al arrancar
    updateExchangeRates();
    
    // Intervalo de 12 horas (12 * 60 * 60 * 1000)
    setInterval(updateExchangeRates, 12 * 60 * 60 * 1000);
}
