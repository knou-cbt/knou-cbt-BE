// src/index.ts
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swaggerSpec";
import examRoutes from "./routes/examRoutes";

const app = express();

// 리버스 프록시 신뢰 설정 (x-forwarded-* 헤더를 신뢰)
app.set("trust proxy", true);

// HTTPS 리다이렉트 미들웨어 (프로덕션 환경에서만)
if (process.env.NODE_ENV === "production") {
	app.use((req, res, next) => {
		// x-forwarded-proto 헤더 확인 (리버스 프록시 사용 시)
		const forwardedProto = req.headers["x-forwarded-proto"];
		const isHttps = forwardedProto === "https" || req.secure;
		
		// HTTP 요청인 경우 HTTPS로 리다이렉트
		if (!isHttps && forwardedProto !== "https") {
			const host = req.headers.host || req.headers["x-forwarded-host"];
			if (host) {
				return res.redirect(301, `https://${host}${req.originalUrl}`);
			}
		}
		
		next();
	});
}

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
app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

// 서버 시작
const PORT = parseInt(process.env.PORT || "3000");
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
	console.log(`🚀 Server running on http://${HOST}:${PORT}`);
	console.log(`📚 Swagger docs available at http://${HOST}:${PORT}/api-docs`);
});