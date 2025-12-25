// src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

// 빌드 환경에 따라 경로 설정
const isProduction = process.env.NODE_ENV === "production";
const routesPath = isProduction 
	? path.join(process.cwd(), "dist/src/routes/*.js")
	: "./src/routes/*.ts";

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "KNOU CBT API",
			version: "1.0.0",
			description: "방송대(KNOU) CBT 시험 문제 관리 API",
			contact: {
				name: "API Support",
			},
		},
		servers: [
			{
				url: process.env.VERCEL_URL 
					? `https://${process.env.VERCEL_URL}` 
					: process.env.API_URL || "http://localhost:3000",
				description: isProduction ? "Production server" : "Development server",
			},
		],
		tags: [
			{
				name: "Crawl",
				description: "크롤링 관련 API",
			},
			{
				name: "Subjects",
				description: "과목 관련 API",
			},
			{
				name: "Exams",
				description: "시험 관련 API",
			},
		],
	},
	apis: [routesPath],
};

export const swaggerSpec = swaggerJsdoc(options);

