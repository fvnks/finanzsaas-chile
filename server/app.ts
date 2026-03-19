import express from "express";
// import cors from "cors"; // Removed in favor of manual middleware
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes";
import { prisma } from "./prisma";
import { attachCompanyContext } from "./middleware/company";
import { attachCurrentUser } from "./middleware/auth";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

// Manual CORS Middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isLocalhost = !!origin && origin.includes("localhost");
    const isConfiguredOrigin = !!origin && configuredOrigins.includes(origin);
    const isSameRailwayOrigin = !!origin && origin === "https://finanzsaas-chile-production.up.railway.app";

    if (origin && (isLocalhost || isConfiguredOrigin || isSameRailwayOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-company-id, active-company-id, x-user-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle Preflight directly
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    next();
});

app.use(express.json());
app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on("finish", () => {
        logger.info({
            event: "http_request",
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            companyId: (req as any).companyId || null
        });
    });

    next();
});

app.use(attachCompanyContext);
app.use(attachCurrentUser);

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "finanzsaas-chile-api",
        timestamp: new Date().toISOString()
    });
});

app.get("/api/health/ready", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: "ready",
            database: "ok",
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error({
            event: "health_readiness_failed",
            message: error?.message || "Database readiness check failed"
        });
        res.status(503).json({
            status: "not_ready",
            database: "error"
        });
    }
});

// API Routes
app.use("/api", routes);

// Serve frontend in production
// Since we are moving to a build step with Vite, the output will be in 'dist'
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../dist")));

    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, "../dist", "index.html"));
    });
}

export default app;
