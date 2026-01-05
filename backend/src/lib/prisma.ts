// src/lib/prisma.ts
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";

// DATABASE_URL에 따라 자동으로 어댑터 선택
const isDatabaseUrlPostgres = process.env.DATABASE_URL?.startsWith("postgresql://");

let prisma: PrismaClient;

if (isDatabaseUrlPostgres) {
	// PostgreSQL 사용
	const { PrismaPg } = require("@prisma/adapter-pg");
	const { Pool } = require("pg");

	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,
		max: 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 10000,
	});

	pool.on('connect', (client: any) => {
		client.query('SET timezone = "Asia/Seoul"');
	});

	const adapter = new PrismaPg(pool);
	prisma = new PrismaClient({ adapter });
} else {
	// SQLite 사용 (기본값)
	prisma = new PrismaClient();
}

export default prisma;
