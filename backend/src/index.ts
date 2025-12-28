// src/index.ts
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swaggerSpec";
import examRoutes from "./routes/examRoutes";

const app = express();

// Middleware
app.use(cors());
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
app.get("/", (req, res) => {
	res.json({ 
		status: "ok",
		message: "KNOU CBT API",
		docs: "/api-docs"
	});
});

app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

// Vercel에서는 export default로 내보내기
export default app;

// 로컬 개발 환경에서만 서버 시작
if (process.env.NODE_ENV !== "production") {
	const PORT = parseInt(process.env.PORT || "3000");
	const HOST = "0.0.0.0";
	
	app.listen(PORT, HOST, () => {
		console.log(`🚀 Server running on http://${HOST}:${PORT}`);
		console.log(`📚 Swagger docs available at http://${HOST}:${PORT}/api-docs`);
	});
}