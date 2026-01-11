// src/index.ts
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swaggerSpec";
import examRoutes from "./routes/examRoutes";

const app = express();

// 리버스 프록시 신뢰 설정 (x-forwarded-* 헤더를 신뢰)
app.set("trust proxy", true);

// Middleware
// CORS 설정 - www.qknou.kr와 qknou.kr 간 통신 허용
app.use(
	cors({
		origin: [
			"https://www.qknou.kr",
			"https://qknou.kr",
			"http://localhost:3000",
			"http://localhost:5173", // Vite 개발 서버
		],
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);
app.use(express.json());


// Swagger UI
app.get("/api-docs/swagger.json", (req, res) => {
	// 동적으로 현재 호스트 기반 서버 URL 설정
	const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
	const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
	const serverUrl = `${protocol}://${host}`;
	
	const spec = {
		...swaggerSpec,
		servers: [
			{
				url: serverUrl,
				description: process.env.NODE_ENV === "production" ? "Production server" : "Development server",
			},
		],
	};
	
	res.json(spec);
});

app.use(
	"/api-docs",
	swaggerUi.serve,
	swaggerUi.setup(null, {
		customCss: ".swagger-ui .topbar { display: none }",
		customSiteTitle: "KNOU CBT API Documentation",
		customfavIcon: "/favicon.ico",
		swaggerOptions: {
			url: "/api-docs/swagger.json",
		},
	})
);

// Routes
app.use("/api", examRoutes);

// Health check
app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

// 서버 시작
const PORT = parseInt(process.env.PORT || "3000");
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
	console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
	console.log(`📚 Swagger docs available at http://127.0.0.1:${PORT}/api-docs`);
});