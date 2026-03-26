/*import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import graphRoute from "./routes/graph.js";
import chatRoute from "./routes/chat.js";

dotenv.config();

const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Backend running 🚀"));
app.use("/api/graph", graphRoute);
app.use("/api/chat", chatRoute);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

*/

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";

// Import your routes - Ensure these filenames exactly match your files in /routes
import chatRoutes from "./routes/chatRoutes.js";
import graphRoutes from "./routes/graphRoutes.js";

dotenv.config();

const app = express();

// 1. CORS Configuration
// This allows your Vercel frontend to talk to this Render backend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000", 
  credentials: true
}));

app.use(express.json());

// 2. Health Check & DB Test Route
// Use this to verify the DB is working: https://your-backend.onrender.com/api/health
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ 
      status: "ok", 
      database: "connected", 
      time: result.rows[0].now 
    });
  } catch (err) {
    res.status(500).json({ 
      status: "error", 
      message: "Database connection failed",
      error: err.message 
    });
  }
});

app.get("/", (req, res) => res.send("Backend is Live 🚀"));

// 3. Routes
app.use("/api/chat", chatRoutes);
app.use("/api/graph", graphRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
