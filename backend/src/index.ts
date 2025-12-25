// src/index.ts
import express from "express";
import cors from "cors";
import examRoutes from "./routes/examRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", examRoutes);

// Health check
app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

// 서버 시작
app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
});
