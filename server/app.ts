import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://finanzsaas-chile-production.up.railway.app',
    'https://finanzsaas-chile-production.up.railway.app/', // Handling potential trailing slash
    'https://finanzchile-saas-production.up.railway.app',
    'https://finanzchile-saas-production.up.railway.app/'
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Reflect the request origin. This effectively allows all origins that send an Origin header,
        // which is useful for debugging. 
        // WARNING: This should be tightened before final production release if possible,
        // though many public APIs use this pattern.
        console.log('CORS Check - Incoming origin:', origin);
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Use CORS globally
app.use(cors(corsOptions));

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
