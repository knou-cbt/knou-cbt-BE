// src/scripts/crawl.ts
import questionService from "../services/questionService";
import prisma from "../lib/prisma";

async function main() {
	const url = process.argv[2];
	const forceRetry = process.argv.includes("--retry") || process.argv.includes("-r");

	if (!url) {
		console.error("❌ 사용법: npm run crawl <URL> [--retry]");
		console.error("예시: npm run crawl https://example.com/exam");
		console.error("     npm run crawl https://example.com/exam --retry  (부분 저장된 경우 재시도)");
		process.exit(1);
	}

	try {
		console.log(`🔍 크롤링 시작: ${url}`);
		if (forceRetry) {
			console.log("⚠️ --retry 옵션 활성화: 부분 저장된 데이터가 있으면 삭제하고 다시 시도합니다.");
		}
		const result = await questionService.saveExamFromUrl(url, forceRetry);
		console.log("✅ 크롤링 완료!");
		console.log(`   - 시험 ID: ${result.examId}`);
		console.log(`   - 제목: ${result.title}`);
		console.log(`   - 문제 수: ${result.questionCount}`);
	} catch (error: any) {
		console.error("❌ 크롤링 실패:", error.message);
		if (error.message.includes("부분적으로 저장된")) {
			console.error("\n💡 해결 방법: --retry 옵션을 사용하여 다시 시도하세요.");
			console.error("   예시: npm run crawl <URL> --retry");
		}
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();

