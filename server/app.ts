import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", routes);

// Serve frontend in production
// Since we are moving to a build step with Vite, the output will be in 'dist'
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../dist", "index.html"));
    });
}

export default app;
