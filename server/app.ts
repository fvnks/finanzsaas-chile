import express from "express";
// import cors from "cors"; // Removed in favor of manual middleware
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Manual CORS Middleware
app.use((req, res, next) => {
    const allowedOrigin = 'https://finanzsaas-chile-production.up.railway.app';

    // Check if the incoming origin matches our allowed origin
    // OR if we are in development (localhost)
    const origin = req.headers.origin;
    if (origin && (origin === allowedOrigin || origin.includes('localhost'))) {
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
