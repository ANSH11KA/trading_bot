import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import botRoutes from "./routes/bot.js";
import { resumeAll } from "./services/engine.js";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import "dotenv/config";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api", botRoutes);
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: "Something went wrong on the server." }); });

await mongoose.connect(process.env.MONGO_URI);
await resumeAll();
app.listen(process.env.PORT || 5000, () => console.log("API on :" + (process.env.PORT || 5000)));
