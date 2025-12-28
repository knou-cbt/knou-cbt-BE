// src/lib/prisma.ts
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 20, // 최대 커넥션 수 증가 (기본값: 10)
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000,
});

// 연결 시 타임존 설정
pool.on('connect', (client) => {
	client.query('SET timezone = "Asia/Seoul"');
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
