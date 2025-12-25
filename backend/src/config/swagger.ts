// src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";

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
				url: "http://localhost:3000",
				description: "Development server",
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
	apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

