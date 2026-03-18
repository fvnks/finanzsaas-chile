import express from "express";
// import cors from "cors"; // Removed in favor of manual middleware
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes";

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-company-id, active-company-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle Preflight directly
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    next();
});

app.use(express.json());

// Company Context Middleware
app.use((req, res, next) => {
    const companyId = req.headers['x-company-id'];
    if (companyId) {
        (req as any).companyId = typeof companyId === 'string' ? companyId : companyId[0];
    }
    next();
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
