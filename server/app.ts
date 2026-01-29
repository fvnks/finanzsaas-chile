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
    const origin = req.headers.origin;

    // Allow any origin that is calling (Reflecting origin)
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Allow standard methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    // Allow headers usually sent by browsers/clients
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Allow credentials (cookies, auth headers)
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle Preflight directly
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return; // End checking
    }

    next();
});

app.use(express.json());

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
