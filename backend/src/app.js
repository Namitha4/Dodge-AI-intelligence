import express from "express";
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