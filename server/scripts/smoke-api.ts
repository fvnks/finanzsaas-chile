const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const apiUrl = `${baseUrl}/api`;
const companyId = process.env.SMOKE_COMPANY_ID || process.env.COMPANY_ID || "";

const defaultHeaders: Record<string, string> = {
    Accept: "application/json"
};

if (companyId) {
    defaultHeaders["x-company-id"] = companyId;
}

const checks = [
    {
        name: "health",
        url: `${apiUrl}/health`
    },
    {
        name: "readiness",
        url: `${apiUrl}/health/ready`
    },
    {
        name: "debug-db",
        url: `${apiUrl}/debug-db`
    },
    ...(companyId
        ? [
              {
                  name: "clients",
                  url: `${apiUrl}/clients`
              },
              {
                  name: "cash-flow",
                  url: `${apiUrl}/cash-flow`
              }
          ]
        : [])
];

const run = async () => {
    console.log(`[smoke] baseUrl=${baseUrl}`);
    if (companyId) {
        console.log(`[smoke] companyId=${companyId}`);
    } else {
        console.log("[smoke] companyId not set, company-scoped checks skipped");
    }

    for (const check of checks) {
        const startedAt = Date.now();
        const response = await fetch(check.url, { headers: defaultHeaders });
        const durationMs = Date.now() - startedAt;

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`[smoke] ${check.name} failed: ${response.status} ${body}`);
        }

        console.log(`[smoke] ${check.name} ok (${durationMs}ms)`);
    }

    console.log("[smoke] all checks passed");
};

run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
