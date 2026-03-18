import { updateExchangeRates } from '../server/services/exchangeRateService';

async function test() {
    console.log("Starting manual test of updateExchangeRates...");
    await updateExchangeRates();
    console.log("Test finished.");
}

test().then(() => process.exit(0)).catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
