// src/index.ts
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import examRoutes from "./routes/examRoutes";

const app = express();
const PORT = parseInt(process.env.PORT || "3000");
const HOST = "0.0.0.0";
// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api", examRoutes);

// Health check
app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

// 서버 시작
app.listen(PORT, HOST, () => {
	// HOST 추가
	console.log(`🚀 Server running on http://${HOST}:${PORT}`);
	console.log(`📚 Swagger docs available at http://${HOST}:${PORT}/api-docs`);
});